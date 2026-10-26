Add-Type -AssemblyName System.Drawing

function Generate-GoldIcon([int]$size, [string]$outputPath) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Background squircle
    $rect = New-Object System.Drawing.Rectangle 0, 0, $size, $size
    $bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.PointF 0, 0),
        (New-Object System.Drawing.PointF $size, $size),
        [System.Drawing.Color]::FromArgb(255, 31, 44, 71),
        [System.Drawing.Color]::FromArgb(255, 8, 12, 22)
    )
    $radius = [int]($size * 0.26)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    $path.AddArc(0, 0, $d, $d, 180, 90)
    $path.AddArc($size - $d, 0, $d, $d, 270, 90)
    $path.AddArc($size - $d, $size - $d, $d, $d, 0, 90)
    $path.AddArc(0, $size - $d, $d, $d, 90, 90)
    $path.CloseFigure()

    $g.FillPath($bgBrush, $path)

    # Gold rim
    $rimPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 233, 185, 73), [float]($size * 0.03))
    $g.DrawPath($rimPen, $path)

    # Radial Glow in center
    $glowRect = New-Object System.Drawing.Rectangle([int]($size * 0.15), [int]($size * 0.15), [int]($size * 0.7), [int]($size * 0.7))
    $glowPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $glowPath.AddEllipse($glowRect)
    $pgh = New-Object System.Drawing.Drawing2D.PathGradientBrush($glowPath)
    $pgh.CenterColor = [System.Drawing.Color]::FromArgb(80, 233, 185, 73)
    $pgh.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 233, 185, 73))
    $g.FillPath($pgh, $glowPath)

    # Shadow under bar
    $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(140, 0, 0, 0))
    $g.FillEllipse($shadowBrush, [float]($size * 0.2), [float]($size * 0.68), [float]($size * 0.6), [float]($size * 0.16))

    # 3D Gold Bar coordinates (scaled)
    # Left face
    $pLeft = @(
        (New-Object System.Drawing.PointF ($size * 0.27), ($size * 0.33)),
        (New-Object System.Drawing.PointF ($size * 0.38), ($size * 0.49)),
        (New-Object System.Drawing.PointF ($size * 0.31), ($size * 0.68)),
        (New-Object System.Drawing.PointF ($size * 0.20), ($size * 0.51))
    )
    $brushLeft = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.PointF ($size * 0.2), ($size * 0.33)),
        (New-Object System.Drawing.PointF ($size * 0.38), ($size * 0.68)),
        [System.Drawing.Color]::FromArgb(255, 138, 81, 0),
        [System.Drawing.Color]::FromArgb(255, 69, 38, 0)
    )
    $g.FillPolygon($brushLeft, $pLeft)

    # Front face
    $pFront = @(
        (New-Object System.Drawing.PointF ($size * 0.38), ($size * 0.49)),
        (New-Object System.Drawing.PointF ($size * 0.80), ($size * 0.42)),
        (New-Object System.Drawing.PointF ($size * 0.73), ($size * 0.60)),
        (New-Object System.Drawing.PointF ($size * 0.31), ($size * 0.68))
    )
    $brushFront = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.PointF ($size * 0.38), ($size * 0.42)),
        (New-Object System.Drawing.PointF ($size * 0.73), ($size * 0.68)),
        [System.Drawing.Color]::FromArgb(255, 229, 158, 18),
        [System.Drawing.Color]::FromArgb(255, 100, 56, 0)
    )
    $g.FillPolygon($brushFront, $pFront)

    # Top face
    $pTop = @(
        (New-Object System.Drawing.PointF ($size * 0.27), ($size * 0.33)),
        (New-Object System.Drawing.PointF ($size * 0.69), ($size * 0.26)),
        (New-Object System.Drawing.PointF ($size * 0.80), ($size * 0.42)),
        (New-Object System.Drawing.PointF ($size * 0.38), ($size * 0.49))
    )
    $brushTop = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.PointF ($size * 0.27), ($size * 0.26)),
        (New-Object System.Drawing.PointF ($size * 0.80), ($size * 0.49)),
        [System.Drawing.Color]::FromArgb(255, 255, 255, 255),
        [System.Drawing.Color]::FromArgb(255, 238, 170, 30)
    )
    $g.FillPolygon($brushTop, $pTop)

    # Ridge highlight line
    $ridgePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(220, 255, 255, 255), [float]($size * 0.018))
    $g.DrawLine($ridgePen, (New-Object System.Drawing.PointF ($size * 0.38), ($size * 0.49)), (New-Object System.Drawing.PointF ($size * 0.80), ($size * 0.42)))

    # Text "KKVH 999.9"
    $fontSize = [float]($size * 0.065)
    $font = New-Object System.Drawing.Font ("Arial", [float]$fontSize, [System.Drawing.FontStyle]::Bold)
    $textBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(220, 122, 69, 0))
    $state = $g.Save()
    $g.TranslateTransform(($size * 0.52), ($size * 0.38))
    $g.RotateTransform(-10)
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    $g.DrawString("KKVH 999.9", $font, $textBrush, 0, 0, $sf)
    $g.Restore($state)

    # Sparkle 1 (Top right)
    $spBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $spX = [float]($size * 0.72)
    $spY = [float]($size * 0.20)
    $spR = [float]($size * 0.09)
    $spPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $spPath.AddPolygon(@(
        (New-Object System.Drawing.PointF $spX, ($spY - $spR)),
        (New-Object System.Drawing.PointF ($spX + $spR * 0.25), ($spY - $spR * 0.25)),
        (New-Object System.Drawing.PointF ($spX + $spR), $spY),
        (New-Object System.Drawing.PointF ($spX + $spR * 0.25), ($spY + $spR * 0.25)),
        (New-Object System.Drawing.PointF $spX, ($spY + $spR)),
        (New-Object System.Drawing.PointF ($spX - $spR * 0.25), ($spY + $spR * 0.25)),
        (New-Object System.Drawing.PointF ($spX - $spR), $spY),
        (New-Object System.Drawing.PointF ($spX - $spR * 0.25), ($spY - $spR * 0.25))
    ))
    $g.FillPath($spBrush, $spPath)

    # Sparkle 2 (Left)
    $sp2X = [float]($size * 0.16)
    $sp2Y = [float]($size * 0.42)
    $sp2R = [float]($size * 0.05)
    $sp2Path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $sp2Path.AddPolygon(@(
        (New-Object System.Drawing.PointF $sp2X, ($sp2Y - $sp2R)),
        (New-Object System.Drawing.PointF ($sp2X + $sp2R * 0.25), ($sp2Y - $sp2R * 0.25)),
        (New-Object System.Drawing.PointF ($sp2X + $sp2R), $sp2Y),
        (New-Object System.Drawing.PointF ($sp2X + $sp2R * 0.25), ($sp2Y + $sp2R * 0.25)),
        (New-Object System.Drawing.PointF $sp2X, ($sp2Y + $sp2R)),
        (New-Object System.Drawing.PointF ($sp2X - $sp2R * 0.25), ($sp2Y + $sp2R * 0.25)),
        (New-Object System.Drawing.PointF ($sp2X - $sp2R), $sp2Y),
        (New-Object System.Drawing.PointF ($sp2X - $sp2R * 0.25), ($sp2Y - $sp2R * 0.25))
    ))
    $g.FillPath($spBrush, $sp2Path)

    # Save to file
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated $outputPath ($size x $size)"
}

Generate-GoldIcon 192 "icon-192.png"
Generate-GoldIcon 512 "icon-512.png"
