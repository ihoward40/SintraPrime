[CmdletBinding()]
param(
  [switch]$SkipInstall,
  [switch]$SkipApiInstall
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $PSScriptRoot) {
  throw "Unable to resolve script root (PSScriptRoot is empty). Run with: powershell -File .\\verify-local.ps1"
}

function Write-Stage([string]$msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg) { Write-Host "[PASS] $msg" -ForegroundColor Green }
function Write-Warn([string]$msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Fail([string]$msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red }

function Invoke-Step {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][string]$FilePath,
    [string[]]$ArgumentList = @()
  )

  Write-Stage $Name
  Push-Location $WorkingDirectory
  try {
    & $FilePath @ArgumentList
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
      Write-Fail ("{0} exited with code {1}" -f $Name, $exitCode)
      return [pscustomobject]@{
        Name = $Name
        Success = $false
        ExitCode = $exitCode
      }
    }

    Write-Ok $Name
    return [pscustomobject]@{
      Name = $Name
      Success = $true
      ExitCode = 0
    }
  }
  catch {
    Write-Fail ("{0} threw: {1}" -f $Name, $_.Exception.Message)
    return [pscustomobject]@{
      Name = $Name
      Success = $false
      ExitCode = -1
    }
  }
  finally {
    Pop-Location
  }
}

$rootDir = $PSScriptRoot
$apiDir = Join-Path $rootDir 'apps/api'

if (-not (Test-Path -LiteralPath (Join-Path $rootDir 'package.json'))) {
  throw "Root package.json not found under: $rootDir"
}

if (-not (Test-Path -LiteralPath (Join-Path $apiDir 'package.json'))) {
  throw "apps/api package.json not found under: $apiDir"
}

$npmCommand = Get-Command npm.cmd -ErrorAction SilentlyContinue
if (-not $npmCommand) {
  $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
}
if (-not $npmCommand) {
  throw "npm was not found on PATH. Install Node.js and ensure npm is available."
}

$steps = @()
if (-not $SkipInstall) {
  $steps += [pscustomobject]@{ Name = 'Root install'; WorkingDirectory = $rootDir; FilePath = $npmCommand.Source; ArgumentList = @('install') }
} else {
  Write-Warn 'Skipping root install (--SkipInstall).'
}

$steps += [pscustomobject]@{ Name = 'Root typecheck'; WorkingDirectory = $rootDir; FilePath = $npmCommand.Source; ArgumentList = @('run', 'typecheck') }
$steps += [pscustomobject]@{ Name = 'Root build'; WorkingDirectory = $rootDir; FilePath = $npmCommand.Source; ArgumentList = @('run', 'build') }

if (-not $SkipApiInstall) {
  $steps += [pscustomobject]@{ Name = 'API install'; WorkingDirectory = $apiDir; FilePath = $npmCommand.Source; ArgumentList = @('install') }
} else {
  Write-Warn 'Skipping API install (--SkipApiInstall).'
}

$steps += [pscustomobject]@{ Name = 'API build'; WorkingDirectory = $apiDir; FilePath = $npmCommand.Source; ArgumentList = @('run', 'build') }

$results = @()
foreach ($step in $steps) {
  $result = Invoke-Step -Name $step.Name -WorkingDirectory $step.WorkingDirectory -FilePath $step.FilePath -ArgumentList $step.ArgumentList
  $results += $result
  if (-not $result.Success) {
    break
  }
}

Write-Host ''
Write-Host 'Verification summary' -ForegroundColor Cyan
Write-Host '--------------------' -ForegroundColor Cyan

foreach ($result in $results) {
  if ($result.Success) {
    Write-Ok $result.Name
  } else {
    Write-Fail ("{0} (exit {1})" -f $result.Name, $result.ExitCode)
  }
}

$passedCount = ($results | Where-Object { $_.Success }).Count
$failedCount = ($results | Where-Object { -not $_.Success }).Count
Write-Host ("Passed: {0}  Failed: {1}" -f $passedCount, $failedCount)

if ($failedCount -gt 0) {
  exit 1
}

Write-Ok 'Local verification completed successfully.'
exit 0
