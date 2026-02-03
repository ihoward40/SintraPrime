<#
.SYNOPSIS
    Lock File / Mutex implementation for SintraPrime Supermemory operations.
    Upgrade #6 from the High-ROI Upgrade Roadmap.

.DESCRIPTION
    Ensures two runs can't overlap (Make retries + manual runs won't collide).
    Prevents race conditions, duplicate executions, and resource contention.

.PARAMETER LockName
    The name of the lock (used to create the lock file name).

.PARAMETER MaxAgeMinutes
    Maximum age of a lock file before it's considered stale. Default: 5 minutes.

.PARAMETER Action
    Action to perform: 'Acquire', 'Release', or 'Check'.

.OUTPUTS
    JSON object with lock status.

.EXAMPLE
    . .\lib\Lock-Execution.ps1
    $lock = Get-ExecutionLock -LockName "sm-receipts" -Action "Acquire"
    if ($lock.acquired) { ... }
    Release-ExecutionLock -LockName "sm-receipts"
#>

$script:LockDirectory = Join-Path $PSScriptRoot ".." ".locks"

function Initialize-LockDirectory {
    if (-not (Test-Path $script:LockDirectory)) {
        New-Item -ItemType Directory -Path $script:LockDirectory -Force | Out-Null
    }
}

function Get-LockFilePath {
    param([string]$LockName)
    return Join-Path $script:LockDirectory ".sm_lock_$LockName"
}

function Get-ExecutionLock {
    <#
    .SYNOPSIS
        Attempts to acquire an execution lock.
    
    .PARAMETER LockName
        Name of the lock to acquire.
    
    .PARAMETER MaxAgeMinutes
        Maximum age of existing lock before it's considered stale.
    
    .OUTPUTS
        PSCustomObject with: acquired (bool), reason (string), lockFile (string), timestamp (string)
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$LockName,
        
        [int]$MaxAgeMinutes = 5
    )
    
    Initialize-LockDirectory
    $lockFile = Get-LockFilePath -LockName $LockName
    $now = Get-Date
    $result = @{
        acquired = $false
        reason = ""
        lockFile = $lockFile
        timestamp = $now.ToString("o")
        lockName = $LockName
        pid = $PID
    }
    
    # Check if lock file exists
    if (Test-Path $lockFile) {
        try {
            $lockContent = Get-Content $lockFile -Raw | ConvertFrom-Json
            $lockTime = [DateTime]::Parse($lockContent.timestamp)
            $lockAge = ($now - $lockTime).TotalMinutes
            
            if ($lockAge -lt $MaxAgeMinutes) {
                # Lock is still valid - cannot acquire
                $result.reason = "Lock held by PID $($lockContent.pid) since $($lockContent.timestamp) (age: $([math]::Round($lockAge, 2)) minutes)"
                $result.existingLock = $lockContent
                return [PSCustomObject]$result
            }
            else {
                # Lock is stale - can override
                $result.reason = "Stale lock overridden (age: $([math]::Round($lockAge, 2)) minutes > $MaxAgeMinutes minutes)"
                $result.staleLock = $lockContent
            }
        }
        catch {
            # Corrupted lock file - can override
            $result.reason = "Corrupted lock file overridden"
        }
    }
    
    # Acquire the lock
    $lockData = @{
        lockName = $LockName
        timestamp = $now.ToString("o")
        pid = $PID
        hostname = $env:COMPUTERNAME
        user = $env:USERNAME
    }
    
    try {
        $lockData | ConvertTo-Json | Set-Content -Path $lockFile -Force
        $result.acquired = $true
        if (-not $result.reason) {
            $result.reason = "Lock acquired successfully"
        }
    }
    catch {
        $result.reason = "Failed to write lock file: $_"
    }
    
    return [PSCustomObject]$result
}

function Release-ExecutionLock {
    <#
    .SYNOPSIS
        Releases an execution lock.
    
    .PARAMETER LockName
        Name of the lock to release.
    
    .PARAMETER Force
        Force release even if lock is held by another process.
    
    .OUTPUTS
        PSCustomObject with: released (bool), reason (string)
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$LockName,
        
        [switch]$Force
    )
    
    $lockFile = Get-LockFilePath -LockName $LockName
    $result = @{
        released = $false
        reason = ""
        lockFile = $lockFile
        timestamp = (Get-Date).ToString("o")
    }
    
    if (-not (Test-Path $lockFile)) {
        $result.released = $true
        $result.reason = "Lock file does not exist (already released)"
        return [PSCustomObject]$result
    }
    
    try {
        $lockContent = Get-Content $lockFile -Raw | ConvertFrom-Json
        
        if (-not $Force -and $lockContent.pid -ne $PID) {
            $result.reason = "Lock held by different process (PID: $($lockContent.pid)). Use -Force to override."
            return [PSCustomObject]$result
        }
        
        Remove-Item $lockFile -Force
        $result.released = $true
        $result.reason = "Lock released successfully"
        $result.previousLock = $lockContent
    }
    catch {
        $result.reason = "Failed to release lock: $_"
    }
    
    return [PSCustomObject]$result
}

function Test-ExecutionLock {
    <#
    .SYNOPSIS
        Checks if an execution lock is currently held.
    
    .PARAMETER LockName
        Name of the lock to check.
    
    .OUTPUTS
        PSCustomObject with: locked (bool), lockInfo (object), age (minutes)
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$LockName
    )
    
    $lockFile = Get-LockFilePath -LockName $LockName
    $result = @{
        locked = $false
        lockFile = $lockFile
        timestamp = (Get-Date).ToString("o")
    }
    
    if (-not (Test-Path $lockFile)) {
        $result.reason = "No lock file exists"
        return [PSCustomObject]$result
    }
    
    try {
        $lockContent = Get-Content $lockFile -Raw | ConvertFrom-Json
        $lockTime = [DateTime]::Parse($lockContent.timestamp)
        $lockAge = ((Get-Date) - $lockTime).TotalMinutes
        
        $result.locked = $true
        $result.lockInfo = $lockContent
        $result.ageMinutes = [math]::Round($lockAge, 2)
        $result.reason = "Lock held by PID $($lockContent.pid)"
    }
    catch {
        $result.reason = "Lock file exists but is corrupted"
        $result.corrupted = $true
    }
    
    return [PSCustomObject]$result
}

# Export functions
Export-ModuleMember -Function Get-ExecutionLock, Release-ExecutionLock, Test-ExecutionLock -ErrorAction SilentlyContinue
