# Example Test Scenarios for OpenCodeSafe

This document provides example test scenarios to validate OpenCodeSafe functionality.

## Prerequisites for Testing

Before running these tests, you need:

1. OpenSSH Client installed
2. PowerShell 7+ installed
3. Test directories created
4. Mock OpenCode config file

## Setup Test Environment

```powershell
# Create test directories
New-Item -ItemType Directory -Path "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode" -Force
New-Item -ItemType Directory -Path "C:\SintraPrime\_GOVERNANCE\AUDIT\OpenCode" -Force
New-Item -ItemType Directory -Path "C:\SintraPrime\keys" -Force
New-Item -ItemType Directory -Path "C:\SintraPrime\CASES\TestProject" -Force

# Create a mock OpenCode config for testing
$mockConfig = @{
    version = "1.0.0"
    mcpServers = @{
        "chrome-devtools" = @{
            type = "local"
            command = "chrome-devtools"
        }
    }
}

$configPath = "$env:USERPROFILE\.config\opencode"
New-Item -ItemType Directory -Path $configPath -Force
$mockConfig | ConvertTo-Json -Depth 10 | Out-File "$configPath\opencode.json" -Encoding UTF8
```

## Test Scenario 1: Generate Test Keys

```powershell
# Generate Ed25519 test key
ssh-keygen -t ed25519 -f "C:\SintraPrime\keys\opencode-signing.ed25519" -C "test-sintraprime-opencode-config" -N '""'

# Create allowed_signers file
$publicKey = Get-Content "C:\SintraPrime\keys\opencode-signing.ed25519.pub"
"sintraprime-opencode-config $publicKey" | Out-File "C:\SintraPrime\keys\allowed_signers" -Encoding ASCII

Write-Host "✓ Test keys generated" -ForegroundColor Green
```

## Test Scenario 2: Seal a Config

```powershell
cd tools\OpenCodeSafe

.\Seal-OpenCodeConfig.ps1 `
    -OpenCodeConfigPath "$env:USERPROFILE\.config\opencode\opencode.json" `
    -SealDir "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode" `
    -PrivateKeyPath "C:\SintraPrime\keys\opencode-signing.ed25519" `
    -AllowedSignersPath "C:\SintraPrime\keys\allowed_signers" `
    -SignerIdentity "sintraprime-opencode-config" `
    -Namespace "sintraprime-opencode-config"

# Expected output:
# [SEAL] ✓ Signature verified successfully
# [SEAL] SEAL COMPLETE
```

## Test Scenario 3: Verify Seal with Policy Check

```powershell
cd tools\OpenCodeSafe

.\Test-OpenCodePolicy.ps1 `
    -ConfigPath ".\opencode_policy.config.v1.json" `
    -WorkRoot "C:\SintraPrime\CASES\TestProject"

# Expected output:
# ✓ Signature verified
# ✓ Config hash matches sealed hash
# ═══════════════════════════════════════════════════════════
#                     POLICY CHECK PASSED
# ═══════════════════════════════════════════════════════════
```

## Test Scenario 4: Detect Unauthorized Modification

```powershell
# Modify the config without re-sealing
$configPath = "$env:USERPROFILE\.config\opencode\opencode.json"
$config = Get-Content $configPath | ConvertFrom-Json
$config.version = "2.0.0"  # Change something
$config | ConvertTo-Json -Depth 10 | Out-File $configPath -Encoding UTF8

# Now try policy check - should BLOCK
.\Test-OpenCodePolicy.ps1 `
    -ConfigPath ".\opencode_policy.config.v1.json"

# Expected output:
# ✗ Config hash mismatch!
#   Expected: <original_hash>
#   Current:  <new_hash>
# ═══════════════════════════════════════════════════════════
#            BLOCKED: Config seal verification failed
# ═══════════════════════════════════════════════════════════
```

## Test Scenario 5: Path Validation

```powershell
# Test with prohibited path (should BLOCK)
.\Test-OpenCodePolicy.ps1 `
    -ConfigPath ".\opencode_policy.config.v1.json" `
    -WorkRoot "C:\Windows"

# Expected output:
# ✗ Path in prohibited zone: C:\Windows
# ═══════════════════════════════════════════════════════════
#                     POLICY CHECK BLOCKED
# ═══════════════════════════════════════════════════════════

# Test with allowed path (should PASS)
.\Test-OpenCodePolicy.ps1 `
    -ConfigPath ".\opencode_policy.config.v1.json" `
    -WorkRoot "C:\SintraPrime\CASES\TestProject"

