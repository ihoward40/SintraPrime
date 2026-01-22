#!/usr/bin/env pwsh

param(
  [Parameter(Mandatory = $true)][string]$RunId,
  [Parameter(Mandatory = $true)][string]$By,
  [string]$Note = "",
  [string]$RunsRoot = "runs",
  [switch]$NoRehash
)

$script = Join-Path $PSScriptRoot "approve-run.mjs"

$argsList = @(
  $script,
  "--run-id", $RunId,
  "--by", $By,
  "--runs-root", $RunsRoot
)

if ($Note -and $Note.Trim().Length -gt 0) {
  $argsList += @("--note", $Note)
}

if ($NoRehash) {
  $argsList += "--no-rehash"
}

node @argsList
exit $LASTEXITCODE
