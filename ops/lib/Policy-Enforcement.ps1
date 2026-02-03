<#
.SYNOPSIS
    Policy Pack Hash implementation for SintraPrime Supermemory operations.
    Upgrade #9 from the High-ROI Upgrade Roadmap.

.DESCRIPTION
    Adds policyPackHash into Make JSON output so the router can reject runs
    produced under the wrong policy pack.
    Ensures that only approved policy configurations are used in production.

.PARAMETER PolicyPath
    Path to the policy configuration file.

.OUTPUTS
    JSON object with policy hash and validation results.

.EXAMPLE
    . .\lib\Policy-Enforcement.ps1
    $hash = Get-PolicyPackHash -PolicyPath "config/policies.json"
#>

$script:PolicyDirectory = Join-Path $PSScriptRoot ".." "policies"

function Initialize-PolicyDirectory {
    if (-not (Test-Path $script:PolicyDirectory)) {
        New-Item -ItemType Directory -Path $script:PolicyDirectory -Force | Out-Null
    }
}

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

function Get-PolicyPackHash {
    <#
    .SYNOPSIS
        Computes the hash of a policy pack configuration.
    
    .PARAMETER PolicyPath
        Path to the policy JSON file.
    
    .OUTPUTS
        PSCustomObject with hash and policy metadata.
    #>
    param(
        [string]$PolicyPath = (Join-Path $script:PolicyDirectory "active_policy.json")
    )
    
    $result = @{
        timestamp = (Get-Date).ToString("o")
        version = "policy-v1"
    }
    
    if (-not (Test-Path $PolicyPath)) {
        $result.error = "Policy file not found: $PolicyPath"
        $result.policyPackHash = "no-policy"
        return [PSCustomObject]$result
    }
    
    try {
        $policyContent = Get-Content $PolicyPath -Raw
        $policy = $policyContent | ConvertFrom-Json
        
        # Compute hash of the policy content
        $result.policyPackHash = Get-SHA256Hash -InputString $policyContent
        $result.policyPath = $PolicyPath
        $result.policyVersion = if ($policy.PSObject.Properties['version']) { $policy.version } else { "unknown" }
        $result.policyName = if ($policy.PSObject.Properties['name']) { $policy.name } else { "unnamed" }
        
        # Extract key policy settings for quick reference
        if ($policy.PSObject.Properties['settings']) {
            $result.settings = $policy.settings
        }
        
        $result.valid = $true
    }
    catch {
        $result.error = "Failed to read policy: $_"
        $result.policyPackHash = "error"
        $result.valid = $false
    }
    
    return [PSCustomObject]$result
}

function Test-PolicyPackHash {
    <#
    .SYNOPSIS
        Validates that the current policy pack hash matches the expected hash.
    
    .PARAMETER ExpectedHash
        The expected policy pack hash.
    
    .PARAMETER PolicyPath
        Path to the policy JSON file.
    
    .OUTPUTS
        PSCustomObject with validation result.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$ExpectedHash,
        
        [string]$PolicyPath = (Join-Path $script:PolicyDirectory "active_policy.json")
    )
    
    $result = @{
        valid = $false
        expectedHash = $ExpectedHash
        timestamp = (Get-Date).ToString("o")
        version = "policy-v1"
    }
    
    $currentPolicy = Get-PolicyPackHash -PolicyPath $PolicyPath
    $result.actualHash = $currentPolicy.policyPackHash
    $result.policyPath = $PolicyPath
    
    if ($currentPolicy.policyPackHash -eq $ExpectedHash) {
        $result.valid = $true
        $result.reason = "Policy pack hash matches"
        $result.exitCode = 0
    }
    else {
        $result.reason = "Policy pack hash mismatch: expected '$ExpectedHash', got '$($currentPolicy.policyPackHash)'"
        $result.exitCode = 5
        
        # Check for special cases
        if ($currentPolicy.policyPackHash -eq "no-policy") {
            $result.reason = "No policy file found"
        }
        elseif ($currentPolicy.policyPackHash -eq "error") {
            $result.reason = "Error reading policy: $($currentPolicy.error)"
        }
    }
    
    return [PSCustomObject]$result
}

function New-PolicyPack {
    <#
    .SYNOPSIS
        Creates a new policy pack configuration.
    
    .PARAMETER Name
        Name of the policy pack.
    
    .PARAMETER Settings
        Hashtable of policy settings.
    
    .PARAMETER OutputPath
        Path to save the policy file.
    
    .OUTPUTS
        PSCustomObject with the created policy and its hash.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Name,
        
        [Parameter(Mandatory=$true)]
        [hashtable]$Settings,
        
        [string]$OutputPath = (Join-Path $script:PolicyDirectory "active_policy.json")
    )
    
    Initialize-PolicyDirectory
    
    $policy = @{
        name = $Name
        version = "1.0"
        createdAt = (Get-Date).ToString("o")
        createdBy = $env:USERNAME
        settings = $Settings
    }
    
    $policyJson = $policy | ConvertTo-Json -Depth 10
    Set-Content -Path $OutputPath -Value $policyJson -Force
    
    # Compute hash
    $hash = Get-SHA256Hash -InputString $policyJson
    
    return @{
        success = $true
        path = $OutputPath
        policyPackHash = $hash
        policy = $policy
    }
}

