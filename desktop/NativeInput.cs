using System.Runtime.InteropServices;
using System.Text;
using System.ComponentModel;

namespace MortalNexusDesktop;

[Flags]
internal enum HotkeyModifiers
{
    None = 0,
    Control = 1,
    Alt = 2,
    Shift = 4,
    Win = 8,
}

internal static class NativeInput
{
    private const int VkControl = 0x11;
    private const int VkMenu = 0x12;
    private const int VkShift = 0x10;
    private const int VkLwin = 0x5B;
    private const int VkRwin = 0x5C;
    private const uint MouseeventfLeftdown = 0x0002;
    private const uint MouseeventfLeftup = 0x0004;
    private const uint InputKeyboard = 1;
    private const uint KeyeventfKeyup = 0x0002;
    private const uint KeyeventfUnicode = 0x0004;

    public static bool IsDown(int virtualKey) =>
        virtualKey > 0 && (GetAsyncKeyState(virtualKey) & 0x8000) != 0;

    public static int ReadModifiers()
    {
        var result = HotkeyModifiers.None;
        if (IsDown(VkControl)) result |= HotkeyModifiers.Control;
        if (IsDown(VkMenu)) result |= HotkeyModifiers.Alt;
        if (IsDown(VkShift)) result |= HotkeyModifiers.Shift;
        if (IsDown(VkLwin) || IsDown(VkRwin)) result |= HotkeyModifiers.Win;
        return (int)result;
    }

    public static bool IsModifier(int virtualKey) =>
        virtualKey is 0x10 or 0x11 or 0x12 or 0x5B or 0x5C or
        0xA0 or 0xA1 or 0xA2 or 0xA3 or 0xA4 or 0xA5;

    public static string FormatBinding(int virtualKey, int modifiers)
    {
        if (virtualKey <= 0)
        {
            return "Not set";
        }

        var builder = new StringBuilder();
        var flags = (HotkeyModifiers)modifiers;
        if (flags.HasFlag(HotkeyModifiers.Control)) builder.Append("Ctrl+");
        if (flags.HasFlag(HotkeyModifiers.Alt)) builder.Append("Alt+");
        if (flags.HasFlag(HotkeyModifiers.Shift)) builder.Append("Shift+");
        if (flags.HasFlag(HotkeyModifiers.Win)) builder.Append("Win+");
        builder.Append(FormatKey(virtualKey));
        return builder.ToString();
    }

    private static string FormatKey(int virtualKey)
    {
        if (virtualKey is >= 0x30 and <= 0x39) return ((char)virtualKey).ToString();
        if (virtualKey is >= 0x41 and <= 0x5A) return ((char)virtualKey).ToString();
        if (virtualKey is >= 0x70 and <= 0x87) return $"F{virtualKey - 0x6F}";
        if (virtualKey is >= 0x60 and <= 0x69) return $"Num {virtualKey - 0x60}";
        return virtualKey switch
        {
            0x01 => "Mouse Left",
            0x02 => "Mouse Right",
            0x04 => "Mouse Middle",
            0x05 => "Mouse Back",
            0x06 => "Mouse Forward",
            0x08 => "Backspace",
            0x09 => "Tab",
            0x0D => "Enter",
            0x1B => "Esc",
            0x20 => "Space",
            0x21 => "Page Up",
            0x22 => "Page Down",
            0x23 => "End",
            0x24 => "Home",
            0x25 => "Left",
            0x26 => "Up",
            0x27 => "Right",
            0x28 => "Down",
            0x2D => "Insert",
            0x2E => "Delete",
            0xBA => ";",
            0xBB => "=",
            0xBC => ",",
            0xBD => "-",
            0xBE => ".",
            0xBF => "/",
            0xC0 => "`",
            0xDB => "[",
            0xDC => "\\",
            0xDD => "]",
            0xDE => "'",
            _ => $"Key {virtualKey}",
        };
    }

    public static Point CursorPosition()
    {
        GetCursorPos(out var point);
        return new Point(point.X, point.Y);
    }

    public static void MoveCursor(int x, int y) => SetCursorPos(x, y);

    public static void MouseDown() => mouse_event(MouseeventfLeftdown, 0, 0, 0, UIntPtr.Zero);

    public static void MouseUp() => mouse_event(MouseeventfLeftup, 0, 0, 0, UIntPtr.Zero);

