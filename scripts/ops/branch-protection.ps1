param(
  [Parameter(Mandatory = $true)][ValidateSet("solo", "team")][string]$Mode,
  [string]$Owner = "ihoward40",
  [string]$Repo = "SintraPrime",
  [string]$Branch = "master"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = (git rev-parse --show-toplevel) 2>$null
if (-not $root) { throw "Run this from inside the repo." }

$cfgPath = Join-Path $root ".github/branch-protection/$Mode.json"
if (-not (Test-Path $cfgPath)) { throw "Missing config: $cfgPath" }

Write-Host "Applying branch protection mode: $Mode  ->  $Owner/${Repo}:${Branch}"

# Read raw JSON and send as application/json
$json = Get-Content $cfgPath -Raw

# Apply (PUT replaces the protection config; that's what we want for a true toggle)
# Note: PowerShell doesn't support bash heredocs (<<<). We pipe the JSON to stdin.
$json | gh api -X PUT `
  -H "Accept: application/vnd.github+json" `
  -H "Content-Type: application/json" `
  "repos/$Owner/$Repo/branches/$Branch/protection" `
  --input - `
  --silent

# Verify
$verify = gh api "repos/$Owner/$Repo/branches/$Branch/protection" --jq '{
  enforce_admins: .enforce_admins.enabled,
  reviews_required: .required_pull_request_reviews.required_approving_review_count,
  code_owner: .required_pull_request_reviews.require_code_owner_reviews,
  conversation_resolution: (.required_conversation_resolution.enabled // .required_conversation_resolution),
  strict: .required_status_checks.strict,
  contexts: .required_status_checks.contexts
}'

Write-Host $verify
