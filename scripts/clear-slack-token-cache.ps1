param(
  [string]$CachePath = "data/slack_token.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$abs = Resolve-Path -LiteralPath $CachePath -ErrorAction SilentlyContinue
if (-not $abs) {
  Write-Host "No Slack token cache found at $CachePath"
  exit 0
}

Remove-Item -LiteralPath $abs -Force
Write-Host "Deleted Slack token cache: $($abs.Path)"
