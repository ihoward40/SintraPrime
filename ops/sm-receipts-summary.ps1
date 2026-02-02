#requires -Version 5.1
Set-StrictMode -Version Latest

<#
sm-receipts-summary.ps1
Reads Supermemory daily JSONL receipts and prints a one-line health summary.
Make.com safe modes:
  -MakeFriendly          => exactly one JSON object, no extra stdout/stderr
  -MakeFriendlyPretty    => pretty JSON (still one object), no extra stdout/stderr

Expected receipt file naming:
  supermemory_receipts_YYYY-MM-DD.jsonl  (default)
  supermemory_receipts.jsonl             (when RECEIPTS_DAILY=false)

This script never prints secrets.
#>

param(
  [string]$AuditDir = $env:AUDIT_DIR,
  [string]$ReceiptPath = "",
  [int]$MaxLines = 20000,
  [switch]$MakeFriendly,
  [switch]$MakeFriendlyPretty,
  [switch]$Debug
)

if ($MakeFriendlyPretty) { $MakeFriendly = $true }

# ---- Make-friendly hard mute (no stray output) ----
if ($MakeFriendly) {
  $global:ProgressPreference = 'SilentlyContinue'
  $global:VerbosePreference  = 'SilentlyContinue'
  $global:DebugPreference    = 'SilentlyContinue'
  $global:InformationPreference = 'SilentlyContinue'
  $global:WarningPreference  = 'SilentlyContinue'
}

$script:__mf_emitted = $false

function Emit-MakeAndExit {
  param(
    [string]$Status,
    [int]$ExitCode,
    $Hits,
    $P95,
    [string]$ReceiptFile
  )
  if ($script:__mf_emitted) { exit $ExitCode }
  $script:__mf_emitted = $true

  $obj = [ordered]@{
    status      = $Status
    exitCode    = $ExitCode
    hits        = $Hits
    p95         = $P95
    receiptFile = $ReceiptFile
  }

  $json = if ($MakeFriendlyPretty) {
    ($obj | ConvertTo-Json -Depth 8)
  } else {
    ($obj | ConvertTo-Json -Depth 8 -Compress)
  }

  # Important: no trailing newline
  [Console]::Out.Write($json)
  exit $ExitCode
}

function Write-Diag {
  param([string]$Msg)
  if (-not $MakeFriendly) { Write-Host $Msg }
}

function Clamp-Int {
  param([int]$Val, [int]$Min, [int]$Max)
  if ($Val -lt $Min) { return $Min }
  if ($Val -gt $Max) { return $Max }
  return $Val
}

function Get-P95 {
  param([int[]]$Values)
  if (-not $Values -or $Values.Count -lt 1) { return $null }
  $sorted = $Values | Sort-Object
  $n = $sorted.Count
  $idx = [int]([Math]::Ceiling(0.95 * $n) - 1)
  if ($idx -lt 0) { $idx = 0 }
  if ($idx -ge $n) { $idx = $n - 1 }
  return [int]$sorted[$idx]
}

function Resolve-ReceiptFile {
  param([string]$AuditDirIn, [string]$ExplicitPath)

  if ($ExplicitPath -and (Test-Path -LiteralPath $ExplicitPath)) {
    return (Resolve-Path -LiteralPath $ExplicitPath).Path
  }

  $ad = $AuditDirIn
  if (-not $ad) { $ad = 'C:\SintraPrime\_AUDIT' }
  $receiptsDir = Join-Path $ad 'receipts'

  $daily = $true
  if ($env:RECEIPTS_DAILY) {
    $daily = ($env:RECEIPTS_DAILY.ToLowerInvariant() -ne 'false')
  }

  if ($daily) {
    $today = (Get-Date).ToString('yyyy-MM-dd')
    $p = Join-Path $receiptsDir ("supermemory_receipts_{0}.jsonl" -f $today)
    if (Test-Path -LiteralPath $p) { return $p }

    # fallback: latest daily
    $latest = Get-ChildItem -LiteralPath $receiptsDir -Filter 'supermemory_receipts_*.jsonl' -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
    if ($latest) { return $latest.FullName }
  }

  $legacy = Join-Path $receiptsDir 'supermemory_receipts.jsonl'
  if (Test-Path -LiteralPath $legacy) { return $legacy }

  # last-chance: any jsonl
  $any = Get-ChildItem -LiteralPath $receiptsDir -Filter '*.jsonl' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
  if ($any) { return $any.FullName }

  return $null
}

