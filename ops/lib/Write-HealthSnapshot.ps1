<#
.SYNOPSIS
    Health Snapshot JSON implementation for SintraPrime Supermemory operations.
    Upgrade #4 from the High-ROI Upgrade Roadmap.

.DESCRIPTION
    Emits a single "health snapshot" JSON to ops/health/sm_health_latest.json on success.
    Uses atomic write (write to temp file, then rename) to prevent partial reads.
    Provides a single source of truth for the current system health.

.PARAMETER HealthData
    Hashtable containing health metrics to write.

.PARAMETER SnapshotType
    Type of snapshot: 'latest' (overwrites) or 'daily' (date-stamped).

.OUTPUTS
    JSON object with write status.

.EXAMPLE
    . .\lib\Write-HealthSnapshot.ps1
    $health = @{ attempts = 100; successes = 98; errors = 2; p95_ms = 1500 }
    Write-HealthSnapshot -HealthData $health -SnapshotType "latest"
#>

$script:HealthDirectory = Join-Path $PSScriptRoot ".." "health"

function Initialize-HealthDirectory {
    if (-not (Test-Path $script:HealthDirectory)) {
        New-Item -ItemType Directory -Path $script:HealthDirectory -Force | Out-Null
    }
}

function Write-HealthSnapshot {
    <#
    .SYNOPSIS
        Writes a health snapshot to disk using atomic write.
    
    .PARAMETER HealthData
        Hashtable containing health metrics.
    
    .PARAMETER SnapshotType
        'latest' for the current snapshot, 'daily' for date-stamped archive.
    
    .OUTPUTS
        PSCustomObject with: success (bool), path (string), timestamp (string)
    #>
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$HealthData,
        
        [ValidateSet("latest", "daily")]
        [string]$SnapshotType = "latest"
    )
    
    Initialize-HealthDirectory
    $now = Get-Date
    $result = @{
        success = $false
        timestamp = $now.ToString("o")
        snapshotType = $SnapshotType
    }
    
    # Determine file path
    if ($SnapshotType -eq "latest") {
        $targetPath = Join-Path $script:HealthDirectory "sm_health_latest.json"
    }
    else {
        $dateStamp = $now.ToString("yyyy-MM-dd")
        $targetPath = Join-Path $script:HealthDirectory "sm_health_$dateStamp.json"
    }
    
    $result.path = $targetPath
    
    # Enrich health data with metadata
    $enrichedData = @{
        version = "sm-health-v1"
        generatedAt = $now.ToString("o")
        generatedAtUnix = [int][double]::Parse((Get-Date -UFormat %s))
        hostname = $env:COMPUTERNAME
        user = $env:USERNAME
        metrics = $HealthData
        status = if ($HealthData.errors -gt 0) { "degraded" } else { "healthy" }
    }
    
    # Calculate health score (0-100)
    if ($HealthData.attempts -gt 0) {
        $successRate = ($HealthData.successes / $HealthData.attempts) * 100
        $enrichedData.healthScore = [math]::Round($successRate, 2)
    }
    else {
        $enrichedData.healthScore = 100
    }
    
    # Atomic write: write to temp file, then rename
    $tempPath = "$targetPath.tmp.$PID"
    
    try {
        $enrichedData | ConvertTo-Json -Depth 10 | Set-Content -Path $tempPath -Force -Encoding UTF8
        
        # Verify temp file was written correctly
        if (-not (Test-Path $tempPath)) {
            throw "Temp file was not created"
        }
        
        $tempSize = (Get-Item $tempPath).Length
        if ($tempSize -eq 0) {
            throw "Temp file is empty"
        }
        
        # Atomic rename
        Move-Item -Path $tempPath -Destination $targetPath -Force
        
        $result.success = $true
        $result.reason = "Health snapshot written successfully"
        $result.fileSize = (Get-Item $targetPath).Length
        $result.healthScore = $enrichedData.healthScore
        $result.status = $enrichedData.status
    }
    catch {
        $result.reason = "Failed to write health snapshot: $_"
        
        # Cleanup temp file if it exists
        if (Test-Path $tempPath) {
            Remove-Item $tempPath -Force -ErrorAction SilentlyContinue
        }
    }
    
    return [PSCustomObject]$result
}

function Get-HealthSnapshot {
    <#
    .SYNOPSIS
        Reads a health snapshot from disk.
    
    .PARAMETER SnapshotType
        'latest' for the current snapshot, or a date string (yyyy-MM-dd) for a specific day.
    
    .OUTPUTS
        PSCustomObject with health data or error.
    #>
    param(
        [string]$SnapshotType = "latest"
    )
    
    $result = @{
        success = $false
        timestamp = (Get-Date).ToString("o")
    }
    
    # Determine file path
    if ($SnapshotType -eq "latest") {
        $targetPath = Join-Path $script:HealthDirectory "sm_health_latest.json"
    }
    else {
        $targetPath = Join-Path $script:HealthDirectory "sm_health_$SnapshotType.json"
    }
    
    $result.path = $targetPath
    
    if (-not (Test-Path $targetPath)) {
        $result.reason = "Health snapshot not found"
        return [PSCustomObject]$result
    }
    
    try {
        $content = Get-Content $targetPath -Raw | ConvertFrom-Json
        $result.success = $true
        $result.data = $content
        $result.reason = "Health snapshot read successfully"
    }
    catch {
        $result.reason = "Failed to read health snapshot: $_"
    }
    
    return [PSCustomObject]$result
}

function Get-HealthSnapshotList {
    <#
    .SYNOPSIS
        Lists all available health snapshots.
    
    .OUTPUTS
        Array of snapshot file info.
    #>
    
    Initialize-HealthDirectory
    
    $snapshots = Get-ChildItem -Path $script:HealthDirectory -Filter "sm_health_*.json" |
        Where-Object { $_.Name -ne "sm_health_latest.json" } |
        Sort-Object Name -Descending |
        ForEach-Object {
            @{
                name = $_.Name
                path = $_.FullName
                size = $_.Length
                lastModified = $_.LastWriteTime.ToString("o")
                date = if ($_.Name -match "sm_health_(\d{4}-\d{2}-\d{2})\.json") { $matches[1] } else { "unknown" }
            }
        }
    
    return @{
        success = $true
        timestamp = (Get-Date).ToString("o")
        count = @($snapshots).Count
        snapshots = @($snapshots)
        latestExists = Test-Path (Join-Path $script:HealthDirectory "sm_health_latest.json")
    }
}

# Export functions
Export-ModuleMember -Function Write-HealthSnapshot, Get-HealthSnapshot, Get-HealthSnapshotList -ErrorAction SilentlyContinue