function Get-DefaultPolicySettings {
    <#
    .SYNOPSIS
        Returns default policy settings for SintraPrime.
    #>
    return @{
        # Execution limits
        maxConcurrentRuns = 1
        maxExecutionTimeSeconds = 300
        maxRetries = 3
        
        # Spending limits
        maxDailySpend = 1000
        maxSingleTransaction = 100
        requireApprovalAbove = 50
        
        # Security settings
        requireTwoPersonRule = $false
        twoPersonRuleThreshold = 500
        allowedOperations = @("search", "index", "report")
        blockedOperations = @("delete", "purge")
        
        # Audit settings
        receiptRetentionDays = 90
        requireSignedReceipts = $true
        
        # Alert thresholds
        p95ThresholdMs = 2000
        errorRateThreshold = 0.05
        
        # Feature flags
        enableStrictMode = $true
        enableHealthDiff = $true
        enableBaitTokenCheck = $true
    }
}

function Assert-PolicyCompliance {
    <#
    .SYNOPSIS
        Validates that an operation complies with the active policy.
    
    .PARAMETER Operation
        The operation being performed.
    
    .PARAMETER Amount
        The monetary amount (if applicable).
    
    .PARAMETER PolicyPath
        Path to the policy file.
    
    .OUTPUTS
        PSCustomObject with compliance result.
    #>
    param(
        [Parameter(Mandatory=$true)]
        [string]$Operation,
        
        [decimal]$Amount = 0,
        
        [string]$PolicyPath = (Join-Path $script:PolicyDirectory "active_policy.json")
    )
    
    $result = @{
        compliant = $false
        operation = $Operation
        amount = $Amount
        timestamp = (Get-Date).ToString("o")
        checks = @()
    }
    
    # Load policy
    if (-not (Test-Path $PolicyPath)) {
        $result.reason = "No policy file found - using permissive defaults"
        $result.compliant = $true
        $result.warning = "Operating without policy enforcement"
        return [PSCustomObject]$result
    }
    
    try {
        $policy = Get-Content $PolicyPath -Raw | ConvertFrom-Json
        $settings = $policy.settings
    }
    catch {
        $result.reason = "Failed to load policy: $_"
        return [PSCustomObject]$result
    }
    
    # Check 1: Operation allowed
    if ($settings.PSObject.Properties['blockedOperations']) {
        if ($Operation -in $settings.blockedOperations) {
            $result.checks += @{ check = "operation_blocked"; passed = $false; operation = $Operation }
            $result.reason = "Operation '$Operation' is blocked by policy"
            return [PSCustomObject]$result
        }
    }
    $result.checks += @{ check = "operation_blocked"; passed = $true }
    
    if ($settings.PSObject.Properties['allowedOperations']) {
        if ($Operation -notin $settings.allowedOperations) {
            $result.checks += @{ check = "operation_allowed"; passed = $false; operation = $Operation }
            $result.reason = "Operation '$Operation' is not in allowed list"
            return [PSCustomObject]$result
        }
    }
    $result.checks += @{ check = "operation_allowed"; passed = $true }
    
    # Check 2: Amount limits
    if ($Amount -gt 0) {
        if ($settings.PSObject.Properties['maxSingleTransaction']) {
            if ($Amount -gt $settings.maxSingleTransaction) {
                $result.checks += @{ 
                    check = "max_transaction"
                    passed = $false
                    amount = $Amount
                    limit = $settings.maxSingleTransaction
                }
                $result.reason = "Amount $Amount exceeds max single transaction limit of $($settings.maxSingleTransaction)"
                return [PSCustomObject]$result
            }
        }
        $result.checks += @{ check = "max_transaction"; passed = $true }
        
        # Check if approval required
        if ($settings.PSObject.Properties['requireApprovalAbove']) {
            if ($Amount -gt $settings.requireApprovalAbove) {
                $result.requiresApproval = $true
                $result.approvalThreshold = $settings.requireApprovalAbove
            }
        }
    }
    
    # Check 3: Two-person rule
    if ($settings.PSObject.Properties['requireTwoPersonRule'] -and $settings.requireTwoPersonRule) {
        if ($Amount -gt $settings.twoPersonRuleThreshold) {
            $result.requiresTwoPersonRule = $true
            $result.twoPersonRuleThreshold = $settings.twoPersonRuleThreshold
        }
    }
    
    $result.compliant = $true
    $result.reason = "All policy checks passed"
    $result.policyName = $policy.name
    $result.policyVersion = $policy.version
    
    return [PSCustomObject]$result
}

# Export functions
Export-ModuleMember -Function Get-PolicyPackHash, Test-PolicyPackHash, New-PolicyPack, Get-DefaultPolicySettings, Assert-PolicyCompliance -ErrorAction SilentlyContinue
