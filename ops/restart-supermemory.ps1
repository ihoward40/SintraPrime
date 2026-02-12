#requires -Version 5.1
Set-StrictMode -Version Latest

<#
restart-supermemory.ps1
“Boring but decisive” Supermemory proof runner:
  1) Verifies SUPERMEMORY key presence safely (len only; never prints key)
  2) Runs index slice
  3) Runs positive-control search (must hit >= 1)
  4) Runs bait token proof (must hit == 0)
  5) Prints summary-first receipts (human mode)
  6) Exits nonzero if any proof fails

Make.com safe modes:
  -MakeFriendly          => exactly one JSON object, no extra stdout/stderr
  -MakeFriendlyPretty    => pretty JSON (still one object), no extra stdout/stderr

Assumptions (matches the integration spec):
  - Index CLI:  src\supermemory_pack\cli\sp-memory-index.mjs
  - Search CLI: src\supermemory_pack\cli\sp-memory-search.mjs
  - Index pattern: node sp-memory-index.mjs <path> --tag <tag>
  - Search pattern: node sp-memory-search.mjs --tag <tag> --query <token>
#>

param(
  [string]$Tag = "",
  [string]$IndexPath = "",
  [string]$AuditDir = $env:AUDIT_DIR,
  [string]$ReceiptPath = "",
  [int]$TailMaxLines = 4000,
  [int]$WaitReceiptsMs = 4000,
  [switch]$MakeFriendly,
  [switch]$MakeFriendlyPretty,
  [switch]$Strict,
  [switch]$Debug
)

if ($MakeFriendlyPretty) { $MakeFriendly = $true }

$script:MAKE_SCHEMA_VERSION = 'sm-make-v1'

# ---- Make-friendly hard mute (no stray output) ----
if ($MakeFriendly) {
  $global:ProgressPreference = 'SilentlyContinue'
  $global:VerbosePreference  = 'SilentlyContinue'
  $global:DebugPreference    = 'SilentlyContinue'
  $global:InformationPreference = 'SilentlyContinue'
  $global:WarningPreference  = 'SilentlyContinue'
}

$script:__mf_emitted = $false
$script:positiveHits = 0
$script:baitHits = 0
$script:resolvedP95 = $null
$script:ResolvedReceiptFile = ""

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
    version    = $script:MAKE_SCHEMA_VERSION
    strict     = [bool]$Strict
    exitCode    = $ExitCode
    hits        = $Hits
    p95         = $P95
    receiptFile = $ReceiptFile
  }

  $json = if ($MakeFriendlyPretty) {
    ($obj | ConvertTo-Json -Depth 10)
  } else {
    ($obj | ConvertTo-Json -Depth 10 -Compress)
  }

  # Important: no trailing newline
  [Console]::Out.Write($json)
  exit $ExitCode
}

function Write-Diag { param([string]$Msg) if (-not $MakeFriendly) { Write-Host $Msg } }

function Clamp-Int { param([int]$Val,[int]$Min,[int]$Max) if ($Val -lt $Min) { $Min } elseif ($Val -gt $Max) { $Max } else { $Val } }

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

function Try-ParseJsonLine {
  param([string]$Line)
  if (-not $Line) { return $null }
  $t = $Line.Trim()
  if ($t.Length -lt 2) { return $null }
  if (-not ($t.StartsWith('{') -and $t.EndsWith('}'))) { return $null }
  try { return ($t | ConvertFrom-Json -ErrorAction Stop) } catch { return $null }
}


function Try-ParseJsonFromText {
  param([object]$Output)

  if ($null -eq $Output) { return $null }

  $lines = @()
  if ($Output -is [string]) {
    $lines = $Output -split "`n"
  } else {
    $lines = @($Output)
  }

  # Try parse from the end: most CLIs print JSON on the last line
  for ($i = $lines.Count - 1; $i -ge 0; $i--) {
    $l = ($lines[$i] -as [string]).Trim()
    if (!$l) { continue }
    if ($l.StartsWith("{") -or $l.StartsWith("[")) {
      $obj = Try-ParseJsonLine $l
      if ($obj) { return $obj }
    }
  }

  # Fallback: scan the full blob for a JSON-looking chunk (best-effort)
  $blob = ($lines -join "`n")
  try {
    $matches = [regex]::Matches($blob, '(?s)(\{.*\}|\[.*\])')
    if ($matches.Count -gt 0) {
      $candidate = $matches[$matches.Count - 1].Groups[1].Value.Trim()
      if ($candidate.StartsWith("{") -or $candidate.StartsWith("[")) {
        return (Try-ParseJsonLine $candidate)
      }
    }
  } catch { }

  return $null
}

