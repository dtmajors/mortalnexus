namespace MortalNexusDesktop;

internal sealed class CraftAutomationService : IDisposable
{
    private readonly object _gate = new();
    private CancellationTokenSource? _cycleCancellation;
    private CancellationTokenSource? _repeatCancellation;
    private bool _paused;

    public event Action<string, string>? StatusChanged;

    public bool IsRunning
    {
        get
        {
            lock (_gate) return _cycleCancellation is not null;
        }
    }

    public bool IsPaused
    {
        get
        {
            lock (_gate) return _paused;
        }
    }

    public bool IsRepeating
    {
        get
        {
            lock (_gate) return _repeatCancellation is not null;
        }
    }

    public void ToggleCycle(CraftSettings settings)
    {
        lock (_gate)
        {
            if (_cycleCancellation is not null)
            {
                _paused = !_paused;
                NativeInput.MouseUp();
                Emit(_paused ? "PAUSED" : "RUNNING", _paused ? "Craft cycle paused." : "Craft cycle resumed.");
                return;
            }
        }

        var validationError = Validate(settings);
        if (validationError is not null)
        {
            Emit("BLOCKED", validationError);
            return;
        }

        StopRepeat();
        var cancellation = new CancellationTokenSource();
        lock (_gate)
        {
            _cycleCancellation = cancellation;
            _paused = false;
        }
        _ = Task.Run(() => CycleLoopAsync(settings, cancellation));
    }

    public void StopCycle()
    {
        CancellationTokenSource? cancellation;
        lock (_gate)
        {
            cancellation = _cycleCancellation;
            _cycleCancellation = null;
            _paused = false;
        }
        cancellation?.Cancel();
        NativeInput.MouseUp();
        Emit("STOPPED", "Craft cycle stopped.");
    }

    public void ToggleRepeat(CraftSettings settings)
    {
        lock (_gate)
        {
            if (_repeatCancellation is not null)
            {
                StopRepeatLocked();
                Emit("READY", "Click-and-hold repeat stopped.");
                return;
            }
        }

        StopCycle();
        var point = NativeInput.CursorPosition();
        var cancellation = new CancellationTokenSource();
        lock (_gate)
        {
            _repeatCancellation = cancellation;
        }
        Emit("REPEAT", $"Repeating at ({point.X}, {point.Y}).");
        _ = Task.Run(() => RepeatLoopAsync(point, settings, cancellation));
    }

    public void StopRepeat()
    {
        lock (_gate)
        {
            StopRepeatLocked();
        }
    }

    private void StopRepeatLocked()
    {
        _repeatCancellation?.Cancel();
        _repeatCancellation = null;
        NativeInput.MouseUp();
    }

