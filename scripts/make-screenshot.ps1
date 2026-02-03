Add-Type -AssemblyName System.Drawing

function New-Screenshot {
    param(
        [int]$Width,
        [int]$Height,
        [string]$Path,
        [string]$Title,
        [string]$Subtitle,
        [string[]]$Lines
    )

    $bmp = New-Object System.Drawing.Bitmap $Width, $Height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'
    $g.TextRenderingHint = 'AntiAlias'

    $bg = [System.Drawing.Color]::FromArgb(0xF5, 0xF3, 0xFF)
    $g.Clear($bg)

    $panelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $panelPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(0xDD, 0xDD, 0xDD), 2)
    $padX = [Math]::Round($Width * 0.05)
    $padY = [Math]::Round($Height * 0.36)
    $panelW = $Width - (2 * $padX)
    $panelH = [Math]::Round($Height * 0.5)
    $g.FillRectangle($panelBrush, $padX, $padY, $panelW, $panelH)
    $g.DrawRectangle($panelPen, $padX, $padY, $panelW, $panelH)

    $headingFont = New-Object System.Drawing.Font('Segoe UI', 48, [System.Drawing.FontStyle]::Bold)
    $subFont = New-Object System.Drawing.Font('Segoe UI', 24, [System.Drawing.FontStyle]::Regular)
    $bodyFont = New-Object System.Drawing.Font('Segoe UI', 16, [System.Drawing.FontStyle]::Regular)

    $titleBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0x4F, 0x46, 0xE5))
    $bodyBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0x33, 0x33, 0x33))
    $mutedBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0x66, 0x66, 0x66))

    $g.DrawString($Title, $headingFont, $titleBrush, $padX, [Math]::Round($Height * 0.1))
    $g.DrawString($Subtitle, $subFont, $mutedBrush, $padX + 4, [Math]::Round($Height * 0.2))

    $lineY = $padY + 40
    foreach ($line in $Lines) {
        $brush = $bodyBrush
        if ($line -like '*•*') { $brush = $mutedBrush }
        $g.DrawString($line, $bodyFont, $brush, $padX + 20, $lineY)
        $lineY += 40
    }

    $bmp.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
}

New-Screenshot `
    -Width 1280 `
    -Height 720 `
    -Path "public/screenshot-wide.png" `
    -Title "ClientWave" `
    -Subtitle "Dashboard & Invoice Builder" `
    -Lines @(
        "Clients, invoices, PDF + email",
        "User-scoped data • Branded emails • Offline-ready shell",
        "Create invoice   •   Send email   •   Download PDF",
        "PWA install: Add to Home Screen or Install app"
    )

New-Screenshot `
    -Width 720 `
    -Height 1280 `
    -Path "public/screenshot-portrait.png" `
    -Title "ClientWave" `
    -Subtitle "Mobile-first auth & invoices" `
    -Lines @(
        "Login + Register in one screen",
        "Add clients and invoices on the go",
        "Branded emails, PDF download",
        "Installable PWA shell"
    )
