<#
.SYNOPSIS
  Watches a folder for new .ris + .pdf files and imports them into EndNote.

.DESCRIPTION
  - .ris files: Opens with EndNote (file association triggers import)
  - .pdf files: Copies to EndNote's PDF Auto Import folder

  Run this on the Windows machine that has EndNote Desktop installed.
  Works with local paths (C:\) AND UNC paths (\\SERVER\Share\).

  Install as a Scheduled Task (run once as Admin):
    $action = New-ScheduledTaskAction -Execute "PowerShell.exe" -Argument "-ExecutionPolicy Bypass -File `"C:\path\endnote-watchdog.ps1`" -WatchFolder `"\\SERVER\LabData\PaperBot\outbox`""
    $trigger = New-ScheduledTaskTrigger -AtStartup
    Register-ScheduledTask -TaskName "LabPaperBot Watchdog" -Action $action -Trigger $trigger -RunLevel Highest
#>

param(
  [Parameter(Mandatory)]
  [string]$WatchFolder,

  [string]$PdfImportFolder = "",

  [int]$PollIntervalMs = 5000
)

Write-Host "=== Lab Paper Bot - EndNote Watchdog ===" -ForegroundColor Cyan
Write-Host "Watching: $WatchFolder" -ForegroundColor Yellow
if ($PdfImportFolder) {
  Write-Host "PDF Import: $PdfImportFolder" -ForegroundColor Yellow
}
Write-Host "Poll interval: ${PollIntervalMs}ms" -ForegroundColor Yellow

# Validate paths exist
if (-not (Test-Path $WatchFolder)) {
  Write-Host "ERROR: WatchFolder does not exist: $WatchFolder" -ForegroundColor Red
  Write-Host "Make sure the shared disk is accessible and the path is correct."
  Write-Host "  Examples:"
  Write-Host "    \\\\SERVER\\LabData\\PaperBot\\outbox"
  Write-Host "    C:\\Users\\Public\\PaperBot\\outbox"
  exit 1
}

if ($PdfImportFolder -and -not (Test-Path $PdfImportFolder)) {
  Write-Host "WARNING: PdfImportFolder does not exist: $PdfImportFolder - PDF copy disabled" -ForegroundColor Yellow
  $PdfImportFolder = ""
}

Write-Host ""
Write-Host "Waiting for new files... (Ctrl+C to stop)" -ForegroundColor Gray

# Track processed file full paths to avoid duplicates across restarts
$processed = @{}

while ($true) {
  Start-Sleep -Milliseconds $PollIntervalMs

  # ── Handle .ris files ──────────────────────────────────
  try {
    $risFiles = Get-ChildItem -Path $WatchFolder -Filter "*.ris" -File -ErrorAction Stop | Where-Object {
      -not $processed.ContainsKey($_.FullName)
    }

    foreach ($file in $risFiles) {
      Write-Host "[$(Get-Date -Format HH:mm:ss)] New RIS: $($file.Name)" -ForegroundColor Green
      try {
        Start-Process -FilePath $file.FullName -Verb Open
        $processed[$file.FullName] = $true
        Write-Host "  -> Sent to EndNote" -ForegroundColor Green
      } catch {
        Write-Host "  -> FAILED to open: $_" -ForegroundColor Red
        Write-Host "  -> Tip: Right-click a .ris file -> Open with -> EndNote -> Always use this app"
      }
    }
  } catch {
    # Path might be temporarily unavailable (network hiccup) - skip this poll
  }

  # ── Handle .pdf files (copy to EndNote auto-import) ───
  if ($PdfImportFolder) {
    try {
      $pdfFiles = Get-ChildItem -Path $WatchFolder -Filter "*.pdf" -File -ErrorAction Stop | Where-Object {
        -not $processed.ContainsKey($_.FullName)
      }

      foreach ($file in $pdfFiles) {
        Write-Host "[$(Get-Date -Format HH:mm:ss)] New PDF: $($file.Name)" -ForegroundColor Green
        try {
          $dest = Join-Path $PdfImportFolder $file.Name
          Copy-Item -Path $file.FullName -Destination $dest -Force
          $processed[$file.FullName] = $true
          Write-Host "  -> Copied to EndNote PDF Import" -ForegroundColor Green
        } catch {
          Write-Host "  -> FAILED to copy PDF: $_" -ForegroundColor Red
        }
      }
    } catch {}
  }

  # ── Cleanup old entries (keep last 500) ────────────────
  if ($processed.Count -gt 500) {
    $keys = $processed.Keys | Select-Object -First ($processed.Count - 500)
    foreach ($k in $keys) { $processed.Remove($k) }
  }
}