# Expected output:
# ✓ Path allowed: C:\SintraPrime\CASES\TestProject
# ═══════════════════════════════════════════════════════════
#                     POLICY CHECK PASSED
# ═══════════════════════════════════════════════════════════
```

## Test Scenario 6: Command Validation with Plan File

```powershell
# Create a test plan with allowed commands
$plan = @{
    commands = @(
        "git status",
        "ls -la",
        "opencode --help"
    )
}
$plan | ConvertTo-Json | Out-File "test-plan-allowed.json" -Encoding UTF8

.\Test-OpenCodePolicy.ps1 `
    -ConfigPath ".\opencode_policy.config.v1.json" `
    -WorkRoot "C:\SintraPrime\CASES\TestProject" `
    -PlanPath "test-plan-allowed.json"

# Expected output:
# ✓ All commands allowed
# ═══════════════════════════════════════════════════════════
#                     POLICY CHECK PASSED
# ═══════════════════════════════════════════════════════════

# Create a test plan with denied commands
$planDenied = @{
    commands = @(
        "rm -rf /",
        "del /s /q C:\Windows"
    )
}
$planDenied | ConvertTo-Json | Out-File "test-plan-denied.json" -Encoding UTF8

.\Test-OpenCodePolicy.ps1 `
    -ConfigPath ".\opencode_policy.config.v1.json" `
    -WorkRoot "C:\SintraPrime\CASES\TestProject" `
    -PlanPath "test-plan-denied.json"

# Expected output:
# ✗ Command DENIED by pattern
# ═══════════════════════════════════════════════════════════
#                     POLICY CHECK BLOCKED
# ═══════════════════════════════════════════════════════════
```

## Test Scenario 7: Network Domain Validation

```powershell
# Create a plan with allowed domains
$plan = @{
    network_requests = @(
        @{ domain = "github.com" },
        @{ domain = "docs.microsoft.com" }
    )
}
$plan | ConvertTo-Json | Out-File "test-plan-allowed-domains.json" -Encoding UTF8

.\Test-OpenCodePolicy.ps1 `
    -ConfigPath ".\opencode_policy.config.v1.json" `
    -WorkRoot "C:\SintraPrime\CASES\TestProject" `
    -PlanPath "test-plan-allowed-domains.json"

# Expected output:
# ✓ Domain allowed: github.com
# ✓ Domain allowed: docs.microsoft.com
# ═══════════════════════════════════════════════════════════
#                     POLICY CHECK PASSED
# ═══════════════════════════════════════════════════════════

# Create a plan with denied domain
$planDenied = @{
    network_requests = @(
        @{ domain = "pastebin.com" }
    )
}
$planDenied | ConvertTo-Json | Out-File "test-plan-denied-domain.json" -Encoding UTF8

.\Test-OpenCodePolicy.ps1 `
    -ConfigPath ".\opencode_policy.config.v1.json" `
    -WorkRoot "C:\SintraPrime\CASES\TestProject" `
    -PlanPath "test-plan-denied-domain.json"

# Expected output:
# ✗ Domain DENIED: pastebin.com
# ═══════════════════════════════════════════════════════════
#                     POLICY CHECK BLOCKED
# ═══════════════════════════════════════════════════════════
```

## Test Scenario 8: Re-seal After Authorized Change

```powershell
# Make an authorized change to the config
$configPath = "$env:USERPROFILE\.config\opencode\opencode.json"
$config = Get-Content $configPath | ConvertFrom-Json
$config.version = "1.1.0"
$config | ConvertTo-Json -Depth 10 | Out-File $configPath -Encoding UTF8

# Re-seal the config
.\Seal-OpenCodeConfig.ps1 `
    -OpenCodeConfigPath "$env:USERPROFILE\.config\opencode\opencode.json" `
    -SealDir "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode" `
    -PrivateKeyPath "C:\SintraPrime\keys\opencode-signing.ed25519" `
    -AllowedSignersPath "C:\SintraPrime\keys\allowed_signers" `
    -SignerIdentity "sintraprime-opencode-config" `
    -Namespace "sintraprime-opencode-config"

# Verify the new seal
.\Test-OpenCodePolicy.ps1 `
    -ConfigPath ".\opencode_policy.config.v1.json"

# Expected output:
# ✓ Signature verified
# ✓ Config hash matches sealed hash
# ═══════════════════════════════════════════════════════════
#                     POLICY CHECK PASSED
# ═══════════════════════════════════════════════════════════
```

## Test Scenario 9: Audit Log Verification

