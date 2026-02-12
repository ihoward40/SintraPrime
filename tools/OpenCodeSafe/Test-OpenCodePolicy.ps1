<#
.SYNOPSIS
    Enhanced policy lint for OpenCode with cryptographic validation.

.DESCRIPTION
    Validates OpenCode policy configuration including:
    - Cryptographic seal verification (signature + hash match)
    - Path sandbox constraints
    - Command allow/deny/approval lists
    - Network domain filtering
    - MCP server validation
    
    Enforcement order (fail-fast):
    1. Load and parse policy config
    2. Verify OpenCode config seal (HARD BLOCK if fails)
    3. Verify WorkRoot path constraints
    4. Parse plan file (if provided)
    5. Check command patterns
    6. Check network domains
    7. Check MCP server configuration
    8. Write audit log entry
    9. Exit 0 (OK) or Exit 2 (BLOCK)

.PARAMETER ConfigPath
    Path to the policy configuration file (opencode_policy.config.v1.json).

.PARAMETER WorkRoot
    Optional. Working directory root to validate against allowed paths.

.PARAMETER PlanPath
    Optional. Path to OpenCode plan file to validate commands and operations.

.EXAMPLE
    .\Test-OpenCodePolicy.ps1 -ConfigPath ".\opencode_policy.config.v1.json"

.EXAMPLE
    .\Test-OpenCodePolicy.ps1 -ConfigPath ".\opencode_policy.config.v1.json" -WorkRoot "C:\SintraPrime\CASES\Project1"

.EXAMPLE
    .\Test-OpenCodePolicy.ps1 -ConfigPath ".\opencode_policy.config.v1.json" -WorkRoot "C:\SintraPrime\CASES\Project1" -PlanPath ".\plan.json"
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$true)]
    [string]$ConfigPath,

    [Parameter(Mandatory=$false)]
    [string]$WorkRoot,

    [Parameter(Mandatory=$false)]
    [string]$PlanPath
)

$ErrorActionPreference = "Stop"

# Helper function for colored output
function Write-PolicyCheck {
    param(
        [string]$Message,
        [ValidateSet("OK", "BLOCK", "WARNING", "INFO")]
        [string]$Status
    )
    
    switch ($Status) {
        "OK"      { Write-Host "✓ $Message" -ForegroundColor Green }
        "BLOCK"   { Write-Host "✗ $Message" -ForegroundColor Red }
        "WARNING" { Write-Host "⚠ $Message" -ForegroundColor Yellow }
        "INFO"    { Write-Host "ℹ $Message" -ForegroundColor Cyan }
    }
}

# Audit logging function
function Write-AuditLog {
    param(
        [string]$AuditDir,
        [hashtable]$AuditData
    )
    
    if (-not (Test-Path $AuditDir)) {
        New-Item -ItemType Directory -Path $AuditDir -Force | Out-Null
    }
    
    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $auditFile = Join-Path $AuditDir "policy_check_$timestamp.json"
    
    $AuditData | ConvertTo-Json -Depth 10 | Out-File -FilePath $auditFile -Encoding UTF8
    Write-PolicyCheck "Audit log: $auditFile" -Status INFO
}

# Verify OpenCode config seal
function Assert-OpenCodeConfigSealed {
    param(
        [object]$Policy
    )
    
    Write-PolicyCheck "Checking OpenCode config seal..." -Status INFO
    
    if (-not $Policy.integrity.enforce_opencode_config_seal) {
        Write-PolicyCheck "Config seal enforcement disabled (not recommended)" -Status WARNING
        return $true
    }
    
    $configPath = [Environment]::ExpandEnvironmentVariables($Policy.integrity.opencode_config_path)
    $sealDir = [Environment]::ExpandEnvironmentVariables($Policy.integrity.seal.seal_dir)
    $hashFilename = $Policy.integrity.seal.hash_filename
    $sigFilename = $Policy.integrity.seal.sig_filename
    $namespace = $Policy.integrity.seal.namespace
    $signerIdentity = $Policy.integrity.seal.signer_identity
    $allowedSignersPath = [Environment]::ExpandEnvironmentVariables($Policy.integrity.seal.allowed_signers_path)
    
    $hashFilePath = Join-Path $sealDir $hashFilename
    $sigFilePath = Join-Path $sealDir $sigFilename
    
    # Check if config exists
    if (-not (Test-Path $configPath)) {
        Write-PolicyCheck "OpenCode config not found: $configPath" -Status BLOCK
        return $false
    }
    
    # Check if seal exists
    if (-not (Test-Path $hashFilePath)) {
        Write-PolicyCheck "Seal hash not found: $hashFilePath" -Status BLOCK
        return $false
    }
    
    if (-not (Test-Path $sigFilePath)) {
        Write-PolicyCheck "Seal signature not found: $sigFilePath" -Status BLOCK
        return $false
    }
    
    if (-not (Test-Path $allowedSignersPath)) {
        Write-PolicyCheck "Allowed signers file not found: $allowedSignersPath" -Status BLOCK
        return $false
    }
    
    # Verify signature
    try {
        $verifyResult = Get-Content $hashFilePath | & ssh-keygen -Y verify -f $allowedSignersPath -I $signerIdentity -n $namespace -s $sigFilePath 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-PolicyCheck "Signature verification failed: $verifyResult" -Status BLOCK
            return $false
        }
    } catch {
        Write-PolicyCheck "Failed to verify signature: $_" -Status BLOCK
        return $false
    }
    
    Write-PolicyCheck "Signature verified" -Status OK
    
    # Verify hash matches current config
    $currentHash = (Get-FileHash -Path $configPath -Algorithm SHA256).Hash.ToLower()
    $sealedHash = (Get-Content $hashFilePath).Trim()
    
    if ($currentHash -ne $sealedHash) {
        Write-PolicyCheck "Config hash mismatch!" -Status BLOCK
        Write-Host "  Expected: $sealedHash" -ForegroundColor Red
        Write-Host "  Current:  $currentHash" -ForegroundColor Red
        Write-Host "  Config may have been modified without re-sealing!" -ForegroundColor Red
        return $false
    }
    
    Write-PolicyCheck "Config hash matches sealed hash" -Status OK
    return $true
}

