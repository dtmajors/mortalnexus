using System.Runtime.InteropServices;

namespace MortalNexusDesktop;

internal sealed class GlobalHotkeyService : IDisposable
{
    private readonly ToolSettings _settings;
    private readonly System.Threading.Timer _timer;
    private readonly HotkeyMessageWindow _messageWindow;
    private readonly Dictionary<string, bool> _wasDown = new(StringComparer.OrdinalIgnoreCase);
    private readonly object _gate = new();
    private string? _captureAction;
    private bool _captureWaitingForRelease;
    private DateTime _suppressUntilUtc;
    private bool _disposed;

    public GlobalHotkeyService(ToolSettings settings)
    {
        _settings = settings;
        _messageWindow = new HotkeyMessageWindow(HandleRegisteredHotkey);
        RefreshBindings();
        _timer = new System.Threading.Timer(Poll, null, 100, 14);
    }

    public event Action<string>? Triggered;
    public event Action<string, HotkeyBinding>? Captured;
    public event Action<string>? CaptureCancelled;

    public void SuppressFor(TimeSpan duration)
    {
        lock (_gate)
        {
            var until = DateTime.UtcNow.Add(duration);
            if (until > _suppressUntilUtc)
            {
                _suppressUntilUtc = until;
            }
        }
    }

    public void BeginCapture(string action)
    {
        lock (_gate)
        {
            _captureAction = action;
            _captureWaitingForRelease = true;
        }
        _messageWindow.SetBindings([]);
    }

    public void CancelCapture()
    {
        string? action;
        lock (_gate)
        {
            action = _captureAction;
            _captureAction = null;
            _captureWaitingForRelease = false;
        }
        RefreshBindings();
        if (action is not null)
        {
            CaptureCancelled?.Invoke(action);
        }
    }

    public void RefreshBindings()
    {
        if (_disposed)
        {
            return;
        }

        KeyValuePair<string, HotkeyBinding>[] bindings;
        try
        {
            bindings = _settings.Hotkeys
                .Where(pair => pair.Value.VirtualKey > 0)
                .Select(pair => new KeyValuePair<string, HotkeyBinding>(
                    pair.Key,
                    new HotkeyBinding
                    {
                        VirtualKey = pair.Value.VirtualKey,
                        Modifiers = pair.Value.Modifiers,
                        Display = pair.Value.Display,
                    }))
                .ToArray();
        }
        catch (InvalidOperationException)
        {
            return;
        }

        _messageWindow.SetBindings(bindings);
    }

    private void Poll(object? state)
    {
        if (_disposed)
        {
            return;
        }

        string? captureAction;
        bool waitingForRelease;
        lock (_gate)
        {
            captureAction = _captureAction;
            waitingForRelease = _captureWaitingForRelease;
        }

        if (captureAction is not null)
        {
            var pressed = PressedPrimaryKeys();
            if (waitingForRelease)
            {
                if (pressed.Count == 0)
                {
                    lock (_gate)
                    {
                        _captureWaitingForRelease = false;
                    }
                }
                return;
            }

            if (pressed.Count == 0)
            {
                return;
            }

            var virtualKey = pressed[0];
            if (virtualKey == 0x1B)
            {
                CancelCapture();
                return;
            }

            var binding = new HotkeyBinding
            {
                VirtualKey = virtualKey,
                Modifiers = NativeInput.ReadModifiers(),
            };
            binding.Display = NativeInput.FormatBinding(binding.VirtualKey, binding.Modifiers);

            lock (_gate)
            {
                _captureAction = null;
                _captureWaitingForRelease = false;
            }
            _wasDown[captureAction] = true;
            Captured?.Invoke(captureAction, binding);
            RefreshBindings();
            return;
        }

        foreach (var (action, binding) in _settings.Hotkeys.ToArray())
        {
            var down = binding.VirtualKey > 0 &&
                NativeInput.IsDown(binding.VirtualKey) &&
                NativeInput.ReadModifiers() == binding.Modifiers;
            var wasDown = _wasDown.GetValueOrDefault(action);
            _wasDown[action] = down;

            // RegisterHotKey remains reliable while a game owns the foreground window.
            // Polling is retained for mouse buttons and keys Windows reserves.
            if (_messageWindow.IsRegistered(action))
            {
                continue;
            }

            if (CanTrigger(action) && down && !wasDown)
            {
                Triggered?.Invoke(action);
            }
        }
    }

    private void HandleRegisteredHotkey(string action)
    {
        if (!CanTrigger(action))
        {
            return;
        }

        ThreadPool.QueueUserWorkItem(_ => Triggered?.Invoke(action));
    }

