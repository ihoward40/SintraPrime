<#
.SYNOPSIS
    Health Diff Script for SintraPrime Supermemory operations.
    Upgrade #5 from the High-ROI Upgrade Roadmap.

.DESCRIPTION
    Compares "latest vs yesterday" health snapshots and flags regressions.
    Detects: P95 spikes, error rate increases, success rate drops.
    Integrates with Make.com to send alerts on regressions.

.PARAMETER BaselineDate
    Date to compare against (yyyy-MM-dd). Default: yesterday.

.PARAMETER P95SpikeThreshold
    Percentage increase in P95 to flag as regression. Default: 20%.

.PARAMETER ErrorRateSpikeThreshold
    Percentage point increase in error rate to flag. Default: 5%.

.PARAMETER MakeFriendly
    Output single JSON object for Make.com consumption.

.OUTPUTS
    JSON object with comparison results and regression flags.

.EXAMPLE
    .\sm-health-diff.ps1 -MakeFriendly
    .\sm-health-diff.ps1 -BaselineDate "2026-02-01" -P95SpikeThreshold 30
#>

param(
    [string]$BaselineDate = (Get-Date).AddDays(-1).ToString("yyyy-MM-dd"),
    [double]$P95SpikeThreshold = 20,
    [double]$ErrorRateSpikeThreshold = 5,
    [double]$SuccessRateDropThreshold = 5,
    [switch]$MakeFriendly
)

# Strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Import health snapshot functions
$libPath = Join-Path $PSScriptRoot "lib" "Write-HealthSnapshot.ps1"
if (Test-Path $libPath) {
    . $libPath
}

$script:HealthDirectory = Join-Path $PSScriptRoot "health"

