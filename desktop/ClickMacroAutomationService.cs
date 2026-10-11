namespace MortalNexusDesktop;

internal sealed class ClickMacroAutomationService : IDisposable
{
    private readonly object _gate = new();
    private readonly Action<TimeSpan> _suppressHotkeys;
    private CancellationTokenSource? _cancellation;
    private bool _paused;
    private int _stepIndex;

    public ClickMacroAutomationService(Action<TimeSpan> suppressHotkeys)
    {
        _suppressHotkeys = suppressHotkeys;
    }

    public event Action<string, string, int, int>? StatusChanged;

    public bool IsRunning
    {
        get { lock (_gate) return _cancellation is not null; }
    }

    public bool IsPaused
    {
        get { lock (_gate) return _paused; }
    }

    public int StepIndex
    {
        get { lock (_gate) return _stepIndex; }
    }

    public void Toggle(ClickMacroSettings settings, IntPtr targetWindow)
    {
        lock (_gate)
        {
            if (_cancellation is not null)
            {
                _paused = !_paused;
                NativeInput.MouseUp();
                Emit(
                    _paused ? "PAUSED" : "RUNNING",
                    _paused ? "Click rotation paused." : "Click rotation resumed.",
                    _stepIndex,
                    0);
                return;
            }
        }

        var configuration = settings.Clone();
        var validationError = Validate(configuration, targetWindow);
        if (validationError is not null)
        {
            Emit("BLOCKED", validationError, 0, 0);
            return;
        }

        var source = new CancellationTokenSource();
        lock (_gate)
        {
            _cancellation = source;
            _paused = false;
            _stepIndex = 0;
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
            _stepIndex = 0;
        }
        source?.Cancel();
        NativeInput.MouseUp();
        Emit("STOPPED", "Click rotation stopped.", 0, 0);
    }

