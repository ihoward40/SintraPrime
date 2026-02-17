[CmdletBinding()]
param(
  [string]$ComposeFile = '',
  [switch]$RemoveVolumes
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $PSScriptRoot) {
  throw "Unable to resolve script root (PSScriptRoot is empty). Run with: powershell -File .\\stop-docker.ps1"
}

if ([string]::IsNullOrWhiteSpace($ComposeFile)) {
  $ComposeFile = (Join-Path $PSScriptRoot 'docker-compose.full.yml')
}

Write-Host "Stopping full stack..." -ForegroundColor Cyan
if ($RemoveVolumes) {
  docker compose --env-file (Join-Path $PSScriptRoot '.env.docker') -f $ComposeFile down -v | Out-Host
} else {
  docker compose --env-file (Join-Path $PSScriptRoot '.env.docker') -f $ComposeFile down | Out-Host
}
