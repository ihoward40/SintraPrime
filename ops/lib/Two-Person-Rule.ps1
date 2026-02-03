<#
.SYNOPSIS
    Two-Person Rule Proof implementation for SintraPrime Supermemory operations.
    Upgrade #10 from the High-ROI Upgrade Roadmap.

.DESCRIPTION
    Requires two distinct approvers for high-risk operations.
    Logs both approver identities to the receipt.
    Provides enterprise-grade governance for sensitive operations.

.PARAMETER Operation
    The operation requiring two-person approval.

.PARAMETER Amount
    The monetary amount (if applicable).

.PARAMETER Threshold
    Amount threshold above which two-person rule applies. Default: 500.

.OUTPUTS
    JSON object with approval status and proof.

.EXAMPLE
    . .\lib\Two-Person-Rule.ps1
    $approval = Request-TwoPersonApproval -Operation "large_transfer" -Amount 1000
#>

$script:ApprovalDirectory = Join-Path $PSScriptRoot ".." "approvals"
$script:PendingApprovals = Join-Path $script:ApprovalDirectory "pending"
$script:CompletedApprovals = Join-Path $script:ApprovalDirectory "completed"

function Initialize-ApprovalDirectories {
    foreach ($dir in @($script:ApprovalDirectory, $script:PendingApprovals, $script:CompletedApprovals)) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
}

function Get-SHA256Hash {
    param([string]$InputString)
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($InputString)
    $hash = $sha256.ComputeHash($bytes)
    return [BitConverter]::ToString($hash).Replace("-", "").ToLower()
}

function New-ApprovalRequest {
    <#
    .SYNOPSIS
        Creates a new two-person approval request.
    
    .PARAMETER Operation
        The operation requiring approval.
    
    .PARAMETER Amount
        The monetary amount.
    
    .PARAMETER Details
        Additional details about the operation.
    
    .PARAMETER RequestedBy
        Identity of the person requesting approval.
    
    .OUTPUTS
        PSCustomObject with the approval request.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Operation,
        
        [decimal]$Amount = 0,
        
        [hashtable]$Details = @{},
        
        [string]$RequestedBy = $env:USERNAME
    )
    
    Initialize-ApprovalDirectories
    
    $requestId = [guid]::NewGuid().ToString("N").Substring(0, 12)
    $timestamp = (Get-Date).ToString("o")
    
    $request = @{
        requestId = $requestId
        operation = $Operation
        amount = $Amount
        details = $Details
        requestedBy = $RequestedBy
        requestedAt = $timestamp
        status = "pending"
        approvals = @()
        requiredApprovals = 2
        version = "2pr-v1"
    }
    
    # Compute request hash for integrity
    $requestContent = @{
        requestId = $requestId
        operation = $Operation
        amount = $Amount
        requestedBy = $RequestedBy
        requestedAt = $timestamp
    }
    $request.requestHash = Get-SHA256Hash -InputString ($requestContent | ConvertTo-Json -Compress)
    
    # Save to pending
    $requestPath = Join-Path $script:PendingApprovals "$requestId.json"
    $request | ConvertTo-Json -Depth 10 | Set-Content -Path $requestPath -Force
    
    return [PSCustomObject]@{
        success = $true
        requestId = $requestId
        requestPath = $requestPath
        request = $request
        message = "Approval request created. Requires 2 approvals from different people."
    }
}

