Param(
  [switch]$FailOnNonDeterminism,
  [int]$MaxBadToShow = 60
)

$ErrorActionPreference = 'Stop'

function Get-ChangedFiles {
  # Tracked changes (unstaged + staged) + untracked files
  $trackedUnstaged = @(git diff --name-only)
  $trackedStaged = @(git diff --cached --name-only)
  $untracked = @(git ls-files --others --exclude-standard)

  $all = @($trackedUnstaged + $trackedStaged + $untracked) |
    Where-Object { $_ -and $_.Trim() -ne "" } |
    Sort-Object -Unique

  return $all
}

function Normalize-PathSlash([string]$p) {
  return ($p -replace '\\','/').Trim()
}

function Classify([string]$p) {
  $p2 = Normalize-PathSlash $p

  # ✅ determinism (allowed in PR1)
  if ($p2 -like 'src/litigation/*') { return '✅ determinism' }
  if ($p2 -like 'src/templates/litigation/*') { return '✅ determinism' }
  if ($p2 -eq 'synergy7-selftest.mjs') { return '✅ determinism' }
  if ($p2 -eq 'scripts/synergy7-selftest.mjs') { return '✅ determinism' }

  # ⚠️ unrelated (must NOT be in PR1)
  if ($p2 -like 'ui/*') { return '⚠️ unrelated' }
  if ($p2 -like 'socialos/*') { return '⚠️ unrelated' }
  if ($p2 -like 'sintra-cluster-console/*') { return '⚠️ unrelated' }

  # Guardrail scripts + wiring (tight allowlist)
  $allow = @(
    'litigation-determinism-guardrail.mjs',
    'no-network-preload.mjs',
    'scripts/ci/litigation-determinism-guardrail.mjs',
    'scripts/ci/no-network-preload.mjs',
    'scripts/postbuild-copy-litigation.mjs',
    'scripts/verify-litigation-packet.mjs',
    '.github/workflows/ci.yml',
    'ci.yml',
    'package.json',
    'package-lock.json',
    'tools/classify-scope.ps1'
  )

  if ($allow -contains $p2) { return '✅ determinism' }

  return '❓ ambiguous'
}

$all = Get-ChangedFiles

$rows = foreach ($f in $all) {
  [pscustomobject]@{
    scope = (Classify $f)
    path  = $f
  }
}

$rows | Sort-Object scope, path | Format-Table -AutoSize

"`nSummary:" | Write-Host
$rows |
  Group-Object scope |
  Sort-Object Name |
  Select-Object @{ Name = 'scope'; Expression = { $_.Name } }, @{ Name = 'count'; Expression = { $_.Count } } |
  Format-Table -AutoSize

if ($FailOnNonDeterminism) {
  $bad = $rows | Where-Object { $_.scope -ne '✅ determinism' }
  if ($bad.Count -gt 0) {
    Write-Host "`nBLOCKED: Non-determinism files detected:" -ForegroundColor Red
    $n = [Math]::Max(1, $MaxBadToShow)
    $badShown = $bad | Sort-Object scope, path | Select-Object -First $n
    $badShown | Format-Table -AutoSize

    if ($bad.Count -gt $badShown.Count) {
      Write-Host "(Showing first $($badShown.Count) of $($bad.Count) blocked files. Re-run with -MaxBadToShow <n> to adjust.)" -ForegroundColor DarkYellow
    }
    exit 1
  }
  Write-Host "`nOK: Scope is determinism-only." -ForegroundColor Green
}
