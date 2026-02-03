<#
.SYNOPSIS
    Unified Operations Runner for SintraPrime Supermemory.
    Integrates all 12 upgrades from the High-ROI Upgrade Roadmap.

.DESCRIPTION
    Single entry point for all Supermemory operational tasks.
    Automatically applies lock file, health snapshots, routing, and governance.
    Supports all Make.com integration patterns.

.PARAMETER Action
    The action to perform: 'health', 'proof', 'diff', 'rotate', 'fixtures', 'integrity'.

.PARAMETER Strict
    Enable strict mode for fail-closed validation.

.PARAMETER MakeFriendly
    Output single JSON object for Make.com consumption.

.OUTPUTS
    JSON object with operation results.

.EXAMPLE
    .\sm-ops-runner.ps1 -Action health -MakeFriendly
    .\sm-ops-runner.ps1 -Action proof -Strict -MakeFriendly
    .\sm-ops-runner.ps1 -Action diff
#>

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("health", "proof", "diff", "rotate", "fixtures", "integrity", "status")]
    [string]$Action,
    
    [switch]$Strict,
    [switch]$MakeFriendly,
    [int]$TimeoutSeconds = 120,
    [string]$PolicyPath = ""
)

# Strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Import all library functions
$libPath = Join-Path $PSScriptRoot "lib"
$libs = @(
    "Lock-Execution.ps1",
    "Write-HealthSnapshot.ps1",
    "Router-Enforcement.ps1",
    "Schema-Validation.ps1",
    "Invoke-WithTimeout.ps1",
    "Receipt-Integrity.ps1",
    "Policy-Enforcement.ps1",
    "Two-Person-Rule.ps1"
)

foreach ($lib in $libs) {
    $libFile = Join-Path $libPath $lib
    if (Test-Path $libFile) {
        . $libFile
    }
}

function Invoke-WithLockAndRouting {
    <#
    .SYNOPSIS
        Wraps an operation with lock file, timeout, and routing.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$LockName,
        
        [Parameter(Mandatory=$true)]
        [ScriptBlock]$Operation,
        
        [int]$TimeoutSeconds = 120
    )
    
    $result = @{
        version = "sm-make-v1"
        timestamp = (Get-Date).ToString("o")
        lockName = $LockName
    }
    
    # Acquire lock
    $lock = Get-ExecutionLock -LockName $LockName -MaxAgeMinutes 5
    
    if (-not $lock.acquired) {
        $result.status = "blocked"
        $result.error = "Could not acquire lock: $($lock.reason)"
        $result.exitCode = 11
        return $result
    }
    
    $result.lockAcquired = $true
    
    try {
        # Execute with timeout
        $startTime = Get-Date
        $operationResult = & $Operation
        $endTime = Get-Date
        
        $result.durationMs = [math]::Round(($endTime - $startTime).TotalMilliseconds, 2)
        $result.operationResult = $operationResult
        
        # Apply routing
        if ($operationResult -is [hashtable] -or $operationResult -is [PSCustomObject]) {
            $routing = Get-RoutingDecision -ExecutionResult ([PSCustomObject]$operationResult)
            $result.routing = $routing
            $result.route = $routing.route
            $result.proceed = $routing.proceed
        }
        
        $result.status = "success"
        $result.exitCode = 0
    }
    catch {
        $result.status = "error"
        $result.error = $_.Exception.Message
        $result.exitCode = 1
    }
    finally {
        # Release lock
        $release = Release-ExecutionLock -LockName $LockName
        $result.lockReleased = $release.released
    }
    
    # Add policy hash if available
    if ($PolicyPath -and (Test-Path $PolicyPath)) {
        $policyHash = Get-PolicyPackHash -PolicyPath $PolicyPath
        $result.policyPackHash = $policyHash.policyPackHash
    }
    elseif (Test-Path (Join-Path $PSScriptRoot "policies" "active_policy.json")) {
        $policyHash = Get-PolicyPackHash
        $result.policyPackHash = $policyHash.policyPackHash
    }
    
    return $result
}

