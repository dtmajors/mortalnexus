using System.Media;

namespace MortalNexusDesktop;

internal sealed class InventoryGridCalibrationForm : Form
{
    private const int HeaderHeight = 50;
    private const int FooterHeight = 58;
    private const int ResizeBorder = 8;

    private readonly Panel _gridHost = new();
    private readonly HashSet<int> _safeIndices;
    private readonly Button[] _cellButtons = new Button[36];
    private readonly ScreenRectangleSetting? _initialBounds;
    private bool _dragging;
    private Point _dragOffset;

    public InventoryGridCalibrationForm(CraftSettings settings)
    {
        _safeIndices = settings.SafeIndices
            .Where(index => index is >= 0 and < 36)
            .Take(35)
            .ToHashSet();
        _initialBounds = settings.InventoryGrid;

        Text = "Inventory grid calibration";
        BackColor = Color.FromArgb(7, 12, 18);
        ForeColor = Color.White;
        FormBorderStyle = FormBorderStyle.None;
        MinimumSize = new Size(300, 390);
        Opacity = 0.62;
        ShowInTaskbar = false;
        StartPosition = FormStartPosition.Manual;
        TopMost = true;
        Padding = new Padding(3);

        var root = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            BackColor = Color.FromArgb(38, 77, 122),
            ColumnCount = 1,
            RowCount = 3,
            Padding = new Padding(1),
        };
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, HeaderHeight));
        root.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        root.RowStyles.Add(new RowStyle(SizeType.Absolute, FooterHeight));
        Controls.Add(root);

        var header = BuildHeader();
        root.Controls.Add(header, 0, 0);

        BuildGrid();
        root.Controls.Add(_gridHost, 0, 1);

        var footer = BuildFooter();
        root.Controls.Add(footer, 0, 2);

        if (_initialBounds is { Width: >= 120, Height: >= 120 })
        {
            Bounds = new Rectangle(
                _initialBounds.Left,
                _initialBounds.Top - HeaderHeight,
                _initialBounds.Width,
                _initialBounds.Height + HeaderHeight + FooterHeight);
        }
        else
        {
            var workingArea = Screen.FromPoint(Cursor.Position).WorkingArea;
            Size = new Size(390, 500);
            Location = new Point(
                workingArea.Left + (workingArea.Width - Width) / 2,
                workingArea.Top + (workingArea.Height - Height) / 2);
        }

        Shown += (_, _) =>
        {
            if (_initialBounds is { Width: >= 120, Height: >= 120 })
            {
                AlignGridTo(_initialBounds);
            }
        };
    }

    public ScreenRectangleSetting? GridBounds { get; private set; }

    public IReadOnlyList<int> SafeIndices => _safeIndices.Order().ToArray();

    private Control BuildHeader()
    {
        var header = new Panel
        {
            Dock = DockStyle.Fill,
            BackColor = Color.FromArgb(11, 20, 30),
            Cursor = Cursors.SizeAll,
            Padding = new Padding(12, 6, 12, 5),
        };
        var title = new Label
        {
            AutoSize = true,
            ForeColor = Color.White,
            Font = new Font("Segoe UI", 10, FontStyle.Bold),
            Location = new Point(10, 5),
            Text = "ALIGN THE 6 x 6 INVENTORY GRID",
        };
        var instructions = new Label
        {
            AutoSize = true,
            ForeColor = Color.FromArgb(165, 190, 216),
            Font = new Font("Segoe UI", 8),
            Location = new Point(10, 27),
            Text = "Drag this header, resize the edges, then click cells to protect.",
        };
        header.Controls.Add(title);
        header.Controls.Add(instructions);
        WireDrag(header);
        WireDrag(title);
        WireDrag(instructions);
        return header;
    }

    private void BuildGrid()
    {
        _gridHost.Dock = DockStyle.Fill;
        _gridHost.BackColor = Color.FromArgb(61, 112, 168);
        _gridHost.Padding = new Padding(2);

        var grid = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            BackColor = Color.FromArgb(48, 73, 98),
            ColumnCount = 6,
            RowCount = 6,
            Margin = Padding.Empty,
            Padding = Padding.Empty,
        };
        for (var index = 0; index < 6; index++)
        {
            grid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100f / 6f));
            grid.RowStyles.Add(new RowStyle(SizeType.Percent, 100f / 6f));
        }

        for (var index = 0; index < 36; index++)
        {
            var cellIndex = index;
            var button = new Button
            {
                Dock = DockStyle.Fill,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 8, FontStyle.Bold),
                Margin = new Padding(1),
                TabStop = false,
                Text = (index + 1).ToString(),
            };
            button.FlatAppearance.BorderSize = 1;
            button.Click += (_, _) => ToggleSafe(cellIndex);
            _cellButtons[index] = button;
            grid.Controls.Add(button, index % 6, index / 6);
        }

        _gridHost.Controls.Add(grid);
        RefreshCells();
    }

    private Control BuildFooter()
    {
        var footer = new Panel
        {
            Dock = DockStyle.Fill,
            BackColor = Color.FromArgb(11, 20, 30),
            Padding = new Padding(8),
        };
        var clear = CreateFooterButton("Clear protected", Color.FromArgb(28, 43, 58));
        clear.Location = new Point(8, 9);
        clear.Click += (_, _) =>
        {
            _safeIndices.Clear();
            RefreshCells();
        };

        var cancel = CreateFooterButton("Cancel", Color.FromArgb(49, 28, 33));
        cancel.Anchor = AnchorStyles.Top | AnchorStyles.Right;
        cancel.Location = new Point(footer.Width - 188, 9);
        cancel.Click += (_, _) =>
        {
            DialogResult = DialogResult.Cancel;
            Close();
        };

        var save = CreateFooterButton("Save grid", Color.FromArgb(37, 94, 153));
        save.Anchor = AnchorStyles.Top | AnchorStyles.Right;
        save.Location = new Point(footer.Width - 96, 9);
        save.Click += (_, _) => SaveGrid();

        footer.Controls.Add(clear);
        footer.Controls.Add(cancel);
        footer.Controls.Add(save);
        footer.Resize += (_, _) =>
        {
            cancel.Left = footer.ClientSize.Width - cancel.Width - save.Width - 18;
            save.Left = footer.ClientSize.Width - save.Width - 8;
        };
        return footer;
    }

    private static Button CreateFooterButton(string text, Color color) => new()
    {
        BackColor = color,
        FlatStyle = FlatStyle.Flat,
        ForeColor = Color.White,
        Font = new Font("Segoe UI", 8, FontStyle.Bold),
        Size = new Size(text == "Clear protected" ? 120 : 84, 36),
        Text = text,
        UseVisualStyleBackColor = false,
    };

    private void ToggleSafe(int index)
    {
        if (!_safeIndices.Remove(index))
        {
            if (_safeIndices.Count >= 35)
            {
                SystemSounds.Beep.Play();
                return;
            }
            _safeIndices.Add(index);
        }
        RefreshCells();
    }

    private void RefreshCells()
    {
        for (var index = 0; index < _cellButtons.Length; index++)
        {
            var safe = _safeIndices.Contains(index);
            var button = _cellButtons[index];
            button.BackColor = safe
                ? Color.FromArgb(20, 139, 86)
                : Color.FromArgb(17, 30, 43);
            button.ForeColor = safe
                ? Color.White
                : Color.FromArgb(191, 211, 230);
            button.FlatAppearance.BorderColor = safe
                ? Color.FromArgb(111, 255, 185)
                : Color.FromArgb(92, 139, 185);
            button.Text = safe ? $"SAFE\n{index + 1}" : (index + 1).ToString();
        }
    }

    private void SaveGrid()
    {
        var screenBounds = _gridHost.RectangleToScreen(_gridHost.ClientRectangle);
        if (screenBounds.Width < 120 || screenBounds.Height < 120)
        {
            MessageBox.Show(
                this,
                "Resize the overlay so the grid is at least 120 x 120 pixels.",
                "Inventory grid is too small",
                MessageBoxButtons.OK,
                MessageBoxIcon.Information);
            return;
        }

        GridBounds = new ScreenRectangleSetting
        {
            Left = screenBounds.Left,
            Top = screenBounds.Top,
            Right = screenBounds.Right,
            Bottom = screenBounds.Bottom,
        };
        DialogResult = DialogResult.OK;
        Close();
    }

    private void AlignGridTo(ScreenRectangleSetting desired)
    {
        var current = _gridHost.RectangleToScreen(_gridHost.ClientRectangle);
        Width += desired.Width - current.Width;
        Height += desired.Height - current.Height;
        current = _gridHost.RectangleToScreen(_gridHost.ClientRectangle);
        Left += desired.Left - current.Left;
        Top += desired.Top - current.Top;
    }

    private void WireDrag(Control control)
    {
        control.MouseDown += (_, eventArgs) =>
        {
            if (eventArgs.Button != MouseButtons.Left) return;
            _dragging = true;
            _dragOffset = new Point(Cursor.Position.X - Left, Cursor.Position.Y - Top);
        };
        control.MouseMove += (_, _) =>
        {
            if (!_dragging) return;
            Location = new Point(Cursor.Position.X - _dragOffset.X, Cursor.Position.Y - _dragOffset.Y);
        };
        control.MouseUp += (_, _) => _dragging = false;
    }

    protected override void WndProc(ref Message message)
    {
        const int WmNcHitTest = 0x0084;
        if (message.Msg == WmNcHitTest)
        {
            base.WndProc(ref message);
            if ((int)message.Result == 1)
            {
                var screenPoint = new Point(
                    unchecked((short)(long)message.LParam),
                    unchecked((short)((long)message.LParam >> 16)));
                var point = PointToClient(screenPoint);
                var left = point.X <= ResizeBorder;
                var right = point.X >= ClientSize.Width - ResizeBorder;
                var top = point.Y <= ResizeBorder;
                var bottom = point.Y >= ClientSize.Height - ResizeBorder;

                message.Result = (IntPtr)(left && top ? 13 :
                    right && top ? 14 :
                    left && bottom ? 16 :
                    right && bottom ? 17 :
                    left ? 10 :
                    right ? 11 :
                    top ? 12 :
                    bottom ? 15 : 1);
            }
            return;
        }
        base.WndProc(ref message);
    }
}