```powershell
# Check that audit logs are being created
$auditDir = "C:\SintraPrime\_GOVERNANCE\AUDIT\OpenCode"

# List recent policy checks
Get-ChildItem $auditDir -Filter "policy_check_*.json" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 5 |
    ForEach-Object {
        $data = Get-Content $_.FullName | ConvertFrom-Json
        Write-Host "[$($data.timestamp)] $($data.result) - Operator: $($data.operator)" -ForegroundColor $(if ($data.result -eq "PASS") { "Green" } else { "Red" })
    }

# List recent seal operations
Get-ChildItem $auditDir -Filter "seal_*.json" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 5 |
    ForEach-Object {
        $data = Get-Content $_.FullName | ConvertFrom-Json
        Write-Host "[$($data.timestamp)] SEAL - Hash: $($data.hash.Substring(0,16))... - Operator: $($data.operator)" -ForegroundColor Cyan
    }
```

## Test Scenario 10: MCP Server Validation

```powershell
# Create a config with an allowed MCP server
$config = @{
    version = "1.0.0"
    mcpServers = @{
        "chrome-devtools" = @{
            type = "local"
            command = "chrome-devtools"
        }
    }
}
$configPath = "$env:USERPROFILE\.config\opencode\opencode.json"
$config | ConvertTo-Json -Depth 10 | Out-File $configPath -Encoding UTF8

# Re-seal and test
.\Seal-OpenCodeConfig.ps1 <seal parameters...>
.\Test-OpenCodePolicy.ps1 -ConfigPath ".\opencode_policy.config.v1.json"

# Expected output:
# ✓ MCP server OK: chrome-devtools
# ═══════════════════════════════════════════════════════════
#                     POLICY CHECK PASSED
# ═══════════════════════════════════════════════════════════

# Create a config with an unknown MCP server
$config.mcpServers["unknown-server"] = @{ type = "local"; command = "unknown" }
$config | ConvertTo-Json -Depth 10 | Out-File $configPath -Encoding UTF8

# Test without re-sealing (should fail on hash mismatch first)
.\Test-OpenCodePolicy.ps1 -ConfigPath ".\opencode_policy.config.v1.json"

# Expected output:
# ✗ Config hash mismatch!
# ═══════════════════════════════════════════════════════════
#            BLOCKED: Config seal verification failed
# ═══════════════════════════════════════════════════════════
```

## Test Scenario 11: Emergency Bypass (Testing Only)

```powershell
# Test emergency bypass flag (WARNING: Only for testing!)
.\Start-OpenCodeSafe.ps1 `
    -WorkRoot "C:\SintraPrime\CASES\TestProject" `
    -SkipPolicyCheck

# Expected output:
# [WARNING] ⚠ Policy checks SKIPPED (dangerous!)
# [WARNING] ⚠ This should only be used for emergency recovery
# [LAUNCH] Starting OpenCode...
```

## Cleanup Test Environment

```powershell
# Remove test files (optional)
Remove-Item "test-plan-*.json" -Force
Remove-Item "C:\SintraPrime\keys\opencode-signing.ed25519*" -Force
Remove-Item "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode\*" -Force
Remove-Item "C:\SintraPrime\_GOVERNANCE\AUDIT\OpenCode\*" -Force
```

## Expected Results Summary

| Test | Expected Result |
|------|----------------|
| Generate Keys | ✓ Keys created successfully |
| Seal Config | ✓ Seal created and verified |
| Verify Seal | ✓ Policy check passes |
| Detect Modification | ✗ BLOCKED - hash mismatch |
| Path Validation (prohibited) | ✗ BLOCKED - prohibited path |
| Path Validation (allowed) | ✓ Policy check passes |
| Command Validation (allowed) | ✓ Policy check passes |
| Command Validation (denied) | ✗ BLOCKED - denied command |
| Domain Validation (allowed) | ✓ Policy check passes |
| Domain Validation (denied) | ✗ BLOCKED - denied domain |
| Re-seal After Change | ✓ New seal verified |
| Audit Log Check | ✓ Logs created and readable |
| MCP Server (allowed) | ✓ Policy check passes |
| MCP Server (unknown) | ✗ BLOCKED - hash or server issue |
| Emergency Bypass | ⚠ Warning shown, OpenCode starts |

## Notes

- All tests should be run in a non-production environment
- Tests require Windows with OpenSSH Client installed
- Some tests intentionally create failures to validate blocking behavior
- Audit logs should be reviewed after each test
- Emergency bypass should only be used in testing or true emergencies
