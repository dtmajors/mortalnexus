using System.Text.Json;
using System.Text.Json.Serialization;

namespace MortalNexusDesktop;

internal sealed class HotkeyBinding
{
    public int VirtualKey { get; set; }
    public int Modifiers { get; set; }
    public string Display { get; set; } = "Not set";

    public HotkeyBinding Clone() => new()
    {
        VirtualKey = VirtualKey,
        Modifiers = Modifiers,
        Display = Display,
    };
}

internal sealed class ScreenPointSetting
{
    public int X { get; set; }
    public int Y { get; set; }
}

internal sealed class ScreenRectangleSetting
{
    public int Left { get; set; }
    public int Top { get; set; }
    public int Right { get; set; }
    public int Bottom { get; set; }

    [JsonIgnore]
    public int Width => Math.Max(0, Right - Left);

    [JsonIgnore]
    public int Height => Math.Max(0, Bottom - Top);
}

internal sealed class CraftSettings
{
    public ScreenPointSetting? CraftButton { get; set; }
    public ScreenPointSetting? DeletePosition { get; set; }
    public ScreenPointSetting? YesButton { get; set; }
    public ScreenRectangleSetting? InventoryGrid { get; set; }
    public List<int> SafeIndices { get; set; } = [];
    public int TargetProcessId { get; set; }
    public bool SafeMode { get; set; } = true;
    public int CraftHoldSeconds { get; set; } = 63;
    public int RepeatHoldMs { get; set; } = 110;
    public int RepeatGapMs { get; set; } = 15;
}

internal sealed class ClickMacroStep
{
    public bool Enabled { get; set; } = true;
    public HotkeyBinding Key { get; set; } = new();

    public ClickMacroStep Clone() => new()
    {
        Enabled = Enabled,
        Key = Key.Clone(),
    };
}

internal sealed class ClickMacroSettings
{
    public int SchemaVersion { get; set; }
    public int ShootDurationSeconds { get; set; } = 45;
    public int ShootIntervalMs { get; set; } = 200;
    public int ClickHoldMs { get; set; } = 30;
    public int PostShootDelayMs { get; set; }
    public int KeyToRegenDelayMs { get; set; }
    public int RestDurationSeconds { get; set; } = 27;
    public bool UseRestKey { get; set; }
    public HotkeyBinding RegenKey { get; set; } = new();
    public List<ClickMacroStep> Steps { get; set; } = DefaultSteps();

    public ClickMacroSettings Clone() => new()
    {
        SchemaVersion = SchemaVersion,
        ShootDurationSeconds = ShootDurationSeconds,
        ShootIntervalMs = ShootIntervalMs,
        ClickHoldMs = ClickHoldMs,
        PostShootDelayMs = PostShootDelayMs,
        KeyToRegenDelayMs = KeyToRegenDelayMs,
        RestDurationSeconds = RestDurationSeconds,
        UseRestKey = UseRestKey,
        RegenKey = RegenKey.Clone(),
        Steps = Steps.Select(step => step.Clone()).ToList(),
    };

    public static List<ClickMacroStep> DefaultSteps() =>
        Enumerable.Range(1, 10)
            .Select(_ => new ClickMacroStep())
            .ToList();
}

internal sealed class MagicSettings
{
    public int PressIntervalMs { get; set; } = 1000;
    public int PressHoldMs { get; set; } = 30;
    public int PressesPerBatch { get; set; } = 10;
    public int BatchRestMs { get; set; } = 5000;
    public bool UseRecoveryKey { get; set; }
    public HotkeyBinding ActionKey { get; set; } = new();
    public HotkeyBinding RecoveryKey { get; set; } = new();

    public MagicSettings Clone() => new()
    {
        PressIntervalMs = PressIntervalMs,
        PressHoldMs = PressHoldMs,
        PressesPerBatch = PressesPerBatch,
        BatchRestMs = BatchRestMs,
        UseRecoveryKey = UseRecoveryKey,
        ActionKey = ActionKey.Clone(),
        RecoveryKey = RecoveryKey.Clone(),
    };
}