function Assert-SearchSchema {
  param([object]$Resp, [string]$Context)

  if ($null -eq $Resp) { return $false }
  $props = $Resp.PSObject.Properties.Name

  # Accept any of these shapes:
  # - array of results
  # - object with items/results array
  # - object with hits integer or hits.count
  if ($Resp -is [System.Array]) { return $true }

  if ($props -contains 'items') {
    $items = @($Resp.items)
    if ($null -eq $items) { return $false }
    return $true
  }

  if ($props -contains 'results') {
    $r = $Resp.results
    if ($r -is [System.Array]) { return $true }
    try { if ([int]$r.count -ge 0) { return $true } } catch { }
  }

  if ($props -contains 'hits') {
    $h = $Resp.hits
    if ($h -is [int]) { return $true }
    try { if ([int]$h.count -ge 0) { return $true } } catch { }
  }

  return $false
}

function Assert-IndexSchema {
  param([object]$Resp)

  if ($null -eq $Resp) { return $false }
  $props = $Resp.PSObject.Properties.Name

  # Be permissive: different indexers summarize differently.
  $hasAny = ($props -contains 'status') -or ($props -contains 'indexed') -or ($props -contains 'uploaded') -or ($props -contains 'files') -or ($props -contains 'ok')
  return [bool]$hasAny
}
function Resolve-RepoRoot {
  param([string]$ScriptDir)
  # expects script in repo\ops\
  $p = Resolve-Path -LiteralPath (Join-Path $ScriptDir '..') -ErrorAction Stop
  return $p.Path
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

    $latest = Get-ChildItem -LiteralPath $receiptsDir -Filter 'supermemory_receipts_*.jsonl' -ErrorAction SilentlyContinue |
      Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
    if ($latest) { return $latest.FullName }
  }

  $legacy = Join-Path $receiptsDir 'supermemory_receipts.jsonl'
  if (Test-Path -LiteralPath $legacy) { return $legacy }

  $any = Get-ChildItem -LiteralPath $receiptsDir -Filter '*.jsonl' -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
  if ($any) { return $any.FullName }

  return $null
}

function Get-KeyLenSafe {
  $names = @(
    'SUPERMEMORY_API_KEY',
    'SUPERMEMORY_CC_API_KEY',
    'SUPERMEMORY_OPENCLAW_API_KEY',
    'SUPERMEMORY_KEY'
  )
  foreach ($n in $names) {
    $v = [string]([Environment]::GetEnvironmentVariable($n, 'Process'))
    if (-not $v) { $v = [string]([Environment]::GetEnvironmentVariable($n, 'User')) }
    if (-not $v) { $v = [string]([Environment]::GetEnvironmentVariable($n, 'Machine')) }
    $v = ($v).Trim()
    if ($v) { return [PSCustomObject]@{ Name=$n; Len=$v.Length } }
  }
  return $null
}

function Invoke-External {
  param([string]$Exe, [string[]]$Args)

  $out = $null
  $code = 0
  try {
    $out = & $Exe @Args 2>&1
    $code = $LASTEXITCODE
  } catch {
    $out = @($_.Exception.Message)
    $code = 1
  }

  if (-not $MakeFriendly -and $Debug) {
    if ($out) { $out | ForEach-Object { Write-Diag ("[ext] " + $_) } }
  }

  return [PSCustomObject]@{
    ExitCode = $code
    Output   = @($out)
  }
}

