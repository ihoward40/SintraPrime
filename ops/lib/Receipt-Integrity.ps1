<#
.SYNOPSIS
    Receipt Integrity Check for SintraPrime Supermemory operations.
    Upgrade #3 from the High-ROI Upgrade Roadmap.

.DESCRIPTION
    Verifies each JSONL line has a SHA-256 hash and validates chain continuity.
    Provides tamper-evidence and court-safe audit trails.
    Implements Merkle-style hash chaining for integrity verification.

.PARAMETER ReceiptPath
    Path to the receipt file to verify.

.OUTPUTS
    JSON object with integrity verification results.

.EXAMPLE
    . .\lib\Receipt-Integrity.ps1
    $result = Test-ReceiptIntegrity -ReceiptPath "receipts/2026-02-03.jsonl"
#>

function Get-SHA256Hash {
    <#
    .SYNOPSIS
        Computes SHA-256 hash of a string.
    #>
    param([string]$InputString)
    
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($InputString)
    $hash = $sha256.ComputeHash($bytes)
    return [BitConverter]::ToString($hash).Replace("-", "").ToLower()
}

function New-SignedReceipt {
    <#
    .SYNOPSIS
        Creates a new receipt with integrity hashes.
    
    .PARAMETER Event
        The event name (e.g., "sm.search.success").
    
    .PARAMETER Data
        Hashtable of event data.
    
    .PARAMETER PreviousChainHash
        The chain hash from the previous receipt (for chain continuity).
    
    .OUTPUTS
        PSCustomObject with the signed receipt.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Event,
        
        [Parameter(Mandatory=$true)]
        [hashtable]$Data,
        
        [string]$PreviousChainHash = ""
    )
    
    $timestamp = (Get-Date).ToString("o")
    
    # Build the receipt content (without hashes)
    $receiptContent = @{
        event = $Event
        timestamp = $timestamp
        data = $Data
        metadata = @{
            hostname = $env:COMPUTERNAME
            user = $env:USERNAME
            pid = $PID
        }
    }
    
    # Compute content hash (hash of the receipt content)
    $contentJson = $receiptContent | ConvertTo-Json -Depth 10 -Compress
    $receiptHash = Get-SHA256Hash -InputString $contentJson
    
    # Compute chain hash (hash of current receipt + previous chain hash)
    $chainInput = "$receiptHash$PreviousChainHash"
    $chainHash = Get-SHA256Hash -InputString $chainInput
    
    # Add integrity fields
    $receipt = $receiptContent.Clone()
    $receipt.integrity = @{
        version = "integrity-v1"
        receiptHash = $receiptHash
        chainHash = $chainHash
        previousChainHash = $PreviousChainHash
        algorithm = "SHA-256"
    }
    
    return [PSCustomObject]$receipt
}

function Test-ReceiptHash {
    <#
    .SYNOPSIS
        Verifies the hash of a single receipt.
    
    .PARAMETER Receipt
        The receipt object to verify.
    
    .OUTPUTS
        PSCustomObject with verification result.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$Receipt
    )
    
    $result = @{
        valid = $false
        checks = @()
    }
    
    # Check if integrity field exists
    if (-not $Receipt.PSObject.Properties['integrity']) {
        $result.reason = "No integrity field found"
        $result.checks += @{ check = "integrity_field"; passed = $false }
        return [PSCustomObject]$result
    }
    
    $result.checks += @{ check = "integrity_field"; passed = $true }
    
    # Rebuild content hash
    $contentOnly = @{
        event = $Receipt.event
        timestamp = $Receipt.timestamp
        data = $Receipt.data
        metadata = $Receipt.metadata
    }
    
    $contentJson = $contentOnly | ConvertTo-Json -Depth 10 -Compress
    $computedHash = Get-SHA256Hash -InputString $contentJson
    
    # Verify receipt hash
    if ($computedHash -eq $Receipt.integrity.receiptHash) {
        $result.checks += @{ check = "receipt_hash"; passed = $true }
    }
    else {
        $result.checks += @{ 
            check = "receipt_hash"
            passed = $false
            expected = $Receipt.integrity.receiptHash
            computed = $computedHash
        }
        $result.reason = "Receipt hash mismatch - content may have been tampered"
        return [PSCustomObject]$result
    }
    
    # Verify chain hash
    $chainInput = "$computedHash$($Receipt.integrity.previousChainHash)"
    $computedChainHash = Get-SHA256Hash -InputString $chainInput
    
    if ($computedChainHash -eq $Receipt.integrity.chainHash) {
        $result.checks += @{ check = "chain_hash"; passed = $true }
    }
    else {
        $result.checks += @{
            check = "chain_hash"
            passed = $false
            expected = $Receipt.integrity.chainHash
            computed = $computedChainHash
        }
        $result.reason = "Chain hash mismatch - chain continuity broken"
        return [PSCustomObject]$result
    }
    
    $result.valid = $true
    $result.reason = "All integrity checks passed"
    $result.receiptHash = $Receipt.integrity.receiptHash
    $result.chainHash = $Receipt.integrity.chainHash
    
    return [PSCustomObject]$result
}