internal sealed class MeleeSettings
{
    public int ClickHoldMs { get; set; } = 30;
    public int ClickIntervalMs { get; set; } = 250;
    public int AttackDurationSeconds { get; set; } = 30;
    public int RestDurationSeconds { get; set; } = 10;
    public bool UseRestCycle { get; set; }
    public HotkeyBinding RestKey { get; set; } = new();

    public MeleeSettings Clone() => new()
    {
        ClickHoldMs = ClickHoldMs,
        ClickIntervalMs = ClickIntervalMs,
        AttackDurationSeconds = AttackDurationSeconds,
        RestDurationSeconds = RestDurationSeconds,
        UseRestCycle = UseRestCycle,
        RestKey = RestKey.Clone(),
    };
}

internal sealed class AfkSettings
{
    public int DelayBetweenKeysMs { get; set; } = 50;
    public int RepeatIntervalSeconds { get; set; } = 60;
    public HotkeyBinding FirstKey { get; set; } = new();
    public HotkeyBinding SecondKey { get; set; } = new();

    public AfkSettings Clone() => new()
    {
        DelayBetweenKeysMs = DelayBetweenKeysMs,
        RepeatIntervalSeconds = RepeatIntervalSeconds,
        FirstKey = FirstKey.Clone(),
        SecondKey = SecondKey.Clone(),
    };
}

internal sealed class MapFilterSettings
{
    public bool Initialized { get; set; }
    public string SearchText { get; set; } = "";
    public bool ShowNames { get; set; }
    public List<string> HiddenCategories { get; set; } = [];
    public List<string> HiddenResources { get; set; } = [];

    public void Normalize()
    {
        SearchText = (SearchText ?? "").Trim();
        if (SearchText.Length > 200)
        {
            SearchText = SearchText[..200];
        }

        HiddenCategories = NormalizeValues(HiddenCategories, 128);
        HiddenResources = NormalizeValues(HiddenResources, 1024);
    }

    private static List<string> NormalizeValues(List<string>? values, int limit) =>
        (values ?? [])
            .Select(value => (value ?? "").Trim().ToLowerInvariant())
            .Where(value => value.Length is > 0 and <= 120)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Order(StringComparer.OrdinalIgnoreCase)
            .Take(limit)
            .ToList();
}