function Get-HealthDiff {
    $now = Get-Date
    $result = @{
        version = "sm-make-v1"
        timestamp = $now.ToString("o")
        status = "unknown"
        regressions = @()
        improvements = @()
        comparison = @{}
        alerts = @()
    }
    
    # Load latest snapshot
    $latestPath = Join-Path $script:HealthDirectory "sm_health_latest.json"
    if (-not (Test-Path $latestPath)) {
        $result.status = "error"
        $result.error = "Latest health snapshot not found"
        $result.exitCode = 1
        return $result
    }
    
    try {
        $latest = Get-Content $latestPath -Raw | ConvertFrom-Json
    }
    catch {
        $result.status = "error"
        $result.error = "Failed to parse latest snapshot: $_"
        $result.exitCode = 2
        return $result
    }
    
    # Load baseline snapshot
    $baselinePath = Join-Path $script:HealthDirectory "sm_health_$BaselineDate.json"
    if (-not (Test-Path $baselinePath)) {
        $result.status = "warning"
        $result.warning = "Baseline snapshot for $BaselineDate not found. Cannot compare."
        $result.latestOnly = $latest
        $result.exitCode = 0
        return $result
    }
    
    try {
        $baseline = Get-Content $baselinePath -Raw | ConvertFrom-Json
    }
    catch {
        $result.status = "error"
        $result.error = "Failed to parse baseline snapshot: $_"
        $result.exitCode = 2
        return $result
    }
    
    # Extract metrics with null safety
    $latestMetrics = if ($latest.PSObject.Properties['metrics']) { $latest.metrics } else { @{} }
    $baselineMetrics = if ($baseline.PSObject.Properties['metrics']) { $baseline.metrics } else { @{} }
    
    # Get values with defaults
    $latestP95 = if ($latestMetrics.PSObject.Properties['p95_ms']) { $latestMetrics.p95_ms } else { 0 }
    $baselineP95 = if ($baselineMetrics.PSObject.Properties['p95_ms']) { $baselineMetrics.p95_ms } else { 0 }
    
    $latestErrors = if ($latestMetrics.PSObject.Properties['errors']) { $latestMetrics.errors } else { 0 }
    $baselineErrors = if ($baselineMetrics.PSObject.Properties['errors']) { $baselineMetrics.errors } else { 0 }
    
    $latestAttempts = if ($latestMetrics.PSObject.Properties['attempts']) { $latestMetrics.attempts } else { 1 }
    $baselineAttempts = if ($baselineMetrics.PSObject.Properties['attempts']) { $baselineMetrics.attempts } else { 1 }
    
    $latestSuccesses = if ($latestMetrics.PSObject.Properties['successes']) { $latestMetrics.successes } else { 0 }
    $baselineSuccesses = if ($baselineMetrics.PSObject.Properties['successes']) { $baselineMetrics.successes } else { 0 }
    
    # Calculate rates
    $latestErrorRate = if ($latestAttempts -gt 0) { ($latestErrors / $latestAttempts) * 100 } else { 0 }
    $baselineErrorRate = if ($baselineAttempts -gt 0) { ($baselineErrors / $baselineAttempts) * 100 } else { 0 }
    
    $latestSuccessRate = if ($latestAttempts -gt 0) { ($latestSuccesses / $latestAttempts) * 100 } else { 100 }
    $baselineSuccessRate = if ($baselineAttempts -gt 0) { ($baselineSuccesses / $baselineAttempts) * 100 } else { 100 }
    
    # Store comparison data
    $result.comparison = @{
        baselineDate = $BaselineDate
        latestDate = if ($latest.PSObject.Properties['generatedAt']) { $latest.generatedAt } else { "unknown" }
        p95 = @{
            latest = $latestP95
            baseline = $baselineP95
            change = $latestP95 - $baselineP95
            changePercent = if ($baselineP95 -gt 0) { [math]::Round((($latestP95 - $baselineP95) / $baselineP95) * 100, 2) } else { 0 }
        }
        errorRate = @{
            latest = [math]::Round($latestErrorRate, 2)
            baseline = [math]::Round($baselineErrorRate, 2)
            change = [math]::Round($latestErrorRate - $baselineErrorRate, 2)
        }
        successRate = @{
            latest = [math]::Round($latestSuccessRate, 2)
            baseline = [math]::Round($baselineSuccessRate, 2)
            change = [math]::Round($latestSuccessRate - $baselineSuccessRate, 2)
        }
        attempts = @{
            latest = $latestAttempts
            baseline = $baselineAttempts
            change = $latestAttempts - $baselineAttempts
        }
    }
    
    # Check for regressions
    $hasRegression = $false
    
    # P95 Spike Check
    if ($baselineP95 -gt 0) {
        $p95ChangePercent = (($latestP95 - $baselineP95) / $baselineP95) * 100
        if ($p95ChangePercent -gt $P95SpikeThreshold) {
            $hasRegression = $true
            $result.regressions += @{
                type = "p95_spike"
                severity = "warning"
                message = "P95 latency increased by $([math]::Round($p95ChangePercent, 1))% (threshold: $P95SpikeThreshold%)"
                latest = $latestP95
                baseline = $baselineP95
                threshold = $P95SpikeThreshold
            }
            $result.alerts += @{
                type = "performance"
                metric = "p95_ms"
                message = "P95 spike detected: ${latestP95}ms vs ${baselineP95}ms baseline"
            }
        }
        elseif ($p95ChangePercent -lt -10) {
            $result.improvements += @{
                type = "p95_improvement"
                message = "P95 latency decreased by $([math]::Round([math]::Abs($p95ChangePercent), 1))%"
            }
        }
    }
    
    # Error Rate Spike Check
    $errorRateChange = $latestErrorRate - $baselineErrorRate
    if ($errorRateChange -gt $ErrorRateSpikeThreshold) {
        $hasRegression = $true
        $result.regressions += @{
            type = "error_rate_spike"
            severity = "error"
            message = "Error rate increased by $([math]::Round($errorRateChange, 2)) percentage points (threshold: $ErrorRateSpikeThreshold)"
            latest = [math]::Round($latestErrorRate, 2)
            baseline = [math]::Round($baselineErrorRate, 2)
            threshold = $ErrorRateSpikeThreshold
        }
        $result.alerts += @{
            type = "reliability"
            metric = "error_rate"
            message = "Error rate spike: $([math]::Round($latestErrorRate, 2))% vs $([math]::Round($baselineErrorRate, 2))% baseline"
        }
    }
    
    # Success Rate Drop Check
    $successRateChange = $latestSuccessRate - $baselineSuccessRate
    if ($successRateChange -lt -$SuccessRateDropThreshold) {
        $hasRegression = $true
        $result.regressions += @{
            type = "success_rate_drop"
            severity = "error"
            message = "Success rate dropped by $([math]::Round([math]::Abs($successRateChange), 2)) percentage points (threshold: $SuccessRateDropThreshold)"
            latest = [math]::Round($latestSuccessRate, 2)
            baseline = [math]::Round($baselineSuccessRate, 2)
            threshold = $SuccessRateDropThreshold
        }
        $result.alerts += @{
            type = "reliability"
            metric = "success_rate"
            message = "Success rate drop: $([math]::Round($latestSuccessRate, 2))% vs $([math]::Round($baselineSuccessRate, 2))% baseline"
        }
    }
    elseif ($successRateChange -gt 5) {
        $result.improvements += @{
            type = "success_rate_improvement"
            message = "Success rate improved by $([math]::Round($successRateChange, 2)) percentage points"
        }
    }
    
    # Set final status
    if ($hasRegression) {
        $result.status = "regression"
        $result.exitCode = 3
    }
    else {
        $result.status = "healthy"
        $result.exitCode = 0
    }
    
    $result.regressionCount = $result.regressions.Count
    $result.improvementCount = $result.improvements.Count
    $result.alertCount = $result.alerts.Count
    
    return $result
}

