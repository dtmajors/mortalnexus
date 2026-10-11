using System.Diagnostics;
using System.Reflection;

namespace MortalNexusDesktop;

internal sealed class UpdateService : IDisposable
{
    internal const string ReleasePageUrl = "https://github.com/dtmajors/mortalnexus/releases/latest";
    private readonly IWin32Window _owner;
    private readonly UpdateStateSnapshot _snapshot;

    public UpdateService(IWin32Window owner, string? sessionToken)
    {
        _owner = owner;
        var version = Assembly.GetEntryAssembly()?.GetName().Version ?? new Version(0, 0, 0);
        _snapshot = new UpdateStateSnapshot(
            "standalone",
            "Standalone edition - updates are available on GitHub",
            $"{version.Major}.{version.Minor}.{Math.Max(0, version.Build)}",
            null,
            false,
            false,
            null);
    }

    public event Action<UpdateStateSnapshot>? StatusChanged;
    public UpdateStateSnapshot Snapshot => _snapshot;

    public Task CheckAsync(bool interactive)
    {
        StatusChanged?.Invoke(_snapshot);
        if (interactive)
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = ReleasePageUrl,
                    UseShellExecute = true,
                });
            }
            catch
            {
                MessageBox.Show(
                    _owner,
                    $"Open the latest Mortal Nexus release in your browser:\n\n{ReleasePageUrl}",
                    "Mortal Nexus Downloads",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
            }
        }
        return Task.CompletedTask;
    }

    public void Dispose()
    {
    }
}

internal sealed record UpdateStateSnapshot(
    string State,
    string Message,
    string CurrentVersion,
    string? LatestVersion,
    bool Available,
    bool Busy,
    int? ProgressPercent);
