using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using System.Diagnostics;
using System.Text.Json;

namespace MortalNexusDesktop;

internal sealed class MapPopoutForm : Form
{
    private readonly Uri _baseAddress;
    private string _route;
    private readonly WebView2 _browser = new()
    {
        Dock = DockStyle.Fill,
        DefaultBackgroundColor = Color.FromArgb(3, 5, 10),
    };

    public MapPopoutForm(Uri baseAddress, string route)
    {
        _baseAddress = baseAddress;
        _route = NormalizeRoute(route);
        Text = "Mortal Nexus - Live Map";
        BackColor = Color.FromArgb(3, 5, 10);
        MinimumSize = new Size(780, 540);
        Size = new Size(1220, 820);
        StartPosition = FormStartPosition.CenterParent;
        TopMost = true;
        Controls.Add(_browser);
        Shown += InitializeBrowserAsync;
    }

    private async void InitializeBrowserAsync(object? sender, EventArgs e)
    {
        Shown -= InitializeBrowserAsync;

        try
        {
            var userDataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Mortal Nexus",
                "WebView2");
            var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: userDataFolder);
            await _browser.EnsureCoreWebView2Async(environment);

            _browser.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
            _browser.CoreWebView2.Settings.AreDevToolsEnabled = true;
            _browser.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = true;
            _browser.CoreWebView2.Settings.IsStatusBarEnabled = false;
            _browser.CoreWebView2.WebMessageReceived += BrowserWebMessageReceived;
            _browser.CoreWebView2.NewWindowRequested += BrowserNewWindowRequested;
            NavigateToMap(_route);
        }
        catch (Exception ex)
        {
            MessageBox.Show(
                this,
                $"The live map could not be opened.\n\n{ex.Message}",
                "Mortal Nexus",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            Close();
        }
    }

    public void NavigateToMap(string route)
    {
        _route = NormalizeRoute(route);
        Text = $"Mortal Nexus - {(_route == "/myrland-alt-map" ? "Myrland Alt Map" : _route == "/myrland-map" ? "Myrland" : "Sarducaa")}";
        if (_browser.CoreWebView2 is not null)
        {
            _browser.Source = new Uri(_baseAddress, $"{_route.TrimStart('/')}?popout=1");
        }
    }

    private static string NormalizeRoute(string route) => route switch
    {
        "/myrland-map" => "/myrland-map",
        "/myrland-alt-map" => "/myrland-alt-map",
        _ => "/map",
    };

    private void BrowserWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            using var document = JsonDocument.Parse(e.WebMessageAsJson);
            var root = document.RootElement;
            var type = root.TryGetProperty("type", out var typeValue)
                ? typeValue.GetString() ?? ""
                : "";

            switch (type)
            {
                case "popout.close":
                    Close();
                    break;
                case "popout.opacity":
                    if (root.TryGetProperty("percent", out var opacityValue) &&
                        opacityValue.TryGetInt32(out var opacity))
                    {
                        Opacity = Math.Clamp(opacity, 25, 100) / 100d;
                    }
                    break;
                case "popout.scale":
                    if (root.TryGetProperty("percent", out var scaleValue) &&
                        scaleValue.TryGetInt32(out var scale))
                    {
                        _browser.ZoomFactor = Math.Clamp(scale, 65, 135) / 100d;
                    }
                    break;
                case "popout.topmost":
                    TopMost = root.TryGetProperty("enabled", out var topmostValue) &&
                        topmostValue.ValueKind is JsonValueKind.True;
                    break;
            }
        }
        catch (JsonException)
        {
            // Ignore unrelated messages produced by the shared map page.
        }
    }

    private void BrowserNewWindowRequested(object? sender, CoreWebView2NewWindowRequestedEventArgs e)
    {
        e.Handled = true;
        if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out var uri) ||
            uri.Scheme is not ("http" or "https"))
        {
            return;
        }

        Process.Start(new ProcessStartInfo(uri.ToString()) { UseShellExecute = true });
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            if (_browser.CoreWebView2 is not null)
            {
                _browser.CoreWebView2.WebMessageReceived -= BrowserWebMessageReceived;
                _browser.CoreWebView2.NewWindowRequested -= BrowserNewWindowRequested;
            }
            _browser.Dispose();
        }

        base.Dispose(disposing);
    }
}
