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

Section "Drift summary artifact (no logs)"
TryCmd {
  $latest = gh run list --repo $Repo --workflow "verify-branch-protection.yml" --branch $Branch -L 1 --json databaseId,status,conclusion,url --jq '.[0]'
  if (-not $latest) { Write-Host "No runs found." -ForegroundColor Yellow; return }

  $run = $latest | ConvertFrom-Json
  $conclusion = if ($null -eq $run.conclusion) { "" } else { $run.conclusion }

  Write-Host ("Latest drift run: #" + $run.databaseId + " -> " + $run.status + " " + $conclusion) -ForegroundColor Gray
  Write-Host ("URL: " + $run.url) -ForegroundColor Gray

  $tmp = Join-Path $env:TEMP ("bp_drift_" + $run.databaseId)
  Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue | Out-Null
  New-Item -ItemType Directory -Path $tmp | Out-Null

  gh run download $run.databaseId --repo $Repo --name "bp-drift-summary" --dir $tmp | Out-Null

  $found = Get-ChildItem -Path $tmp -Recurse -Filter "bp_drift_summary.json" -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $found) {
    Write-Host "Artifact bp_drift_summary.json not found (older runs may not have it yet)." -ForegroundColor Yellow
    return
  }

  $s = Get-Content $found.FullName -Raw | ConvertFrom-Json

  Write-Host ("ok: " + $s.ok) -ForegroundColor Cyan
  Write-Host ("token_present: " + $s.token_present + " | token_admin_read_ok: " + $s.token_admin_read_ok) -ForegroundColor Cyan
  if ($null -ne $s.token_checked_at) {
    Write-Host ("token_checked_at: " + $s.token_checked_at) -ForegroundColor Cyan
  }
  if ($null -ne $s.token_scope_repo -or $null -ne $s.token_permission_admin_read) {
    $scopeRepo = if ($null -ne $s.token_scope_repo) { $s.token_scope_repo } else { "(n/a)" }
    $adminRead = if ($null -ne $s.token_permission_admin_read) { $s.token_permission_admin_read } else { "(n/a)" }
    Write-Host ("token_scope_repo: " + $scopeRepo + " | token_permission_admin_read: " + $adminRead) -ForegroundColor Cyan
  }

  Write-Host "`nExpected contexts:" -ForegroundColor Gray
  $s.expected_contexts | ForEach-Object { Write-Host "  - $_" }

  Write-Host "`nActual contexts:" -ForegroundColor Gray
  $s.actual_contexts | ForEach-Object { Write-Host "  - $_" }

  if ($s.missing_contexts.Count -gt 0) {
    Write-Host "`nMissing contexts:" -ForegroundColor Yellow
    $s.missing_contexts | ForEach-Object { Write-Host "  - $_" -ForegroundColor DarkYellow }
  }

  if ($s.extra_contexts.Count -gt 0) {
    Write-Host "`nExtra contexts:" -ForegroundColor Yellow
    $s.extra_contexts | ForEach-Object { Write-Host "  - $_" -ForegroundColor DarkYellow }
  }
} "Could not download drift artifact (need Actions read perms)."

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
