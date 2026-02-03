<#
.SYNOPSIS
    Receipt Rotation + Retention for SintraPrime Supermemory operations.
    Upgrade #7 from the High-ROI Upgrade Roadmap.

.DESCRIPTION
    Keeps last N days locally, auto-archives older receipts to cloud storage.
    Prevents disk space issues and ensures long-term receipt retention.
    Supports Google Drive, S3, and local archive destinations.

.PARAMETER RetentionDays
    Number of days to keep receipts locally. Default: 30.

.PARAMETER ArchiveDestination
    Where to archive old receipts: 'local', 'gdrive', 's3'. Default: 'local'.

.PARAMETER DryRun
    Show what would be done without actually moving files.

.PARAMETER MakeFriendly
    Output single JSON object for Make.com consumption.

.OUTPUTS
    JSON object with rotation results.

.EXAMPLE
    .\sm-receipt-rotate.ps1 -RetentionDays 30 -ArchiveDestination local -MakeFriendly
    .\sm-receipt-rotate.ps1 -DryRun
#>

param(
    [int]$RetentionDays = 30,
    [ValidateSet("local", "gdrive", "s3")]
    [string]$ArchiveDestination = "local",
    [string]$ReceiptDir = (Join-Path $PSScriptRoot "receipts"),
    [string]$ArchiveDir = (Join-Path $PSScriptRoot "archive"),
    [string]$GDrivePath = "SintraPrime/receipts/archive",
    [string]$S3Bucket = "sintraprime-receipts",
    [switch]$DryRun,
    [switch]$MakeFriendly,
    [switch]$DeleteAfterArchive
)

# Strict mode
Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-ReceiptFiles {
    <#
    .SYNOPSIS
        Gets receipt files older than retention period.
    #>
    param(
        [string]$Directory,
        [int]$OlderThanDays
    )
    
    $cutoffDate = (Get-Date).AddDays(-$OlderThanDays)
    
    $files = Get-ChildItem -Path $Directory -Filter "*.jsonl" -ErrorAction SilentlyContinue |
        Where-Object { $_.LastWriteTime -lt $cutoffDate } |
        Sort-Object LastWriteTime
    
    return $files
}

function Move-ToLocalArchive {
    <#
    .SYNOPSIS
        Moves files to local archive directory.
    #>
    param(
        [System.IO.FileInfo[]]$Files,
        [string]$ArchiveDir,
        [switch]$DryRun
    )
    
    $results = @()
    
    # Create archive directory if needed
    if (-not $DryRun -and -not (Test-Path $ArchiveDir)) {
        New-Item -ItemType Directory -Path $ArchiveDir -Force | Out-Null
    }
    
    # Create year/month subdirectories
    foreach ($file in $Files) {
        $yearMonth = $file.LastWriteTime.ToString("yyyy-MM")
        $targetDir = Join-Path $ArchiveDir $yearMonth
        $targetPath = Join-Path $targetDir $file.Name
        
        $result = @{
            source = $file.FullName
            target = $targetPath
            size = $file.Length
            lastModified = $file.LastWriteTime.ToString("o")
        }
        
        if ($DryRun) {
            $result.action = "would_move"
            $result.success = $true
        }
        else {
            try {
                if (-not (Test-Path $targetDir)) {
                    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
                }
                Move-Item -Path $file.FullName -Destination $targetPath -Force
                $result.action = "moved"
                $result.success = $true
            }
            catch {
                $result.action = "failed"
                $result.success = $false
                $result.error = $_.Exception.Message
            }
        }
        
        $results += $result
    }
    
    return $results
}

