# scripts/verify/post-merge-ritual.ps1
# Post-merge verification ritual for SintraPrime governance + CI.
# Usage:
#   pwsh scripts/verify/post-merge-ritual.ps1
# Optional:
#   pwsh scripts/verify/post-merge-ritual.ps1 -Repo "ihoward40/SintraPrime" -Branch "master"

param(
  [string]$Repo = "ihoward40/SintraPrime",
  [string]$Branch = "master"
)

$ErrorActionPreference = "Stop"
$env:GH_PAGER = "cat"

function Section([string]$title) {
  Write-Host ""
  Write-Host "== $title ==" -ForegroundColor Cyan
}

function TryCmd([scriptblock]$sb, [string]$fallbackMessage) {
  try { & $sb }
  catch { Write-Host $fallbackMessage -ForegroundColor Yellow; Write-Host $_.Exception.Message -ForegroundColor DarkYellow }
}

Section "Repo + CLI sanity"
TryCmd { gh --version } "gh not available"
TryCmd { gh repo view $Repo --json nameWithOwner,defaultBranchRef --jq '{repo:.nameWithOwner, defaultBranch:.defaultBranchRef.name}' } "Could not read repo view"

Section "Required contexts on branch protection"
TryCmd {
  gh api "repos/$Repo/branches/$Branch/protection/required_status_checks" --jq '{strict, contexts}'
} "Could not read required_status_checks (need admin or branch protection enabled)"

Section "Key workflows registered (augment, gitstream, drift)"
TryCmd {
  gh api "repos/$Repo/actions/workflows" --jq '
    .workflows[]
    | select(
        .path==".github/workflows/augment-agent.yml"
        or .path==".github/workflows/gitstream.yml"
        or .path==".github/workflows/verify-branch-protection.yml"
      )
    | {name, state, path, id}
  '
} "Could not list workflows"

Section "Drift workflow latest run on branch"
TryCmd {
  gh run list --repo $Repo --workflow "verify-branch-protection.yml" --branch $Branch -L 3
} "Could not list drift runs"

Section "Drift failure summary (safe)"
TryCmd {
  $latest = gh run list --repo $Repo --workflow "verify-branch-protection.yml" --branch $Branch -L 1 --json databaseId,status,conclusion,url --jq '.[0]'
  if (-not $latest) {
    Write-Host "No runs found." -ForegroundColor Yellow
    return
  }

  $obj = $latest | ConvertFrom-Json
  $conclusion = if ($null -eq $obj.conclusion) { "" } else { $obj.conclusion }

  Write-Host ("Latest drift run: #" + $obj.databaseId + " -> " + $obj.status + " " + $conclusion) -ForegroundColor Gray
  Write-Host ("URL: " + $obj.url) -ForegroundColor Gray

  if ($obj.status -ne "completed") {
    Write-Host "Run not completed yet; skipping log peek." -ForegroundColor Yellow
    return
  }

  if ($obj.conclusion -ne "success") {
    # Pull only error-ish lines; avoid dumping full logs.
    $log = gh run view $obj.databaseId --repo $Repo --log-failed 2>$null
    if (-not $log) {
      $log = gh run view $obj.databaseId --repo $Repo --log 2>$null
    }
    if (-not $log) {
      Write-Host "Could not read logs (permissions?)" -ForegroundColor Yellow
      return
    }

    $hits = $log -split "`n" | Where-Object {
      $_ -match "::error::" -or
      $_ -match "Missing BRANCH_PROTECTION_TOKEN" -or
      $_ -match "\b401\b" -or
      $_ -match "\b403\b" -or
      $_ -match "\b404\b"
    } | Select-Object -First 25

    if ($hits.Count -gt 0) {
      Write-Host "Key failure lines:" -ForegroundColor Yellow
      $hits | ForEach-Object { Write-Host $_ -ForegroundColor DarkYellow }
    } else {
      Write-Host "No obvious error markers found in logs (showing URL above)." -ForegroundColor Yellow
    }
  } else {
    Write-Host "Drift check is green." -ForegroundColor Green
  }
} "Could not summarize drift failure (need Actions read perms)."

Section "BRANCH_PROTECTION_TOKEN secret present?"
TryCmd {
  # GitHub will return nothing if you have no secrets or you lack permission.
  $names = @(gh secret list -R $Repo --json name --jq '.[].name' 2>$null)
  if ($names.Count -eq 0) {
    Write-Host "No secrets visible (either none exist or you lack admin permission)." -ForegroundColor Yellow
  } elseif ($names -contains "BRANCH_PROTECTION_TOKEN") {
    Write-Host "OK: BRANCH_PROTECTION_TOKEN exists." -ForegroundColor Green
  } else {
    Write-Host "MISSING: BRANCH_PROTECTION_TOKEN" -ForegroundColor Red
  }
} "Could not list secrets (need repo admin)"

Section "Actionable next steps"
Write-Host "- If drift is failing with Missing BRANCH_PROTECTION_TOKEN:" -ForegroundColor Gray
Write-Host "    gh secret set BRANCH_PROTECTION_TOKEN -R $Repo" -ForegroundColor Gray
Write-Host "    gh workflow run 233376120 --ref $Branch" -ForegroundColor Gray
Write-Host "    gh run watch --exit-status" -ForegroundColor Gray