    public static int ForegroundProcessId()
    {
        var window = GetForegroundWindow();
        return ProcessIdForWindow(window);
    }

    public static IntPtr ForegroundWindowHandle() => GetForegroundWindow();

    public static int ProcessIdForWindow(IntPtr window)
    {
        if (window == IntPtr.Zero) return 0;
        GetWindowThreadProcessId(window, out var processId);
        return unchecked((int)processId);
    }

    public static int ProcessIdAtPoint(int x, int y)
    {
        var window = WindowFromPoint(new NativePoint { X = x, Y = y });
        GetWindowThreadProcessId(window, out var processId);
        return unchecked((int)processId);
    }

    public static void FlashWindow(IntPtr windowHandle)
    {
        if (windowHandle == IntPtr.Zero) return;
        var info = new FlashWindowInfo
        {
            Size = (uint)Marshal.SizeOf<FlashWindowInfo>(),
            WindowHandle = windowHandle,
            Flags = 0x00000003 | 0x0000000C,
            Count = 8,
            Timeout = 0,
        };
        FlashWindowEx(ref info);
    }

    public static async Task LeftClickAsync(int x, int y, int holdMs, CancellationToken cancellationToken)
    {
        MoveCursor(x, y);
        await Task.Delay(25, cancellationToken);
        MouseDown();
        try
        {
            await Task.Delay(Math.Max(1, holdMs), cancellationToken);
        }
        finally
        {
            MouseUp();
        }
    }

    public static async Task SendChatCommandAsync(
        string command,
        IntPtr targetWindow,
        CancellationToken cancellationToken)
    {
        if (targetWindow != IntPtr.Zero && IsWindow(targetWindow))
        {
            SetForegroundWindow(targetWindow);
            await Task.Delay(85, cancellationToken);
        }
        await SendVirtualKeyAsync(0x0D, cancellationToken);
        await Task.Delay(110, cancellationToken);
        await SendTextAsKeysAsync(command, cancellationToken);
        await Task.Delay(75, cancellationToken);
        await SendVirtualKeyAsync(0x0D, cancellationToken);
    }

    public static async Task SendBindingAsync(
        HotkeyBinding binding,
        IntPtr targetWindow,
        CancellationToken cancellationToken,
        int holdMs = 35)
    {
        if (binding.VirtualKey <= 0)
        {
            throw new InvalidOperationException("The requested action key is not configured.");
        }
        if (targetWindow != IntPtr.Zero && IsWindow(targetWindow))
        {
            SetForegroundWindow(targetWindow);
            await Task.Delay(35, cancellationToken);
        }

        var flags = (HotkeyModifiers)binding.Modifiers;
        var modifierKeys = new List<ushort>(4);
        if (flags.HasFlag(HotkeyModifiers.Control)) modifierKeys.Add(VkControl);
        if (flags.HasFlag(HotkeyModifiers.Alt)) modifierKeys.Add(VkMenu);
        if (flags.HasFlag(HotkeyModifiers.Shift)) modifierKeys.Add(VkShift);
        if (flags.HasFlag(HotkeyModifiers.Win)) modifierKeys.Add(VkLwin);

        var inputs = new List<Input>(modifierKeys.Count + 1);
        foreach (var modifier in modifierKeys)
        {
            inputs.Add(KeyboardInput(modifier, 0));
        }
        inputs.Add(KeyboardInput((ushort)binding.VirtualKey, 0));
        SendInputs(inputs.ToArray());
        try
        {
            await Task.Delay(Math.Clamp(holdMs, 1, 60000), cancellationToken);
        }
        finally
        {
            inputs.Clear();
            inputs.Add(KeyboardInput((ushort)binding.VirtualKey, KeyeventfKeyup));
            for (var index = modifierKeys.Count - 1; index >= 0; index--)
            {
                inputs.Add(KeyboardInput(modifierKeys[index], KeyeventfKeyup));
            }
            SendInputs(inputs.ToArray());
        }
        await Task.Delay(35, cancellationToken);
    }

    private static async Task SendVirtualKeyAsync(ushort virtualKey, CancellationToken cancellationToken)
    {
        var inputs = new[]
        {
            KeyboardInput(virtualKey, 0),
            KeyboardInput(virtualKey, KeyeventfKeyup),
        };
        SendInputs(inputs);
        await Task.Delay(28, cancellationToken);
    }