function Copy-ToGoogleDrive {
    <#
    .SYNOPSIS
        Copies files to Google Drive using rclone.
    #>
    param(
        [System.IO.FileInfo[]]$Files,
        [string]$GDrivePath,
        [switch]$DryRun,
        [switch]$DeleteAfterCopy
    )
    
    $results = @()
    $rcloneConfig = "/home/ubuntu/.gdrive-rclone.ini"
    
    # Check if rclone is available
    $rcloneAvailable = $null -ne (Get-Command rclone -ErrorAction SilentlyContinue)
    
    if (-not $rcloneAvailable) {
        return @(@{
            action = "failed"
            success = $false
            error = "rclone not available"
        })
    }
    
    foreach ($file in $Files) {
        $yearMonth = $file.LastWriteTime.ToString("yyyy-MM")
        $targetPath = "$GDrivePath/$yearMonth/$($file.Name)"
        
        $result = @{
            source = $file.FullName
            target = "manus_google_drive:$targetPath"
            size = $file.Length
            lastModified = $file.LastWriteTime.ToString("o")
        }
        
        if ($DryRun) {
            $result.action = "would_copy"
            $result.success = $true
        }
        else {
            try {
                $rcloneArgs = @(
                    "copy",
                    $file.FullName,
                    "manus_google_drive:$GDrivePath/$yearMonth/",
                    "--config", $rcloneConfig
                )
                
                $rcloneOutput = & rclone @rcloneArgs 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    $result.action = "copied"
                    $result.success = $true
                    
                    if ($DeleteAfterCopy) {
                        Remove-Item -Path $file.FullName -Force
                        $result.deleted = $true
                    }
                }
                else {
                    $result.action = "failed"
                    $result.success = $false
                    $result.error = $rcloneOutput -join "`n"
                }
            }
            catch {
                $result.action = "failed"
                $result.success = $false
                $result.error = $_.Exception.Message
            }
        }
        
        $results += $result
    }
    
    return $results
}

function Copy-ToS3 {
    <#
    .SYNOPSIS
        Copies files to S3 using AWS CLI.
    #>
    param(
        [System.IO.FileInfo[]]$Files,
        [string]$S3Bucket,
        [switch]$DryRun,
        [switch]$DeleteAfterCopy
    )
    
    $results = @()
    
    # Check if AWS CLI is available
    $awsAvailable = $null -ne (Get-Command aws -ErrorAction SilentlyContinue)
    
    if (-not $awsAvailable) {
        return @(@{
            action = "failed"
            success = $false
            error = "AWS CLI not available"
        })
    }
    
    foreach ($file in $Files) {
        $yearMonth = $file.LastWriteTime.ToString("yyyy-MM")
        $s3Key = "receipts/archive/$yearMonth/$($file.Name)"
        
        $result = @{
            source = $file.FullName
            target = "s3://$S3Bucket/$s3Key"
            size = $file.Length
            lastModified = $file.LastWriteTime.ToString("o")
        }
        
        if ($DryRun) {
            $result.action = "would_copy"
            $result.success = $true
        }
        else {
            try {
                $awsOutput = & aws s3 cp $file.FullName "s3://$S3Bucket/$s3Key" 2>&1
                
                if ($LASTEXITCODE -eq 0) {
                    $result.action = "copied"
                    $result.success = $true
                    
                    if ($DeleteAfterCopy) {
                        Remove-Item -Path $file.FullName -Force
                        $result.deleted = $true
                    }
                }
                else {
                    $result.action = "failed"
                    $result.success = $false
                    $result.error = $awsOutput -join "`n"
                }
            }
            catch {
                $result.action = "failed"
                $result.success = $false
                $result.error = $_.Exception.Message
            }
        }
        
        $results += $result
    }
    
    return $results
}

# Main execution
$rotationResult = @{
    version = "sm-make-v1"
    timestamp = (Get-Date).ToString("o")
    status = "unknown"
    config = @{
        retentionDays = $RetentionDays
        archiveDestination = $ArchiveDestination
        receiptDir = $ReceiptDir
        dryRun = $DryRun.IsPresent
    }
    files = @()
    summary = @{
        totalFiles = 0
        totalSize = 0
        archived = 0
        failed = 0
    }
}

