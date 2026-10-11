using System.Text.Json;
using Microsoft.Web.WebView2.WinForms;

namespace MortalNexusDesktop;

internal sealed class NativeToolBridge : IDisposable
{
    private static readonly JsonSerializerOptions WebMessageJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
    };

    private readonly MainForm _owner;
    private readonly WebView2 _browser;
    private readonly ToolSettings _settings;
    private readonly GlobalHotkeyService _hotkeys;
    private readonly CraftAutomationService _craft = new();
    private readonly ClickMacroAutomationService _clickMacro;
    private readonly MagicAutomationService _magic;
    private readonly MeleeAutomationService _melee;
    private readonly AfkAutomationService _afk;
    private readonly UpdateService _updates;
    private CancellationTokenSource? _captureCancellation;
    private CancellationTokenSource? _macroCancellation;
    private bool _initialUpdateCheckStarted;
    private bool _craftSafetyArmed;
    private bool _disposed;

    public NativeToolBridge(
        MainForm owner,
        WebView2 browser,
        DesktopAuthenticationResult? authenticationResult)
    {
        _owner = owner;
        _browser = browser;
        _settings = ToolSettingsStore.Load();
        if (_settings.AutomaticScale)
        {
            _settings.ApplicationScalePercent = _owner.RecommendedApplicationScalePercent;
        }
        _owner.SetWindowOpacity(_settings.WindowOpacityPercent);
        _owner.SetApplicationScale(_settings.ApplicationScalePercent);
        _hotkeys = new GlobalHotkeyService(_settings);
        _hotkeys.Triggered += HotkeyTriggered;
        _hotkeys.Captured += HotkeyCaptured;
        _hotkeys.CaptureCancelled += action =>
            Post("hotkeyCaptureCancelled", new { action });
        _craft.StatusChanged += (phase, message) =>
            Post("craftStatus", new
            {
                phase,
                message,
                running = _craft.IsRunning,
                paused = _craft.IsPaused,
                repeating = _craft.IsRepeating,
            });
        _clickMacro = new ClickMacroAutomationService(_hotkeys.SuppressFor);
        _clickMacro.StatusChanged += (phase, message, stepIndex, remainingSeconds) =>
            Post("clickMacroStatus", new
            {
                phase,
                message,
                stepIndex,
                remainingSeconds,
                running = _clickMacro.IsRunning,
                paused = _clickMacro.IsPaused,
            });
        _magic = new MagicAutomationService(_hotkeys.SuppressFor);
        _magic.StatusChanged += (phase, message, pressIndex, pressTotal, remainingMs) =>
            Post("magicStatus", new
            {
                phase,
                message,
                pressIndex,
                pressTotal,
                remainingMs,
                running = _magic.IsRunning,
                paused = _magic.IsPaused,
            });
        _melee = new MeleeAutomationService(_hotkeys.SuppressFor);
        _melee.StatusChanged += (phase, message, remainingMs) =>
            Post("meleeStatus", new
            {
                phase,
                message,
                remainingMs,
                running = _melee.IsRunning,
            });
        _afk = new AfkAutomationService(_hotkeys.SuppressFor);
        _afk.StatusChanged += (phase, message, remainingMs) =>
            Post("afkStatus", new
            {
                phase,
                message,
                remainingMs,
                running = _afk.IsRunning,
            });
        _updates = new UpdateService(owner, authenticationResult?.AppSession.SessionToken);
        _updates.StatusChanged += snapshot => Post("updateStatus", snapshot);
    }

    public async void HandleMessage(string json)
    {
        try
        {
            using var document = JsonDocument.Parse(json);
            var root = document.RootElement;
            var type = root.GetProperty("type").GetString() ?? "";
            if (!_settings.MacrosEnabled && IsMacroExecutionCommand(type))
            {
                ReportMacrosDisabled();
                return;
            }
            switch (type)
            {
                case "account.logout":
                    StopAllAutomation();
                    await _owner.SignOutAsync();
                    break;
                case "tools.init":
                    PostSnapshot();
                    PostWindowState();
                    Post("updateStatus", _updates.Snapshot);
                    if (!_initialUpdateCheckStarted)
                    {
                        _initialUpdateCheckStarted = true;
                        await _updates.CheckAsync(interactive: false);
                    }
                    break;
                case "window.state":
                    PostWindowState();
                    break;
                case "window.secondScreen":
                    var secondScreenEnabled = root.TryGetProperty("enabled", out var secondScreenValue) &&
                        secondScreenValue.ValueKind is JsonValueKind.True;
                    var secondScreenResolution = root.TryGetProperty("resolution", out var resolutionValue)
                        ? resolutionValue.GetString()
                        : _settings.SecondScreenResolution;
                    _settings.SecondScreenResolution = MainForm.NormalizeSecondScreenResolution(secondScreenResolution);
                    ToolSettingsStore.Save(_settings);
                    _owner.SetSecondScreenMode(secondScreenEnabled, _settings.SecondScreenResolution);
                    PostWindowState();
                    break;
                case "window.opacity":
                    var requestedOpacity = root.TryGetProperty("percent", out var opacityValue) &&
                        opacityValue.TryGetInt32(out var parsedOpacity)
                            ? parsedOpacity
                            : _settings.WindowOpacityPercent;
                    _settings.WindowOpacityPercent = Math.Clamp(requestedOpacity, 20, 100);
                    _owner.SetWindowOpacity(_settings.WindowOpacityPercent);
                    var persistOpacity = !root.TryGetProperty("persist", out var persistOpacityValue) ||
                        persistOpacityValue.ValueKind is not JsonValueKind.False;
                    if (persistOpacity)
                    {
                        ToolSettingsStore.Save(_settings);
                    }
                    PostWindowState();
                    break;
                case "window.scale":
                    var requestedScale = root.TryGetProperty("percent", out var scaleValue) &&
                        scaleValue.TryGetInt32(out var parsedScale)
                            ? parsedScale
                            : _settings.ApplicationScalePercent;
                    _settings.ApplicationScalePercent = Math.Clamp(requestedScale, 60, 150);
                    _settings.AutomaticScale = false;
                    _owner.SetApplicationScale(_settings.ApplicationScalePercent);
                    ToolSettingsStore.Save(_settings);
                    PostWindowState();
                    break;
                case "window.autoScale":
                    _settings.AutomaticScale = root.TryGetProperty("enabled", out var automaticScaleValue) &&
                        automaticScaleValue.ValueKind is JsonValueKind.True;
                    if (_settings.AutomaticScale)
                    {
                        _settings.ApplicationScalePercent = _owner.RecommendedApplicationScalePercent;
                    }
                    _owner.SetApplicationScale(_settings.ApplicationScalePercent);
                    ToolSettingsStore.Save(_settings);
                    PostWindowState();
                    break;
                case "map.filters.set":
                    var filterContinent = NormalizeMapContinent(
                        root.TryGetProperty("continent", out var filterContinentValue)
                            ? filterContinentValue.GetString()
                            : null);
                    var filterSettings = _settings.MapFilters.GetValueOrDefault(filterContinent) ?? new MapFilterSettings();
                    filterSettings.Initialized = true;
                    filterSettings.SearchText = root.TryGetProperty("searchText", out var filterSearchValue)
                        ? filterSearchValue.GetString() ?? ""
                        : "";
                    filterSettings.ShowNames = root.TryGetProperty("showNames", out var filterShowNamesValue) &&
                        filterShowNamesValue.ValueKind is JsonValueKind.True;
                    filterSettings.HiddenCategories = ReadStringArray(root, "hiddenCategories", 128);
                    filterSettings.HiddenResources = ReadStringArray(root, "hiddenResources", 1024);
                    filterSettings.Normalize();
                    _settings.MapFilters[filterContinent] = filterSettings;
                    ToolSettingsStore.Save(_settings);
                    break;
                case "map.popout":
                    _owner.OpenMapPopout(root.TryGetProperty("route", out var popoutRoute)
                        ? popoutRoute.GetString() ?? "/map"
                        : "/map");
                    break;
                case "hotkey.capture":
                    _hotkeys.BeginCapture(root.GetProperty("action").GetString() ?? "");
                    break;
                case "hotkey.clear":
                    ClearHotkey(root.GetProperty("action").GetString() ?? "");
                    break;
                case "hotkeys.toggle":
                    _settings.HotkeysEnabled = root.TryGetProperty("enabled", out var enabled) &&
                        enabled.ValueKind is JsonValueKind.True;
                    _hotkeys.RefreshBindings();
                    SaveAndPostSnapshot();
                    break;
                case "macros.toggle":
                    SetMacrosEnabled(
                        root.TryGetProperty("enabled", out var macrosEnabled) &&
                        macrosEnabled.ValueKind is JsonValueKind.True);
                    break;
                case "updates.check":
                    await _updates.CheckAsync(interactive: true);
                    break;
                case "updates.state":
                    Post("updateStatus", _updates.Snapshot);
                    if (!_initialUpdateCheckStarted)
                    {
                        _initialUpdateCheckStarted = true;
                        await _updates.CheckAsync(interactive: false);
                    }
                    break;
                case "houseHunter.alarm":
                    var houseName = ReadString(root, "name", 120, "House");
                    var houseLocation = ReadString(root, "location", 1000, "");
                    var houseContinent = ReadString(root, "continent", 40, "");
                    System.Media.SystemSounds.Exclamation.Play();
                    MessageBox.Show(
                        _owner,
                        string.IsNullOrWhiteSpace(houseLocation)
                            ? $"{houseName} can now be looted."
                            : $"{houseName} can now be looted.\n\n{houseContinent}\n{houseLocation}",
                        "House Hunter Alarm",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information,
                        MessageBoxDefaultButton.Button1);
                    break;
                case "craft.configure":
                    ConfigureCraft(root);
                    break;
                case "craft.safety":
                    SetCraftSafety(
                        root.TryGetProperty("armed", out var craftArmed) &&
                        craftArmed.ValueKind is JsonValueKind.True);
                    break;
                case "craft.capturePoint":
                    await CapturePointAsync(root.GetProperty("target").GetString() ?? "");
                    break;
                case "craft.captureGrid":
                    await CaptureGridAsync();
                    break;
                case "craft.start":
                    if (!_craftSafetyArmed)
                    {
                        ReportCraftSafetyBlocked();
                        break;
                    }
                    MinimizeForAutomation();
                    _craft.ToggleCycle(_settings.Craft);
                    break;
                case "craft.stop":
                    _craft.StopCycle();
                    break;
                case "clickMacro.configure":
                    ConfigureClickMacro(root);
                    break;
                case "clickMacro.start":
                    await ToggleClickMacroAsync();
                    break;
                case "clickMacro.stop":
                    _clickMacro.Stop();
                    break;
                case "magic.configure":
                    ConfigureMagic(root);
                    break;
                case "magic.start":
                    await ToggleMagicAsync();
                    break;
                case "magic.stop":
                    _magic.Stop();
                    break;
                case "melee.configure":
                    ConfigureMelee(root);
                    break;
                case "melee.start":
                    await ToggleMeleeAsync();
                    break;
                case "melee.stop":
                    _melee.Stop();
                    break;
                case "afk.configure":
                    ConfigureAfk(root);
                    break;
                case "afk.start":
                    await ToggleAfkAsync();
                    break;
                case "afk.stop":
                    _afk.Stop();
                    break;
                case "automation.stopAll":
                    StopAllAutomation();
                    break;
                case "macro.send":
                    await SendMacroAsync(root.GetProperty("command").GetString() ?? "");
                    break;
            }
        }
        catch (Exception exception)
        {
            Post("nativeError", new { message = exception.Message });
        }
    }

    private void ConfigureCraft(JsonElement root)
    {
        var craft = _settings.Craft;
        if (root.TryGetProperty("safeMode", out var safeMode) &&
            safeMode.ValueKind is JsonValueKind.True or JsonValueKind.False)
        {
            craft.SafeMode = safeMode.GetBoolean();
        }
        if (root.TryGetProperty("craftHoldSeconds", out var craftHold) &&
            craftHold.TryGetInt32(out var craftHoldSeconds))
        {
            craft.CraftHoldSeconds = Math.Clamp(craftHoldSeconds, 1, 3600);
        }
        if (root.TryGetProperty("safeIndices", out var safeIndices) &&
            safeIndices.ValueKind == JsonValueKind.Array)
        {
            craft.SafeIndices = safeIndices.EnumerateArray()
                .Where(value => value.TryGetInt32(out _))
                .Select(value => value.GetInt32())
                .Where(index => index is >= 0 and < 36)
                .Distinct()
                .Order()
                .ToList();
        }
        SaveAndPostSnapshot();
    }

    private void ConfigureClickMacro(JsonElement root)
    {
        var settings = _settings.ClickMacro;
        if (root.TryGetProperty("shootDurationSeconds", out var shoot) && shoot.TryGetInt32(out var shootSeconds))
            settings.ShootDurationSeconds = Math.Clamp(shootSeconds, 1, 3600);
        if (root.TryGetProperty("shootIntervalMs", out var interval) && interval.TryGetInt32(out var intervalMs))
            settings.ShootIntervalMs = Math.Clamp(intervalMs, 20, 10000);
        if (root.TryGetProperty("clickHoldMs", out var clickHold) && clickHold.TryGetInt32(out var clickHoldMs))
            settings.ClickHoldMs = Math.Clamp(clickHoldMs, 5, 10000);
        if (root.TryGetProperty("postShootDelayMs", out var postShoot) && postShoot.TryGetInt32(out var postShootMs))
            settings.PostShootDelayMs = Math.Clamp(postShootMs, 0, 60000);
        if (root.TryGetProperty("keyToRegenDelayMs", out var keyToRegen) && keyToRegen.TryGetInt32(out var keyToRegenMs))
            settings.KeyToRegenDelayMs = Math.Clamp(keyToRegenMs, 0, 60000);
        if (root.TryGetProperty("restDurationSeconds", out var rest) && rest.TryGetInt32(out var restSeconds))
            settings.RestDurationSeconds = Math.Clamp(restSeconds, 0, 3600);
        if (root.TryGetProperty("useRestKey", out var useRestKey) &&
            useRestKey.ValueKind is JsonValueKind.True or JsonValueKind.False)
            settings.UseRestKey = useRestKey.GetBoolean();
        if (root.TryGetProperty("enabledSteps", out var enabledSteps) && enabledSteps.ValueKind == JsonValueKind.Array)
        {
            var values = enabledSteps.EnumerateArray().Take(10).ToArray();
            for (var index = 0; index < values.Length && index < settings.Steps.Count; index++)
            {
                if (values[index].ValueKind is JsonValueKind.True or JsonValueKind.False)
                    settings.Steps[index].Enabled = values[index].GetBoolean();
            }
        }
        SaveAndPostSnapshot();
    }

    private void ConfigureMagic(JsonElement root)
    {
        var settings = _settings.Magic;
        if (root.TryGetProperty("pressIntervalMs", out var interval) && interval.TryGetInt32(out var intervalMs))
            settings.PressIntervalMs = Math.Clamp(intervalMs, 20, 600000);
        if (root.TryGetProperty("pressHoldMs", out var hold) && hold.TryGetInt32(out var holdMs))
            settings.PressHoldMs = Math.Clamp(holdMs, 5, 10000);
        if (root.TryGetProperty("pressesPerBatch", out var presses) && presses.TryGetInt32(out var pressCount))
            settings.PressesPerBatch = Math.Clamp(pressCount, 1, 10000);
        if (root.TryGetProperty("batchRestMs", out var rest) && rest.TryGetInt32(out var restMs))
            settings.BatchRestMs = Math.Clamp(restMs, 0, 3600000);
        if (root.TryGetProperty("useRecoveryKey", out var useRecoveryKey) &&
            useRecoveryKey.ValueKind is JsonValueKind.True or JsonValueKind.False)
            settings.UseRecoveryKey = useRecoveryKey.GetBoolean();
        SaveAndPostSnapshot();
    }

    private void ConfigureMelee(JsonElement root)
    {
        var settings = _settings.Melee;
        if (root.TryGetProperty("clickHoldMs", out var hold) && hold.TryGetInt32(out var holdMs))
            settings.ClickHoldMs = Math.Clamp(holdMs, 0, 10000);
        if (root.TryGetProperty("clickIntervalMs", out var interval) && interval.TryGetInt32(out var intervalMs))
            settings.ClickIntervalMs = Math.Clamp(intervalMs, 20, 600000);
        if (root.TryGetProperty("attackDurationSeconds", out var attack) && attack.TryGetInt32(out var attackSeconds))
            settings.AttackDurationSeconds = Math.Clamp(attackSeconds, 1, 3600);
        if (root.TryGetProperty("restDurationSeconds", out var rest) && rest.TryGetInt32(out var restSeconds))
            settings.RestDurationSeconds = Math.Clamp(restSeconds, 0, 3600);
        if (root.TryGetProperty("useRestCycle", out var useRest) &&
            useRest.ValueKind is JsonValueKind.True or JsonValueKind.False)
            settings.UseRestCycle = useRest.GetBoolean();
        SaveAndPostSnapshot();
    }

    private void ConfigureAfk(JsonElement root)
    {
        var settings = _settings.Afk;
        if (root.TryGetProperty("delayBetweenKeysMs", out var delay) && delay.TryGetInt32(out var delayMs))
            settings.DelayBetweenKeysMs = Math.Clamp(delayMs, 0, 600000);
        if (root.TryGetProperty("repeatIntervalSeconds", out var repeat) && repeat.TryGetInt32(out var repeatSeconds))
            settings.RepeatIntervalSeconds = Math.Clamp(repeatSeconds, 1, 86400);
        SaveAndPostSnapshot();
    }

    private void ClearHotkey(string action)
    {
        if (action.Equals("magicAction", StringComparison.OrdinalIgnoreCase))
        {
            _settings.Magic.ActionKey = new HotkeyBinding();
            SaveAndPostSnapshot();
            return;
        }
        if (action.Equals("magicRecovery", StringComparison.OrdinalIgnoreCase))
        {
            _settings.Magic.RecoveryKey = new HotkeyBinding();
            _settings.Magic.UseRecoveryKey = false;
            SaveAndPostSnapshot();
            return;
        }
        if (action.Equals("clickMacroRegen", StringComparison.OrdinalIgnoreCase))
        {
            _settings.ClickMacro.RegenKey = new HotkeyBinding();
            SaveAndPostSnapshot();
            return;
        }
        if (action.Equals("meleeRest", StringComparison.OrdinalIgnoreCase))
        {
            _settings.Melee.RestKey = new HotkeyBinding();
            _settings.Melee.UseRestCycle = false;
            SaveAndPostSnapshot();
            return;
        }
        if (action.Equals("afkFirst", StringComparison.OrdinalIgnoreCase))
        {
            _settings.Afk.FirstKey = new HotkeyBinding();
            SaveAndPostSnapshot();
            return;
        }
        if (action.Equals("afkSecond", StringComparison.OrdinalIgnoreCase))
        {
            _settings.Afk.SecondKey = new HotkeyBinding();
            SaveAndPostSnapshot();
            return;
        }
        if (TryParseClickMacroStepAction(action, out var stepIndex))
        {
            _settings.ClickMacro.Steps[stepIndex].Key = new HotkeyBinding();
            SaveAndPostSnapshot();
            return;
        }
        if (_settings.Hotkeys.TryGetValue(action, out var binding))
        {
            binding.VirtualKey = 0;
            binding.Modifiers = 0;
            binding.Display = "Not set";
            _hotkeys.RefreshBindings();
            SaveAndPostSnapshot();
        }
    }

    private void HotkeyCaptured(string action, HotkeyBinding binding)
    {
        if (action.Equals("magicAction", StringComparison.OrdinalIgnoreCase))
        {
            _settings.Magic.ActionKey = binding;
            SaveAndPostSnapshot();
            Post("hotkeyCaptured", new { action, binding });
            return;
        }
        if (action.Equals("magicRecovery", StringComparison.OrdinalIgnoreCase))
        {
            _settings.Magic.RecoveryKey = binding;
            _settings.Magic.UseRecoveryKey = true;
            SaveAndPostSnapshot();
            Post("hotkeyCaptured", new { action, binding });
            return;
        }
        if (action.Equals("clickMacroRegen", StringComparison.OrdinalIgnoreCase))
        {
            _settings.ClickMacro.RegenKey = binding;
            SaveAndPostSnapshot();
            Post("hotkeyCaptured", new { action, binding });
            return;
        }
        if (action.Equals("meleeRest", StringComparison.OrdinalIgnoreCase))
        {
            _settings.Melee.RestKey = binding;
            _settings.Melee.UseRestCycle = true;
            SaveAndPostSnapshot();
            Post("hotkeyCaptured", new { action, binding });
            return;
        }
        if (action.Equals("afkFirst", StringComparison.OrdinalIgnoreCase))
        {
            _settings.Afk.FirstKey = binding;
            SaveAndPostSnapshot();
            Post("hotkeyCaptured", new { action, binding });
            return;
        }
        if (action.Equals("afkSecond", StringComparison.OrdinalIgnoreCase))
        {
            _settings.Afk.SecondKey = binding;
            SaveAndPostSnapshot();
            Post("hotkeyCaptured", new { action, binding });
            return;
        }
        if (TryParseClickMacroStepAction(action, out var stepIndex))
        {
            _settings.ClickMacro.Steps[stepIndex].Key = binding;
            SaveAndPostSnapshot();
            Post("hotkeyCaptured", new { action, binding });
            return;
        }

        var duplicate = _settings.Hotkeys
            .FirstOrDefault(pair =>
                !pair.Key.Equals(action, StringComparison.OrdinalIgnoreCase) &&
                pair.Value.VirtualKey == binding.VirtualKey &&
                pair.Value.Modifiers == binding.Modifiers &&
                binding.VirtualKey > 0);
        if (!string.IsNullOrEmpty(duplicate.Key))
        {
            Post("hotkeyRejected", new
            {
                action,
                message = $"{binding.Display} is already assigned to {duplicate.Key}.",
            });
            return;
        }

        _settings.Hotkeys[action] = binding;
        _hotkeys.RefreshBindings();
        SaveAndPostSnapshot();
        Post("hotkeyCaptured", new { action, binding });
    }

    private void HotkeyTriggered(string action)
    {
        if (!_settings.MacrosEnabled && IsMacroHotkey(action))
        {
            ReportMacrosDisabled();
            return;
        }
        switch (action)
        {
            case "craftToggle":
                if (!_craftSafetyArmed)
                {
                    ReportCraftSafetyBlocked();
                    break;
                }
                _craft.ToggleCycle(_settings.Craft);
                break;
            case "craftStop":
                _craft.StopCycle();
                break;
            case "loot":
                _ = SendMacroAsync("/loot", _settings.Hotkeys.GetValueOrDefault("loot"));
                break;
            case "bank":
                _ = SendMacroAsync("/bank", _settings.Hotkeys.GetValueOrDefault("bank"));
                break;
            case "overlayToggle":
                _owner.ToggleSecondScreenVisibility();
                break;
            case "clickMacroToggle":
                _ = ToggleClickMacroAsync();
                break;
            case "magicToggle":
                _ = ToggleMagicAsync();
                break;
            case "meleeToggle":
                _ = ToggleMeleeAsync();
                break;
            case "afkToggle":
                _ = ToggleAfkAsync();
                break;
            case "emergencyStop":
                StopAllAutomation();
                break;
        }
    }

    private void SetCraftSafety(bool armed)
    {
        _craftSafetyArmed = armed;
        if (!armed)
        {
            _craft.StopCycle();
            _craft.StopRepeat();
        }

        Post("craftStatus", new
        {
            phase = armed ? "ARMED" : "SAFE",
            message = armed
                ? "Craft & Click is armed. Start controls and the craft hotkey are enabled."
                : "Craft & Click is disabled. Inventory automation cannot start.",
            running = _craft.IsRunning,
            paused = _craft.IsPaused,
            repeating = _craft.IsRepeating,
        });
        PostSnapshot();
    }

    private void SetMacrosEnabled(bool enabled)
    {
        _settings.MacrosEnabled = enabled;
        if (!enabled)
        {
            _craftSafetyArmed = false;
            StopAllAutomation();
        }
        _hotkeys.RefreshBindings();
        SaveAndPostSnapshot();
        Post("macrosState", new
        {
            enabled,
            message = enabled
                ? "Macros enabled. Only bindings you assign can run."
                : "Macros disabled. All automation has been stopped.",
        });
    }

    private void ReportMacrosDisabled()
    {
        Post("macrosDisabled", new
        {
            message = "Macros are disabled. Turn on the master switch in the Macros section first."
        });
    }

    private void ReportCraftSafetyBlocked()
    {
        Post("craftSafetyBlocked", new
        {
            message = "Craft & Click is disabled. Turn on the large safety switch before starting."
        });
        Post("craftStatus", new
        {
            phase = "SAFE",
            message = "Start blocked: Craft & Click safety is OFF.",
            running = false,
            paused = false,
            repeating = false,
        });
    }

    private async Task ToggleClickMacroAsync()
    {
        if (_clickMacro.IsRunning)
        {
            _clickMacro.Toggle(_settings.ClickMacro, IntPtr.Zero);
            return;
        }

        var trigger = _settings.Hotkeys.GetValueOrDefault("clickMacroToggle");
        if (trigger?.VirtualKey > 0)
        {
            var releaseDeadline = DateTime.UtcNow.AddSeconds(2);
            while (
                (NativeInput.IsDown(trigger.VirtualKey) ||
                 (NativeInput.ReadModifiers() & trigger.Modifiers) != 0) &&
                DateTime.UtcNow < releaseDeadline)
            {
                await Task.Delay(12);
            }
        }

        _clickMacro.Toggle(_settings.ClickMacro, IntPtr.Zero);
    }

    private async Task ToggleMagicAsync()
    {
        if (_magic.IsRunning)
        {
            _magic.Stop();
            return;
        }

        var trigger = _settings.Hotkeys.GetValueOrDefault("magicToggle");
        if (trigger?.VirtualKey > 0)
        {
            var releaseDeadline = DateTime.UtcNow.AddSeconds(2);
            while (
                (NativeInput.IsDown(trigger.VirtualKey) ||
                 (NativeInput.ReadModifiers() & trigger.Modifiers) != 0) &&
                DateTime.UtcNow < releaseDeadline)
            {
                await Task.Delay(12);
            }
        }

        _magic.Toggle(_settings.Magic, IntPtr.Zero);
    }

    private async Task ToggleMeleeAsync()
    {
        if (!_melee.IsRunning) await WaitForHotkeyReleaseAsync("meleeToggle");
        _melee.Toggle(_settings.Melee);
    }

    private async Task ToggleAfkAsync()
    {
        if (!_afk.IsRunning) await WaitForHotkeyReleaseAsync("afkToggle");
        _afk.Toggle(_settings.Afk);
    }

    private async Task WaitForHotkeyReleaseAsync(string action)
    {
        var trigger = _settings.Hotkeys.GetValueOrDefault(action);
        if (trigger is null || trigger.VirtualKey <= 0) return;
        var releaseDeadline = DateTime.UtcNow.AddSeconds(2);
        while (
            (NativeInput.IsDown(trigger.VirtualKey) ||
             (NativeInput.ReadModifiers() & trigger.Modifiers) != 0) &&
            DateTime.UtcNow < releaseDeadline)
        {
            await Task.Delay(12);
        }
    }

    private void StopAllAutomation()
    {
        _craft.StopCycle();
        _craft.StopRepeat();
        _clickMacro.Stop();
        _magic.Stop();
        _melee.Stop();
        _afk.Stop();
        _macroCancellation?.Cancel();
        NativeInput.MouseUp();
        Post("automationStopped", new { message = "All automation stopped." });
    }

    private static bool TryParseClickMacroStepAction(string action, out int stepIndex)
    {
        const string prefix = "clickMacroStep";
        stepIndex = -1;
        return action.StartsWith(prefix, StringComparison.OrdinalIgnoreCase) &&
            int.TryParse(action[prefix.Length..], out stepIndex) &&
            stepIndex is >= 0 and < 10;
    }

    private Task CapturePointAsync(string target)
    {
        CancelCapture();
        Post("captureStatus", new { active = true, target, message = "Click the target position." });
        try
        {
            _owner.WindowState = FormWindowState.Minimized;
            using var capture = new ScreenPointCaptureForm(CaptureTargetLabel(target));
            if (capture.ShowDialog() != DialogResult.OK || capture.SelectedPoint is not Point point)
            {
                RestoreAfterCapture();
                Post("captureStatus", new
                {
                    active = false,
                    target,
                    message = "Coordinate capture cancelled.",
                });
                return Task.CompletedTask;
            }

            var setting = new ScreenPointSetting { X = point.X, Y = point.Y };
            switch (target)
            {
                case "craftButton":
                    _settings.Craft.CraftButton = setting;
                    break;
                case "deletePosition":
                    _settings.Craft.DeletePosition = setting;
                    break;
                case "yesButton":
                    _settings.Craft.YesButton = setting;
                    break;
                default:
                    throw new InvalidOperationException("Unknown capture target.");
            }
            ToolSettingsStore.Save(_settings);
            RestoreAfterCapture();
            Post("captureStatus", new { active = false, target, message = $"Saved ({point.X}, {point.Y})." });
            PostSnapshot();
        }
        catch (Exception exception)
        {
            RestoreAfterCapture();
            Post("nativeError", new { message = exception.Message });
        }
        return Task.CompletedTask;
    }

    private static string CaptureTargetLabel(string target) => target switch
    {
        "craftButton" => "CRAFT BUTTON",
        "deletePosition" => "DELETE DROP POSITION",
        "yesButton" => "YES CONFIRMATION BUTTON",
        _ => "TARGET POSITION",
    };

    private Task CaptureGridAsync()
    {
        CancelCapture();
        Post("captureStatus", new
        {
            active = true,
            target = "inventoryGrid",
            message = "Move and resize the 6 x 6 overlay, then click every protected cell.",
        });
        try
        {
            _owner.WindowState = FormWindowState.Minimized;
            using var calibration = new InventoryGridCalibrationForm(_settings.Craft);
            if (calibration.ShowDialog() != DialogResult.OK || calibration.GridBounds is null)
            {
                RestoreAfterCapture();
                Post("captureStatus", new
                {
                    active = false,
                    target = "inventoryGrid",
                    message = "Grid calibration cancelled.",
                });
                return Task.CompletedTask;
            }

            var rectangle = calibration.GridBounds;
            _settings.Craft.InventoryGrid = rectangle;
            _settings.Craft.SafeIndices = calibration.SafeIndices.ToList();
            _settings.Craft.TargetProcessId = NativeInput.ProcessIdAtPoint(
                rectangle.Left + rectangle.Width / 2,
                rectangle.Top + rectangle.Height / 2);
            ToolSettingsStore.Save(_settings);
            RestoreAfterCapture();
            Post("captureStatus", new
            {
                active = false,
                target = "inventoryGrid",
                message = $"Grid saved: {rectangle.Width} x {rectangle.Height}, PID {_settings.Craft.TargetProcessId}.",
            });
            PostSnapshot();
        }
        catch (Exception exception)
        {
            RestoreAfterCapture();
            Post("nativeError", new { message = exception.Message });
        }
        return Task.CompletedTask;
    }

    private async Task SendMacroAsync(string command, HotkeyBinding? trigger = null)
    {
        if (command is not "/loot" and not "/bank")
        {
            return;
        }
        _macroCancellation?.Cancel();
        _macroCancellation?.Dispose();
        _macroCancellation = new CancellationTokenSource();
        try
        {
            var cancellationToken = _macroCancellation.Token;
            var targetWindow = NativeInput.ForegroundWindowHandle();
            if (NativeInput.ProcessIdForWindow(targetWindow) == Environment.ProcessId)
            {
                MinimizeForAutomation();
                await Task.Delay(220, cancellationToken);
                targetWindow = NativeInput.ForegroundWindowHandle();
            }

            if (trigger?.VirtualKey > 0)
            {
                var releaseDeadline = DateTime.UtcNow.AddSeconds(2);
                while (
                    (NativeInput.IsDown(trigger.VirtualKey) ||
                     (NativeInput.ReadModifiers() & trigger.Modifiers) != 0) &&
                    DateTime.UtcNow < releaseDeadline)
                {
                    await Task.Delay(12, cancellationToken);
                }
                await Task.Delay(35, cancellationToken);
            }

            await NativeInput.SendChatCommandAsync(command, targetWindow, cancellationToken);
            Post("macroStatus", new { command, message = $"{command} sent." });
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception exception)
        {
            Post("nativeError", new
            {
                message = $"{command} could not be sent: {exception.Message}",
            });
        }
    }

    private void CancelCapture()
    {
        _captureCancellation?.Cancel();
        _captureCancellation?.Dispose();
        _captureCancellation = null;
    }

    private void MinimizeForAutomation()
    {
        if (_owner.IsHandleCreated)
        {
            _owner.BeginInvoke(() => _owner.WindowState = FormWindowState.Minimized);
        }
    }

    private void RestoreAfterCapture()
    {
        if (_owner.IsHandleCreated)
        {
            _owner.BeginInvoke(_owner.RestoreAfterNativeCapture);
        }
    }

    private void SaveAndPostSnapshot()
    {
        ToolSettingsStore.Save(_settings);
        PostSnapshot();
    }

    private static bool IsMacroHotkey(string action) => action is
        "craftToggle" or "loot" or "bank" or "clickMacroToggle" or
        "magicToggle" or "meleeToggle" or "afkToggle";

    private static bool IsMacroExecutionCommand(string type) => type is
        "craft.start" or "clickMacro.start" or "magic.start" or "melee.start" or
        "afk.start" or "macro.send";

    private static string NormalizeMapContinent(string? continent) =>
        string.Equals(continent, "myrland", StringComparison.OrdinalIgnoreCase)
            ? "myrland"
            : "sarducaa";

    private static string ReadString(JsonElement root, string propertyName, int limit, string fallback)
    {
        if (!root.TryGetProperty(propertyName, out var value) || value.ValueKind is not JsonValueKind.String)
        {
            return fallback;
        }

        var result = (value.GetString() ?? "").Trim();
        return result.Length == 0 ? fallback : result[..Math.Min(result.Length, limit)];
    }

    private static List<string> ReadStringArray(JsonElement root, string propertyName, int limit)
    {
        if (!root.TryGetProperty(propertyName, out var values) || values.ValueKind is not JsonValueKind.Array)
        {
            return [];
        }

        return values.EnumerateArray()
            .Where(value => value.ValueKind is JsonValueKind.String)
            .Select(value => (value.GetString() ?? "").Trim())
            .Where(value => value.Length is > 0 and <= 120)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Take(limit)
            .ToList();
    }

    private void PostSnapshot()
    {
        Post("toolsSnapshot", new
        {
            entitlement = new { tier = "open-source", premium = true },
            settings = _settings,
            craft = new
            {
                running = _craft.IsRunning,
                paused = _craft.IsPaused,
                repeating = _craft.IsRepeating,
                safetyArmed = _craftSafetyArmed,
            },
            clickMacro = new
            {
                running = _clickMacro.IsRunning,
                paused = _clickMacro.IsPaused,
                stepIndex = _clickMacro.StepIndex,
            },
            magic = new
            {
                running = _magic.IsRunning,
                paused = _magic.IsPaused,
                pressIndex = _magic.PressIndex,
            },
            melee = new
            {
                running = _melee.IsRunning,
            },
            afk = new
            {
                running = _afk.IsRunning,
            },
        });
    }

    private void PostWindowState()
    {
        var displaySize = _owner.ActiveDisplaySize;
        Post("windowState", new
        {
            enabled = _owner.SecondScreenModeEnabled,
            visible = _owner.SecondScreenVisible,
            opacityPercent = _owner.WindowOpacityPercent,
            scalePercent = _owner.ApplicationScalePercent,
            automaticScale = _settings.AutomaticScale,
            resolution = _settings.SecondScreenResolution,
            screenWidth = displaySize.Width,
            screenHeight = displaySize.Height,
        });
    }

    private void Post(string type, object payload)
    {
        if (_disposed || _browser.IsDisposed || !_browser.IsHandleCreated)
        {
            return;
        }

        try
        {
            _browser.BeginInvoke(new Action(() =>
            {
                if (_disposed || _browser.IsDisposed || _browser.CoreWebView2 is null) return;
                var json = JsonSerializer.Serialize(new { type, payload }, WebMessageJsonOptions);
                _browser.CoreWebView2.PostWebMessageAsJson(json);
            }));
        }
        catch (InvalidOperationException)
        {
            // The form can close between the handle check and BeginInvoke.
        }
    }

    public void Dispose()
    {
        _disposed = true;
        CancelCapture();
        _macroCancellation?.Cancel();
        _macroCancellation?.Dispose();
        _hotkeys.Dispose();
        _craft.Dispose();
        _clickMacro.Dispose();
        _magic.Dispose();
        _melee.Dispose();
        _afk.Dispose();
        _updates.Dispose();
    }
}
