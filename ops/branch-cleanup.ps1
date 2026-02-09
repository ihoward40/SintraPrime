Set-StrictMode -Version Latest

function Remove-LocalSwarmKeepNewest {
  <#
  .SYNOPSIS
  Deletes superseded local branches under a prefix, keeping the newest.

  .DESCRIPTION
  Finds local branches matching `refs/heads/<Prefix>*`, selects the newest by committer date as the keeper,
  then deletes only those branches proven to be ancestors of the keeper.

  Divergent branches are NOT deleted; they are reported as "SKIP (not ancestor)".

  .PARAMETER Prefix
  Branch prefix to match, e.g. "pr/copilot-swe-agent/13".

  .PARAMETER Force
  Uses `git branch -D` for deletion (default). If not set, uses `git branch -d`.

  .EXAMPLE
  . .\ops\branch-cleanup.ps1
  Remove-LocalSwarmKeepNewest -Prefix "pr/copilot-swe-agent/13" -WhatIf

  .EXAMPLE
  . .\ops\branch-cleanup.ps1
  Remove-LocalSwarmKeepNewest -Prefix "pr/copilot-swe-agent/13" -Force
  #>
  [CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
  param(
    [Parameter(Mandatory = $true)][string]$Prefix,
    [switch]$Force,
    [switch]$Quiet,
    [string]$OutJson,
    [switch]$IncludeEvidence
  )

  function Write-Log {
    param([Parameter(Mandatory = $true)][string]$Msg)
    if (-not $Quiet) { Write-Host $Msg }
  }

  function Write-ReceiptJson {
    param(
      [Parameter(Mandatory = $true)]$Object,
      [Parameter(Mandatory = $true)][string]$Path
    )
    $parent = Split-Path -Parent $Path
    if ($parent -and -not (Test-Path $parent)) {
      New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    $Object | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 -Path $Path
  }

  $git = Get-Command git -ErrorAction SilentlyContinue
  if (-not $git) { throw "git not found in PATH" }

  $startedAt = (Get-Date).ToUniversalTime().ToString('o')
  $scriptPath = $PSCommandPath
  if (-not $scriptPath) { $scriptPath = $MyInvocation.MyCommand.Path }

  $scriptHash = $null
  if ($scriptPath -and (Test-Path $scriptPath)) {
    $scriptHash = (Get-FileHash -Algorithm SHA256 -Path $scriptPath).Hash.ToLowerInvariant().Substring(0, 12)
  }

  $repoHeadSha = $null
  try {
    $repoHeadSha = (git rev-parse HEAD 2>$null).Trim()
    if (-not $repoHeadSha) { $repoHeadSha = $null }
  } catch {
    $repoHeadSha = $null
  }

  $runId = "$startedAt $scriptHash"

  $pattern = "refs/heads/$Prefix*"

  $refs = git for-each-ref --sort=-committerdate --format="%(refname:short)" $pattern
  if (-not $refs) {
    Write-Host "No local branches match: $Prefix*"
    return
  }

  $deleted = 0
  $wouldDelete = 0
  $skippedDivergent = 0
  $skippedNotConfirmed = 0

  $deletedBranches = @()
  $wouldDeleteBranches = @()

  $keep = $refs | Select-Object -First 1
  Write-Log "KEEP: $keep"

  foreach ($b in $refs) {
    if ($b -eq $keep) { continue }

    git merge-base --is-ancestor $b $keep | Out-Null
    if ($LASTEXITCODE -eq 0) {
      $branchSha = $null
      try {
        $branchSha = (git rev-parse $b 2>$null).Trim()
        if (-not $branchSha) { $branchSha = $null }
      } catch {
        $branchSha = $null
      }

      if ($PSCmdlet.ShouldProcess($b, "Delete superseded ancestor branch")) {
        if ($Force) {
          git branch -D $b | Out-Null
        } else {
          git branch -d $b | Out-Null
        }
        $deleted++
        $deletedBranches += [pscustomobject]@{ Name = $b; Sha = $branchSha }
        Write-Log "DEL : $b"
      } elseif ($WhatIfPreference) {
        $wouldDelete++
        $wouldDeleteBranches += [pscustomobject]@{ Name = $b; Sha = $branchSha }
        Write-Log "WOULD DEL : $b"
      } else {
        $skippedNotConfirmed++
        if (-not $Quiet) { Write-Host "SKIP (not confirmed): $b" -ForegroundColor Yellow }
      }
    } else {
      $skippedDivergent++
      if (-not $Quiet) { Write-Host "SKIP (not ancestor): $b" -ForegroundColor Yellow }
    }
  }

  $receipt = [pscustomobject]@{
    RunId              = $runId
    StartedAtUtc       = $startedAt
    ScriptHash         = $scriptHash
    RepoHeadSha        = $repoHeadSha
    Prefix             = $Prefix
    WhatIf             = [bool]$WhatIfPreference
    Force              = [bool]$Force
    Quiet              = [bool]$Quiet
    OutJson            = $OutJson
    IncludeEvidence    = [bool]$IncludeEvidence

    Kept               = 1
    Deleted            = $deleted
    WouldDelete        = $wouldDelete
    SkippedDivergent   = $skippedDivergent
    SkippedNotConfirmed = $skippedNotConfirmed
    Candidates         = ($refs | Measure-Object).Count
  }

  if ($IncludeEvidence) {
    Add-Member -InputObject $receipt -NotePropertyName DeletedBranches -NotePropertyValue $deletedBranches
    Add-Member -InputObject $receipt -NotePropertyName WouldDeleteBranches -NotePropertyValue $wouldDeleteBranches
  }

  if (-not $Quiet) {
    Write-Host ""
    Write-Host "Summary:"
    Write-Host "  Prefix: $Prefix"
    Write-Host "  Kept: 1 ($keep)"
    if ($WhatIfPreference) {
      Write-Host "  Would delete: $wouldDelete"
    }
    Write-Host "  Deleted: $deleted"
    Write-Host "  Skipped divergent: $skippedDivergent"
    Write-Host "  Skipped not confirmed: $skippedNotConfirmed"
  }

  if ($OutJson) {
    Write-ReceiptJson -Object $receipt -Path $OutJson
  }

  return $receipt
}

function Remove-CopilotSwarmsKeepNewest {
  <#
  .SYNOPSIS
  Sweeps all local swarms matching pr/copilot-swe-agent/NN-* and keeps newest per NN.

  .DESCRIPTION
  Discovers all local branches under `refs/heads/pr/copilot-swe-agent/*` that match the pattern
  `pr/copilot-swe-agent/<number>-...`, groups by that number, and calls Remove-LocalSwarmKeepNewest
  for each group.

  .PARAMETER Force
  Passed through to Remove-LocalSwarmKeepNewest.

  .EXAMPLE
  . .\ops\branch-cleanup.ps1
  Remove-CopilotSwarmsKeepNewest -WhatIf
  #>
  [CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'High')]
  param(
    [switch]$Force,
    [switch]$Quiet,
    [string]$OutJson,
    [switch]$IncludeEvidence
  )

  function Write-Log {
    param([Parameter(Mandatory = $true)][string]$Msg)
    if (-not $Quiet) { Write-Host $Msg }
  }

  function Write-ReceiptJson {
    param(
      [Parameter(Mandatory = $true)]$Object,
      [Parameter(Mandatory = $true)][string]$Path
    )
    $parent = Split-Path -Parent $Path
    if ($parent -and -not (Test-Path $parent)) {
      New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    $Object | ConvertTo-Json -Depth 10 | Set-Content -Encoding UTF8 -Path $Path
  }

  $startedAt = (Get-Date).ToUniversalTime().ToString('o')
  $scriptPath = $PSCommandPath
  if (-not $scriptPath) { $scriptPath = $MyInvocation.MyCommand.Path }

  $scriptHash = $null
  if ($scriptPath -and (Test-Path $scriptPath)) {
    $scriptHash = (Get-FileHash -Algorithm SHA256 -Path $scriptPath).Hash.ToLowerInvariant().Substring(0, 12)
  }

  $repoHeadSha = $null
  try {
    $repoHeadSha = (git rev-parse HEAD 2>$null).Trim()
    if (-not $repoHeadSha) { $repoHeadSha = $null }
  } catch {
    $repoHeadSha = $null
  }

  $runId = "$startedAt $scriptHash"

  $all = git for-each-ref --format="%(refname:short)" refs/heads/pr/copilot-swe-agent/*
  if (-not $all) {
    Write-Host "No local branches match: pr/copilot-swe-agent/*"
    return
  }

  $groups = $all |
    Where-Object { $_ -match '^pr/copilot-swe-agent/(\d+)-' } |
    ForEach-Object { ($_ -replace '^pr/copilot-swe-agent/(\d+)-.*$', 'pr/copilot-swe-agent/$1') } |
    Sort-Object -Unique

  $results = @()
  foreach ($g in $groups) {
    if (-not $Quiet) { Write-Host "" }
    Write-Log "=== Sweeping: $g* ==="
    $results += Remove-LocalSwarmKeepNewest -Prefix $g -Force:$Force -Quiet:$Quiet -OutJson:$null -IncludeEvidence:$IncludeEvidence -WhatIf:$WhatIfPreference
  }

  $totalKept = ($results | Measure-Object -Property Kept -Sum).Sum
  $totalDeleted = ($results | Measure-Object -Property Deleted -Sum).Sum
  $totalWouldDelete = ($results | Measure-Object -Property WouldDelete -Sum).Sum
  $totalSkippedDivergent = ($results | Measure-Object -Property SkippedDivergent -Sum).Sum
  $totalSkippedNotConfirmed = ($results | Measure-Object -Property SkippedNotConfirmed -Sum).Sum

  $totals = [pscustomobject]@{
    Kept               = $totalKept
    Deleted            = $totalDeleted
    WouldDelete        = $totalWouldDelete
    SkippedDivergent   = $totalSkippedDivergent
    SkippedNotConfirmed = $totalSkippedNotConfirmed
  }

  $runReceipt = [pscustomobject]@{
    RunId        = $runId
    StartedAtUtc = $startedAt
    ScriptHash   = $scriptHash
    RepoHeadSha  = $repoHeadSha
    OutJson      = $OutJson
    Prefix       = 'pr/copilot-swe-agent'
    WhatIf       = [bool]$WhatIfPreference
    Force        = [bool]$Force
    Quiet        = [bool]$Quiet
    IncludeEvidence = [bool]$IncludeEvidence

    Kept               = $totalKept
    Deleted            = $totalDeleted
    WouldDelete        = $totalWouldDelete
    SkippedDivergent   = $totalSkippedDivergent
    SkippedNotConfirmed = $totalSkippedNotConfirmed

    Groups       = $results
    Totals       = $totals
  }

  if ($IncludeEvidence) {
    $flatDeleted = @()
    $flatWouldDelete = @()
    foreach ($g in $results) {
      if ($g.PSObject.Properties.Name -contains 'DeletedBranches') {
        $flatDeleted += @($g.DeletedBranches)
      }
      if ($g.PSObject.Properties.Name -contains 'WouldDeleteBranches') {
        $flatWouldDelete += @($g.WouldDeleteBranches)
      }
    }

    Add-Member -InputObject $runReceipt -NotePropertyName DeletedBranches -NotePropertyValue $flatDeleted
    Add-Member -InputObject $runReceipt -NotePropertyName WouldDeleteBranches -NotePropertyValue $flatWouldDelete
  }

  if (-not $Quiet -and $results.Count -gt 0) {
    Write-Host ""
    Write-Host "Overall summary:"
    Write-Host "  Groups swept: $($results.Count)"
    if ($WhatIfPreference) {
      Write-Host "  Would delete: $totalWouldDelete"
    }
    Write-Host "  Deleted: $totalDeleted"
    Write-Host "  Skipped divergent: $totalSkippedDivergent"
    Write-Host "  Skipped not confirmed: $totalSkippedNotConfirmed"
  }

  if ($OutJson) {
    Write-ReceiptJson -Object $runReceipt -Path $OutJson
  }

  return $runReceipt
}
