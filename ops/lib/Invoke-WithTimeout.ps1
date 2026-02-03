<#
.SYNOPSIS
    Timeout Discipline implementation for SintraPrime Supermemory operations.
    Upgrade #8 from the High-ROI Upgrade Roadmap.

.DESCRIPTION
    Hard timeout around node calls with killable job wrapper.
    Prevents hung processes from blocking future runs.
    Logs timeout events to receipts.

.PARAMETER ScriptBlock
    The script block to execute with timeout.

.PARAMETER TimeoutSeconds
    Maximum execution time in seconds. Default: 60.

.PARAMETER ProcessName
    Name for logging purposes.

.OUTPUTS
    JSON object with execution result or timeout error.

.EXAMPLE
    . .\lib\Invoke-WithTimeout.ps1
    $result = Invoke-WithTimeout -ScriptBlock { node search.js } -TimeoutSeconds 30 -ProcessName "search"
#>

function Invoke-WithTimeout {
    <#
    .SYNOPSIS
        Executes a script block with a hard timeout.
    
    .PARAMETER ScriptBlock
        The code to execute.
    
    .PARAMETER TimeoutSeconds
        Maximum execution time.
    
    .PARAMETER ProcessName
        Identifier for logging.
    
    .OUTPUTS
        PSCustomObject with: success, output, error, timedOut, durationMs
    #>
    param(
        [Parameter(Mandatory=$true)]
        [ScriptBlock]$ScriptBlock,
        
        [int]$TimeoutSeconds = 60,
        
        [string]$ProcessName = "unnamed"
    )
    
    $startTime = Get-Date
    $result = @{
        success = $false
        processName = $ProcessName
        timeoutSeconds = $TimeoutSeconds
        timedOut = $false
        startTime = $startTime.ToString("o")
        version = "timeout-v1"
    }
    
    try {
        # Create a job for the script block
        $job = Start-Job -ScriptBlock $ScriptBlock
        
        # Wait for completion or timeout
        $completed = Wait-Job -Job $job -Timeout $TimeoutSeconds
        
        if ($null -eq $completed) {
            # Timeout occurred
            $result.timedOut = $true
            $result.error = "Process '$ProcessName' timed out after $TimeoutSeconds seconds"
            $result.exitCode = 10  # Timeout exit code
            
            # Kill the job
            Stop-Job -Job $job -ErrorAction SilentlyContinue
            Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
            
            # Try to kill any child processes
            try {
                $childProcesses = Get-Process | Where-Object { $_.Name -match "node|npm" -and $_.StartTime -gt $startTime }
                foreach ($proc in $childProcesses) {
                    Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
                }
                $result.killedProcesses = @($childProcesses | Select-Object Id, Name)
            }
            catch {
                $result.killError = $_.Exception.Message
            }
        }
        else {
            # Job completed
            $jobResult = Receive-Job -Job $job
            Remove-Job -Job $job -Force
            
            $result.success = $true
            $result.output = $jobResult
            $result.exitCode = 0
        }
    }
    catch {
        $result.error = $_.Exception.Message
        $result.exitCode = 1
    }
    
    $endTime = Get-Date
    $result.endTime = $endTime.ToString("o")
    $result.durationMs = [math]::Round(($endTime - $startTime).TotalMilliseconds, 2)
    $result.durationSeconds = [math]::Round(($endTime - $startTime).TotalSeconds, 2)
    
    return [PSCustomObject]$result
}

