using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System.Runtime.InteropServices;

namespace MortalNexusDesktop;

internal sealed class MainForm : Form
{
    private const int GwlExStyle = -20;
    private const long WsExTransparent = 0x00000020L;
    private const long WsExNoActivate = 0x08000000L;
    private const int WmNcHitTest = 0x0084;
    private const int WmMouseActivate = 0x0021;
    private const int HtTransparent = -1;
    private const int HtClient = 1;
    private const int MaActivate = 1;
    private const uint SwpNoSize = 0x0001;
    private const uint SwpNoMove = 0x0002;
    private const uint SwpNoZOrder = 0x0004;
    private const uint SwpNoActivate = 0x0010;
    private const uint SwpFrameChanged = 0x0020;

    private readonly Uri _baseAddress;
    private readonly DesktopAuthenticationResult? _authenticationResult;
    private NativeToolBridge? _toolBridge;
    private MapPopoutForm? _mapPopout;
    private bool _signingOut;
    private bool _secondScreenMode;
    private Rectangle _desktopBounds;
    private FormWindowState _desktopWindowState;
    private FormBorderStyle _desktopBorderStyle;
    private bool _desktopTopMost;
    private bool _desktopShowInTaskbar;
    private Size _desktopMinimumSize;
    private string? _secondScreenDeviceName;
    private string _secondScreenResolution = "fill";
    private readonly WebView2 _browser = new()
    {
        Dock = DockStyle.Fill,
        DefaultBackgroundColor = Color.FromArgb(3, 5, 10),
    };

    public MainForm(Uri baseAddress, DesktopAuthenticationResult? authenticationResult)
    {
        _baseAddress = baseAddress;
        _authenticationResult = authenticationResult ?? DesktopAuthenticationResult.CreateLocal();

        Text = "Mortal Nexus";
        Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
        BackColor = Color.FromArgb(3, 5, 10);
        MinimumSize = new Size(920, 620);
        Size = new Size(1440, 900);
        StartPosition = FormStartPosition.CenterScreen;
        WindowState = FormWindowState.Maximized;
        Controls.Add(_browser);

        Shown += InitializeBrowserAsync;
        FormClosing += ConfirmClose;
    }

    private void ConfirmClose(object? sender, FormClosingEventArgs e)
    {
        if (_signingOut) return;
        if (e.CloseReason is not CloseReason.UserClosing) return;

        var result = MessageBox.Show(
            this,
            "Close Mortal Nexus? Running macros and tools will stop.",
            "Confirm close",
            MessageBoxButtons.YesNo,
            MessageBoxIcon.Question,
            MessageBoxDefaultButton.Button2);
        e.Cancel = result is not DialogResult.Yes;
    }

    internal async Task SignOutAsync()
    {
        if (_signingOut) return;

        _signingOut = true;
        await Task.Yield();
        Close();
    }

    internal bool SecondScreenModeEnabled => _secondScreenMode;

    internal bool SecondScreenVisible => Visible;

    internal int WindowOpacityPercent => (int)Math.Round(Opacity * 100d);

    internal int ApplicationScalePercent => (int)Math.Round(_browser.ZoomFactor * 100d);

    internal string SecondScreenResolution => _secondScreenResolution;

    internal Size ActiveDisplaySize => ResolveSecondScreen().Bounds.Size;

    internal int RecommendedApplicationScalePercent
    {
        get
        {
            var size = ActiveDisplaySize;
            if (size.Width >= 3600 || size.Height >= 2000) return 125;
            if (size.Width >= 2500 || size.Height >= 1400) return 110;
            if (size.Width >= 1900 || size.Height >= 1000) return 90;
            if (size.Width >= 1500 || size.Height >= 850) return 85;
            return 75;
        }
    }

    internal void OpenMapPopout(string route = "/map")
    {
        if (InvokeRequired)
        {
            BeginInvoke(() => OpenMapPopout(route));
            return;
        }

        if (_mapPopout is null || _mapPopout.IsDisposed)
        {
            _mapPopout = new MapPopoutForm(_baseAddress, route);
            _mapPopout.FormClosed += (_, _) => _mapPopout = null;
            _mapPopout.Show(this);
        }
        else
        {
            _mapPopout.NavigateToMap(route);
        }

        _mapPopout.WindowState = FormWindowState.Normal;
        _mapPopout.BringToFront();
        _mapPopout.Activate();
    }

    internal void SetWindowOpacity(int percent)
    {
        if (InvokeRequired)
        {
            BeginInvoke(() => SetWindowOpacity(percent));
            return;
        }

        Opacity = Math.Clamp(percent, 20, 100) / 100d;
    }

