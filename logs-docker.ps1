[CmdletBinding()]
param(
  [string]$ComposeFile = '',
  [string]$Service = '',
  [switch]$Follow,
  [int]$Tail = 200
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $PSScriptRoot) {
  throw "Unable to resolve script root (PSScriptRoot is empty). Run with: powershell -File .\\logs-docker.ps1"
}

if ([string]::IsNullOrWhiteSpace($ComposeFile)) {
  $ComposeFile = (Join-Path $PSScriptRoot 'docker-compose.full.yml')
}

$args = @('--env-file', (Join-Path $PSScriptRoot '.env.docker'), '-f', $ComposeFile, 'logs', '--tail', "$Tail")
if ($Follow) { $args += '-f' }
if ($Service -and $Service.Trim().Length -gt 0) { $args += $Service.Trim() }

& docker compose @args | Out-Host
