param(
  [string]$SecretsPath = "control/secrets.env",
  [switch]$Supervised = $true
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

& "$PSScriptRoot\load-secrets.ps1" -SecretsPath $SecretsPath

if ($Supervised) {
  node "./scripts/supervise-ui-server.mjs"
} else {
  node "./server.js"
}