internal sealed class ToolSettings
{
    public int SchemaVersion { get; set; }
    public bool MacrosEnabled { get; set; }
    public bool HotkeysEnabled { get; set; } = true;
    public bool AutomaticScale { get; set; } = true;
    public string SecondScreenResolution { get; set; } = "fill";
    public int WindowOpacityPercent { get; set; } = 100;
    public int ApplicationScalePercent { get; set; } = 100;
    public string GatherMaterial { get; set; } = "Whitewood";
    public int GatherDurationSeconds { get; set; } = 180;
    public CraftSettings Craft { get; set; } = new();
    public ClickMacroSettings ClickMacro { get; set; } = new();
    public MagicSettings Magic { get; set; } = new();
    public MeleeSettings Melee { get; set; } = new();
    public AfkSettings Afk { get; set; } = new();
    public Dictionary<string, MapFilterSettings> MapFilters { get; set; } =
        new(StringComparer.OrdinalIgnoreCase);
    public Dictionary<string, HotkeyBinding> Hotkeys { get; set; } =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["craftToggle"] = new(),
            ["craftStop"] = new(),
            ["loot"] = new() { VirtualKey = 0, Display = "Not set" },
            ["bank"] = new() { VirtualKey = 0, Display = "Not set" },
            ["overlayToggle"] = new() { VirtualKey = 0, Display = "Not set" },
            ["clickMacroToggle"] = new(),
            ["magicToggle"] = new() { VirtualKey = 0, Display = "Not set" },
            ["meleeToggle"] = new() { VirtualKey = 0, Display = "Not set" },
            ["afkToggle"] = new() { VirtualKey = 0, Display = "Not set" },
            ["emergencyStop"] = new(),
        };

    public void Normalize()
    {
        Hotkeys ??= new Dictionary<string, HotkeyBinding>(StringComparer.OrdinalIgnoreCase);
        ClickMacro ??= new ClickMacroSettings();
        Magic ??= new MagicSettings();
        Melee ??= new MeleeSettings();
        Afk ??= new AfkSettings();
        if (SchemaVersion < 1)
        {
            MacrosEnabled = false;
            ClearMacroBindings();
            SchemaVersion = 1;
        }

        SecondScreenResolution = MainForm.NormalizeSecondScreenResolution(SecondScreenResolution);
        WindowOpacityPercent = Math.Clamp(WindowOpacityPercent, 20, 100);
        ApplicationScalePercent = Math.Clamp(ApplicationScalePercent, 60, 150);
        GatherDurationSeconds = Math.Clamp(GatherDurationSeconds, 0, 359999);
        MapFilters ??= new Dictionary<string, MapFilterSettings>(StringComparer.OrdinalIgnoreCase);
        var normalizedMapFilters = new Dictionary<string, MapFilterSettings>(StringComparer.OrdinalIgnoreCase);
        foreach (var continent in new[] { "sarducaa", "myrland" })
        {
            var filter = MapFilters.GetValueOrDefault(continent) ?? new MapFilterSettings();
            filter.Normalize();
            normalizedMapFilters[continent] = filter;
        }
        MapFilters = normalizedMapFilters;

        Craft.CraftHoldSeconds = Math.Clamp(Craft.CraftHoldSeconds, 1, 3600);
        Craft.RepeatHoldMs = Math.Clamp(Craft.RepeatHoldMs, 1, 3_600_000);
        Craft.RepeatGapMs = Math.Clamp(Craft.RepeatGapMs, 0, 3_600_000);
        Craft.SafeIndices = Craft.SafeIndices
            .Where(index => index is >= 0 and < 36)
            .Distinct()
            .Order()
            .Take(35)
            .ToList();

        if (ClickMacro.SchemaVersion < 3)
        {
            ClickMacro.SchemaVersion = 3;
            ClickMacro.ShootIntervalMs = 200;
            ClickMacro.ClickHoldMs = 30;
            ClickMacro.PostShootDelayMs = 0;
            ClickMacro.KeyToRegenDelayMs = 0;
            ClickMacro.UseRestKey = false;
        }
        ClickMacro.ShootDurationSeconds = Math.Clamp(ClickMacro.ShootDurationSeconds, 1, 3600);
        ClickMacro.ShootIntervalMs = Math.Clamp(ClickMacro.ShootIntervalMs, 20, 10000);
        ClickMacro.ClickHoldMs = Math.Clamp(ClickMacro.ClickHoldMs, 5, 10000);
        ClickMacro.PostShootDelayMs = Math.Clamp(ClickMacro.PostShootDelayMs, 0, 60000);
        ClickMacro.KeyToRegenDelayMs = Math.Clamp(ClickMacro.KeyToRegenDelayMs, 0, 60000);
        ClickMacro.RestDurationSeconds = Math.Clamp(ClickMacro.RestDurationSeconds, 0, 3600);
        ClickMacro.RegenKey ??= new HotkeyBinding();
        ClickMacro.RegenKey.Display = NativeInput.FormatBinding(
            ClickMacro.RegenKey.VirtualKey,
            ClickMacro.RegenKey.Modifiers);
        ClickMacro.Steps ??= [];
        var defaultSteps = ClickMacroSettings.DefaultSteps();
        ClickMacro.Steps = ClickMacro.Steps
            .Where(step => step is not null)
            .Take(10)
            .ToList();
        while (ClickMacro.Steps.Count < 10)
        {
            ClickMacro.Steps.Add(defaultSteps[ClickMacro.Steps.Count]);
        }
        foreach (var step in ClickMacro.Steps)
        {
            step.Key ??= new HotkeyBinding();
            step.Key.Display = NativeInput.FormatBinding(step.Key.VirtualKey, step.Key.Modifiers);
        }


        Magic.PressIntervalMs = Math.Clamp(Magic.PressIntervalMs, 20, 600000);
        Magic.PressHoldMs = Math.Clamp(Magic.PressHoldMs <= 0 ? 30 : Magic.PressHoldMs, 5, 10000);
        Magic.PressesPerBatch = Math.Clamp(Magic.PressesPerBatch, 1, 10000);
        Magic.BatchRestMs = Math.Clamp(Magic.BatchRestMs, 0, 3600000);
        Magic.ActionKey ??= new HotkeyBinding();
        Magic.ActionKey.Display = NativeInput.FormatBinding(
            Magic.ActionKey.VirtualKey,
            Magic.ActionKey.Modifiers);
        Magic.RecoveryKey ??= new HotkeyBinding();
        Magic.RecoveryKey.Display = NativeInput.FormatBinding(
            Magic.RecoveryKey.VirtualKey,
            Magic.RecoveryKey.Modifiers);

        Melee.ClickHoldMs = Math.Clamp(Melee.ClickHoldMs, 0, 10000);
        Melee.ClickIntervalMs = Math.Clamp(Melee.ClickIntervalMs, 20, 600000);
        Melee.AttackDurationSeconds = Math.Clamp(Melee.AttackDurationSeconds, 1, 3600);
        Melee.RestDurationSeconds = Math.Clamp(Melee.RestDurationSeconds, 0, 3600);
        Melee.RestKey ??= new HotkeyBinding();
        Melee.RestKey.Display = NativeInput.FormatBinding(
            Melee.RestKey.VirtualKey,
            Melee.RestKey.Modifiers);

        Afk.DelayBetweenKeysMs = Math.Clamp(Afk.DelayBetweenKeysMs, 0, 600000);
        Afk.RepeatIntervalSeconds = Math.Clamp(Afk.RepeatIntervalSeconds, 1, 86400);
        Afk.FirstKey ??= new HotkeyBinding();
        Afk.FirstKey.Display = NativeInput.FormatBinding(
            Afk.FirstKey.VirtualKey,
            Afk.FirstKey.Modifiers);
        Afk.SecondKey ??= new HotkeyBinding();
        Afk.SecondKey.Display = NativeInput.FormatBinding(
            Afk.SecondKey.VirtualKey,
            Afk.SecondKey.Modifiers);

        var defaults = new ToolSettings().Hotkeys;
        foreach (var (action, binding) in defaults)
        {
            if (!Hotkeys.TryGetValue(action, out var current))
            {
                Hotkeys[action] = binding.Clone();
            }
            else
            {
                current.Display = NativeInput.FormatBinding(current.VirtualKey, current.Modifiers);
            }
        }
    }

    private void ClearMacroBindings()
    {
        foreach (var action in new[]
        {
            "craftToggle", "craftStop", "loot", "bank", "clickMacroToggle",
            "magicToggle", "meleeToggle", "afkToggle", "emergencyStop",
        })
        {
            Hotkeys[action] = new HotkeyBinding();
        }

        ClickMacro.RegenKey = new HotkeyBinding();
        ClickMacro.UseRestKey = false;
        foreach (var step in ClickMacro.Steps ?? [])
        {
            step.Key = new HotkeyBinding();
        }
        Magic.ActionKey = new HotkeyBinding();
        Magic.RecoveryKey = new HotkeyBinding();
        Magic.UseRecoveryKey = false;
        Melee.RestKey = new HotkeyBinding();
        Melee.UseRestCycle = false;
        Afk.FirstKey = new HotkeyBinding();
        Afk.SecondKey = new HotkeyBinding();
    }
}

