<#
.SYNOPSIS
    Enhanced Router Enforcement for SintraPrime Supermemory operations.
    Upgrade #11 from the High-ROI Upgrade Roadmap.

.DESCRIPTION
    Implements comprehensive routing logic for Make.com integration.
    Routes:
    - version != "v1" → Quarantine route (don't process)
    - exitCode != 0 → Alert route
    - hits.bait > 0 → Critical breach lane (page on-call)
    - p95 > threshold → Performance lane (alert ops)

.PARAMETER ExecutionResult
    The JSON result from a Supermemory script execution.

.PARAMETER P95Threshold
    P95 latency threshold in milliseconds. Default: 2000ms.

.OUTPUTS
    JSON object with routing decision.

.EXAMPLE
    . .\lib\Router-Enforcement.ps1
    $result = Get-Content result.json | ConvertFrom-Json
    $routing = Get-RoutingDecision -ExecutionResult $result
#>

# Routing configuration
$script:RouterConfig = @{
    ExpectedVersion = "sm-make-v1"
    P95ThresholdMs = 2000
    ErrorRateThreshold = 0.05  # 5%
    Routes = @{
        Success = "success"
        VersionMismatch = "quarantine"
        ExitCodeFailure = "alert"
        CriticalBreach = "critical"
        PerformanceDegraded = "performance"
        ReceiptMissing = "failure"
    }
    Severities = @{
        Success = "info"
        VersionMismatch = "warning"
        ExitCodeFailure = "error"
        CriticalBreach = "critical"
        PerformanceDegraded = "warning"
        ReceiptMissing = "error"
    }
}

function Get-RoutingDecision {
    <#
    .SYNOPSIS
        Determines the routing decision for a Supermemory execution result.
    
    .PARAMETER ExecutionResult
        The execution result object (from JSON).
    
    .PARAMETER P95ThresholdMs
        Override for P95 threshold.
    
    .OUTPUTS
        PSCustomObject with routing decision.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$ExecutionResult,
        
        [int]$P95ThresholdMs = 2000
    )
    
    $now = Get-Date
    $decision = @{
        timestamp = $now.ToString("o")
        route = $script:RouterConfig.Routes.Success
        severity = $script:RouterConfig.Severities.Success
        reasons = @()
        alerts = @()
        proceed = $true
        version = "router-v1"
    }
    
    # Extract key fields with null safety
    $version = if ($ExecutionResult.PSObject.Properties['version']) { $ExecutionResult.version } else { $null }
    $exitCode = if ($ExecutionResult.PSObject.Properties['exitCode']) { $ExecutionResult.exitCode } else { 0 }
    $status = if ($ExecutionResult.PSObject.Properties['status']) { $ExecutionResult.status } else { "unknown" }
    $p95 = if ($ExecutionResult.PSObject.Properties['p95_ms']) { $ExecutionResult.p95_ms } else { 0 }
    $baitHits = 0
    
    # Check for bait hits in various locations
    if ($ExecutionResult.PSObject.Properties['hits']) {
        if ($ExecutionResult.hits.PSObject.Properties['bait']) {
            $baitHits = $ExecutionResult.hits.bait
        }
    }
    if ($ExecutionResult.PSObject.Properties['baitHits']) {
        $baitHits = $ExecutionResult.baitHits
    }
    
    # Route 1: Version Mismatch → Quarantine
    if ($null -eq $version -or $version -ne $script:RouterConfig.ExpectedVersion) {
        $decision.route = $script:RouterConfig.Routes.VersionMismatch
        $decision.severity = $script:RouterConfig.Severities.VersionMismatch
        $decision.proceed = $false
        $decision.reasons += "Version mismatch: expected '$($script:RouterConfig.ExpectedVersion)', got '$version'"
        $decision.alerts += @{
            type = "version_mismatch"
            expected = $script:RouterConfig.ExpectedVersion
            actual = $version
            action = "Quarantine - do not process"
        }
    }
    
    # Route 2: Critical Breach (Bait Token Leaked) → Critical Lane
    if ($baitHits -gt 0) {
        $decision.route = $script:RouterConfig.Routes.CriticalBreach
        $decision.severity = $script:RouterConfig.Severities.CriticalBreach
        $decision.proceed = $false
        $decision.reasons += "CRITICAL: Bait token leaked! Hits: $baitHits"
        $decision.alerts += @{
            type = "bait_token_breach"
            hits = $baitHits
            action = "PAGE ON-CALL IMMEDIATELY"
            urgency = "critical"
        }
    }
    
    # Route 3: Exit Code Failure → Alert Lane
    if ($exitCode -ne 0) {
        # Don't downgrade from critical
        if ($decision.route -ne $script:RouterConfig.Routes.CriticalBreach) {
            $decision.route = $script:RouterConfig.Routes.ExitCodeFailure
            $decision.severity = $script:RouterConfig.Severities.ExitCodeFailure
        }
        $decision.proceed = $false
        $decision.reasons += "Exit code failure: $exitCode"
        $decision.alerts += @{
            type = "exit_code_failure"
            exitCode = $exitCode
            status = $status
            action = "Investigate and alert"
        }
    }
    
    # Route 4: Performance Degraded → Performance Lane
    if ($p95 -gt $P95ThresholdMs) {
        # Don't downgrade from critical or alert
        if ($decision.route -eq $script:RouterConfig.Routes.Success) {
            $decision.route = $script:RouterConfig.Routes.PerformanceDegraded
            $decision.severity = $script:RouterConfig.Severities.PerformanceDegraded
        }
        $decision.reasons += "P95 latency exceeded threshold: ${p95}ms > ${P95ThresholdMs}ms"
        $decision.alerts += @{
            type = "performance_degraded"
            p95_ms = $p95
            threshold_ms = $P95ThresholdMs
            action = "Alert ops team"
        }
    }
    
    # Add summary
    $decision.summary = if ($decision.proceed) {
        "Execution passed all checks"
    } else {
        "Execution failed: $($decision.reasons -join '; ')"
    }
    
    $decision.alertCount = $decision.alerts.Count
    
    return [PSCustomObject]$decision
}