function Parse-HitsFromSearchOutput {
  param([string[]]$Lines)

  if (-not $Lines -or $Lines.Count -eq 0) { return 0 }

  $txt = ($Lines -join "`n").Trim()

  # 1) JSON parse (best-effort)
  try {
    $j = $txt | ConvertFrom-Json -ErrorAction Stop
    if ($j -is [System.Array]) { return $j.Count }
    if ($j.PSObject.Properties.Name -contains 'hits') {
      $h = $j.hits
      if ($h -is [int]) { return $h }
      try { return [int]$h.count } catch {}
    }
    if ($j.PSObject.Properties.Name -contains 'results') {
      $r = $j.results
      if ($r -is [System.Array]) { return $r.Count }
      try { return [int]$r.count } catch {}
    }
  } catch { }

  # 2) Text patterns
  $m0 = [regex]::Match($txt, '(?i)\b(0|no)\s+(results|hits|matches)\b')
  if ($m0.Success) { return 0 }

  $mN = [regex]::Match($txt, '(?i)\b(\d+)\s+(results|hits|matches)\b')
  if ($mN.Success) { return [int]$mN.Groups[1].Value }

  # 3) Fallback: any non-empty output implies at least 1
  return 1
}

function Scan-Receipts-ForRawTextKeys {
  param([string]$ReceiptFilePath, [int]$MaxLinesScan)

  if (-not (Test-Path -LiteralPath $ReceiptFilePath)) { return 0 }
  $ls = @(Get-Content -LiteralPath $ReceiptFilePath -Tail $MaxLinesScan -ErrorAction SilentlyContinue)
  $hits = 0
  foreach ($ln in $ls) {
    # Only match JSON keys "text": or "rawText":
    if ($ln -match '\"text\"\s*:' -or $ln -match '\"rawText\"\s*:') { $hits++ }
  }
  return $hits
}

function Read-ReceiptTailLines {
  param([string]$ReceiptFilePath, [int]$TailLines)
  if (-not (Test-Path -LiteralPath $ReceiptFilePath)) { return @() }
  return @(Get-Content -LiteralPath $ReceiptFilePath -Tail $TailLines -ErrorAction SilentlyContinue)
}

function Write-Receipts-SummaryFirst {
  param([string[]]$Lines)

  if (-not $Lines -or $Lines.Count -eq 0) { return }

  # Summary-first: run.summary → speak.summary → other
  $run = New-Object System.Collections.Generic.List[string]
  $speak = New-Object System.Collections.Generic.List[string]
  $other = New-Object System.Collections.Generic.List[string]

  foreach ($ln in $Lines) {
    $o = Try-ParseJsonLine -Line $ln
    if (-not $o) { continue }
    $e = $null
    try { $e = [string]$o.event } catch { $e = $null }
    if ($e -eq 'run.summary') { $run.Add($ln); continue }
    if ($e -eq 'speak.summary' -or $e -eq 'sm.summary') { $speak.Add($ln); continue }
    $other.Add($ln)
  }

  foreach ($x in $run)   { Write-Diag $x }
  foreach ($x in $speak) { Write-Diag $x }
  foreach ($x in $other) { Write-Diag $x }
}

trap {
  if ($MakeFriendly) {
    $hitsObj = [ordered]@{ positive = $script:positiveHits; bait = $script:baitHits }
    Emit-MakeAndExit -Status 'error' -ExitCode 1 -Hits $hitsObj -P95 $script:resolvedP95 -ReceiptFile $script:ResolvedReceiptFile
  }
  throw
}

# ---- main ----
$TailMaxLines  = Clamp-Int -Val $TailMaxLines -Min 100 -Max 200000
$WaitReceiptsMs = Clamp-Int -Val $WaitReceiptsMs -Min 0 -Max 20000

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-RepoRoot -ScriptDir $scriptDir

if (-not $Tag) {
  $envName = $env:NODE_ENV
  if (-not $envName) { $envName = 'dev' }
  $Tag = ("sintraprime__{0}__supermemory__ops" -f $envName.ToLowerInvariant())
}

if (-not $IndexPath) {
  $IndexPath = Join-Path $repoRoot 'src'
}

# Key presence (len only)
$keyInfo = Get-KeyLenSafe
if (-not $keyInfo -or $keyInfo.Len -lt 8) {
  $script:ResolvedReceiptFile = ''
  $hitsObj = [ordered]@{ positive = 0; bait = 0 }
  if ($MakeFriendly) {
    Emit-MakeAndExit -Status 'fail' -ExitCode 2 -Hits $hitsObj -P95 $null -ReceiptFile ''
  }
  Write-Diag "sm.fail missing_key (set SUPERMEMORY_API_KEY)."
  exit 2
}

