[CmdletBinding()]
param(
  # Optional: override the repo root (defaults to parent of tools/)
  [string]$RepoRoot = "",

  [Parameter(Mandatory = $true)]
  [string]$RunDir,

  [Parameter(Mandatory = $true)]
  [string]$From,

  # Microwave-complete: open the import/output folder in Explorer after success
  [switch]$Open
)

$ErrorActionPreference = "Stop"

### Shared helper(s)
. (Join-Path $PSScriptRoot "pslib.ps1")

function Infer-RepoRoot([string]$explicit) {
  if ($explicit -and $explicit.Trim()) { return $explicit }
  # Assume tools/ is inside repo; repo root = parent of tools/
  return (Resolve-Path (Join-Path $PSScriptRoot "..") -ErrorAction Stop).Path
}

$RepoRoot = Infer-RepoRoot $RepoRoot

Push-Location $RepoRoot
try {
  $absRunDir = $RunDir
  if (-not [System.IO.Path]::IsPathRooted($absRunDir)) {
    $absRunDir = (Join-Path $RepoRoot $RunDir)
  }

  $fromAbs = $From
  if (-not [System.IO.Path]::IsPathRooted($fromAbs)) {
    $fromAbs = (Join-Path $RepoRoot $From)
  }

  $target = Join-Path $absRunDir "stitch\import"
  New-Item -ItemType Directory -Force -Path $target | Out-Null

  if ($fromAbs.ToLower().EndsWith(".zip")) {
    Expand-Archive -Force -Path $fromAbs -DestinationPath $target
  } else {
    Copy-Item -Recurse -Force -Path (Join-Path $fromAbs "*") -Destination $target
  }

  Write-Host "Imported Stitch export into: $target" -ForegroundColor Green

  if ($Open) {
    [void](Open-ExplorerSafe @($target, $absRunDir))
  }
}
finally {
  Pop-Location
}
