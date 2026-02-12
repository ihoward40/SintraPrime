<#
.SYNOPSIS
    Golden Fixture Tests for SintraPrime Supermemory operations.
    Upgrade #2 from the High-ROI Upgrade Roadmap.

.DESCRIPTION
    Validates parsing logic against known-good fixture files.
    Catches parsing regressions before they reach production.
    Run this test before deploying script updates.

.PARAMETER FixtureDir
    Directory containing fixture files. Default: ops/fixtures/

.PARAMETER Verbose
    Show detailed test output.

.PARAMETER MakeFriendly
    Output single JSON object for Make.com consumption.

.OUTPUTS
    JSON object with test results.

.EXAMPLE
    .\test-fixtures.ps1 -MakeFriendly
    .\test-fixtures.ps1 -Verbose
#>

param(
    [string]$FixtureDir = (Join-Path $PSScriptRoot "fixtures"),
    [switch]$Verbose,
    [switch]$MakeFriendly
)

# Strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# Import validation functions
$schemaLib = Join-Path $PSScriptRoot "lib" "Schema-Validation.ps1"
if (Test-Path $schemaLib) {
    . $schemaLib
}

function Test-ReceiptParsing {
    <#
    .SYNOPSIS
        Tests receipt parsing against a fixture file.
    #>
    param(
        [string]$FixturePath
    )
    
    $result = @{
        fixture = Split-Path $FixturePath -Leaf
        passed = $false
        checks = @()
    }
    
    if (-not (Test-Path $FixturePath)) {
        $result.error = "Fixture file not found"
        return $result
    }
    
    try {
        $content = Get-Content $FixturePath -Raw
        
        # Check 1: Valid JSON
        $parsed = $content | ConvertFrom-Json
        $result.checks += @{ name = "valid_json"; passed = $true }
        
        # Check 2: Has required fields
        $requiredFields = @("event", "timestamp")
        $missingFields = @()
        foreach ($field in $requiredFields) {
            if (-not $parsed.PSObject.Properties[$field]) {
                $missingFields += $field
            }
        }
        
        if ($missingFields.Count -eq 0) {
            $result.checks += @{ name = "required_fields"; passed = $true }
        }
        else {
            $result.checks += @{ name = "required_fields"; passed = $false; missing = $missingFields }
        }
        
        # Check 3: Event field starts with "sm."
        if ($parsed.event -match "^sm\.") {
            $result.checks += @{ name = "event_prefix"; passed = $true; event = $parsed.event }
        }
        else {
            $result.checks += @{ name = "event_prefix"; passed = $false; event = $parsed.event; expected = "sm.*" }
        }
        
        # Check 4: Timestamp is valid ISO 8601
        try {
            $ts = [DateTime]::Parse($parsed.timestamp)
            $result.checks += @{ name = "valid_timestamp"; passed = $true }
        }
        catch {
            $result.checks += @{ name = "valid_timestamp"; passed = $false; error = "Invalid timestamp format" }
        }
        
        # Overall pass/fail
        $failedChecks = $result.checks | Where-Object { -not $_.passed }
        $result.passed = ($failedChecks.Count -eq 0)
        $result.passedCount = ($result.checks | Where-Object { $_.passed }).Count
        $result.failedCount = $failedChecks.Count
    }
    catch {
        $result.error = $_.Exception.Message
        $result.checks += @{ name = "parse"; passed = $false; error = $_.Exception.Message }
    }
    
    return $result
}