    private bool CanTrigger(string action)
    {
        if (action.Equals("emergencyStop", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (!_settings.HotkeysEnabled)
        {
            return false;
        }

        if (!_settings.MacrosEnabled && IsMacroAction(action))
        {
            return false;
        }

        var macroControl = action is
            "clickMacroToggle" or "magicToggle" or "meleeToggle" or "afkToggle";
        lock (_gate)
        {
            return DateTime.UtcNow >= _suppressUntilUtc || macroControl;
        }
    }

    private static bool IsMacroAction(string action) => action is
        "craftToggle" or "craftStop" or "loot" or "bank" or "clickMacroToggle" or
        "magicToggle" or "meleeToggle" or "afkToggle";

    private static List<int> PressedPrimaryKeys()
    {
        var result = new List<int>();
        for (var virtualKey = 1; virtualKey <= 0xFE; virtualKey++)
        {
            if (!NativeInput.IsModifier(virtualKey) && NativeInput.IsDown(virtualKey))
            {
                result.Add(virtualKey);
            }
        }
        return result;
    }

    public void Dispose()
    {
        _disposed = true;
        _timer.Dispose();
        _messageWindow.Dispose();
    }

    private sealed class HotkeyMessageWindow : NativeWindow, IDisposable
    {
        private const int WmHotkey = 0x0312;
        private const int WmRefreshBindings = 0x8001;
        private const uint ModAlt = 0x0001;
        private const uint ModControl = 0x0002;
        private const uint ModShift = 0x0004;
        private const uint ModWin = 0x0008;
        private const uint ModNoRepeat = 0x4000;
        private static readonly IntPtr MessageOnlyWindow = new(-3);

        private readonly Action<string> _triggered;
        private readonly object _gate = new();
        private readonly Dictionary<int, string> _actionsById = new();
        private readonly HashSet<string> _registeredActions = new(StringComparer.OrdinalIgnoreCase);
        private KeyValuePair<string, HotkeyBinding>[] _pendingBindings = [];

        public HotkeyMessageWindow(Action<string> triggered)
        {
            _triggered = triggered;
            CreateHandle(new CreateParams
            {
                Caption = "Mortal Nexus Global Hotkeys",
                Parent = MessageOnlyWindow,
            });
        }

        public void SetBindings(KeyValuePair<string, HotkeyBinding>[] bindings)
        {
            lock (_gate)
            {
                _pendingBindings = bindings;
            }
            PostMessage(Handle, WmRefreshBindings, IntPtr.Zero, IntPtr.Zero);
        }

        public bool IsRegistered(string action)
        {
            lock (_gate)
            {
                return _registeredActions.Contains(action);
            }
        }

        protected override void WndProc(ref Message message)
        {
            if (message.Msg == WmRefreshBindings)
            {
                RefreshRegistrations();
                return;
            }

            if (message.Msg == WmHotkey)
            {
                string? action;
                lock (_gate)
                {
                    _actionsById.TryGetValue(message.WParam.ToInt32(), out action);
                }
                if (action is not null)
                {
                    _triggered(action);
                }
                return;
            }

            base.WndProc(ref message);
        }

        private void RefreshRegistrations()
        {
            KeyValuePair<string, HotkeyBinding>[] bindings;
            lock (_gate)
            {
                bindings = _pendingBindings;
                foreach (var registeredId in _actionsById.Keys)
                {
                    UnregisterHotKey(Handle, registeredId);
                }
                _actionsById.Clear();
                _registeredActions.Clear();
            }

            var id = 0x4D00;
            foreach (var (action, binding) in bindings)
            {
                if (binding.VirtualKey is >= 0x01 and <= 0x06 || NativeInput.IsModifier(binding.VirtualKey))
                {
                    continue;
                }

                var modifiers = ToWindowsModifiers(binding.Modifiers) | ModNoRepeat;
                if (!RegisterHotKey(Handle, id, modifiers, unchecked((uint)binding.VirtualKey)))
                {
                    continue;
                }

                lock (_gate)
                {
                    _actionsById[id] = action;
                    _registeredActions.Add(action);
                }
                id++;
            }
        }

        private static uint ToWindowsModifiers(int modifiers)
        {
            var source = (HotkeyModifiers)modifiers;
            var result = 0u;
            if (source.HasFlag(HotkeyModifiers.Control)) result |= ModControl;
            if (source.HasFlag(HotkeyModifiers.Alt)) result |= ModAlt;
            if (source.HasFlag(HotkeyModifiers.Shift)) result |= ModShift;
            if (source.HasFlag(HotkeyModifiers.Win)) result |= ModWin;
            return result;
        }

        public void Dispose()
        {
            if (Handle == IntPtr.Zero)
            {
                return;
            }

            lock (_gate)
            {
                foreach (var registeredId in _actionsById.Keys)
                {
                    UnregisterHotKey(Handle, registeredId);
                }
                _actionsById.Clear();
                _registeredActions.Clear();
            }
            DestroyHandle();
        }

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool RegisterHotKey(IntPtr windowHandle, int id, uint modifiers, uint virtualKey);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool UnregisterHotKey(IntPtr windowHandle, int id);

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool PostMessage(IntPtr windowHandle, int message, IntPtr wParam, IntPtr lParam);
    }
}