    private async Task RunAsync(
        ClickMacroSettings settings,
        IntPtr targetWindow,
        CancellationTokenSource source)
    {
        var token = source.Token;
        var steps = settings.Steps
            .Where(step => step.Enabled && step.Key.VirtualKey > 0)
            .Select(step => step.Clone())
            .ToList();
        var blocked = false;
        try
        {
            await Task.Delay(1000, token);
            while (!token.IsCancellationRequested)
            {
                var index = StepIndex % steps.Count;
                var step = steps[index];
                Emit(
                    "SHOOTING",
                    $"Rapid firing, then sending {step.Key.Display}.",
                    index,
                    settings.ShootDurationSeconds);
                await RapidClickAsync(
                    settings.ShootDurationSeconds,
                    settings.ShootIntervalMs,
                    settings.ClickHoldMs,
                    targetWindow,
                    index,
                    token);

                await DelayPhaseAsync(
                    "WAITING",
                    $"Waiting before {step.Key.Display}.",
                    settings.PostShootDelayMs,
                    targetWindow,
                    index,
                    token);

                EnsureTarget(targetWindow);
                _suppressHotkeys(TimeSpan.FromMilliseconds(350));
                Emit("ACTION", $"Sending {step.Key.Display}.", index, 0);
                await NativeInput.SendBindingAsync(step.Key, targetWindow, token);

                if (settings.UseRestKey)
                {
                    await DelayPhaseAsync(
                        "WAITING",
                        $"Waiting before rest key {settings.RegenKey.Display}.",
                        settings.KeyToRegenDelayMs,
                        targetWindow,
                        index,
                        token);

                    EnsureTarget(targetWindow);
                    _suppressHotkeys(TimeSpan.FromMilliseconds(350));
                    Emit("RESTKEY", $"Sending rest key {settings.RegenKey.Display}.", index, 0);
                    await NativeInput.SendBindingAsync(settings.RegenKey, targetWindow, token);
                }

                var nextKey = steps[(index + 1) % steps.Count].Key.Display;
                await DelayPhaseAsync(
                    "RESTING",
                    $"Resting after {step.Key.Display}; next is {nextKey}.",
                    checked(settings.RestDurationSeconds * 1000),
                    targetWindow,
                    index,
                    token);

                lock (_gate)
                {
                    _stepIndex = (_stepIndex + 1) % steps.Count;
                }
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception exception)
        {
            blocked = true;
            Emit("BLOCKED", exception.Message, StepIndex, 0);
        }
        finally
        {
            NativeInput.MouseUp();
            lock (_gate)
            {
                if (ReferenceEquals(_cancellation, source))
                {
                    _cancellation = null;
                    _paused = false;
                    _stepIndex = 0;
                }
            }
            if (!blocked)
            {
                Emit("STOPPED", "Click rotation stopped.", 0, 0);
            }
            source.Dispose();
        }
    }

    private async Task RapidClickAsync(
        int seconds,
        int intervalMs,
        int clickHoldMs,
        IntPtr targetWindow,
        int stepIndex,
        CancellationToken token)
    {
        var remainingMs = checked(seconds * 1000);
        while (remainingMs > 0)
        {
            token.ThrowIfCancellationRequested();
            EnsureTarget(targetWindow);
            if (IsPaused)
            {
                NativeInput.MouseUp();
                await WaitWhilePausedAsync(targetWindow, token);
                continue;
            }

            Emit(
                "SHOOTING",
                $"Rapid firing every {intervalMs} ms.",
                stepIndex,
                Math.Max(0, (int)Math.Ceiling(remainingMs / 1000d)));

            var activeHoldMs = Math.Min(clickHoldMs, remainingMs);
            NativeInput.MouseDown();
            try
            {
                await DelayActiveAsync(activeHoldMs, targetWindow, token);
            }
            finally
            {
                NativeInput.MouseUp();
            }
            remainingMs -= activeHoldMs;

            var gapMs = Math.Min(Math.Max(0, intervalMs - activeHoldMs), remainingMs);
            if (gapMs > 0)
            {
                await DelayActiveAsync(gapMs, targetWindow, token);
                remainingMs -= gapMs;
            }
        }
    }

    private async Task DelayActiveAsync(
        int durationMs,
        IntPtr targetWindow,
        CancellationToken token)
    {
        var remainingMs = Math.Max(0, durationMs);
        while (remainingMs > 0)
        {
            token.ThrowIfCancellationRequested();
            EnsureTarget(targetWindow);
            if (IsPaused)
            {
                NativeInput.MouseUp();
                await WaitWhilePausedAsync(targetWindow, token);
                continue;
            }

            var sliceMs = Math.Min(25, remainingMs);
            await Task.Delay(sliceMs, token);
            remainingMs -= sliceMs;
        }
    }

    private async Task DelayPhaseAsync(
        string phase,
        string message,
        int durationMs,
        IntPtr targetWindow,
        int stepIndex,
        CancellationToken token)
    {
        var remainingMs = Math.Max(0, durationMs);
        var lastTick = DateTime.UtcNow;
        while (remainingMs > 0)
        {
            token.ThrowIfCancellationRequested();
            EnsureTarget(targetWindow);
            if (IsPaused)
            {
                await WaitWhilePausedAsync(targetWindow, token);
                lastTick = DateTime.UtcNow;
                continue;
            }
            var now = DateTime.UtcNow;
            remainingMs -= Math.Max(0, (int)(now - lastTick).TotalMilliseconds);
            lastTick = now;
            Emit(
                phase,
                message,
                stepIndex,
                Math.Max(0, (int)Math.Ceiling(remainingMs / 1000d)));
            await Task.Delay(Math.Min(200, Math.Max(1, remainingMs)), token);
        }
    }

    private async Task WaitWhilePausedAsync(IntPtr targetWindow, CancellationToken token)
    {
        while (IsPaused)
        {
            token.ThrowIfCancellationRequested();
            EnsureTarget(targetWindow);
            await Task.Delay(35, token);
        }
    }

    private static string? Validate(ClickMacroSettings settings, IntPtr targetWindow)
    {
        if (settings.Steps.Count(step => step.Enabled && step.Key.VirtualKey > 0) == 0)
            return "Enable and configure at least one rotation key.";
        if (settings.UseRestKey && settings.RegenKey.VirtualKey <= 0)
            return "Configure the optional rest key or turn it off.";
        return null;
    }

    private static void EnsureTarget(IntPtr targetWindow)
    {
        // Click Macro intentionally follows whichever window is active after arming.
    }

    private void Emit(string phase, string message, int stepIndex, int remainingSeconds) =>
        StatusChanged?.Invoke(phase, message, stepIndex, remainingSeconds);

    public void Dispose() => Stop();
}