    private async Task CycleLoopAsync(CraftSettings settings, CancellationTokenSource source)
    {
        var cancellationToken = source.Token;
        try
        {
            var cycle = 0;
            while (!cancellationToken.IsCancellationRequested)
            {
                cycle++;
                Emit("CRAFTING", $"Cycle {cycle}: holding Craft for {FormatDuration(settings.CraftHoldSeconds)}.");
                if (!await HoldCraftAsync(settings, cancellationToken))
                {
                    break;
                }

                var slots = BreakSlots(settings);
                Emit("BREAKING", $"Cycle {cycle}: breaking {slots.Count} items.");
                await Task.Delay(200, cancellationToken);
                for (var index = 0; index < slots.Count; index++)
                {
                    await WaitWhilePausedAsync(cancellationToken);
                    EnsureTarget(settings);
                    Emit("BREAKING", $"Cycle {cycle}: breaking item {index + 1}/{slots.Count}.");
                    await DragAsync(slots[index], settings.DeletePosition!, settings, cancellationToken);
                    await Task.Delay(60, cancellationToken);
                    EnsureTarget(settings);
                    await NativeInput.LeftClickAsync(
                        settings.YesButton!.X,
                        settings.YesButton.Y,
                        45,
                        cancellationToken);
                    await Task.Delay(180, cancellationToken);
                }

                Emit("RUNNING", $"Cycle {cycle} complete. Starting the next batch.");
                await Task.Delay(250, cancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
        }
        catch (Exception exception)
        {
            Emit("BLOCKED", exception.Message);
        }
        finally
        {
            NativeInput.MouseUp();
            lock (_gate)
            {
                if (ReferenceEquals(_cycleCancellation, source))
                {
                    _cycleCancellation = null;
                    _paused = false;
                }
            }
            Emit("STOPPED", "Craft cycle stopped.");
            source.Dispose();
        }
    }

    private async Task<bool> HoldCraftAsync(CraftSettings settings, CancellationToken cancellationToken)
    {
        var elapsed = TimeSpan.Zero;
        var lastTick = DateTime.UtcNow;
        var mouseDown = false;
        try
        {
            while (elapsed.TotalSeconds < settings.CraftHoldSeconds)
            {
                cancellationToken.ThrowIfCancellationRequested();
                EnsureTarget(settings);
                if (IsPaused)
                {
                    if (mouseDown)
                    {
                        NativeInput.MouseUp();
                        mouseDown = false;
                    }
                    await WaitWhilePausedAsync(cancellationToken);
                    lastTick = DateTime.UtcNow;
                    continue;
                }

                if (!mouseDown)
                {
                    NativeInput.MoveCursor(settings.CraftButton!.X, settings.CraftButton.Y);
                    await Task.Delay(25, cancellationToken);
                    NativeInput.MouseDown();
                    mouseDown = true;
                    lastTick = DateTime.UtcNow;
                }

                var now = DateTime.UtcNow;
                elapsed += now - lastTick;
                lastTick = now;
                var remaining = Math.Max(0, settings.CraftHoldSeconds - (int)elapsed.TotalSeconds);
                Emit("CRAFTING", $"Crafting continuously: {FormatDuration(remaining)} remaining.");
                await Task.Delay(40, cancellationToken);
            }
            return true;
        }
        finally
        {
            if (mouseDown) NativeInput.MouseUp();
        }
    }

    private async Task WaitWhilePausedAsync(CancellationToken cancellationToken)
    {
        while (IsPaused)
        {
            cancellationToken.ThrowIfCancellationRequested();
            await Task.Delay(30, cancellationToken);
        }
    }

    private static async Task DragAsync(
        Point source,
        ScreenPointSetting destination,
        CraftSettings settings,
        CancellationToken cancellationToken)
    {
        NativeInput.MoveCursor(source.X, source.Y);
        await Task.Delay(25, cancellationToken);
        NativeInput.MouseDown();
        try
        {
            const int steps = 10;
            for (var step = 1; step <= steps; step++)
            {
                cancellationToken.ThrowIfCancellationRequested();
                EnsureTarget(settings);
                var progress = step / (double)steps;
                NativeInput.MoveCursor(
                    (int)Math.Round(source.X + (destination.X - source.X) * progress),
                    (int)Math.Round(source.Y + (destination.Y - source.Y) * progress));
                await Task.Delay(16, cancellationToken);
            }
        }
        finally
        {
            NativeInput.MouseUp();
        }
    }

    private async Task RepeatLoopAsync(
        Point point,
        CraftSettings settings,
        CancellationTokenSource source)
    {
        try
        {
            while (!source.IsCancellationRequested)
            {
                NativeInput.MoveCursor(point.X, point.Y);
                NativeInput.MouseDown();
                try
                {
                    await Task.Delay(settings.RepeatHoldMs, source.Token);
                }
                finally
                {
                    NativeInput.MouseUp();
                }
                if (settings.RepeatGapMs > 0)
                {
                    await Task.Delay(settings.RepeatGapMs, source.Token);
                }
            }
        }
        catch (OperationCanceledException)
        {
        }
        finally
        {
            NativeInput.MouseUp();
            lock (_gate)
            {
                if (ReferenceEquals(_repeatCancellation, source))
                {
                    _repeatCancellation = null;
                }
            }
            source.Dispose();
            Emit("READY", "Click-and-hold repeat stopped.");
        }
    }

    private static List<Point> BreakSlots(CraftSettings settings)
    {
        var grid = settings.InventoryGrid!;
        var safe = settings.SafeIndices.ToHashSet();
        var cellWidth = grid.Width / 6d;
        var cellHeight = grid.Height / 6d;
        var result = new List<Point>(36 - safe.Count);
        for (var row = 0; row < 6; row++)
        {
            for (var column = 0; column < 6; column++)
            {
                var index = row * 6 + column;
                if (safe.Contains(index)) continue;
                result.Add(new Point(
                    (int)Math.Round(grid.Left + (column + .5) * cellWidth),
                    (int)Math.Round(grid.Top + (row + .5) * cellHeight)));
            }
        }
        return result;
    }

    private static string? Validate(CraftSettings settings)
    {
        if (settings.InventoryGrid is null || settings.InventoryGrid.Width < 120 || settings.InventoryGrid.Height < 120)
            return "Position the full 6 x 6 inventory grid first.";
        if (settings.SafeIndices.Count < 1)
            return "Select at least one protected inventory cell.";
        if (settings.CraftButton is null)
            return "Select the Craft button.";
        if (settings.DeletePosition is null)
            return "Select the delete drop position.";
        if (settings.YesButton is null)
            return "Select the Yes confirmation button.";
        if (settings.SafeMode && settings.TargetProcessId <= 0)
            return "Safe Mode needs a calibrated game process.";
        try
        {
            EnsureTarget(settings);
        }
        catch (Exception exception)
        {
            return exception.Message;
        }
        return null;
    }

    private static void EnsureTarget(CraftSettings settings)
    {
        if (!settings.SafeMode) return;
        var grid = settings.InventoryGrid!;
        var gridProcess = NativeInput.ProcessIdAtPoint(
            grid.Left + grid.Width / 2,
            grid.Top + grid.Height / 2);
        var foregroundProcess = NativeInput.ForegroundProcessId();
        if (settings.TargetProcessId != gridProcess &&
            settings.TargetProcessId != foregroundProcess)
        {
            throw new InvalidOperationException(
                $"Safety stop: active PID {foregroundProcess} and grid PID {gridProcess} do not match calibrated PID {settings.TargetProcessId}.");
        }
    }

    private void Emit(string phase, string message) => StatusChanged?.Invoke(phase, message);

    private static string FormatDuration(int seconds) =>
        $"{Math.Max(0, seconds) / 60}:{Math.Max(0, seconds) % 60:00}";

    public void Dispose()
    {
        StopCycle();
        StopRepeat();
    }
}