function Test-SearchOutputParsing {
    <#
    .SYNOPSIS
        Tests search output parsing against a fixture file.
    #>
    param(
        [string]$FixturePath
    )
    
    $result = @{
        fixture = Split-Path $FixturePath -Leaf
        passed = $false
        checks = @()
    }
    
    if (-not (Test-Path $FixturePath)) {
        $result.error = "Fixture file not found"
        return $result
    }
    
    try {
        $content = Get-Content $FixturePath -Raw
        $parsed = $content | ConvertFrom-Json
        $result.checks += @{ name = "valid_json"; passed = $true }
        
        # Check for results array
        if ($parsed.PSObject.Properties['results'] -and $parsed.results -is [array]) {
            $result.checks += @{ name = "has_results_array"; passed = $true; count = $parsed.results.Count }
        }
        else {
            $result.checks += @{ name = "has_results_array"; passed = $false }
        }
        
        # Check for schema version
        if ($parsed.PSObject.Properties['schemaVersion']) {
            $result.checks += @{ name = "has_schema_version"; passed = $true; version = $parsed.schemaVersion }
        }
        else {
            $result.checks += @{ name = "has_schema_version"; passed = $false }
        }
        
        $failedChecks = $result.checks | Where-Object { -not $_.passed }
        $result.passed = ($failedChecks.Count -eq 0)
        $result.passedCount = ($result.checks | Where-Object { $_.passed }).Count
        $result.failedCount = $failedChecks.Count
    }
    catch {
        $result.error = $_.Exception.Message
        $result.checks += @{ name = "parse"; passed = $false; error = $_.Exception.Message }
    }
    
    return $result
}

function Test-IndexOutputParsing {
    <#
    .SYNOPSIS
        Tests index output parsing against a fixture file.
    #>
    param(
        [string]$FixturePath
    )
    
    $result = @{
        fixture = Split-Path $FixturePath -Leaf
        passed = $false
        checks = @()
    }
    
    if (-not (Test-Path $FixturePath)) {
        $result.error = "Fixture file not found"
        return $result
    }
    
    try {
        $content = Get-Content $FixturePath -Raw
        $parsed = $content | ConvertFrom-Json
        $result.checks += @{ name = "valid_json"; passed = $true }
        
        # Check for indexed count
        if ($parsed.PSObject.Properties['indexed']) {
            $result.checks += @{ name = "has_indexed_count"; passed = $true; count = $parsed.indexed }
        }
        else {
            $result.checks += @{ name = "has_indexed_count"; passed = $false }
        }
        
        # Check for schema version
        if ($parsed.PSObject.Properties['schemaVersion']) {
            $result.checks += @{ name = "has_schema_version"; passed = $true; version = $parsed.schemaVersion }
        }
        else {
            $result.checks += @{ name = "has_schema_version"; passed = $false }
        }
        
        $failedChecks = $result.checks | Where-Object { -not $_.passed }
        $result.passed = ($failedChecks.Count -eq 0)
        $result.passedCount = ($result.checks | Where-Object { $_.passed }).Count
        $result.failedCount = $failedChecks.Count
    }
    catch {
        $result.error = $_.Exception.Message
        $result.checks += @{ name = "parse"; passed = $false; error = $_.Exception.Message }
    }
    
    return $result
}

function Test-HealthSnapshotParsing {
    <#
    .SYNOPSIS
        Tests health snapshot parsing against a fixture file.
    #>
    param(
        [string]$FixturePath
    )
    
    $result = @{
        fixture = Split-Path $FixturePath -Leaf
        passed = $false
        checks = @()
    }
    
    if (-not (Test-Path $FixturePath)) {
        $result.error = "Fixture file not found"
        return $result
    }
    
    try {
        $content = Get-Content $FixturePath -Raw
        $parsed = $content | ConvertFrom-Json
        $result.checks += @{ name = "valid_json"; passed = $true }
        
        # Check for version
        if ($parsed.PSObject.Properties['version'] -and $parsed.version -eq "sm-health-v1") {
            $result.checks += @{ name = "correct_version"; passed = $true }
        }
        else {
            $result.checks += @{ name = "correct_version"; passed = $false; expected = "sm-health-v1" }
        }
        
        # Check for metrics object
        if ($parsed.PSObject.Properties['metrics']) {
            $result.checks += @{ name = "has_metrics"; passed = $true }
        }
        else {
            $result.checks += @{ name = "has_metrics"; passed = $false }
        }
        
        # Check for status
        if ($parsed.PSObject.Properties['status']) {
            $result.checks += @{ name = "has_status"; passed = $true; status = $parsed.status }
        }
        else {
            $result.checks += @{ name = "has_status"; passed = $false }
        }
        
        $failedChecks = $result.checks | Where-Object { -not $_.passed }
        $result.passed = ($failedChecks.Count -eq 0)
        $result.passedCount = ($result.checks | Where-Object { $_.passed }).Count
        $result.failedCount = $failedChecks.Count
    }
    catch {
        $result.error = $_.Exception.Message
        $result.checks += @{ name = "parse"; passed = $false; error = $_.Exception.Message }
    }
    
    return $result
}