function Add-Approval {
    <#
    .SYNOPSIS
        Adds an approval to a pending request.
    
    .PARAMETER RequestId
        The ID of the approval request.
    
    .PARAMETER ApprovedBy
        Identity of the approver.
    
    .PARAMETER Comment
        Optional comment from the approver.
    
    .OUTPUTS
        PSCustomObject with approval result.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$RequestId,
        
        [Parameter(Mandatory=$true)]
        [string]$ApprovedBy,
        
        [string]$Comment = ""
    )
    
    $result = @{
        success = $false
        requestId = $RequestId
        approvedBy = $ApprovedBy
        timestamp = (Get-Date).ToString("o")
        version = "2pr-v1"
    }
    
    # Load request
    $requestPath = Join-Path $script:PendingApprovals "$RequestId.json"
    if (-not (Test-Path $requestPath)) {
        $result.error = "Request not found: $RequestId"
        return [PSCustomObject]$result
    }
    
    $request = Get-Content $requestPath -Raw | ConvertFrom-Json
    
    # Check if already approved by this person
    $existingApproval = $request.approvals | Where-Object { $_.approvedBy -eq $ApprovedBy }
    if ($existingApproval) {
        $result.error = "Already approved by $ApprovedBy. Two-person rule requires different approvers."
        return [PSCustomObject]$result
    }
    
    # Check if requester is trying to approve their own request
    if ($request.requestedBy -eq $ApprovedBy) {
        $result.error = "Requester cannot approve their own request"
        return [PSCustomObject]$result
    }
    
    # Add approval
    $approval = @{
        approvedBy = $ApprovedBy
        approvedAt = (Get-Date).ToString("o")
        comment = $Comment
        hostname = $env:COMPUTERNAME
    }
    
    # Compute approval hash
    $approval.approvalHash = Get-SHA256Hash -InputString ($approval | ConvertTo-Json -Compress)
    
    $request.approvals += $approval
    
    # Check if fully approved
    if ($request.approvals.Count -ge $request.requiredApprovals) {
        $request.status = "approved"
        $request.approvedAt = (Get-Date).ToString("o")
        
        # Compute final proof hash
        $proofContent = @{
            requestHash = $request.requestHash
            approvals = $request.approvals | ForEach-Object { $_.approvalHash }
        }
        $request.proofHash = Get-SHA256Hash -InputString ($proofContent | ConvertTo-Json -Compress)
        
        # Move to completed
        $completedPath = Join-Path $script:CompletedApprovals "$RequestId.json"
        $request | ConvertTo-Json -Depth 10 | Set-Content -Path $completedPath -Force
        Remove-Item $requestPath -Force
        
        $result.success = $true
        $result.status = "approved"
        $result.proofHash = $request.proofHash
        $result.message = "Request fully approved by 2 different people"
        $result.approvers = $request.approvals | ForEach-Object { $_.approvedBy }
    }
    else {
        # Save updated request
        $request | ConvertTo-Json -Depth 10 | Set-Content -Path $requestPath -Force
        
        $result.success = $true
        $result.status = "pending"
        $result.approvalsReceived = $request.approvals.Count
        $result.approvalsRequired = $request.requiredApprovals
        $result.message = "Approval recorded. Waiting for $($request.requiredApprovals - $request.approvals.Count) more approval(s)."
    }
    
    return [PSCustomObject]$result
}

function Test-TwoPersonApproval {
    <#
    .SYNOPSIS
        Checks if an operation has valid two-person approval.
    
    .PARAMETER RequestId
        The ID of the approval request.
    
    .OUTPUTS
        PSCustomObject with approval status.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$RequestId
    )
    
    $result = @{
        approved = $false
        requestId = $RequestId
        timestamp = (Get-Date).ToString("o")
        version = "2pr-v1"
    }
    
    # Check completed first
    $completedPath = Join-Path $script:CompletedApprovals "$RequestId.json"
    if (Test-Path $completedPath) {
        $request = Get-Content $completedPath -Raw | ConvertFrom-Json
        
        if ($request.status -eq "approved" -and $request.approvals.Count -ge 2) {
            # Verify approvers are different
            $uniqueApprovers = $request.approvals | Select-Object -ExpandProperty approvedBy -Unique
            
            if ($uniqueApprovers.Count -ge 2) {
                $result.approved = $true
                $result.status = "approved"
                $result.proofHash = $request.proofHash
                $result.approvers = @($uniqueApprovers)
                $result.approvedAt = $request.approvedAt
                $result.operation = $request.operation
                $result.amount = $request.amount
            }
            else {
                $result.error = "Invalid approval: same person approved multiple times"
            }
        }
        
        return [PSCustomObject]$result
    }
    
    # Check pending
    $pendingPath = Join-Path $script:PendingApprovals "$RequestId.json"
    if (Test-Path $pendingPath) {
        $request = Get-Content $pendingPath -Raw | ConvertFrom-Json
        
        $result.status = "pending"
        $result.approvalsReceived = $request.approvals.Count
        $result.approvalsRequired = $request.requiredApprovals
        $result.operation = $request.operation
        $result.amount = $request.amount
        
        return [PSCustomObject]$result
    }
    
    $result.error = "Request not found"
    return [PSCustomObject]$result
}