    internal void SetApplicationScale(int percent)
    {
        if (InvokeRequired)
        {
            BeginInvoke(() => SetApplicationScale(percent));
            return;
        }

        _browser.ZoomFactor = Math.Clamp(percent, 60, 150) / 100d;
    }

    internal void SetSecondScreenMode(bool enabled, string? resolution)
    {
        if (InvokeRequired)
        {
            BeginInvoke(() => SetSecondScreenMode(enabled, resolution));
            return;
        }

        _secondScreenResolution = NormalizeSecondScreenResolution(resolution);
        if (enabled)
        {
            if (!_secondScreenMode)
            {
                _desktopWindowState = WindowState;
                _desktopBounds = WindowState == FormWindowState.Normal ? Bounds : RestoreBounds;
                _desktopBorderStyle = FormBorderStyle;
                _desktopTopMost = TopMost;
                _desktopShowInTaskbar = ShowInTaskbar;
                _desktopMinimumSize = MinimumSize;
                _secondScreenDeviceName = Screen.FromControl(this).DeviceName;
            }

            _secondScreenMode = true;
            Show();
            WindowState = FormWindowState.Normal;
            MinimumSize = Size.Empty;
            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
            TopMost = true;
            Bounds = CalculateSecondScreenBounds(ResolveSecondScreen(), _secondScreenResolution);
            BringToFront();
            Activate();
            EnsureOverlayCapturesInput();
            BeginInvoke(EnsureOverlayCapturesInput);
            return;
        }

        if (!_secondScreenMode)
        {
            return;
        }

        _secondScreenMode = false;
        Show();
        WindowState = FormWindowState.Normal;
        MinimumSize = _desktopMinimumSize;
        FormBorderStyle = _desktopBorderStyle;
        ShowInTaskbar = _desktopShowInTaskbar;
        TopMost = _desktopTopMost;
        Bounds = _desktopBounds;
        WindowState = _desktopWindowState;
        BringToFront();
        Activate();
    }

    internal void ToggleSecondScreenVisibility()
    {
        if (InvokeRequired)
        {
            BeginInvoke(ToggleSecondScreenVisibility);
            return;
        }

        if (!_secondScreenMode)
        {
            return;
        }

        if (Visible)
        {
            Hide();
            return;
        }

        Show();
        WindowState = FormWindowState.Normal;
        Bounds = CalculateSecondScreenBounds(ResolveSecondScreen(), _secondScreenResolution);
        BringToFront();
        Activate();
        EnsureOverlayCapturesInput();
        BeginInvoke(EnsureOverlayCapturesInput);
    }

    internal void RestoreAfterNativeCapture()
    {
        if (InvokeRequired)
        {
            BeginInvoke(RestoreAfterNativeCapture);
            return;
        }

        if (_secondScreenMode)
        {
            WindowState = FormWindowState.Normal;
            Bounds = CalculateSecondScreenBounds(ResolveSecondScreen(), _secondScreenResolution);
            EnsureOverlayCapturesInput();
        }
        else
        {
            WindowState = FormWindowState.Normal;
            WindowState = FormWindowState.Maximized;
        }
        Activate();
    }

    private Screen ResolveSecondScreen()
    {
        return Screen.AllScreens.FirstOrDefault(screen =>
                screen.DeviceName.Equals(_secondScreenDeviceName, StringComparison.OrdinalIgnoreCase))
            ?? Screen.FromControl(this);
    }

    private static Rectangle CalculateSecondScreenBounds(Screen screen, string resolution)
    {
        if (resolution == "fill")
        {
            return screen.Bounds;
        }

        var parts = resolution.Split('x', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 2 ||
            !int.TryParse(parts[0], out var requestedWidth) ||
            !int.TryParse(parts[1], out var requestedHeight))
        {
            return screen.Bounds;
        }

        var area = screen.WorkingArea;
        var width = Math.Min(requestedWidth, area.Width);
        var height = Math.Min(requestedHeight, area.Height);
        return new Rectangle(
            area.Left + (area.Width - width) / 2,
            area.Top + (area.Height - height) / 2,
            width,
            height);
    }

    internal static string NormalizeSecondScreenResolution(string? resolution)
    {
        return resolution switch
        {
            "2560x1440" or "1920x1080" or "1600x900" or "1366x768" or "1280x720" => resolution,
            _ => "fill",
        };
    }

