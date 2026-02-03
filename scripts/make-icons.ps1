Add-Type -AssemblyName System.Drawing

$color = [System.Drawing.Color]::FromArgb(0x1d, 0x4e, 0xd8)

function New-Icon {
    param(
        [string]$Path,
        [int]$Size
    )

    $bmp = New-Object System.Drawing.Bitmap $Size, $Size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.Clear($color)
    $g.TextRenderingHint = 'AntiAlias'

    $font = New-Object System.Drawing.Font('Arial', [int]($Size * 0.35), [System.Drawing.FontStyle]::Bold)
    $white = [System.Drawing.Brushes]::White
    $text = 'SI'
    $sz = $g.MeasureString($text, $font)
    $x = ($Size - $sz.Width) / 2
    $y = ($Size - $sz.Height) / 2
    $g.DrawString($text, $font, $white, $x, $y)

    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

New-Icon "public/icon-512.png" 512
New-Icon "public/icon-192.png" 192