if (-not $MakeFriendly) {
  Write-Diag ("sm.key name={0} len={1}" -f $keyInfo.Name, $keyInfo.Len)
  Write-Diag ("sm.tag {0}" -f $Tag)
  Write-Diag ("sm.indexPath {0}" -f $IndexPath)
}

# Locate CLIs
$indexCli = Join-Path $repoRoot 'src\supermemory_pack\cli\sp-memory-index.mjs'
$searchCli = Join-Path $repoRoot 'src\supermemory_pack\cli\sp-memory-search.mjs'

if (-not (Test-Path -LiteralPath $indexCli)) {
  $hitsObj = [ordered]@{ positive = 0; bait = 0 }
  if ($MakeFriendly) { Emit-MakeAndExit -Status 'fail' -ExitCode 3 -Hits $hitsObj -P95 $null -ReceiptFile '' }
  throw "Missing index CLI: $indexCli"
}
if (-not (Test-Path -LiteralPath $searchCli)) {
  $hitsObj = [ordered]@{ positive = 0; bait = 0 }
  if ($MakeFriendly) { Emit-MakeAndExit -Status 'fail' -ExitCode 7 -Hits $hitsObj -P95 $null -ReceiptFile '' }
  throw "Missing search CLI: $searchCli"
}


# Strict mode: verify CLIs respond with parseable, expected schema (fail-closed).
if ($Strict) {
  Write-Diag "Strict mode: validating Supermemory search CLI schema..."
  # Node sanity (Strict): ensure node exists + scripts parse
  $nv = Invoke-External "node" @("--version")
  if ($nv.ExitCode -ne 0) {
    $hitsObj = [ordered]@{ positive = 0; bait = 0 }
    if ($MakeFriendly) { Emit-MakeAndExit -Status 'fail' -ExitCode 8 -Hits $hitsObj -P95 $null -ReceiptFile '' }
    throw "Strict preflight failed (node --version exit $($nv.ExitCode))"
  }
  $maj = $null
  if ($nv.Output -match '^v(\d+)\.') { $maj = [int]$Matches[1] }
  if ($maj -ne $null -and $maj -lt 16) {
    $hitsObj = [ordered]@{ positive = 0; bait = 0 }
    if ($MakeFriendly) { Emit-MakeAndExit -Status 'fail' -ExitCode 8 -Hits $hitsObj -P95 $null -ReceiptFile '' }
    throw "Strict preflight failed (node version too old: $($nv.Output))"
  }

  $chkS = Invoke-External "node" @("--check", $searchCli)
  if ($chkS.ExitCode -ne 0) {
    $hitsObj = [ordered]@{ positive = 0; bait = 0 }
    if ($MakeFriendly) { Emit-MakeAndExit -Status 'fail' -ExitCode 8 -Hits $hitsObj -P95 $null -ReceiptFile '' }
    throw "Strict preflight failed (node --check search CLI exit $($chkS.ExitCode))"
  }

  $chkI = Invoke-External "node" @("--check", $indexCli)
  if ($chkI.ExitCode -ne 0) {
    $hitsObj = [ordered]@{ positive = 0; bait = 0 }
    if ($MakeFriendly) { Emit-MakeAndExit -Status 'fail' -ExitCode 8 -Hits $hitsObj -P95 $null -ReceiptFile '' }
    throw "Strict preflight failed (node --check index CLI exit $($chkI.ExitCode))"
  }
  $probeToken = "sm_schema_probe_" + ([guid]::NewGuid().ToString("N"))
  $probe = Invoke-External "node" @($searchCli, '--query', $probeToken, '--tag', $Tag, '--max', "1")
  if ($probe.ExitCode -ne 0) {
    $hitsObj = [ordered]@{ positive = 0; bait = 0 }
    if ($MakeFriendly) { Emit-MakeAndExit -Status 'fail' -ExitCode 8 -Hits $hitsObj -P95 $null -ReceiptFile '' }
    throw "Strict schema probe failed (search CLI exit $($probe.ExitCode))"
  }
  $probeObj = Try-ParseJsonFromText $probe.Output
  if (-not (Assert-SearchSchema $probeObj 'probe')) {
    $hitsObj = [ordered]@{ positive = 0; bait = 0 }
    if ($MakeFriendly) { Emit-MakeAndExit -Status 'fail' -ExitCode 8 -Hits $hitsObj -P95 $null -ReceiptFile '' }
    throw "Strict schema probe failed (search CLI schema mismatch)"
  }
}

