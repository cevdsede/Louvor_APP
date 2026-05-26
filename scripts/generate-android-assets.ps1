param(
  [string]$Source = "assets\android\logoapk.png"
)

$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$sourcePath = Join-Path $root $Source
$resPath = Join-Path $root "android\app\src\main\res"

if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw "Logo source not found: $sourcePath"
}

Add-Type -AssemblyName System.Drawing

function New-Bitmap($width, $height, $background = $null) {
  $bitmap = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

  if ($background) {
    $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml($background))
  } else {
    $graphics.Clear([System.Drawing.Color]::Transparent)
  }

  return @{ Bitmap = $bitmap; Graphics = $graphics }
}

function Save-Png($bitmap, $path) {
  $directory = Split-Path -Parent $path
  New-Item -ItemType Directory -Force -Path $directory | Out-Null
  $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Save-LauncherIcon($image, $path, $size, $scale = 1.0) {
  $canvas = New-Bitmap $size $size
  $drawSize = [int]($size * $scale)
  $offset = [int](($size - $drawSize) / 2)
  $canvas.Graphics.DrawImage($image, $offset, $offset, $drawSize, $drawSize)
  Save-Png $canvas.Bitmap $path
  $canvas.Graphics.Dispose()
  $canvas.Bitmap.Dispose()
}

function Save-Splash($image, $path) {
  $size = 2732
  $canvas = New-Bitmap $size $size "#050507"

  $gold = [System.Drawing.Color]::FromArgb(95, 245, 184, 28)
  $softGold = [System.Drawing.Color]::FromArgb(32, 245, 184, 28)
  $pen = New-Object System.Drawing.Pen($gold, 4)
  $softPen = New-Object System.Drawing.Pen($softGold, 2)

  for ($i = 0; $i -lt 12; $i++) {
    $y = 260 + ($i * 175)
    $canvas.Graphics.DrawLine($softPen, 160, $y, 760, $y)
    $canvas.Graphics.DrawLine($softPen, 1970, ($y + 80), 2570, ($y + 80))
  }

  $canvas.Graphics.DrawLine($pen, 360, 520, 900, 520)
  $canvas.Graphics.DrawLine($pen, 1830, 2240, 2380, 2240)

  $logoSize = 1120
  $logoOffset = [int](($size - $logoSize) / 2)
  $canvas.Graphics.DrawImage($image, $logoOffset, $logoOffset, $logoSize, $logoSize)

  Save-Png $canvas.Bitmap $path

  $pen.Dispose()
  $softPen.Dispose()
  $canvas.Graphics.Dispose()
  $canvas.Bitmap.Dispose()
}

$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)

$densities = @(
  @{ Name = "mdpi"; Size = 48; Foreground = 108 },
  @{ Name = "hdpi"; Size = 72; Foreground = 162 },
  @{ Name = "xhdpi"; Size = 96; Foreground = 216 },
  @{ Name = "xxhdpi"; Size = 144; Foreground = 324 },
  @{ Name = "xxxhdpi"; Size = 192; Foreground = 432 }
)

foreach ($density in $densities) {
  $folder = Join-Path $resPath ("mipmap-" + $density.Name)
  Save-LauncherIcon $sourceImage (Join-Path $folder "ic_launcher.png") $density.Size 1.0
  Save-LauncherIcon $sourceImage (Join-Path $folder "ic_launcher_round.png") $density.Size 1.0
  Save-LauncherIcon $sourceImage (Join-Path $folder "ic_launcher_foreground.png") $density.Foreground 0.82
}

Save-Splash $sourceImage (Join-Path $resPath "drawable\splash.png")

$valuesBackground = Join-Path $resPath "values\ic_launcher_background.xml"
@'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#050507</color>
</resources>
'@ | Set-Content -LiteralPath $valuesBackground -Encoding UTF8

$drawableBackground = Join-Path $resPath "drawable\ic_launcher_background.xml"
@'
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle">
    <solid android:color="#050507" />
</shape>
'@ | Set-Content -LiteralPath $drawableBackground -Encoding UTF8

$sourceImage.Dispose()

Write-Host "Android launcher and splash assets generated from $Source"
