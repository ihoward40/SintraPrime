<#
.SYNOPSIS
    Safe launcher for OpenCode with cryptographic policy enforcement.

.DESCRIPTION
    Launches OpenCode with enforced policy checks including:
    - Cryptographic seal verification of OpenCode config
    - Path sandbox validation
    - Command policy enforcement
    - Network domain filtering
    - MCP server validation
    
    The launcher will BLOCK if any policy check fails.

.PARAMETER ConfigPath
    Path to the policy configuration file. Default: script directory + opencode_policy.config.v1.json

.PARAMETER WorkRoot
    Working directory root for OpenCode session. Must be within allowed paths.

.PARAMETER PlanPath
    Optional. Path to OpenCode plan file for additional validation.

.PARAMETER SkipPolicyCheck
    DANGEROUS. Skip policy enforcement. Only use for emergency recovery.

.EXAMPLE
    .\Start-OpenCodeSafe.ps1 -WorkRoot "C:\SintraPrime\CASES\Project1"

.EXAMPLE
    .\Start-OpenCodeSafe.ps1 -WorkRoot "C:\SintraPrime\RESEARCH\Analysis" -PlanPath ".\plan.json"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$ConfigPath = (Join-Path $PSScriptRoot "opencode_policy.config.v1.json"),

    [Parameter(Mandatory=$true)]
    [string]$WorkRoot,

    [Parameter(Mandatory=$false)]
    [string]$PlanPath,

    [Parameter(Mandatory=$false)]
    [switch]$SkipPolicyCheck
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "              OpenCode Safe Launcher" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Validate config exists
if (-not (Test-Path $ConfigPath)) {
    Write-Host "[BLOCKED] Policy config not found: $ConfigPath" -ForegroundColor Red
    exit 1
}

# Load policy to get OpenCode config path
try {
    $policy = Get-Content -Raw $ConfigPath | ConvertFrom-Json
} catch {
    Write-Host "[BLOCKED] Failed to parse policy config: $_" -ForegroundColor Red
    exit 1
}

# Pin OpenCode to sealed config explicitly
$opencodeConfigPath = [Environment]::ExpandEnvironmentVariables($policy.integrity.opencode_config_path)
$env:OPENCODE_CONFIG = $opencodeConfigPath

Write-Host "[INFO] OpenCode config pinned to: $opencodeConfigPath" -ForegroundColor Cyan
Write-Host "[INFO] Working root: $WorkRoot" -ForegroundColor Cyan

# Validate WorkRoot exists
if (-not (Test-Path $WorkRoot)) {
    Write-Host "[BLOCKED] WorkRoot does not exist: $WorkRoot" -ForegroundColor Red
    exit 1
}

# Run policy lint BEFORE creating workspace
if (-not $SkipPolicyCheck) {
    Write-Host ""
    Write-Host "[POLICY] Running policy checks..." -ForegroundColor Cyan
    Write-Host ""
    
    $lintArgs = @{
        ConfigPath = $ConfigPath
        WorkRoot = $WorkRoot
    }
    
    if ($PlanPath) {
        $lintArgs.PlanPath = $PlanPath
    }
    
    $testPolicyScript = Join-Path $PSScriptRoot "Test-OpenCodePolicy.ps1"
    
    if (-not (Test-Path $testPolicyScript)) {
        Write-Host "[BLOCKED] Test-OpenCodePolicy.ps1 not found at: $testPolicyScript" -ForegroundColor Red
        exit 1
    }
    
    & pwsh -NoProfile -ExecutionPolicy Bypass $testPolicyScript @lintArgs
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "[BLOCKED] Policy check failed. OpenCode will not start." -ForegroundColor Red
        Write-Host "[BLOCKED] Exit code: $LASTEXITCODE" -ForegroundColor Red
        exit $LASTEXITCODE
    }
    
    Write-Host ""
    Write-Host "[POLICY] ✓ All policy checks passed" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "[WARNING] ⚠ Policy checks SKIPPED (dangerous!)" -ForegroundColor Yellow
    Write-Host "[WARNING] ⚠ This should only be used for emergency recovery" -ForegroundColor Yellow
}

# Launch OpenCode
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "[LAUNCH] Starting OpenCode..." -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Change to work directory
Push-Location $WorkRoot

try {
    # Check if opencode command exists
    $opencodeCmd = Get-Command opencode -ErrorAction SilentlyContinue
    
    if (-not $opencodeCmd) {
        Write-Host "[ERROR] 'opencode' command not found in PATH" -ForegroundColor Red
        Write-Host "[ERROR] Please ensure OpenCode is installed and in your PATH" -ForegroundColor Red
        exit 1
    }
    
    # Launch OpenCode with plan if provided
    if ($PlanPath) {
        Write-Host "[LAUNCH] Using plan: $PlanPath" -ForegroundColor Cyan
        & opencode --plan $PlanPath
    } else {
        Write-Host "[LAUNCH] Interactive mode" -ForegroundColor Cyan
        & opencode
    }
    
    $exitCode = $LASTEXITCODE
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "[COMPLETE] OpenCode session ended (exit code: $exitCode)" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
    exit $exitCode
    
} finally {
    Pop-Location
}