# Prepare control files
$guid = [Guid]::NewGuid().ToString()
$posToken = "SM_POSITIVE_{0}" -f $guid
$baitToken = "SM_BAIT_{0}" -f $guid

$posFile = Join-Path $IndexPath '_sm_positive_control.txt'
$baitDir = Join-Path $IndexPath 'node_modules'
$baitFile = Join-Path $baitDir '_sm_bait_control.txt'

$cleanup = @()
try {
  if (-not (Test-Path -LiteralPath $IndexPath)) { throw "IndexPath not found: $IndexPath" }

  Set-Content -LiteralPath $posFile -Value $posToken -Encoding UTF8
  $cleanup += $posFile

  if (-not (Test-Path -LiteralPath $baitDir)) { New-Item -ItemType Directory -Path $baitDir -Force | Out-Null; $cleanup += $baitDir }
  Set-Content -LiteralPath $baitFile -Value $baitToken -Encoding UTF8
  $cleanup += $baitFile

  # Run index slice
  $ix = Invoke-External -Exe 'node' -Args @($indexCli, $IndexPath, '--tag', $Tag)
  if ($ix.ExitCode -ne 0) {
    $hitsObj = [ordered]@{ positive = 0; bait = 0 }
    if ($MakeFriendly) { Emit-MakeAndExit -Status 'fail' -ExitCode 3 -Hits $hitsObj -P95 $null -ReceiptFile '' }
    Write-Diag "sm.fail index_failed"
    exit 3
  }

  if ($Strict) {
    Write-Diag "Strict mode: validating Supermemory index CLI schema..."
    $ixObj = Try-ParseJsonFromText $ix.Output
    if (-not (Assert-IndexSchema $ixObj)) {
      $hitsObj = [ordered]@{ positive = 0; bait = 0 }
      if ($MakeFriendly) { Emit-MakeAndExit -Status 'fail' -ExitCode 8 -Hits $hitsObj -P95 $null -ReceiptFile '' }
      Write-Diag "sm.fail strict_index_schema_bad"
      exit 8
    }
  }


  # Search positive
  $sx1 = Invoke-External -Exe 'node' -Args @($searchCli, '--tag', $Tag, '--query', $posToken)
  $script:positiveHits = Parse-HitsFromSearchOutput -Lines $sx1.Output

  if ($Strict) {
    $sx1Obj = Try-ParseJsonFromText $sx1.Output
    if (-not (Assert-SearchSchema $sx1Obj 'positive')) {
      $hitsObj = [ordered]@{ positive = 0; bait = 0 }
      if ($MakeFriendly) { Emit-MakeAndExit -Status 'fail' -ExitCode 8 -Hits $hitsObj -P95 $null -ReceiptFile '' }
      Write-Diag "sm.fail strict_search_schema_positive_bad"
      exit 8
    }
  }

  if ($script:positiveHits -lt 1) {
    $hitsObj = [ordered]@{ positive = $script:positiveHits; bait = 0 }
    if ($MakeFriendly) { Emit-MakeAndExit -Status 'fail' -ExitCode 4 -Hits $hitsObj -P95 $null -ReceiptFile '' }
    Write-Diag "sm.fail positive_control_failed"
    exit 4
  }

  # Search bait (must be 0)
  $sx2 = Invoke-External -Exe 'node' -Args @($searchCli, '--tag', $Tag, '--query', $baitToken)
  $script:baitHits = Parse-HitsFromSearchOutput -Lines $sx2.Output

  if ($Strict) {
    $sx2Obj = Try-ParseJsonFromText $sx2.Output
    if (-not (Assert-SearchSchema $sx2Obj 'bait')) {
      $hitsObj = [ordered]@{ positive = $script:positiveHits; bait = 0 }
      if ($MakeFriendly) { Emit-MakeAndExit -Status 'fail' -ExitCode 8 -Hits $hitsObj -P95 $null -ReceiptFile '' }
      Write-Diag "sm.fail strict_search_schema_bait_bad"
      exit 8
    }
  }

  if ($script:baitHits -gt 0) {
    $hitsObj = [ordered]@{ positive = $script:positiveHits; bait = $script:baitHits }
    if ($MakeFriendly) { Emit-MakeAndExit -Status 'fail' -ExitCode 5 -Hits $hitsObj -P95 $null -ReceiptFile '' }
    Write-Diag "sm.fail bait_token_found"
    exit 5
  }

} finally {
  # Cleanup control files (best-effort, do not fail)
  foreach ($p in $cleanup) {
    try {
      if (Test-Path -LiteralPath $p) {
        $it = Get-Item -LiteralPath $p -ErrorAction SilentlyContinue
        if ($it -and $it.PSIsContainer) {
          $children = Get-ChildItem -LiteralPath $p -ErrorAction SilentlyContinue
          if (-not $children -or $children.Count -eq 0) { Remove-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue }
        } else {
          Remove-Item -LiteralPath $p -Force -ErrorAction SilentlyContinue
        }
      }
    } catch {}
  }
}

