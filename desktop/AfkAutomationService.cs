namespace MortalNexusDesktop;

internal sealed class AfkAutomationService : IDisposable
{
    private readonly object _gate = new();
    private readonly Action<TimeSpan> _suppressHotkeys;
    private CancellationTokenSource? _cancellation;

    public AfkAutomationService(Action<TimeSpan> suppressHotkeys)
    {
        _suppressHotkeys = suppressHotkeys;
    }

    public event Action<string, string, int>? StatusChanged;

    public bool IsRunning
    {
        get { lock (_gate) return _cancellation is not null; }
    }

    public void Toggle(AfkSettings settings)
    {
        if (IsRunning)
        {
            Stop();
            return;
        }

        var configuration = settings.Clone();
        if (configuration.FirstKey.VirtualKey <= 0 || configuration.SecondKey.VirtualKey <= 0)
        {
            Emit("BLOCKED", "Configure both AFK action keys.", 0);
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
        Emit("STOPPED", "AFK sequence stopped.", 0);
    }

    private async Task RunAsync(AfkSettings settings, CancellationTokenSource source)
    {
        var token = source.Token;
        var blocked = false;
        try
        {
            await Task.Delay(500, token);
            while (!token.IsCancellationRequested)
            {
                _suppressHotkeys(TimeSpan.FromMilliseconds(350));
                Emit("ACTION", $"Sending {settings.FirstKey.Display}.", 0);
                await NativeInput.SendBindingAsync(
                    settings.FirstKey,
                    NativeInput.ForegroundWindowHandle(),
                    token);

                if (settings.DelayBetweenKeysMs > 0)
                    await Task.Delay(settings.DelayBetweenKeysMs, token);

                _suppressHotkeys(TimeSpan.FromMilliseconds(350));
                Emit("ACTION", $"Sending {settings.SecondKey.Display}.", 0);
                await NativeInput.SendBindingAsync(
                    settings.SecondKey,
                    NativeInput.ForegroundWindowHandle(),
                    token);

                var remainingMs = checked(settings.RepeatIntervalSeconds * 1000);
                while (remainingMs > 0)
                {
                    Emit("WAITING", "Waiting for the next AFK sequence.", remainingMs);
                    var slice = Math.Min(250, remainingMs);
                    await Task.Delay(slice, token);
                    remainingMs -= slice;
                }
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
            lock (_gate)
            {
                if (ReferenceEquals(_cancellation, source)) _cancellation = null;
            }
            if (!blocked) Emit("STOPPED", "AFK sequence stopped.", 0);
            source.Dispose();
        }
    }

    private void Emit(string phase, string message, int remainingMs) =>
        StatusChanged?.Invoke(phase, message, remainingMs);

    public void Dispose() => Stop();
}
