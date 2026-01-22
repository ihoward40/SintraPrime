# tools/pslib.ps1
# Shared PowerShell helpers for operator scripts.

Set-StrictMode -Version Latest

function Open-ExplorerSafe {
  [CmdletBinding()]
  param(
    # One path or many candidate paths; opens the first existing target.
    [Parameter(Mandatory=$true)]
    [string[]]$Path,

    # If the resolved target is a file, open Explorer with that file highlighted.
    # If the target is a directory, opens the directory (regardless of this switch).
    [switch]$SelectFile
  )

  try {
    foreach ($candidate in $Path) {
      if (-not $candidate) { continue }

      $p = $candidate
      # Resolve relative or absolute; if resolution fails, try next candidate.
      try {
        $p = (Resolve-Path -LiteralPath $p -ErrorAction Stop).Path
      } catch {
        continue
      }

      if (Test-Path -LiteralPath $p) {
        $item = Get-Item -LiteralPath $p -ErrorAction SilentlyContinue
        if ($SelectFile -and $item -and -not $item.PSIsContainer) {
          # Highlight the file in Explorer.
          Start-Process explorer.exe -ArgumentList @("/select,`"$p`"") | Out-Null
        } else {
          # Open directory (or file without select).
          Start-Process explorer.exe -ArgumentList @("$p") | Out-Null
        }
        return $true
      }
    }
  } catch {
    # swallow: "safe" means no operator interruption
  }

  return $false
}