# Resolve receipts, compute p95, and scan for unsafe keys
$rf = Resolve-ReceiptFile -AuditDirIn $AuditDir -ExplicitPath $ReceiptPath
$script:ResolvedReceiptFile = if ($rf) { [System.IO.Path]::GetFileName($rf) } else { "" }

# Wait a bit for receipts to land (fail-open)
if ($rf -and $WaitReceiptsMs -gt 0) {
  $deadline = [DateTime]::UtcNow.AddMilliseconds($WaitReceiptsMs)
  do {
    try {
      $fi = Get-Item -LiteralPath $rf -ErrorAction Stop
      $age = ([DateTime]::UtcNow - $fi.LastWriteTimeUtc).TotalSeconds
      if ($age -le 10) { break }
    } catch { }
    Start-Sleep -Milliseconds 250
  } while ([DateTime]::UtcNow -lt $deadline)
}

$unsafeHits = 0
if ($rf) { $unsafeHits = Scan-Receipts-ForRawTextKeys -ReceiptFilePath $rf -MaxLinesScan 12000 }

# Compute p95 latency from supermemory receipts
if ($rf) {
  $lat = New-Object System.Collections.Generic.List[int]
  $ls = @(Get-Content -LiteralPath $rf -Tail 20000 -ErrorAction SilentlyContinue)
  foreach ($ln in $ls) {
    $o = Try-ParseJsonLine -Line $ln
    if (-not $o) { continue }
    $event = $null
    try { $event = [string]$o.event } catch { $event = $null }
    if ($event -and ($event.StartsWith('sm.') -or $event -eq 'speak.summary' -or $event -eq 'run.summary')) {
      $lm = $null
      try { $lm = $o.latencyMs } catch { $lm = $null }
      if ($lm -ne $null) {
        $i = 0
        if ([int]::TryParse($lm.ToString(), [ref]$i) -and $i -ge 0) { $lat.Add($i) }
      }
    }
  }
  $script:resolvedP95 = Get-P95 -Values ($lat.ToArray())
}

# Unsafe receipts => fail (exit 6)
if ($unsafeHits -gt 0) {
  $hitsObj = [ordered]@{ positive = $script:positiveHits; bait = $script:baitHits }
  if ($MakeFriendly) { Emit-MakeAndExit -Status 'fail' -ExitCode 6 -Hits $hitsObj -P95 $script:resolvedP95 -ReceiptFile $script:ResolvedReceiptFile }
  Write-Diag "sm.fail unsafe_receipts_found (found JSON key text/rawText in receipts)"
  exit 6
}

# Success
$hitsObj = [ordered]@{ positive = $script:positiveHits; bait = $script:baitHits }
if ($MakeFriendly) {
  Emit-MakeAndExit -Status 'ok' -ExitCode 0 -Hits $hitsObj -P95 $script:resolvedP95 -ReceiptFile $script:ResolvedReceiptFile
}

$p95txt = if ($script:resolvedP95 -ne $null) { $script:resolvedP95 } else { "null" }
Write-Diag ("sm.ok positiveHits={0} baitHits={1} p95ms={2} receiptFile={3}" -f $script:positiveHits, $script:baitHits, $p95txt, $script:ResolvedReceiptFile)

# Human-mode summary-first tail
if ($rf) {
  Write-Diag "---- receipts tail (summary-first) ----"
  $tail = Read-ReceiptTailLines -ReceiptFilePath $rf -TailLines $TailMaxLines
  Write-Receipts-SummaryFirst -Lines $tail
}

exit 0