function Get-PendingApprovals {
    <#
    .SYNOPSIS
        Lists all pending approval requests.
    #>
    
    Initialize-ApprovalDirectories
    
    $pending = Get-ChildItem -Path $script:PendingApprovals -Filter "*.json" -ErrorAction SilentlyContinue |
        ForEach-Object {
            $request = Get-Content $_.FullName -Raw | ConvertFrom-Json
            @{
                requestId = $request.requestId
                operation = $request.operation
                amount = $request.amount
                requestedBy = $request.requestedBy
                requestedAt = $request.requestedAt
                approvalsReceived = $request.approvals.Count
                approvalsRequired = $request.requiredApprovals
            }
        }
    
    return @{
        timestamp = (Get-Date).ToString("o")
        count = @($pending).Count
        requests = @($pending)
    }
}

function Deny-ApprovalRequest {
    <#
    .SYNOPSIS
        Denies an approval request.
    
    .PARAMETER RequestId
        The ID of the approval request.
    
    .PARAMETER DeniedBy
        Identity of the person denying.
    
    .PARAMETER Reason
        Reason for denial.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$RequestId,
        
        [Parameter(Mandatory=$true)]
        [string]$DeniedBy,
        
        [string]$Reason = ""
    )
    
    $result = @{
        success = $false
        requestId = $RequestId
        deniedBy = $DeniedBy
        timestamp = (Get-Date).ToString("o")
    }
    
    $requestPath = Join-Path $script:PendingApprovals "$RequestId.json"
    if (-not (Test-Path $requestPath)) {
        $result.error = "Request not found"
        return [PSCustomObject]$result
    }
    
    $request = Get-Content $requestPath -Raw | ConvertFrom-Json
    $request.status = "denied"
    $request.deniedBy = $DeniedBy
    $request.deniedAt = (Get-Date).ToString("o")
    $request.denyReason = $Reason
    
    # Move to completed (as denied)
    $completedPath = Join-Path $script:CompletedApprovals "$RequestId.json"
    $request | ConvertTo-Json -Depth 10 | Set-Content -Path $completedPath -Force
    Remove-Item $requestPath -Force
    
    $result.success = $true
    $result.status = "denied"
    $result.message = "Request denied"
    
    return [PSCustomObject]$result
}

function Write-TwoPersonReceipt {
    <#
    .SYNOPSIS
        Writes a two-person rule event to the receipt log.
    
    .PARAMETER ApprovalResult
        The approval result to log.
    
    .PARAMETER ReceiptPath
        Path to the receipt file.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [PSCustomObject]$ApprovalResult,
        
        [string]$ReceiptPath = (Join-Path $PSScriptRoot ".." "receipts" "two_person_receipts.jsonl")
    )
    
    # Ensure directory exists
    $receiptDir = Split-Path $ReceiptPath -Parent
    if (-not (Test-Path $receiptDir)) {
        New-Item -ItemType Directory -Path $receiptDir -Force | Out-Null
    }
    
    $receipt = @{
        event = "sm.governance.two_person_rule"
        timestamp = (Get-Date).ToString("o")
        requestId = $ApprovalResult.requestId
        status = $ApprovalResult.status
        version = "2pr-v1"
    }
    
    if ($ApprovalResult.approved) {
        $receipt.event = "sm.governance.two_person_approved"
        $receipt.proofHash = $ApprovalResult.proofHash
        $receipt.approvers = $ApprovalResult.approvers
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
Export-ModuleMember -Function New-ApprovalRequest, Add-Approval, Test-TwoPersonApproval, Get-PendingApprovals, Deny-ApprovalRequest, Write-TwoPersonReceipt -ErrorAction SilentlyContinue
