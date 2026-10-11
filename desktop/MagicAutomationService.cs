namespace MortalNexusDesktop;

internal sealed class MagicAutomationService : IDisposable
{
    private readonly object _gate = new();
    private readonly Action<TimeSpan> _suppressHotkeys;
    private CancellationTokenSource? _cancellation;
    private bool _paused;
    private int _pressIndex;

    public MagicAutomationService(Action<TimeSpan> suppressHotkeys)
    {
        _suppressHotkeys = suppressHotkeys;
    }

    public event Action<string, string, int, int, int>? StatusChanged;

    public bool IsRunning
    {
        get { lock (_gate) return _cancellation is not null; }
    }

    public bool IsPaused
    {
        get { lock (_gate) return _paused; }
    }

    public int PressIndex
    {
        get { lock (_gate) return _pressIndex; }
    }

    public void Toggle(MagicSettings settings, IntPtr targetWindow)
    {
        lock (_gate)
        {
            if (_cancellation is not null)
            {
                _paused = !_paused;
                Emit(
                    _paused ? "PAUSED" : "CASTING",
                    _paused ? "Magic rotation paused." : "Magic rotation resumed.",
                    _pressIndex,
                    settings.PressesPerBatch,
                    0);
                return;
            }
        }

        var configuration = settings.Clone();
        var validationError = Validate(configuration, targetWindow);
        if (validationError is not null)
        {
            Emit("BLOCKED", validationError, 0, configuration.PressesPerBatch, 0);
            return;
        }

        var source = new CancellationTokenSource();
        lock (_gate)
        {
            _cancellation = source;
            _paused = false;
            _pressIndex = 0;
        }
        _ = Task.Run(() => RunAsync(configuration, targetWindow, source));
    }

    public void Stop()
    {
        CancellationTokenSource? source;
        lock (_gate)
        {
            source = _cancellation;
            _cancellation = null;
            _paused = false;
            _pressIndex = 0;
        }
        source?.Cancel();
        Emit("STOPPED", "Magic rotation stopped.", 0, 0, 0);
    }

    private async Task RunAsync(
        MagicSettings settings,
        IntPtr targetWindow,
        CancellationTokenSource source)
    {
        var token = source.Token;
        var blocked = false;
        try
        {
            await Task.Delay(1000, token);
            while (!token.IsCancellationRequested)
            {
                for (var index = PressIndex; index < settings.PressesPerBatch; index++)
                {
                    await WaitUntilActiveAsync(targetWindow, token);
                    _suppressHotkeys(TimeSpan.FromMilliseconds(350));
                    Emit(
                        "CASTING",
                        $"Sending {settings.ActionKey.Display}: {index + 1} of {settings.PressesPerBatch}.",
                        index,
                        settings.PressesPerBatch,
                        0);
                    await NativeInput.SendBindingAsync(
                        settings.ActionKey,
                        targetWindow == IntPtr.Zero ? NativeInput.ForegroundWindowHandle() : targetWindow,
                        token,
                        settings.PressHoldMs);
                    lock (_gate) _pressIndex = index + 1;

                    if (index + 1 < settings.PressesPerBatch)
                    {
                        await DelayPhaseAsync(
                            "WAITING",
                            $"Next {settings.ActionKey.Display} in {settings.PressIntervalMs} ms.",
                            settings.PressIntervalMs,
                            targetWindow,
                            index + 1,
                            settings.PressesPerBatch,
                            token);
                    }
                }

                if (settings.UseRecoveryKey)
                {
                    await DelayPhaseAsync(
                        "RECOVERY",
                        $"Recovery {settings.RecoveryKey.Display} in 2 seconds.",
                        2000,
                        targetWindow,
                        settings.PressesPerBatch,
                        settings.PressesPerBatch,
                        token);
                    await WaitUntilActiveAsync(targetWindow, token);
                    _suppressHotkeys(TimeSpan.FromMilliseconds(350));
                    Emit(
                        "RECOVERY",
                        $"Sending recovery key {settings.RecoveryKey.Display}.",
                        settings.PressesPerBatch,
                        settings.PressesPerBatch,
                        0);
                    await NativeInput.SendBindingAsync(
                        settings.RecoveryKey,
                        targetWindow == IntPtr.Zero ? NativeInput.ForegroundWindowHandle() : targetWindow,
                        token);
                }

                await DelayPhaseAsync(
                    "RECOVERY",
                    "Batch complete. Waiting before the next batch.",
                    settings.BatchRestMs,
                    targetWindow,
                    settings.PressesPerBatch,
                    settings.PressesPerBatch,
                    token);
                lock (_gate) _pressIndex = 0;
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception exception)
        {
            blocked = true;
            Emit("BLOCKED", exception.Message, PressIndex, settings.PressesPerBatch, 0);
        }
        finally
        {
            lock (_gate)
            {
                if (ReferenceEquals(_cancellation, source))
                {
                    _cancellation = null;
                    _paused = false;
                    _pressIndex = 0;
                }
            }
            if (!blocked) Emit("STOPPED", "Magic rotation stopped.", 0, 0, 0);
            source.Dispose();
        }
    }

    private async Task DelayPhaseAsync(
        string phase,
        string message,
        int durationMs,
        IntPtr targetWindow,
        int pressIndex,
        int pressTotal,
        CancellationToken token)
    {
        var remainingMs = Math.Max(0, durationMs);
        while (remainingMs > 0)
        {
            await WaitUntilActiveAsync(targetWindow, token);
            Emit(phase, message, pressIndex, pressTotal, remainingMs);
            var sliceMs = Math.Min(100, remainingMs);
            await Task.Delay(sliceMs, token);
            remainingMs -= sliceMs;
        }
    }

    private async Task WaitUntilActiveAsync(IntPtr targetWindow, CancellationToken token)
    {
        while (true)
        {
            token.ThrowIfCancellationRequested();
            EnsureTarget(targetWindow);
            if (!IsPaused) return;
            await Task.Delay(35, token);
        }
    }

    private static string? Validate(MagicSettings settings, IntPtr targetWindow)
    {
        if (settings.ActionKey.VirtualKey <= 0)
            return "Configure the magic action key.";
        if (settings.UseRecoveryKey && settings.RecoveryKey.VirtualKey <= 0)
            return "Configure the recovery key or turn recovery off.";
        return null;
    }

    private static void EnsureTarget(IntPtr targetWindow)
    {
        // Magic intentionally follows whichever window is active after arming.
    }

    private void Emit(string phase, string message, int pressIndex, int pressTotal, int remainingMs) =>
        StatusChanged?.Invoke(phase, message, pressIndex, pressTotal, remainingMs);

    public void Dispose() => Stop();
}
