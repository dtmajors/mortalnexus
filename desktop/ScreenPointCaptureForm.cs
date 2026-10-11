namespace MortalNexusDesktop;

internal sealed class ScreenPointCaptureForm : Form
{
    private readonly Label _coordinates = new();

    public ScreenPointCaptureForm(string targetLabel)
    {
        Text = $"Select {targetLabel}";
        FormBorderStyle = FormBorderStyle.None;
        ShowInTaskbar = false;
        StartPosition = FormStartPosition.Manual;
        Bounds = SystemInformation.VirtualScreen;
        TopMost = true;
        KeyPreview = true;
        Opacity = 0.16;
        BackColor = Color.FromArgb(13, 34, 58);
        Cursor = Cursors.Cross;

        var instruction = new Label
        {
            AutoSize = true,
            BackColor = Color.FromArgb(225, 6, 12, 20),
            ForeColor = Color.White,
            Font = new Font("Segoe UI", 12, FontStyle.Bold),
            Padding = new Padding(18, 12, 18, 12),
            Text = $"CLICK THE {targetLabel}\nEsc cancels",
        };
        instruction.Location = new Point(
            Math.Max(16, (ClientSize.Width - instruction.PreferredWidth) / 2),
            24);

        _coordinates.AutoSize = true;
        _coordinates.BackColor = Color.FromArgb(225, 6, 12, 20);
        _coordinates.ForeColor = Color.FromArgb(150, 205, 255);
        _coordinates.Font = new Font("Consolas", 10, FontStyle.Bold);
        _coordinates.Padding = new Padding(9, 6, 9, 6);

        Controls.Add(instruction);
        Controls.Add(_coordinates);
        MouseMove += (_, _) => UpdateCoordinates();
        MouseDown += CaptureClick;
        KeyDown += (_, args) =>
        {
            if (args.KeyCode != Keys.Escape) return;
            DialogResult = DialogResult.Cancel;
            Close();
        };
        Shown += (_, _) =>
        {
            Activate();
            UpdateCoordinates();
        };
    }

    public Point? SelectedPoint { get; private set; }

    private void CaptureClick(object? sender, MouseEventArgs eventArgs)
    {
        if (eventArgs.Button != MouseButtons.Left) return;
        SelectedPoint = Cursor.Position;
        DialogResult = DialogResult.OK;
        Close();
    }

    private void UpdateCoordinates()
    {
        var point = Cursor.Position;
        _coordinates.Text = $"{point.X}, {point.Y}";
        var local = PointToClient(point);
        _coordinates.Location = new Point(
            Math.Clamp(local.X + 18, 8, Math.Max(8, ClientSize.Width - _coordinates.Width - 8)),
            Math.Clamp(local.Y + 18, 8, Math.Max(8, ClientSize.Height - _coordinates.Height - 8)));
    }
}