function Invoke-NodeWithTimeout {
    <#
    .SYNOPSIS
        Executes a Node.js command with timeout.
    
    .PARAMETER Command
        The node command to execute (e.g., "search.js --query test").
    
    .PARAMETER WorkingDirectory
        Directory to run the command in.
    
    .PARAMETER TimeoutSeconds
        Maximum execution time.
    
    .OUTPUTS
        PSCustomObject with execution result.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Command,
        
        [string]$WorkingDirectory = $PWD,
        
        [int]$TimeoutSeconds = 60,
        
        [string]$ProcessName = "node"
    )
    
    $startTime = Get-Date
    $result = @{
        success = $false
        command = $Command
        workingDirectory = $WorkingDirectory
        timeoutSeconds = $TimeoutSeconds
        timedOut = $false
        startTime = $startTime.ToString("o")
        version = "timeout-v1"
        processName = $ProcessName
    }
    
    # Create a temporary file for output capture
    $tempOutput = [System.IO.Path]::GetTempFileName()
    $tempError = [System.IO.Path]::GetTempFileName()
    
    try {
        # Start the process
        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = "node"
        $processInfo.Arguments = $Command
        $processInfo.WorkingDirectory = $WorkingDirectory
        $processInfo.UseShellExecute = $false
        $processInfo.RedirectStandardOutput = $true
        $processInfo.RedirectStandardError = $true
        $processInfo.CreateNoWindow = $true
        
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $processInfo
        
        # Capture output asynchronously
        $outputBuilder = New-Object System.Text.StringBuilder
        $errorBuilder = New-Object System.Text.StringBuilder
        
        $outputEvent = Register-ObjectEvent -InputObject $process -EventName OutputDataReceived -Action {
            if ($null -ne $Event.SourceEventArgs.Data) {
                $Event.MessageData.AppendLine($Event.SourceEventArgs.Data)
            }
        } -MessageData $outputBuilder
        
        $errorEvent = Register-ObjectEvent -InputObject $process -EventName ErrorDataReceived -Action {
            if ($null -ne $Event.SourceEventArgs.Data) {
                $Event.MessageData.AppendLine($Event.SourceEventArgs.Data)
            }
        } -MessageData $errorBuilder
        
        $process.Start() | Out-Null
        $result.pid = $process.Id
        
        $process.BeginOutputReadLine()
        $process.BeginErrorReadLine()
        
        # Wait for completion or timeout
        $completed = $process.WaitForExit($TimeoutSeconds * 1000)
        
        # Unregister events
        Unregister-Event -SourceIdentifier $outputEvent.Name -ErrorAction SilentlyContinue
        Unregister-Event -SourceIdentifier $errorEvent.Name -ErrorAction SilentlyContinue
        
        if (-not $completed) {
            # Timeout occurred
            $result.timedOut = $true
            $result.error = "Node process timed out after $TimeoutSeconds seconds"
            $result.exitCode = 10
            
            # Kill the process
            try {
                $process.Kill()
                $result.killed = $true
            }
            catch {
                $result.killError = $_.Exception.Message
            }
        }
        else {
            # Process completed
            $result.exitCode = $process.ExitCode
            $result.success = ($process.ExitCode -eq 0)
        }
        
        # Capture output
        $result.stdout = $outputBuilder.ToString().Trim()
        $result.stderr = $errorBuilder.ToString().Trim()
        
        # Try to parse stdout as JSON
        if ($result.stdout -and $result.stdout.StartsWith("{")) {
            try {
                $result.outputJson = $result.stdout | ConvertFrom-Json
            }
            catch {
                # Not valid JSON, keep as string
            }
        }
    }
    catch {
        $result.error = $_.Exception.Message
        $result.exitCode = 1
    }
    finally {
        # Cleanup temp files
        Remove-Item $tempOutput -Force -ErrorAction SilentlyContinue
        Remove-Item $tempError -Force -ErrorAction SilentlyContinue
    }
    
    $endTime = Get-Date
    $result.endTime = $endTime.ToString("o")
    $result.durationMs = [math]::Round(($endTime - $startTime).TotalMilliseconds, 2)
    $result.durationSeconds = [math]::Round(($endTime - $startTime).TotalSeconds, 2)
    
    return [PSCustomObject]$result
}

function Write-TimeoutReceipt {
    <#
    .SYNOPSIS
        Writes a timeout event to the receipt log.
    
    .PARAMETER TimeoutResult
        The result from Invoke-WithTimeout or Invoke-NodeWithTimeout.
    
    .PARAMETER ReceiptPath
        Path to the receipt file.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$TimeoutResult,
        
        [string]$ReceiptPath = (Join-Path $PSScriptRoot ".." "receipts" "timeout_receipts.jsonl")
    )
    
    # Ensure directory exists
    $receiptDir = Split-Path $ReceiptPath -Parent
    if (-not (Test-Path $receiptDir)) {
        New-Item -ItemType Directory -Path $receiptDir -Force | Out-Null
    }
    
    $receipt = @{
        event = "sm.timeout"
        timestamp = (Get-Date).ToString("o")
        processName = $TimeoutResult.processName
        timedOut = $TimeoutResult.timedOut
        durationMs = $TimeoutResult.durationMs
        exitCode = $TimeoutResult.exitCode
        pid = $TimeoutResult.pid
    }
    
    if ($TimeoutResult.timedOut) {
        $receipt.event = "sm.timeout.exceeded"
        $receipt.severity = "warning"
    }
    
    $receiptJson = $receipt | ConvertTo-Json -Compress
    Add-Content -Path $ReceiptPath -Value $receiptJson
    
    return @{
        written = $true
        path = $ReceiptPath
        receipt = $receipt
    }
}

# Export functions
Export-ModuleMember -Function Invoke-WithTimeout, Invoke-NodeWithTimeout, Write-TimeoutReceipt -ErrorAction SilentlyContinue
