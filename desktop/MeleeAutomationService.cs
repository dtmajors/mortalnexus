namespace MortalNexusDesktop;

internal sealed class MeleeAutomationService : IDisposable
{
    private readonly object _gate = new();
    private readonly Action<TimeSpan> _suppressHotkeys;
    private CancellationTokenSource? _cancellation;

    public MeleeAutomationService(Action<TimeSpan> suppressHotkeys)
    {
        _suppressHotkeys = suppressHotkeys;
    }

    public event Action<string, string, int>? StatusChanged;

    public bool IsRunning
    {
        get { lock (_gate) return _cancellation is not null; }
    }

    public void Toggle(MeleeSettings settings)
    {
        if (IsRunning)
        {
            Stop();
            return;
        }

        var configuration = settings.Clone();
        if (configuration.UseRestCycle && configuration.RestKey.VirtualKey <= 0)
        {
            Emit("BLOCKED", "Configure the rest key or turn the rest cycle off.", 0);
            return;
        }

        var source = new CancellationTokenSource();
        lock (_gate) _cancellation = source;
        _ = Task.Run(() => RunAsync(configuration, source));
    }

    public void Stop()
    {
        CancellationTokenSource? source;
        lock (_gate)
        {
            source = _cancellation;
            _cancellation = null;
        }
        source?.Cancel();
        NativeInput.MouseUp();
        Emit("STOPPED", "Melee training stopped.", 0);
    }

    private async Task RunAsync(MeleeSettings settings, CancellationTokenSource source)
    {
        var token = source.Token;
        var blocked = false;
        try
        {
            await Task.Delay(500, token);
            while (!token.IsCancellationRequested)
            {
                await AttackAsync(settings, token);
                if (!settings.UseRestCycle) continue;

                _suppressHotkeys(TimeSpan.FromMilliseconds(350));
                Emit("RESTKEY", $"Sending rest key {settings.RestKey.Display}.", 0);
                await NativeInput.SendBindingAsync(
                    settings.RestKey,
                    NativeInput.ForegroundWindowHandle(),
                    token);
                await DelayAsync(
                    "RESTING",
                    "Resting before the next attack phase.",
                    checked(settings.RestDurationSeconds * 1000),
                    token);
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception exception)
        {
            blocked = true;
            Emit("BLOCKED", exception.Message, 0);
        }
        finally
        {
            NativeInput.MouseUp();
            lock (_gate)
            {
                if (ReferenceEquals(_cancellation, source)) _cancellation = null;
            }
            if (!blocked) Emit("STOPPED", "Melee training stopped.", 0);
            source.Dispose();
        }
    }

    private async Task AttackAsync(MeleeSettings settings, CancellationToken token)
    {
        var remainingMs = checked(settings.AttackDurationSeconds * 1000);
        while (remainingMs > 0)
        {
            token.ThrowIfCancellationRequested();
            Emit("ATTACKING", "Repeating left-click attacks.", remainingMs);
            var holdMs = Math.Min(settings.ClickHoldMs <= 0 ? 25 : settings.ClickHoldMs, remainingMs);
            NativeInput.MouseDown();
            try
            {
                await Task.Delay(holdMs, token);
            }
            finally
            {
                NativeInput.MouseUp();
            }
            remainingMs -= holdMs;

            var gapMs = Math.Min(Math.Max(0, settings.ClickIntervalMs - holdMs), remainingMs);
            if (gapMs > 0)
            {
                await Task.Delay(gapMs, token);
                remainingMs -= gapMs;
            }
        }
    }

    private async Task DelayAsync(
        string phase,
        string message,
        int durationMs,
        CancellationToken token)
    {
        var remainingMs = Math.Max(0, durationMs);
        while (remainingMs > 0)
        {
            Emit(phase, message, remainingMs);
            var slice = Math.Min(100, remainingMs);
            await Task.Delay(slice, token);
            remainingMs -= slice;
        }
    }

    private void Emit(string phase, string message, int remainingMs) =>
        StatusChanged?.Invoke(phase, message, remainingMs);

    public void Dispose() => Stop();
}
