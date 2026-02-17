[CmdletBinding()]
param(
  [string]$ComposeFile = '',
  [int]$TimeoutSec = 5
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $PSScriptRoot) {
  throw "Unable to resolve script root (PSScriptRoot is empty). Run with: powershell -File .\\verify-deployment.ps1"
}

if ([string]::IsNullOrWhiteSpace($ComposeFile)) {
  $ComposeFile = (Join-Path $PSScriptRoot 'docker-compose.full.yml')
}

function Write-Ok([string]$msg) { Write-Host "[OK]  $msg" -ForegroundColor Green }
function Write-Warn([string]$msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Fail([string]$msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red }

function Test-HttpJson([string]$Url) {
  try {
    $resp = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSec -UseBasicParsing
    if ($resp.StatusCode -lt 200 -or $resp.StatusCode -ge 300) {
      return @{ ok = $false; status = $resp.StatusCode; error = "non-2xx" }
    }
    $json = $null
    try { $json = $resp.Content | ConvertFrom-Json } catch { $json = $null }
    return @{ ok = $true; status = $resp.StatusCode; json = $json }
  } catch {
    return @{ ok = $false; error = ($_.Exception.Message) }
  }
}

if (-not (Test-Path -LiteralPath $ComposeFile)) {
  throw "Compose file not found: $ComposeFile"
}

Write-Host "Checking docker compose status..." -ForegroundColor Cyan
try {
  $envFile = Join-Path $PSScriptRoot '.env.docker'
  if (Test-Path -LiteralPath $envFile) {
    docker compose --env-file $envFile -f $ComposeFile ps | Out-Host
  } else {
    docker compose -f $ComposeFile ps | Out-Host
  }
} catch {
  Write-Warn "Unable to run 'docker compose ps' (is Docker running?)"
}

$checks = @(
  @{ name = 'Airlock'; url = 'http://127.0.0.1:3000/health' },
  @{ name = 'Brain'; url = 'http://127.0.0.1:8011/health' },
  @{ name = 'FastAPI'; url = 'http://127.0.0.1:8000/health' },
  @{ name = 'Webapp (infra)'; url = 'http://127.0.0.1:3002/api/sintraInfra/health' }
)

$failed = $false
foreach ($c in $checks) {
  $r = Test-HttpJson $c.url
  if (-not $r.ok) {
    $errText = 'error'
    if ($r.ContainsKey('error') -and $null -ne $r.error -and ("$($r.error)".Trim().Length -gt 0)) {
      $errText = "$($r.error)"
    }
    Write-Fail ("{0} {1} :: {2}" -f $c.name, $c.url, $errText)
    $failed = $true
    continue
  }

  if ($c.name -eq 'Webapp (infra)' -and $r.json) {
    $apiOk = $false
    $brainOk = $false
    $airlockOk = $false
    try {
      $apiOk = [bool]$r.json.checks.api.ok
      $brainOk = [bool]$r.json.checks.brain.ok
      $airlockOk = [bool]$r.json.checks.airlock.ok
    } catch {
      # ignore
    }

    if (-not ($apiOk -and $brainOk -and $airlockOk)) {
      Write-Fail "Webapp infra probe returned failing checks (api=$apiOk brain=$brainOk airlock=$airlockOk)"
      $failed = $true
      continue
    }
  }

  Write-Ok ("{0} {1} ({2})" -f $c.name, $c.url, $r.status)
}

if ($failed) {
  throw "One or more deployment checks failed. Inspect logs: docker compose -f $ComposeFile logs --tail 200"
}

Write-Ok "All checks passed."