# Test command against policy
function Test-CommandPolicy {
    param(
        [object]$Policy,
        [string]$Command
    )
    
    # Check denylist first (fail-fast)
    foreach ($pattern in $Policy.commands.denylist_regex) {
        if ($Command -match $pattern) {
            Write-PolicyCheck "Command DENIED by pattern: $pattern" -Status BLOCK
            Write-Host "  Command: $Command" -ForegroundColor Red
            return $false
        }
    }
    
    # Check allowlist
    $allowed = $false
    foreach ($pattern in $Policy.commands.allowlist_regex) {
        if ($Command -match $pattern) {
            $allowed = $true
            break
        }
    }
    
    if (-not $allowed) {
        Write-PolicyCheck "Command not in allowlist: $Command" -Status BLOCK
        return $false
    }
    
    # Check if requires approval
    foreach ($pattern in $Policy.commands.require_approval_regex) {
        if ($Command -match $pattern) {
            Write-PolicyCheck "Command requires approval: $Command" -Status WARNING
            # Still allow, but flag for manual review
        }
    }
    
    return $true
}

# Test network domain
function Test-NetworkPolicy {
    param(
        [object]$Policy,
        [string]$Domain
    )
    
    # Check denylist first
    foreach ($deniedDomain in $Policy.network.domain_denylist) {
        if ($Domain -like "*$deniedDomain*") {
            Write-PolicyCheck "Domain DENIED: $Domain" -Status BLOCK
            return $false
        }
    }
    
    # Check allowlist
    $allowed = $false
    foreach ($allowedDomain in $Policy.network.domain_allowlist) {
        if ($Domain -like "*$allowedDomain*") {
            $allowed = $true
            break
        }
    }
    
    if (-not $allowed) {
        Write-PolicyCheck "Domain not in allowlist: $Domain" -Status BLOCK
        return $false
    }
    
    return $true
}

# Test MCP policy
function Test-MCPPolicy {
    param(
        [object]$Policy
    )
    
    Write-PolicyCheck "Checking MCP server configuration..." -Status INFO
    
    # Check each possible OpenCode config path
    $configFound = $false
    $configPath = $null
    
    foreach ($path in $Policy.mcp.opencode_config_paths) {
        $expandedPath = [Environment]::ExpandEnvironmentVariables($path)
        if (Test-Path $expandedPath) {
            $configFound = $true
            $configPath = $expandedPath
            break
        }
    }
    
    if (-not $configFound) {
        Write-PolicyCheck "No OpenCode MCP config found (checked paths in policy)" -Status WARNING
        return $true  # Not blocking if no config exists
    }
    
    Write-PolicyCheck "Found OpenCode config: $configPath" -Status OK
    
    # Parse and validate MCP servers
    try {
        $mcpConfig = Get-Content $configPath -Raw | ConvertFrom-Json
        
        if ($mcpConfig.mcpServers) {
            foreach ($serverName in $mcpConfig.mcpServers.PSObject.Properties.Name) {
                $server = $mcpConfig.mcpServers.$serverName
                
                # Check if server is allowlisted
                if ($Policy.mcp.allowlisted_servers -notcontains $serverName) {
                    if ($Policy.mcp.block_if_unknown_enabled) {
                        Write-PolicyCheck "MCP server not allowlisted: $serverName" -Status BLOCK
                        return $false
                    } else {
                        Write-PolicyCheck "MCP server not allowlisted (but not blocking): $serverName" -Status WARNING
                    }
                }
                
                # Check server type
                if ($server.type) {
                    if ($Policy.mcp.allowed_types -notcontains $server.type) {
                        Write-PolicyCheck "MCP server type not allowed: $($server.type) for $serverName" -Status BLOCK
                        return $false
                    }
                }
                
                Write-PolicyCheck "MCP server OK: $serverName" -Status OK
            }
        }
    } catch {
        Write-PolicyCheck "Failed to parse OpenCode MCP config: $_" -Status WARNING
    }
    
    return $true
}