# Main execution
$testResults = @{
    version = "sm-make-v1"
    timestamp = (Get-Date).ToString("o")
    fixtureDir = $FixtureDir
    tests = @()
    summary = @{
        total = 0
        passed = 0
        failed = 0
    }
}

# Check if fixture directory exists
if (-not (Test-Path $FixtureDir)) {
    $testResults.status = "error"
    $testResults.error = "Fixture directory not found: $FixtureDir"
    $testResults.exitCode = 1
    
    if ($MakeFriendly) {
        [Console]::Write(($testResults | ConvertTo-Json -Depth 10 -Compress))
    }
    else {
        Write-Error "Fixture directory not found: $FixtureDir"
        $testResults | ConvertTo-Json -Depth 10
    }
    exit 1
}

# Run tests for each fixture type
$fixtureTests = @(
    @{ pattern = "receipt_*.json"; tester = { param($p) Test-ReceiptParsing -FixturePath $p } },
    @{ pattern = "search_output_*.json"; tester = { param($p) Test-SearchOutputParsing -FixturePath $p } },
    @{ pattern = "index_output_*.json"; tester = { param($p) Test-IndexOutputParsing -FixturePath $p } },
    @{ pattern = "health_snapshot_*.json"; tester = { param($p) Test-HealthSnapshotParsing -FixturePath $p } }
)

foreach ($fixtureTest in $fixtureTests) {
    $fixtures = Get-ChildItem -Path $FixtureDir -Filter $fixtureTest.pattern -ErrorAction SilentlyContinue
    
    foreach ($fixture in $fixtures) {
        $result = & $fixtureTest.tester $fixture.FullName
        $testResults.tests += $result
        $testResults.summary.total++
        
        if ($result.passed) {
            $testResults.summary.passed++
        }
        else {
            $testResults.summary.failed++
        }
    }
}

# Set overall status
if ($testResults.summary.total -eq 0) {
    $testResults.status = "warning"
    $testResults.warning = "No fixture files found"
    $testResults.exitCode = 0
}
elseif ($testResults.summary.failed -gt 0) {
    $testResults.status = "failed"
    $testResults.exitCode = 2
}
else {
    $testResults.status = "passed"
    $testResults.exitCode = 0
}

$testResults.summary.passRate = if ($testResults.summary.total -gt 0) {
    [math]::Round(($testResults.summary.passed / $testResults.summary.total) * 100, 2)
} else { 100 }

# Output results
if ($MakeFriendly) {
    [Console]::Write(($testResults | ConvertTo-Json -Depth 10 -Compress))
}
else {
    Write-Host "=== SintraPrime Fixture Tests ===" -ForegroundColor Cyan
    Write-Host "Fixture Directory: $FixtureDir"
    Write-Host ""
    
    foreach ($test in $testResults.tests) {
        $statusColor = if ($test.passed) { "Green" } else { "Red" }
        $statusText = if ($test.passed) { "PASS" } else { "FAIL" }
        Write-Host "[$statusText] $($test.fixture)" -ForegroundColor $statusColor
        
        if ($Verbose -or -not $test.passed) {
            foreach ($check in $test.checks) {
                $checkColor = if ($check.passed) { "DarkGreen" } else { "DarkRed" }
                $checkStatus = if ($check.passed) { "✓" } else { "✗" }
                Write-Host "  $checkStatus $($check.name)" -ForegroundColor $checkColor
            }
        }
    }
    
    Write-Host ""
    Write-Host "=== Summary ===" -ForegroundColor Cyan
    Write-Host "Total: $($testResults.summary.total)"
    Write-Host "Passed: $($testResults.summary.passed)" -ForegroundColor Green
    Write-Host "Failed: $($testResults.summary.failed)" -ForegroundColor $(if ($testResults.summary.failed -gt 0) { "Red" } else { "Green" })
    Write-Host "Pass Rate: $($testResults.summary.passRate)%"
    Write-Host ""
    
    if ($Verbose) {
        Write-Host "Full JSON output:"
        $testResults | ConvertTo-Json -Depth 10
    }
}

exit $testResults.exitCode