# Main execution
try {
    $diffResult = Get-HealthDiff
    
    if ($MakeFriendly) {
        # Single JSON object, no trailing newline
        [Console]::Write(($diffResult | ConvertTo-Json -Depth 10 -Compress))
    }
    else {
        # Human-readable output
        Write-Host "=== SintraPrime Health Diff ===" -ForegroundColor Cyan
        Write-Host "Baseline: $BaselineDate"
        Write-Host "Status: $($diffResult.status)" -ForegroundColor $(if ($diffResult.status -eq "healthy") { "Green" } elseif ($diffResult.status -eq "regression") { "Red" } else { "Yellow" })
        Write-Host ""
        
        if ($diffResult.comparison.Count -gt 0) {
            Write-Host "=== Comparison ===" -ForegroundColor Cyan
            Write-Host "P95 Latency: $($diffResult.comparison.p95.latest)ms (was $($diffResult.comparison.p95.baseline)ms, change: $($diffResult.comparison.p95.changePercent)%)"
            Write-Host "Error Rate: $($diffResult.comparison.errorRate.latest)% (was $($diffResult.comparison.errorRate.baseline)%, change: $($diffResult.comparison.errorRate.change) pp)"
            Write-Host "Success Rate: $($diffResult.comparison.successRate.latest)% (was $($diffResult.comparison.successRate.baseline)%, change: $($diffResult.comparison.successRate.change) pp)"
            Write-Host ""
        }
        
        if ($diffResult.regressions.Count -gt 0) {
            Write-Host "=== REGRESSIONS DETECTED ===" -ForegroundColor Red
            foreach ($reg in $diffResult.regressions) {
                Write-Host "  [$($reg.severity.ToUpper())] $($reg.message)" -ForegroundColor Red
            }
            Write-Host ""
        }
        
        if ($diffResult.improvements.Count -gt 0) {
            Write-Host "=== Improvements ===" -ForegroundColor Green
            foreach ($imp in $diffResult.improvements) {
                Write-Host "  $($imp.message)" -ForegroundColor Green
            }
            Write-Host ""
        }
        
        Write-Host ""
        Write-Host "Full JSON output:"
        $diffResult | ConvertTo-Json -Depth 10
    }
    
    exit $diffResult.exitCode
}
catch {
    $errorResult = @{
        version = "sm-make-v1"
        status = "error"
        error = $_.Exception.Message
        exitCode = 99
        timestamp = (Get-Date).ToString("o")
    }
    
    if ($MakeFriendly) {
        [Console]::Write(($errorResult | ConvertTo-Json -Compress))
    }
    else {
        Write-Error "Health diff failed: $_"
        $errorResult | ConvertTo-Json -Depth 5
    }
    
    exit 99
}