    private static async Task SendTextAsKeysAsync(string text, CancellationToken cancellationToken)
    {
        foreach (var character in text)
        {
            cancellationToken.ThrowIfCancellationRequested();
            var mapped = VkKeyScan(character);
            if (mapped == -1)
            {
                SendUnicode(character.ToString());
            }
            else
            {
                var virtualKey = (ushort)(mapped & 0xFF);
                var shiftState = (mapped >> 8) & 0xFF;
                var inputs = new List<Input>(6);
                if ((shiftState & 1) != 0) inputs.Add(KeyboardInput(VkShift, 0));
                if ((shiftState & 2) != 0) inputs.Add(KeyboardInput(VkControl, 0));
                if ((shiftState & 4) != 0) inputs.Add(KeyboardInput(VkMenu, 0));
                inputs.Add(KeyboardInput(virtualKey, 0));
                inputs.Add(KeyboardInput(virtualKey, KeyeventfKeyup));
                if ((shiftState & 4) != 0) inputs.Add(KeyboardInput(VkMenu, KeyeventfKeyup));
                if ((shiftState & 2) != 0) inputs.Add(KeyboardInput(VkControl, KeyeventfKeyup));
                if ((shiftState & 1) != 0) inputs.Add(KeyboardInput(VkShift, KeyeventfKeyup));
                SendInputs(inputs.ToArray());
            }
            await Task.Delay(12, cancellationToken);
        }
    }

    private static void SendUnicode(string text)
    {
        var inputs = new List<Input>(text.Length * 2);
        foreach (var character in text)
        {
            inputs.Add(UnicodeInput(character, KeyeventfUnicode));
            inputs.Add(UnicodeInput(character, KeyeventfUnicode | KeyeventfKeyup));
        }
        if (inputs.Count > 0)
        {
            SendInputs(inputs.ToArray());
        }
    }

    private static void SendInputs(Input[] inputs)
    {
        if (inputs.Length == 0) return;
        var sent = SendInput((uint)inputs.Length, inputs, Marshal.SizeOf<Input>());
        if (sent != inputs.Length)
        {
            throw new Win32Exception(Marshal.GetLastWin32Error(), "Windows could not inject the requested input.");
        }
    }

    private static Input KeyboardInput(ushort virtualKey, uint flags) => new()
    {
        Type = InputKeyboard,
        Union = new InputUnion
        {
            Keyboard = new KeyboardInputData
            {
                VirtualKey = virtualKey,
                Flags = flags,
            },
        },
    };

    private static Input UnicodeInput(char character, uint flags) => new()
    {
        Type = InputKeyboard,
        Union = new InputUnion
        {
            Keyboard = new KeyboardInputData
            {
                ScanCode = character,
                Flags = flags,
            },
        },
    };

    [StructLayout(LayoutKind.Sequential)]
    private struct NativePoint
    {
        public int X;
        public int Y;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct Input
    {
        public uint Type;
        public InputUnion Union;
    }

    [StructLayout(LayoutKind.Explicit)]
    private struct InputUnion
    {
        [FieldOffset(0)] public KeyboardInputData Keyboard;
        [FieldOffset(0)] public MouseInputData Mouse;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct KeyboardInputData
    {
        public ushort VirtualKey;
        public ushort ScanCode;
        public uint Flags;
        public uint Time;
        public IntPtr ExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct MouseInputData
    {
        public int X;
        public int Y;
        public uint MouseData;
        public uint Flags;
        public uint Time;
        public IntPtr ExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct FlashWindowInfo
    {
        public uint Size;
        public IntPtr WindowHandle;
        public uint Flags;
        public uint Count;
        public uint Timeout;
    }

    [DllImport("user32.dll")]
    private static extern short GetAsyncKeyState(int virtualKey);

    [DllImport("user32.dll")]
    private static extern bool GetCursorPos(out NativePoint point);

    [DllImport("user32.dll")]
    private static extern bool SetCursorPos(int x, int y);

    [DllImport("user32.dll")]
    private static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extraInfo);

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr window);

    [DllImport("user32.dll")]
    private static extern bool IsWindow(IntPtr window);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern short VkKeyScan(char character);

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);

    [DllImport("user32.dll")]
    private static extern IntPtr WindowFromPoint(NativePoint point);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern uint SendInput(uint numberOfInputs, Input[] inputs, int inputSize);

    [DllImport("user32.dll")]
    private static extern bool FlashWindowEx(ref FlashWindowInfo flashInfo);
}
