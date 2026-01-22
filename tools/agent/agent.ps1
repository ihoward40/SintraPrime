param(
  [Parameter(Mandatory=$true)][string]$Text,
  [ValidateSet('G1','G2','G3')][string]$Governance,
  [string]$RunsRoot = 'runs',
  [int]$TimeoutSec = 0,
  [switch]$Ship,
  [switch]$Publish
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$agent = Join-Path $repoRoot 'tools\agent\agent.mjs'

$argsList = @('--text', $Text, '--runs-root', $RunsRoot)
if ($Governance) { $argsList += @('--governance', $Governance) }
if ($TimeoutSec -gt 0) { $argsList += @('--timeout-sec', "$TimeoutSec") }
if ($Ship) { $argsList += '--ship' }
if ($Publish) { $argsList += '--publish' }

& node $agent @argsList
exit $LASTEXITCODE
