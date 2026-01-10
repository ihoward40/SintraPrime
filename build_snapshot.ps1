Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# SintraPrime snapshot helper (Windows)
#
# DeepThink hook:
# - Validates the DeepThink request is CI-safe (dry, deterministic)
# - Optionally generates a DeepThink receipt artifact

function Resolve-RepoRoot {
  $here = Split-Path -Parent $MyInvocation.MyCommand.Path
  return (Resolve-Path (Join-Path $here '.')).Path
}

$RepoRoot = Resolve-RepoRoot
Push-Location $RepoRoot
try {
  Write-Host '[snapshot] DeepThink gates…'
  npm run -s ci:deepthink-gates

  # Optional: generate a DeepThink receipt under runs/deepthink/
  # (This remains deterministic in mode=dry.)
  if (Test-Path (Join-Path $RepoRoot 'deepthink_request.json')) {
    Write-Host '[snapshot] DeepThink receipt…'
    node (Join-Path $RepoRoot 'agent-mode-engine' 'deepthink' 'src' 'deepthink.mjs') (Join-Path $RepoRoot 'deepthink_request.json') --out (Join-Path $RepoRoot 'runs' 'deepthink' 'latest.json')
  }

  Write-Host '[snapshot] Done.'
} finally {
  Pop-Location
}