    private async void InitializeBrowserAsync(object? sender, EventArgs eventArgs)
    {
        try
        {
            var userDataDirectory = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Mortal Nexus",
                "WebView2");
            Directory.CreateDirectory(userDataDirectory);

            var environment = await CoreWebView2Environment.CreateAsync(
                browserExecutableFolder: null,
                userDataFolder: userDataDirectory);
            await _browser.EnsureCoreWebView2Async(environment);

            _browser.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = true;
            _browser.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
            _browser.CoreWebView2.Settings.AreDevToolsEnabled = true;
            _browser.CoreWebView2.Settings.IsStatusBarEnabled = false;
            _browser.CoreWebView2.Settings.IsZoomControlEnabled = false;
            _browser.CoreWebView2.NewWindowRequested += OpenExternalWindow;
            _browser.CoreWebView2.NavigationCompleted += NavigationCompleted;
            _browser.CoreWebView2.WebMessageReceived += (_, args) =>
                _toolBridge?.HandleMessage(args.WebMessageAsJson);
            _toolBridge = new NativeToolBridge(this, _browser, _authenticationResult);
            _browser.Source = new Uri(_baseAddress, "desktop-map");
        }
        catch (WebView2RuntimeNotFoundException)
        {
            MessageBox.Show(
                "Microsoft Edge WebView2 Runtime is required. Install it from Microsoft, then reopen Mortal Nexus.",
                "Mortal Nexus",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
            Close();
        }
        catch (Exception exception)
        {
            MessageBox.Show(
                $"The map could not be opened.\n\n{exception.Message}",
                "Mortal Nexus",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            Close();
        }
    }

    private void OpenExternalWindow(object? sender, CoreWebView2NewWindowRequestedEventArgs eventArgs)
    {
        eventArgs.Handled = true;
        if (!Uri.TryCreate(eventArgs.Uri, UriKind.Absolute, out var uri))
        {
            return;
        }

        if (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase))
        {
            _browser.Source = uri;
            return;
        }

        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
        {
            FileName = uri.AbsoluteUri,
            UseShellExecute = true,
        });
    }

    private void NavigationCompleted(object? sender, CoreWebView2NavigationCompletedEventArgs eventArgs)
    {
        if (eventArgs.IsSuccess)
        {
            if (_secondScreenMode)
            {
                BeginInvoke(EnsureOverlayCapturesInput);
            }
            return;
        }

        Text = $"Mortal Nexus - map load failed ({eventArgs.WebErrorStatus})";
    }

    private void EnsureOverlayCapturesInput()
    {
        if (!_secondScreenMode || !Visible || !IsHandleCreated)
        {
            return;
        }

        RemoveClickThroughStyles(Handle);
        if (_browser.IsHandleCreated)
        {
            RemoveClickThroughStyles(_browser.Handle);
        }

        BringToFront();
        Activate();
        SetForegroundWindow(Handle);
    }

    private static void RemoveClickThroughStyles(IntPtr window)
    {
        if (window == IntPtr.Zero)
        {
            return;
        }

        var current = GetWindowLongPtr(window, GwlExStyle).ToInt64();
        var interactive = current & ~WsExTransparent & ~WsExNoActivate;
        if (interactive == current)
        {
            return;
        }

        SetWindowLongPtr(window, GwlExStyle, new IntPtr(interactive));
        SetWindowPos(
            window,
            IntPtr.Zero,
            0,
            0,
            0,
            0,
            SwpNoMove | SwpNoSize | SwpNoZOrder | SwpNoActivate | SwpFrameChanged);
    }

    protected override void WndProc(ref Message message)
    {
        if (_secondScreenMode && message.Msg == WmMouseActivate)
        {
            EnsureOverlayCapturesInput();
            message.Result = new IntPtr(MaActivate);
            return;
        }

        base.WndProc(ref message);
        if (_secondScreenMode && message.Msg == WmNcHitTest && message.Result.ToInt32() == HtTransparent)
        {
            message.Result = new IntPtr(HtClient);
        }
    }

    [DllImport("user32.dll", EntryPoint = "GetWindowLongPtrW")]
    private static extern IntPtr GetWindowLongPtr(IntPtr window, int index);

    [DllImport("user32.dll", EntryPoint = "SetWindowLongPtrW")]
    private static extern IntPtr SetWindowLongPtr(IntPtr window, int index, IntPtr value);

    [DllImport("user32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetWindowPos(
        IntPtr window,
        IntPtr insertAfter,
        int x,
        int y,
        int width,
        int height,
        uint flags);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool SetForegroundWindow(IntPtr window);

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            _toolBridge?.Dispose();
            _browser.Dispose();
        }
        base.Dispose(disposing);
    }
}
