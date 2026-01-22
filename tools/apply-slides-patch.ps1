param(
  [string]$PatchPath = "patches\\hard-freeze-v2-row-pack.modify-only.patch",
  [switch]$Commit,
  [switch]$NoCommit,
  [string]$CommitMessage = "feat(slides): hard-freeze table pagination + v2 row packing"
)

$ErrorActionPreference = "Stop"

function Assert-Ok([string]$Label) {
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed (exit=$LASTEXITCODE)"
  }
}

Push-Location (Split-Path -Parent $MyInvocation.MyCommand.Path)
Pop-Location

Push-Location (Resolve-Path "..").Path

if ($Commit -and $NoCommit) {
  throw "Pass either -Commit or -NoCommit, not both."
}

Write-Host "[1/6] Preflight patch" -ForegroundColor Cyan
if (!(Test-Path $PatchPath)) { throw "Patch not found: $PatchPath" }

git apply --check --whitespace=nowarn -p0 $PatchPath
Assert-Ok "git apply --check"

Write-Host "[2/6] Apply patch" -ForegroundColor Cyan
git apply -p0 $PatchPath
Assert-Ok "git apply"

Write-Host "[3/6] Status + diffstat" -ForegroundColor Cyan
git status
Assert-Ok "git status"

git diff --stat
Assert-Ok "git diff --stat"

Write-Host "[4/6] Typecheck" -ForegroundColor Cyan
npm run -s typecheck
Assert-Ok "npm run typecheck"

Write-Host "[5/6] Slides smoke" -ForegroundColor Cyan
npm run -s ci:slides-smoke
Assert-Ok "npm run ci:slides-smoke"

if ($Commit) {
  Write-Host "[6/6] Commit" -ForegroundColor Cyan
  git add -A src/slides/render/table-grid.ts src/slides/render/pptx.ts $PatchPath
  Assert-Ok "git add"
  git commit -m $CommitMessage
  Assert-Ok "git commit"
} else {
  Write-Host "[6/6] Skipping commit (use -Commit to commit)" -ForegroundColor Yellow
}

Pop-Location
