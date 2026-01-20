param(
  [Parameter(Mandatory=$true)][string]$Tag,
  [Parameter(Mandatory=$true)][string]$Objective,
  [string]$RunsRoot = "runs",
  [string]$Seq,
  [string]$Now
)

$ErrorActionPreference = 'Stop'

$repoRoot = (Get-Location).Path
$script = Join-Path $repoRoot 'tools\run-skeleton\run-skeleton.mjs'

if (-not (Test-Path $script)) {
  throw "Missing run-skeleton.mjs at $script"
}

$argsList = @('--tag', $Tag, '--objective', $Objective, '--runs-root', $RunsRoot)
if ($Seq) { $argsList += @('--seq', $Seq) }
if ($Now) { $argsList += @('--now', $Now) }

node $script @argsList