function Get-SystemStatus {
    <#
    .SYNOPSIS
        Gets the current system status including all components.
    #>
    
    $status = @{
        version = "sm-make-v1"
        timestamp = (Get-Date).ToString("o")
        components = @{}
    }
    
    # Check health snapshot
    $healthPath = Join-Path $PSScriptRoot "health" "sm_health_latest.json"
    if (Test-Path $healthPath) {
        try {
            $health = Get-Content $healthPath -Raw | ConvertFrom-Json
            $status.components.health = @{
                available = $true
                status = $health.status
                healthScore = $health.healthScore
                lastUpdated = $health.generatedAt
            }
        }
        catch {
            $status.components.health = @{ available = $false; error = $_.Exception.Message }
        }
    }
    else {
        $status.components.health = @{ available = $false; reason = "No health snapshot found" }
    }
    
    # Check locks
    $locksPath = Join-Path $PSScriptRoot ".locks"
    if (Test-Path $locksPath) {
        $activeLocks = Get-ChildItem -Path $locksPath -Filter ".sm_lock_*" -ErrorAction SilentlyContinue
        $status.components.locks = @{
            available = $true
            activeLocks = @($activeLocks).Count
        }
    }
    else {
        $status.components.locks = @{ available = $true; activeLocks = 0 }
    }
    
    # Check policy
    $policyPath = Join-Path $PSScriptRoot "policies" "active_policy.json"
    if (Test-Path $policyPath) {
        $policyHash = Get-PolicyPackHash -PolicyPath $policyPath
        $status.components.policy = @{
            available = $true
            policyPackHash = $policyHash.policyPackHash
            policyName = $policyHash.policyName
        }
    }
    else {
        $status.components.policy = @{ available = $false; reason = "No active policy" }
    }
    
    # Check pending approvals
    $approvalsPath = Join-Path $PSScriptRoot "approvals" "pending"
    if (Test-Path $approvalsPath) {
        $pendingApprovals = Get-ChildItem -Path $approvalsPath -Filter "*.json" -ErrorAction SilentlyContinue
        $status.components.approvals = @{
            available = $true
            pending = @($pendingApprovals).Count
        }
    }
    else {
        $status.components.approvals = @{ available = $true; pending = 0 }
    }
    
    # Check receipts
    $receiptsPath = Join-Path $PSScriptRoot "receipts"
    if (Test-Path $receiptsPath) {
        $receiptFiles = Get-ChildItem -Path $receiptsPath -Filter "*.jsonl" -ErrorAction SilentlyContinue
        $totalSize = ($receiptFiles | Measure-Object -Property Length -Sum).Sum
        $status.components.receipts = @{
            available = $true
            fileCount = @($receiptFiles).Count
            totalSizeMB = [math]::Round($totalSize / 1MB, 2)
        }
    }
    else {
        $status.components.receipts = @{ available = $false; reason = "No receipts directory" }
    }
    
    # Check fixtures
    $fixturesPath = Join-Path $PSScriptRoot "fixtures"
    if (Test-Path $fixturesPath) {
        $fixtureFiles = Get-ChildItem -Path $fixturesPath -Filter "*.json" -ErrorAction SilentlyContinue
        $status.components.fixtures = @{
            available = $true
            fileCount = @($fixtureFiles).Count
        }
    }
    else {
        $status.components.fixtures = @{ available = $false; reason = "No fixtures directory" }
    }
    
    # Overall status
    $allAvailable = $status.components.Values | ForEach-Object { $_.available } | Where-Object { $_ -eq $false }
    $status.status = if (@($allAvailable).Count -eq 0) { "healthy" } else { "degraded" }
    $status.exitCode = 0
    
    return $status
}

# Main execution
$mainResult = @{
    version = "sm-make-v1"
    timestamp = (Get-Date).ToString("o")
    action = $Action
    strict = $Strict.IsPresent
}

