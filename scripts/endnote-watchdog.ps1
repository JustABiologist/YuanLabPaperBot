<#
.SYNOPSIS
  Watches a folder for new .ris files, imports them into EndNote.
  Run this on the Windows machine that has EndNote Desktop installed.

.DESCRIPTION
  This script monitors the bot's outbox folder for new .ris and .pdf files.
  - .ris files: Opens with EndNote (file association triggers import)
  - .pdf files: Copies to EndNote's PDF Auto Import folder

  Run this as a scheduled task that starts on boot.
#>

param(
  [string]$WatchFolder = "C:\LabPaperBot\outbox",
  [string]$PdfImportFolder = "$env:USERPROFILE\EndNote PDF Import",
  [int]$PollIntervalMs = 5000
)

Write-Host "=== Lab Paper Bot - EndNote Watchdog ===" -ForegroundColor Cyan
Write-Host "Watching: $WatchFolder" -ForegroundColor Yellow
if ($PdfImportFolder) {
  Write-Host "PDF Import: $PdfImportFolder" -ForegroundColor Yellow
}
Write-Host "Poll interval: ${PollIntervalMs}ms" -ForegroundColor Yellow
Write-Host ""

# Track processed files to avoid duplicates
$processed = @{}

while ($true) {
  Start-Sleep -Milliseconds $PollIntervalMs

  # Check for .ris files
  $risFiles = Get-ChildItem -Path $WatchFolder -Filter "*.ris" -File | Where-Object {
    -not $processed.ContainsKey($_.FullName)
  }

  foreach ($file in $risFiles) {
    Write-Host "[$(Get-Date -Format HH:mm:ss)] New RIS: $($file.Name)" -ForegroundColor Green
    try {
      # Open .ris with default program (EndNote if file association is set)
      Start-Process -FilePath $file.FullName -Verb Open
      $processed[$file.FullName] = $true
      Write-Host "  -> Opened with EndNote" -ForegroundColor Green
    } catch {
      Write-Host "  -> Failed: $_" -ForegroundColor Red
    }
  }

  # Check for .pdf files (copy to EndNote auto-import folder)
  if ($PdfImportFolder -and (Test-Path $PdfImportFolder)) {
    $pdfFiles = Get-ChildItem -Path $WatchFolder -Filter "*.pdf" -File | Where-Object {
      -not $processed.ContainsKey($_.FullName)
    }

    foreach ($file in $pdfFiles) {
      Write-Host "[$(Get-Date -Format HH:mm:ss)] New PDF: $($file.Name)" -ForegroundColor Green
      try {
        Copy-Item -Path $file.FullName -Destination "$PdfImportFolder\$($file.Name)" -Force
        $processed[$file.FullName] = $true
        Write-Host "  -> Copied to EndNote PDF Import folder" -ForegroundColor Green
      } catch {
        Write-Host "  -> Failed: $_" -ForegroundColor Red
      }
    }
  }

  # Clean up old processed entries (keep last 500)
  if ($processed.Count -gt 500) {
    $keys = $processed.Keys | Select-Object -First ($processed.Count - 500)
    foreach ($k in $keys) { $processed.Remove($k) }
  }
}