function Test-ReceiptChain {
    <#
    .SYNOPSIS
        Verifies the integrity of an entire receipt chain.
    
    .PARAMETER ReceiptPath
        Path to the JSONL receipt file.
    
    .OUTPUTS
        PSCustomObject with chain verification results.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$ReceiptPath
    )
    
    $result = @{
        valid = $false
        path = $ReceiptPath
        timestamp = (Get-Date).ToString("o")
        version = "integrity-v1"
        receipts = @()
        summary = @{
            total = 0
            valid = 0
            invalid = 0
            noIntegrity = 0
        }
    }
    
    if (-not (Test-Path $ReceiptPath)) {
        $result.error = "Receipt file not found"
        return [PSCustomObject]$result
    }
    
    $lines = Get-Content $ReceiptPath
    $previousChainHash = ""
    $lineNumber = 0
    
    foreach ($line in $lines) {
        $lineNumber++
        
        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }
        
        $receiptResult = @{
            line = $lineNumber
            valid = $false
        }
        
        try {
            $receipt = $line | ConvertFrom-Json
            
            # Check if receipt has integrity field
            if (-not $receipt.PSObject.Properties['integrity']) {
                $receiptResult.reason = "No integrity field"
                $result.summary.noIntegrity++
                $result.receipts += $receiptResult
                continue
            }
            
            # Verify chain continuity
            if ($receipt.integrity.previousChainHash -ne $previousChainHash) {
                $receiptResult.valid = $false
                $receiptResult.reason = "Chain break: expected previousChainHash '$previousChainHash', got '$($receipt.integrity.previousChainHash)'"
                $result.summary.invalid++
                $result.receipts += $receiptResult
                
                # Chain is broken - stop verification
                $result.chainBrokenAt = $lineNumber
                break
            }
            
            # Verify receipt hash
            $hashResult = Test-ReceiptHash -Receipt $receipt
            
            if ($hashResult.valid) {
                $receiptResult.valid = $true
                $receiptResult.chainHash = $receipt.integrity.chainHash
                $result.summary.valid++
                $previousChainHash = $receipt.integrity.chainHash
            }
            else {
                $receiptResult.valid = $false
                $receiptResult.reason = $hashResult.reason
                $receiptResult.checks = $hashResult.checks
                $result.summary.invalid++
            }
        }
        catch {
            $receiptResult.reason = "Parse error: $_"
            $result.summary.invalid++
        }
        
        $result.receipts += $receiptResult
        $result.summary.total++
    }
    
    # Set overall validity
    $result.valid = ($result.summary.invalid -eq 0 -and $result.summary.total -gt 0)
    $result.lastChainHash = $previousChainHash
    
    if ($result.valid) {
        $result.status = "verified"
        $result.exitCode = 0
    }
    elseif ($result.summary.total -eq 0) {
        $result.status = "empty"
        $result.exitCode = 0
    }
    else {
        $result.status = "invalid"
        $result.exitCode = 4
    }
    
    return [PSCustomObject]$result
}

function Write-SignedReceipt {
    <#
    .SYNOPSIS
        Writes a signed receipt to a JSONL file with chain continuity.
    
    .PARAMETER Event
        The event name.
    
    .PARAMETER Data
        Event data hashtable.
    
    .PARAMETER ReceiptPath
        Path to the receipt file.
    
    .OUTPUTS
        PSCustomObject with write result.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Event,
        
        [Parameter(Mandatory=$true)]
        [hashtable]$Data,
        
        [string]$ReceiptPath = (Join-Path $PSScriptRoot ".." "receipts" "signed_receipts.jsonl")
    )
    
    # Ensure directory exists
    $receiptDir = Split-Path $ReceiptPath -Parent
    if (-not (Test-Path $receiptDir)) {
        New-Item -ItemType Directory -Path $receiptDir -Force | Out-Null
    }
    
    # Get previous chain hash
    $previousChainHash = ""
    if (Test-Path $ReceiptPath) {
        $lastLine = Get-Content $ReceiptPath -Tail 1
        if (-not [string]::IsNullOrWhiteSpace($lastLine)) {
            try {
                $lastReceipt = $lastLine | ConvertFrom-Json
                if ($lastReceipt.PSObject.Properties['integrity']) {
                    $previousChainHash = $lastReceipt.integrity.chainHash
                }
            }
            catch {
                # Ignore parse errors, start fresh chain
            }
        }
    }
    
    # Create signed receipt
    $receipt = New-SignedReceipt -Event $Event -Data $Data -PreviousChainHash $previousChainHash
    
    # Write to file
    $receiptJson = $receipt | ConvertTo-Json -Depth 10 -Compress
    Add-Content -Path $ReceiptPath -Value $receiptJson
    
    return @{
        success = $true
        path = $ReceiptPath
        receiptHash = $receipt.integrity.receiptHash
        chainHash = $receipt.integrity.chainHash
        event = $Event
        timestamp = $receipt.timestamp
    }
}

# Export functions
Export-ModuleMember -Function Get-SHA256Hash, New-SignedReceipt, Test-ReceiptHash, Test-ReceiptChain, Write-SignedReceipt -ErrorAction SilentlyContinue