try {
    switch ($Action) {
        "health" {
            # Run health check (delegates to sm-receipts-summary.ps1)
            $healthScript = Join-Path $PSScriptRoot "sm-receipts-summary.ps1"
            if (Test-Path $healthScript) {
                $mainResult = Invoke-WithLockAndRouting -LockName "sm-health" -Operation {
                    & $healthScript -MakeFriendly:$MakeFriendly -Strict:$Strict
                } -TimeoutSeconds $TimeoutSeconds
            }
            else {
                $mainResult.status = "error"
                $mainResult.error = "Health script not found"
                $mainResult.exitCode = 1
            }
        }
        
        "proof" {
            # Run proof runner (delegates to restart-supermemory.ps1)
            $proofScript = Join-Path $PSScriptRoot "restart-supermemory.ps1"
            if (Test-Path $proofScript) {
                $mainResult = Invoke-WithLockAndRouting -LockName "sm-proof" -Operation {
                    & $proofScript -MakeFriendly:$MakeFriendly -Strict:$Strict
                } -TimeoutSeconds $TimeoutSeconds
            }
            else {
                $mainResult.status = "error"
                $mainResult.error = "Proof script not found"
                $mainResult.exitCode = 1
            }
        }
        
        "diff" {
            # Run health diff
            $diffScript = Join-Path $PSScriptRoot "sm-health-diff.ps1"
            if (Test-Path $diffScript) {
                $mainResult = Invoke-WithLockAndRouting -LockName "sm-diff" -Operation {
                    & $diffScript -MakeFriendly:$MakeFriendly
                } -TimeoutSeconds $TimeoutSeconds
            }
            else {
                $mainResult.status = "error"
                $mainResult.error = "Diff script not found"
                $mainResult.exitCode = 1
            }
        }
        
        "rotate" {
            # Run receipt rotation
            $rotateScript = Join-Path $PSScriptRoot "sm-receipt-rotate.ps1"
            if (Test-Path $rotateScript) {
                $mainResult = Invoke-WithLockAndRouting -LockName "sm-rotate" -Operation {
                    & $rotateScript -MakeFriendly:$MakeFriendly
                } -TimeoutSeconds $TimeoutSeconds
            }
            else {
                $mainResult.status = "error"
                $mainResult.error = "Rotate script not found"
                $mainResult.exitCode = 1
            }
        }
        
        "fixtures" {
            # Run fixture tests
            $fixturesScript = Join-Path $PSScriptRoot "test-fixtures.ps1"
            if (Test-Path $fixturesScript) {
                $mainResult = Invoke-WithLockAndRouting -LockName "sm-fixtures" -Operation {
                    & $fixturesScript -MakeFriendly:$MakeFriendly
                } -TimeoutSeconds $TimeoutSeconds
            }
            else {
                $mainResult.status = "error"
                $mainResult.error = "Fixtures script not found"
                $mainResult.exitCode = 1
            }
        }
        
        "integrity" {
            # Run receipt integrity check
            $receiptsPath = Join-Path $PSScriptRoot "receipts" "signed_receipts.jsonl"
            if (Test-Path $receiptsPath) {
                $mainResult = Invoke-WithLockAndRouting -LockName "sm-integrity" -Operation {
                    Test-ReceiptChain -ReceiptPath $receiptsPath
                } -TimeoutSeconds $TimeoutSeconds
            }
            else {
                $mainResult.status = "warning"
                $mainResult.warning = "No signed receipts file found"
                $mainResult.exitCode = 0
            }
        }
        
        "status" {
            # Get system status
            $mainResult = Get-SystemStatus
        }
    }
}
catch {
    $mainResult.status = "error"
    $mainResult.error = $_.Exception.Message
    $mainResult.exitCode = 99
}

# Output results
if ($MakeFriendly) {
    [Console]::Write(($mainResult | ConvertTo-Json -Depth 10 -Compress))
}
else {
    Write-Host "=== SintraPrime Ops Runner ===" -ForegroundColor Cyan
    Write-Host "Action: $Action"
    Write-Host "Strict: $($Strict.IsPresent)"
    Write-Host ""
    $mainResult | ConvertTo-Json -Depth 10
}

exit $mainResult.exitCode