internal static class ToolSettingsStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    public static string SettingsDirectory =>
        Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Mortal Nexus");

    public static string SettingsPath => Path.Combine(SettingsDirectory, "tools.json");

    public static ToolSettings Load()
    {
        try
        {
            if (File.Exists(SettingsPath))
            {
                var loaded = JsonSerializer.Deserialize<ToolSettings>(
                    File.ReadAllText(SettingsPath),
                    JsonOptions);
                if (loaded is not null)
                {
                    loaded.Normalize();
                    return loaded;
                }
            }

            var migrated = TryLoadLegacyCraftSettings();
            migrated.Normalize();
            Save(migrated);
            return migrated;
        }
        catch
        {
            var fallback = new ToolSettings();
            fallback.Normalize();
            return fallback;
        }
    }

    public static void Save(ToolSettings settings)
    {
        settings.Normalize();
        Directory.CreateDirectory(SettingsDirectory);
        File.WriteAllText(SettingsPath, JsonSerializer.Serialize(settings, JsonOptions));
    }

    private static ToolSettings TryLoadLegacyCraftSettings()
    {
        var result = new ToolSettings();
        var legacyPath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            "Downloads",
            "Marshal Craft N Click",
            "marshal_craft_n_click_config.json");
        if (!File.Exists(legacyPath))
        {
            return result;
        }

        using var document = JsonDocument.Parse(File.ReadAllText(legacyPath));
        var root = document.RootElement;
        result.Craft.CraftButton = ReadPoint(root, "craft_button");
        result.Craft.DeletePosition = ReadPoint(root, "delete_position");
        result.Craft.YesButton = ReadPoint(root, "yes_button");
        if (root.TryGetProperty("inventory_grid", out var grid) &&
            grid.TryGetProperty("bounds", out var bounds) &&
            bounds.ValueKind == JsonValueKind.Array &&
            bounds.GetArrayLength() == 4)
        {
            result.Craft.InventoryGrid = new ScreenRectangleSetting
            {
                Left = bounds[0].GetInt32(),
                Top = bounds[1].GetInt32(),
                Right = bounds[2].GetInt32(),
                Bottom = bounds[3].GetInt32(),
            };
        }

        if (root.TryGetProperty("safe_indices", out var safes) && safes.ValueKind == JsonValueKind.Array)
        {
            result.Craft.SafeIndices = safes.EnumerateArray()
                .Where(value => value.TryGetInt32(out _))
                .Select(value => value.GetInt32())
                .ToList();
        }
        if (root.TryGetProperty("target_pid", out var targetPid) && targetPid.TryGetInt32(out var pid))
        {
            result.Craft.TargetProcessId = pid;
        }
        if (root.TryGetProperty("safe_mode", out var safeMode) &&
            safeMode.ValueKind is JsonValueKind.True or JsonValueKind.False)
        {
            result.Craft.SafeMode = safeMode.GetBoolean();
        }
        if (root.TryGetProperty("repeat_hold_ms", out var hold) && hold.TryGetInt32(out var holdMs))
        {
            result.Craft.RepeatHoldMs = holdMs;
        }
        if (root.TryGetProperty("repeat_gap_ms", out var gap) && gap.TryGetInt32(out var gapMs))
        {
            result.Craft.RepeatGapMs = gapMs;
        }

        return result;
    }

    private static ScreenPointSetting? ReadPoint(JsonElement root, string name)
    {
        if (!root.TryGetProperty(name, out var point) ||
            !point.TryGetProperty("x", out var x) ||
            !point.TryGetProperty("y", out var y) ||
            !x.TryGetInt32(out var pointX) ||
            !y.TryGetInt32(out var pointY))
        {
            return null;
        }
        return new ScreenPointSetting { X = pointX, Y = pointY };
    }
}
