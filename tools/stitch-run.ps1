[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$From,

  [Parameter(Mandatory = $true)]
  [string]$Prompt,

  # Optional: override repo root (defaults to parent of tools/)
  [string]$RepoRoot = "",

  # Optional: override the run dir. If omitted, uses runs\stitch_<yyyyMMdd_HHmmss>
  [string]$RunDir = "",

  # Optional: set a stitch backend override (stitch_web_ingest|stitch_auto_playwright)
  [string]$StitchBackend = "",

  # Default behavior: strict-any ON (recommended for release branches)
  [switch]$NoStrictAny,

  # Optional: allow running without render (debug/ingest-only)
  [switch]$NoRender,

  # Microwave-complete: open the output folder in Explorer after success
  [switch]$Open
)

$ErrorActionPreference = "Stop"

### Shared helper(s)
. (Join-Path $PSScriptRoot "pslib.ps1")

# Under strict mode, $LASTEXITCODE may be unset until an external process runs.
$global:LASTEXITCODE = 0

function Infer-RepoRoot([string]$explicit) {
  if ($explicit -and $explicit.Trim()) { return $explicit }
  return (Resolve-Path (Join-Path $PSScriptRoot "..") -ErrorAction Stop).Path
}

function New-RunDir {
  $stamp = Get-Date -Format "yyyyMMdd_HHmmss"
  return ("runs\stitch_{0}" -f $stamp)
}

$RepoRoot = Infer-RepoRoot $RepoRoot

if (-not $RunDir) { $RunDir = New-RunDir }

$absRunDir = $RunDir
if (-not [System.IO.Path]::IsPathRooted($absRunDir)) {
  $absRunDir = (Join-Path $RepoRoot $RunDir)
}

Push-Location $RepoRoot
try {
  # 1) Import Stitch export using the shared stitch-import script (no duplication)
  Write-Host "== Stitch: Import ==" -ForegroundColor Cyan
  & (Join-Path $PSScriptRoot "stitch-import.ps1") -RepoRoot $RepoRoot -RunDir $absRunDir -From $From

  # 2) Run /ui stitch with strict-any + stitch-render (unless disabled)
  Write-Host "== Stitch: Build + Render ==" -ForegroundColor Cyan
  $env:SINTRAPRIME_RUN_DIR = $absRunDir

  $args = @("--import", "tsx", "src/cli/run-command.ts")
  if (-not $NoStrictAny) { $args += "--strict-any" }
  if (-not $NoRender) { $args += "--stitch-render" }
  if ($StitchBackend) { $args += ("--stitch-backend={0}" -f $StitchBackend) }

  $cmd = "/ui stitch " + $Prompt
  $args += $cmd

  & node @args
  $exitCode = $LASTEXITCODE

  # 3) Print artifact paths
  Write-Host "" 
  Write-Host "== Stitch: Artifacts ==" -ForegroundColor Green

  $stitchDir = Join-Path $absRunDir "stitch"
  $pack = Join-Path $stitchDir "stitchpack.json"
  $stable = Join-Path $stitchDir "stitchpack.stable.json"
  $stableSha = Join-Path $stitchDir "stitchpack.stable.sha256"
  $pitch = Join-Path $stitchDir "pitch.md"
  $deckDir = Join-Path $stitchDir "deck"
  $refusalDir = Join-Path $absRunDir "refusal"

  if (Test-Path $pack) { Write-Host ("stitchpack.json:          {0}" -f $pack) }
  if (Test-Path $stable) { Write-Host ("stitchpack.stable.json:   {0}" -f $stable) }
  if (Test-Path $stableSha) { Write-Host ("stitchpack.stable.sha256: {0}" -f $stableSha) }
  if (Test-Path $pitch) { Write-Host ("pitch.md:                {0}" -f $pitch) }

  if (Test-Path $deckDir) {
    $deckFiles = Get-ChildItem -File -Path $deckDir -ErrorAction SilentlyContinue
    if ($deckFiles) {
      Write-Host ("deck/:                   {0}" -f $deckDir)
      foreach ($f in $deckFiles) { Write-Host ("  - {0}" -f $f.FullName) }
    } else {
      Write-Host ("deck/:                   {0} (empty)" -f $deckDir) -ForegroundColor Yellow
    }
  }

  if ($exitCode -eq 2 -and (Test-Path $refusalDir)) {
    Write-Host "" 
    Write-Host "== REFUSED (exit 2) ==" -ForegroundColor Red
    $rj = Join-Path $refusalDir "refusal.json"
    $rm = Join-Path $refusalDir "refusal.md"
    if (Test-Path $rm) { Write-Host ("refusal.md:  {0}" -f $rm) -ForegroundColor Red }
    if (Test-Path $rj) { Write-Host ("refusal.json:{0}" -f $rj) -ForegroundColor Red }
  }

  if ($Open -and $exitCode -eq 0) {
    # Prefer deck.pdf (highlight), then deck.pptx, then deck.html, then deck dir,
    # then stitch root, then run dir.
    $deckPdf  = Join-Path $deckDir "deck.pdf"
    $deckPptx = Join-Path $deckDir "deck.pptx"
    $deckHtml = Join-Path $deckDir "deck.html"
    [void](Open-ExplorerSafe @($deckPdf, $deckPptx, $deckHtml, $deckDir, $stitchDir, $absRunDir) -SelectFile)
  }

  exit $exitCode
}
finally {
  Pop-Location
}