try {
    # Check if receipt directory exists
    if (-not (Test-Path $ReceiptDir)) {
        $rotationResult.status = "warning"
        $rotationResult.warning = "Receipt directory not found: $ReceiptDir"
        $rotationResult.exitCode = 0
    }
    else {
        # Get files to rotate
        $filesToRotate = Get-ReceiptFiles -Directory $ReceiptDir -OlderThanDays $RetentionDays
        $rotationResult.summary.totalFiles = @($filesToRotate).Count
        $rotationResult.summary.totalSize = ($filesToRotate | Measure-Object -Property Length -Sum).Sum
        
        if ($rotationResult.summary.totalFiles -eq 0) {
            $rotationResult.status = "success"
            $rotationResult.message = "No files older than $RetentionDays days found"
            $rotationResult.exitCode = 0
        }
        else {
            # Perform rotation based on destination
            switch ($ArchiveDestination) {
                "local" {
                    $rotationResult.files = Move-ToLocalArchive -Files $filesToRotate -ArchiveDir $ArchiveDir -DryRun:$DryRun
                }
                "gdrive" {
                    $rotationResult.files = Copy-ToGoogleDrive -Files $filesToRotate -GDrivePath $GDrivePath -DryRun:$DryRun -DeleteAfterCopy:$DeleteAfterArchive
                }
                "s3" {
                    $rotationResult.files = Copy-ToS3 -Files $filesToRotate -S3Bucket $S3Bucket -DryRun:$DryRun -DeleteAfterCopy:$DeleteAfterArchive
                }
            }
            
            # Calculate summary
            $rotationResult.summary.archived = ($rotationResult.files | Where-Object { $_.success }).Count
            $rotationResult.summary.failed = ($rotationResult.files | Where-Object { -not $_.success }).Count
            
            if ($rotationResult.summary.failed -gt 0) {
                $rotationResult.status = "partial"
                $rotationResult.exitCode = 1
            }
            else {
                $rotationResult.status = "success"
                $rotationResult.exitCode = 0
            }
        }
    }
    
    # Add disk space info
    if (Test-Path $ReceiptDir) {
        $drive = (Get-Item $ReceiptDir).PSDrive
        if ($drive) {
            $rotationResult.diskSpace = @{
                free = $drive.Free
                used = $drive.Used
                freePercent = if ($drive.Free + $drive.Used -gt 0) {
                    [math]::Round(($drive.Free / ($drive.Free + $drive.Used)) * 100, 2)
                } else { 0 }
            }
        }
    }
}
catch {
    $rotationResult.status = "error"
    $rotationResult.error = $_.Exception.Message
    $rotationResult.exitCode = 99
}

# Output results
if ($MakeFriendly) {
    [Console]::Write(($rotationResult | ConvertTo-Json -Depth 10 -Compress))
}
else {
    Write-Host "=== SintraPrime Receipt Rotation ===" -ForegroundColor Cyan
    Write-Host "Retention: $RetentionDays days"
    Write-Host "Destination: $ArchiveDestination"
    Write-Host "Dry Run: $($DryRun.IsPresent)"
    Write-Host ""
    
    Write-Host "=== Summary ===" -ForegroundColor Cyan
    Write-Host "Files to rotate: $($rotationResult.summary.totalFiles)"
    Write-Host "Total size: $([math]::Round($rotationResult.summary.totalSize / 1MB, 2)) MB"
    Write-Host "Archived: $($rotationResult.summary.archived)" -ForegroundColor Green
    Write-Host "Failed: $($rotationResult.summary.failed)" -ForegroundColor $(if ($rotationResult.summary.failed -gt 0) { "Red" } else { "Green" })
    Write-Host ""
    
    if ($rotationResult.files.Count -gt 0) {
        Write-Host "=== Files ===" -ForegroundColor Cyan
        foreach ($file in $rotationResult.files) {
            $statusColor = if ($file.success) { "Green" } else { "Red" }
            Write-Host "[$($file.action)] $(Split-Path $file.source -Leaf)" -ForegroundColor $statusColor
        }
    }
    
    Write-Host ""
    Write-Host "Full JSON output:"
    $rotationResult | ConvertTo-Json -Depth 10
}

exit $rotationResult.exitCode