# Test path constraints
function Test-PathPolicy {
    param(
        [object]$Policy,
        [string]$Path
    )
    
    if ([string]::IsNullOrEmpty($Path)) {
        return $true
    }
    
    $expandedPath = [Environment]::ExpandEnvironmentVariables($Path)
    
    # Check prohibited paths first
    foreach ($prohibited in $Policy.paths.prohibited_paths) {
        $expandedProhibited = [Environment]::ExpandEnvironmentVariables($prohibited)
        if ($expandedPath -like "$expandedProhibited*") {
            Write-PolicyCheck "Path in prohibited zone: $expandedPath" -Status BLOCK
            return $false
        }
    }
    
    # Check allowed roots
    $allowed = $false
    foreach ($allowedRoot in $Policy.paths.allowed_roots) {
        $expandedAllowed = [Environment]::ExpandEnvironmentVariables($allowedRoot)
        if ($expandedPath -like "$expandedAllowed*") {
            $allowed = $true
            break
        }
    }
    
    if (-not $allowed) {
        Write-PolicyCheck "Path not in allowed roots: $expandedPath" -Status BLOCK
        return $false
    }
    
    Write-PolicyCheck "Path allowed: $expandedPath" -Status OK
    return $true
}

# Main execution
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "         OpenCode Policy Validation (Enhanced)" -ForegroundColor White
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

$blockCount = 0
$warningCount = 0

# 1. Load and parse policy config
Write-PolicyCheck "Loading policy config: $ConfigPath" -Status INFO

if (-not (Test-Path $ConfigPath)) {
    Write-PolicyCheck "Policy config not found: $ConfigPath" -Status BLOCK
    exit 2
}

try {
    $policy = Get-Content $ConfigPath -Raw | ConvertFrom-Json
} catch {
    Write-PolicyCheck "Failed to parse policy config: $_" -Status BLOCK
    exit 2
}

Write-PolicyCheck "Policy schema version: $($policy.schema_version)" -Status OK

# 2. Verify OpenCode config seal (HARD BLOCK)
if (-not (Assert-OpenCodeConfigSealed -Policy $policy)) {
    $blockCount++
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "           BLOCKED: Config seal verification failed" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
    exit 2
}

# 3. Verify WorkRoot path constraints
if ($WorkRoot) {
    Write-Host ""
    Write-PolicyCheck "Validating WorkRoot path..." -Status INFO
    if (-not (Test-PathPolicy -Policy $policy -Path $WorkRoot)) {
        $blockCount++
    }
}

# 4. Parse plan file if provided
if ($PlanPath) {
    Write-Host ""
    Write-PolicyCheck "Parsing plan file: $PlanPath" -Status INFO
    
    if (-not (Test-Path $PlanPath)) {
        Write-PolicyCheck "Plan file not found: $PlanPath" -Status BLOCK
        $blockCount++
    } else {
        try {
            $plan = Get-Content $PlanPath -Raw | ConvertFrom-Json
            
            # 5. Check command patterns
            if ($plan.commands) {
                Write-Host ""
                Write-PolicyCheck "Validating commands..." -Status INFO
                foreach ($cmd in $plan.commands) {
                    if (-not (Test-CommandPolicy -Policy $policy -Command $cmd)) {
                        $blockCount++
                    }
                }
            }
            
            # 6. Check network domains
            if ($plan.network_requests) {
                Write-Host ""
                Write-PolicyCheck "Validating network requests..." -Status INFO
                foreach ($request in $plan.network_requests) {
                    if ($request.domain) {
                        if (-not (Test-NetworkPolicy -Policy $policy -Domain $request.domain)) {
                            $blockCount++
                        }
                    }
                }
            }
        } catch {
            Write-PolicyCheck "Failed to parse plan file: $_" -Status WARNING
            $warningCount++
        }
    }
}

# 7. Check MCP server configuration
Write-Host ""
if (-not (Test-MCPPolicy -Policy $policy)) {
    $blockCount++
}

# 8. Write audit log
Write-Host ""
$auditData = @{
    timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ")
    operator = $env:USERNAME
    policy_config = $ConfigPath
    work_root = $WorkRoot
    plan_path = $PlanPath
    blocks = $blockCount
    warnings = $warningCount
    result = if ($blockCount -eq 0) { "PASS" } else { "BLOCK" }
}

$auditDir = [Environment]::ExpandEnvironmentVariables($policy.audit.log_dir)
Write-AuditLog -AuditDir $auditDir -AuditData $auditData

# 9. Final result
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

if ($blockCount -eq 0) {
    Write-Host "                    POLICY CHECK PASSED" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
    if ($warningCount -gt 0) {
        Write-Host "Warnings: $warningCount" -ForegroundColor Yellow
    }
    
    exit 0
} else {
    Write-Host "                    POLICY CHECK BLOCKED" -ForegroundColor Red
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Red
    Write-Host "Blocks: $blockCount" -ForegroundColor Red
    
    if ($warningCount -gt 0) {
        Write-Host "Warnings: $warningCount" -ForegroundColor Yellow
    }
    
    exit 2
}
