param(
  [string]$RepoRoot = "c:\Users\admin\.sintraprime esm project",
  [switch]$RunChecks = $true,
  [switch]$RequireCleanWorktree = $false,
  [string]$Message = "feat(governance): TurboSparse + strict-any symmetry + opt-in cache/budget + CI + operator runner"
)

$ErrorActionPreference = "Stop"

# Allowlist: only these paths may be staged/committed by this script
# NOTE: paths are normalized to use forward slashes.
$Allow = @(
  "README.md",
  ".github/workflows/ci.yml",
  "package.json",
  "src/turbosparse",
  "src/slides/gamma",
  "src/cli/run-command.ts",
  "src/prompt/assembleSystemPrompt.ts",
  "src/governance/refusal-pack.ts",
  "scripts/ci",
  "tools"
)

function Normalize-PathLike([string]$p) {
  return ($p ?? "").Replace('\\', '/').Trim()
}

function Get-StagedPaths {
  # returns array of staged file paths (relative)
  $out = git diff --name-only --cached
  if (-not $out) { return @() }
  return ($out -split "`r?`n") | ForEach-Object { Normalize-PathLike $_ } | Where-Object { $_ -ne "" }
}

function Path-IsAllowed([string]$p) {
  $p = Normalize-PathLike $p
  foreach ($a in $Allow) {
    $aN = Normalize-PathLike $a
    if ($p -eq $aN) { return $true }
    if ($p.StartsWith($aN + "/")) { return $true }
  }
  return $false
}

Push-Location $RepoRoot

Write-Host "== Safe Commit (Upgrade Only) ==" -ForegroundColor Cyan

# Paranoid mode: refuse if ANY unstaged changes exist (including untracked files)
if ($RequireCleanWorktree) {
  $porcelain = git status --porcelain
  if ($LASTEXITCODE -ne 0) { throw "git status failed." }

  if ($porcelain -and $porcelain.Trim().Length -gt 0) {
    Write-Host "ERROR: Worktree is not clean (RequireCleanWorktree enabled). Refusing to proceed." -ForegroundColor Red
    Write-Host "Uncommitted changes detected:" -ForegroundColor Red
    ($porcelain -split "`r?`n") | ForEach-Object {
      if ($_.Trim().Length -gt 0) { Write-Host ("  " + $_) -ForegroundColor Red }
    }
    throw "Clean the worktree (commit/stash/reset/remove untracked) or re-run without -RequireCleanWorktree."
  }
}

# 1) Refuse if anything is already staged outside allowlist
$stagedBefore = Get-StagedPaths
if ($stagedBefore.Count -gt 0) {
  $bad = $stagedBefore | Where-Object { -not (Path-IsAllowed $_) }
  if ($bad.Count -gt 0) {
    Write-Host "ERROR: Found staged changes outside allowlist:" -ForegroundColor Red
    $bad | ForEach-Object { Write-Host ("  " + $_) -ForegroundColor Red }
    throw "Refusing to proceed. Unstage or reset those files first."
  }
}

# 2) Stage only allowlist paths (explicit add; no -A footguns)
Write-Host "Staging allowlisted paths..." -ForegroundColor Cyan

git add `
  README.md `
  .github/workflows/ci.yml `
  package.json `
  src/turbosparse `
  src/slides/gamma `
  src/cli/run-command.ts `
  src/prompt/assembleSystemPrompt.ts `
  src/governance/refusal-pack.ts `
  scripts/ci `
  tools

# 3) Verify staged set is still allowlist-only
$stagedAfter = Get-StagedPaths
$bad2 = $stagedAfter | Where-Object { -not (Path-IsAllowed $_) }
if ($bad2.Count -gt 0) {
  Write-Host "ERROR: Staged changes include non-allowlisted paths:" -ForegroundColor Red
  $bad2 | ForEach-Object { Write-Host ("  " + $_) -ForegroundColor Red }
  throw "Refusing to commit. Something unexpected was staged."
}

if ($stagedAfter.Count -eq 0) {
  Write-Host "Nothing to commit (no staged changes in allowlist)." -ForegroundColor Yellow
  Pop-Location
  exit 0
}

Write-Host "Staged files:" -ForegroundColor Green
$stagedAfter | ForEach-Object { Write-Host ("  " + $_) -ForegroundColor Green }

# 4) Optional checks
if ($RunChecks) {
  Write-Host "Running checks..." -ForegroundColor Cyan

  npm run -s typecheck
  if ($LASTEXITCODE -ne 0) { throw "typecheck failed." }

  npm run -s ci:turbosparse
  if ($LASTEXITCODE -ne 0) { throw "ci:turbosparse failed." }

  npm run -s ci:slides-smoke
  if ($LASTEXITCODE -ne 0) { throw "ci:slides-smoke failed." }
}

# 5) Commit
Write-Host "Committing..." -ForegroundColor Cyan
git commit -m $Message

Write-Host "DONE" -ForegroundColor Green
Pop-Location
