[CmdletBinding()]
param(
  [string]$ComposeFile = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if (-not $PSScriptRoot) {
  throw "Unable to resolve script root (PSScriptRoot is empty). Run with: powershell -File .\\start-docker.ps1"
}

if ([string]::IsNullOrWhiteSpace($ComposeFile)) {
  $ComposeFile = (Join-Path $PSScriptRoot 'docker-compose.full.yml')
}

$envFile = Join-Path $PSScriptRoot '.env.docker'
$envExample = Join-Path $PSScriptRoot '.env.docker.example'

if (-not (Test-Path -LiteralPath $envFile)) {
  if (Test-Path -LiteralPath $envExample) {
    Copy-Item -LiteralPath $envExample -Destination $envFile -Force
    Write-Host "Created .env.docker from .env.docker.example (edit values as needed)." -ForegroundColor Yellow
  } else {
    throw "Missing .env.docker and .env.docker.example"
  }
}

Write-Host "Starting full stack via Docker Compose..." -ForegroundColor Cyan
docker compose --env-file $envFile -f $ComposeFile up -d --build | Out-Host