function Format-RoutingDecisionForMake {
    <#
    .SYNOPSIS
        Formats a routing decision for Make.com consumption.
    
    .PARAMETER Decision
        The routing decision object.
    
    .OUTPUTS
        JSON string suitable for Make.com.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Decision
    )
    
    $makeOutput = @{
        version = "router-v1"
        route = $Decision.route
        severity = $Decision.severity
        proceed = $Decision.proceed
        alertCount = $Decision.alertCount
        summary = $Decision.summary
        timestamp = $Decision.timestamp
    }
    
    # Add first alert details for easy access
    if ($Decision.alerts.Count -gt 0) {
        $makeOutput.primaryAlert = $Decision.alerts[0]
    }
    
    return $makeOutput | ConvertTo-Json -Depth 5 -Compress
}

function Test-ReceiptFileExists {
    <#
    .SYNOPSIS
        Upgrade #12: Receipt File Existence Guard.
        Verifies receipt file exists and has non-zero size.
    
    .PARAMETER ReceiptPath
        Path to the receipt file.
    
    .OUTPUTS
        PSCustomObject with validation result.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$ReceiptPath
    )
    
    $result = @{
        valid = $false
        path = $ReceiptPath
        timestamp = (Get-Date).ToString("o")
        version = "guard-v1"
    }
    
    if (-not (Test-Path $ReceiptPath)) {
        $result.reason = "Receipt file does not exist"
        $result.route = $script:RouterConfig.Routes.ReceiptMissing
        return [PSCustomObject]$result
    }
    
    $fileInfo = Get-Item $ReceiptPath
    
    if ($fileInfo.Length -eq 0) {
        $result.reason = "Receipt file is empty (0 bytes)"
        $result.route = $script:RouterConfig.Routes.ReceiptMissing
        $result.fileSize = 0
        return [PSCustomObject]$result
    }
    
    $result.valid = $true
    $result.reason = "Receipt file exists and has content"
    $result.route = $script:RouterConfig.Routes.Success
    $result.fileSize = $fileInfo.Length
    $result.lastModified = $fileInfo.LastWriteTime.ToString("o")
    
    return [PSCustomObject]$result
}

# Export functions
Export-ModuleMember -Function Get-RoutingDecision, Format-RoutingDecisionForMake, Test-ReceiptFileExists -ErrorAction SilentlyContinue
