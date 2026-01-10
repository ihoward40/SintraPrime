[CmdletBinding()]
param(
  # Directory containing the public-safe, post-freeze artifacts to export.
  [Parameter(Mandatory=$true)]
  [string]$SourceRoot,

  # Destination root for the NotebookLM source set.
  [string]$DestRoot = "analysis/notebooklm/source_set",

  # Optional freeze tag string to embed in the manifest.
  [string]$FreezeTag = "",

  # Allow generating a partial source set if some files are missing.
  [switch]$AllowMissing
)

$ErrorActionPreference = 'Stop'

$files = @(
  "Exhibit_A_System_Overview.pdf",
  "Exhibit_B_Tier_Declaration_Sheet.pdf",
  "FINAL_EXHIBIT_BINDER.pdf",
  "runs.json",
  "runs.merkle.json",
  "tier_declaration.json",
  "binder_manifest.json"
)

$destFiles = Join-Path $DestRoot "files"
New-Item -ItemType Directory -Force -Path $destFiles | Out-Null

$rows = @()
foreach ($f in $files) {
  $src = Join-Path $SourceRoot $f
  $dst = Join-Path $destFiles $f

  if (!(Test-Path $src)) {
    if (-not $AllowMissing) {
      throw "Missing required file: $src"
    }
    $rows += [pscustomobject]@{ name=$f; sha256=$null; copied=$false }
    continue
  }

  Copy-Item $src $dst -Force
  $h = (Get-FileHash -Algorithm SHA256 $dst).Hash.ToLower()
  $rows += [pscustomobject]@{ name=$f; sha256=$h; copied=$true }
}

if ([string]::IsNullOrWhiteSpace($FreezeTag)) {
  try { $FreezeTag = (git describe --tags --abbrev=0 2>$null).Trim() } catch { $FreezeTag = "" }
}

$manifest = [ordered]@{
  version = "notebooklm.source_set.export.v1"
  generated_at = (Get-Date).ToUniversalTime().ToString("o")
  purpose = "NotebookLM read-only analysis"
  freeze_tag = $FreezeTag
  from_dir = $SourceRoot
  files = $rows
}

$manifestPath = Join-Path $DestRoot "source_set.json"
$manifestJson = ($manifest | ConvertTo-Json -Depth 6)
$manifestJson | Set-Content $manifestPath -Encoding utf8

$hash = (Get-FileHash -Algorithm SHA256 $manifestPath).Hash.ToLower()
"$hash  source_set.json" + "`n" | Set-Content -Encoding ascii "$manifestPath.sha256"

Write-Host "NotebookLM source set exported and hashed."
Write-Host "Manifest: $manifestPath"
Write-Host "SHA-256:  $hash"