function Try-ParseJsonLine {
  param([string]$Line)
  if (-not $Line) { return $null }
  $t = $Line.Trim()
  if ($t.Length -lt 2) { return $null }
  if (-not ($t.StartsWith('{') -and $t.EndsWith('}'))) { return $null }
  try { return ($t | ConvertFrom-Json -ErrorAction Stop) } catch { return $null }
}

trap {
  if ($MakeFriendly) {
    $hitsObj = [ordered]@{ attempts = 0; successes = 0; errors = 0 }
    Emit-MakeAndExit -Status 'error' -ExitCode 1 -Hits $hitsObj -P95 $null -ReceiptFile ''
  }
  throw
}

# ---- main ----
$MaxLines = Clamp-Int -Val $MaxLines -Min 1 -Max 200000

$rf = Resolve-ReceiptFile -AuditDirIn $AuditDir -ExplicitPath $ReceiptPath
if (-not $rf) {
  if ($MakeFriendly) {
    $hitsObj = [ordered]@{ attempts = 0; successes = 0; errors = 0 }
    Emit-MakeAndExit -Status 'fail' -ExitCode 1 -Hits $hitsObj -P95 $null -ReceiptFile ''
  }
  throw "Receipt file not found. Provide -ReceiptPath or ensure receipts exist under AUDIT_DIR\\receipts."
}

$receiptFile = [System.IO.Path]::GetFileName($rf)

# Read tail (fast enough for daily files)
$lines = @(Get-Content -LiteralPath $rf -Tail $MaxLines -ErrorAction Stop)

[int]$attempts = 0
[int]$successes = 0
[int]$errors = 0
$lat = New-Object System.Collections.Generic.List[int]

foreach ($ln in $lines) {
  $o = Try-ParseJsonLine -Line $ln
  if (-not $o) { continue }

  # Count only supermemory receipts (event starts with "sm." OR receiptVersion contains "supermemory")
  $event = $null
  try { $event = [string]$o.event } catch { $event = $null }
  $rv = $null
  try { $rv = [string]$o.receiptVersion } catch { $rv = $null }

  $isSm = $false
  if ($event -and $event.StartsWith('sm.')) { $isSm = $true }
  if ($rv -and $rv.ToLowerInvariant().Contains('supermemory')) { $isSm = $true }
  if (-not $isSm) { continue }

  $attempts++

  $ok = $null
  try { $ok = $o.ok } catch { $ok = $null }

  $finalOutcome = $null
  try { $finalOutcome = [string]$o.finalOutcome } catch { $finalOutcome = $null }

  if ($ok -eq $true -or $finalOutcome -eq 'ok' -or $finalOutcome -eq 'success') {
    $successes++
  } elseif ($ok -eq $false -or $finalOutcome -eq 'error' -or $finalOutcome -eq 'fail') {
    $errors++
  }

  $lm = $null
  try { $lm = $o.latencyMs } catch { $lm = $null }
  if ($lm -ne $null) {
    $i = 0
    if ([int]::TryParse($lm.ToString(), [ref]$i) -and $i -ge 0) { $lat.Add($i) }
  }
}

$p95 = Get-P95 -Values ($lat.ToArray())

$hitsObj = [ordered]@{
  attempts  = $attempts
  successes = $successes
  errors    = $errors
}

# Status logic: ok if we saw at least one attempt and zero errors
$status = if ($attempts -gt 0 -and $errors -eq 0) { 'ok' } else { 'fail' }
$exitCode = if ($status -eq 'ok') { 0 } else { 1 }

if ($MakeFriendly) {
  Emit-MakeAndExit -Status $status -ExitCode $exitCode -Hits $hitsObj -P95 $p95 -ReceiptFile $receiptFile
}

# Human mode one-liner
$ageSec = $null
try {
  $fi = Get-Item -LiteralPath $rf -ErrorAction Stop
  $ageSec = [int]([DateTime]::UtcNow - $fi.LastWriteTimeUtc).TotalSeconds
} catch { $ageSec = $null }

$ageTxt = if ($ageSec -ne $null) { " receiptAgeSec=$ageSec" } else { "" }
$p95Txt = if ($p95 -ne $null) { $p95 } else { "null" }

Write-Diag ("sm.health attempts={0} success={1} errors={2} p95ms={3} receiptFile={4}{5}" -f $attempts, $successes, $errors, $p95Txt, $receiptFile, $ageTxt)
exit $exitCode
