param(
  [string]$SecretsPath = "control/secrets.env"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $SecretsPath)) {
  throw "Secrets file not found: $SecretsPath (copy from control/secrets.env.example)"
}

$lines = Get-Content -LiteralPath $SecretsPath
foreach ($line in $lines) {
  $t = $line.Trim()
  if ($t.Length -eq 0) { continue }
  if ($t.StartsWith("#")) { continue }

  $idx = $t.IndexOf("=")
  if ($idx -lt 1) { continue }

  $key = $t.Substring(0, $idx).Trim()
  $value = $t.Substring($idx + 1)

  # Allow empty values; strip surrounding quotes if present.
  if ($value.StartsWith('"') -and $value.EndsWith('"') -and $value.Length -ge 2) {
    $value = $value.Substring(1, $value.Length - 2)
  }

  Set-Item -Path "Env:$key" -Value $value
}

Write-Host "Loaded env from $SecretsPath"
