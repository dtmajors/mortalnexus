namespace MortalNexusDesktop;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();

        try
        {
#if LOCAL_UI_PREVIEW
            WritePreviewLog("Preview startup began.", overwrite: true);
            using var server = new LocalMapServer(Path.Combine(AppContext.BaseDirectory, "wwwroot"));
            server.Start();
            WritePreviewLog($"Local server listening at {server.BaseAddress}.");
            using var previewForm = new MainForm(server.BaseAddress, authenticationResult: null);
            previewForm.Shown += (_, _) =>
                WritePreviewLog("Preview window shown.");
            Application.Run(previewForm);
#else
            var applicationState = DesktopAuthenticationResult.CreateLocal();
            using var server = new LocalMapServer(Path.Combine(AppContext.BaseDirectory, "wwwroot"), applicationState);
            server.Start();
            Application.Run(new MainForm(server.BaseAddress, applicationState));
#endif
        }
        catch (Exception exception)
        {
            MessageBox.Show(
                $"Mortal Nexus could not start.\n\n{exception.Message}",
                "Mortal Nexus",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
        }
    }

#if LOCAL_UI_PREVIEW
    private static void WritePreviewLog(string message, bool overwrite = false)
    {
        try
        {
            var logDirectory = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "Mortal Nexus",
                "Logs");
            Directory.CreateDirectory(logDirectory);

            var logPath = Path.Combine(logDirectory, "preview-launch.log");
            var line = $"{DateTimeOffset.Now:O} {message}{Environment.NewLine}";
            if (overwrite)
            {
                File.WriteAllText(logPath, line);
            }
            else
            {
                File.AppendAllText(logPath, line);
            }
        }
        catch
        {
            // Diagnostic logging must never prevent Mortal Nexus from opening.
        }
    }
#endif
}
