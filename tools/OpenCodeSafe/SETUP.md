# OpenCodeSafe Setup Guide

## Overview

OpenCodeSafe implements a cryptographically-enforced policy layer for OpenCode that prevents unauthorized execution through multiple defense gates:

1. **Path sandbox** - Restricts file system access to approved directories
2. **Command allow/deny lists** - Controls which shell commands can be executed
3. **Network domain filtering** - Limits network access to approved domains
4. **MCP server validation** - Validates Model Context Protocol server configurations
5. **Cryptographic config sealing** - Ensures OpenCode config hasn't been tampered with

The enforcement model: **OpenCode cannot start unless its config file's SHA-256 hash matches a sealed record signed by an authorized operator using Ed25519 SSH keys**.

## Prerequisites

### Required Software

- **Windows 10/11** with OpenSSH Client
  - To install: Settings → Apps → Optional Features → Add a feature → OpenSSH Client
  - Or via PowerShell (admin): `Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0`
  
- **PowerShell 7+**
  - Download from: https://github.com/PowerShell/PowerShell/releases
  - Or install via winget: `winget install Microsoft.PowerShell`
  
- **OpenCode**
  - Ensure OpenCode is installed and the `opencode` command is in your PATH

### Verify Prerequisites

```powershell
# Check OpenSSH
ssh-keygen -V

# Check PowerShell version (should be 7.x or higher)
$PSVersionTable.PSVersion

# Check OpenCode
opencode --version
```

## One-Time Setup

### 1. Generate Ed25519 Signing Key

Generate a dedicated Ed25519 key pair for signing OpenCode configurations:

```powershell
# Create keys directory
$keysDir = "C:\SintraPrime\keys"
New-Item -ItemType Directory -Path $keysDir -Force

# Generate Ed25519 key
ssh-keygen -t ed25519 -f "$keysDir\opencode-signing.ed25519" -C "sintraprime-opencode-config" -N '""'
```

**Important**: When prompted for a passphrase, you can either:
- Press Enter twice for no passphrase (easier but less secure)
- Enter a strong passphrase (more secure, but you'll need to enter it each time you seal)

This creates two files:
- `opencode-signing.ed25519` (private key - keep secure!)
- `opencode-signing.ed25519.pub` (public key - can be shared)

### 2. Create allowed_signers File

The `allowed_signers` file tells `ssh-keygen` which public keys are authorized to sign configs:

```powershell
$keysDir = "C:\SintraPrime\keys"
$publicKey = Get-Content "$keysDir\opencode-signing.ed25519.pub"

# Create allowed_signers file
$allowedSignersContent = "sintraprime-opencode-config $publicKey"
$allowedSignersContent | Out-File -FilePath "$keysDir\allowed_signers" -Encoding ASCII
```

The format is: `<identity> <public-key>`

### 3. Set NTFS Permissions on Private Key

Restrict access to the private key so only authorized operators can use it:

```powershell
$privateKeyPath = "C:\SintraPrime\keys\opencode-signing.ed25519"

# Remove inherited permissions
icacls $privateKeyPath /inheritance:r

# Grant full control to current user only
icacls $privateKeyPath /grant:r "$env:USERNAME:(F)"

# Verify permissions
icacls $privateKeyPath
```

**Expected output**: Only your username should have access.

### 4. Register Windows Event Log Source (Optional)

This allows policy checks to write to the Windows Event Log for centralized monitoring:

```powershell
# Run as Administrator
New-EventLog -LogName Application -Source "SintraPrime-OpenCode"
```

**Note**: Requires administrator privileges. Skip this step if you don't need Windows Event Log integration.

### 5. Create Governance Directories

Create the directory structure for seals and audit logs:

```powershell
# Create governance structure
New-Item -ItemType Directory -Path "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode" -Force
New-Item -ItemType Directory -Path "C:\SintraPrime\_GOVERNANCE\AUDIT\OpenCode" -Force

# Set restrictive permissions on governance directory
icacls "C:\SintraPrime\_GOVERNANCE" /inheritance:r
icacls "C:\SintraPrime\_GOVERNANCE" /grant:r "Administrators:(OI)(CI)F"
icacls "C:\SintraPrime\_GOVERNANCE" /grant:r "$env:USERNAME:(OI)(CI)F"
```

### 6. Initial Seal of OpenCode Config

Before using OpenCodeSafe, you must seal your OpenCode configuration:

```powershell
# Navigate to OpenCodeSafe tools directory
cd C:\path\to\SintraPrime\tools\OpenCodeSafe

# Seal the OpenCode config
.\Seal-OpenCodeConfig.ps1 `
    -OpenCodeConfigPath "$env:USERPROFILE\.config\opencode\opencode.json" `
    -SealDir "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode" `
    -PrivateKeyPath "C:\SintraPrime\keys\opencode-signing.ed25519" `
    -AllowedSignersPath "C:\SintraPrime\keys\allowed_signers" `
    -SignerIdentity "sintraprime-opencode-config" `
    -Namespace "sintraprime-opencode-config"
```

**Expected output**:
```
[SEAL] Validating inputs...
[SEAL] Computing SHA256 hash of: C:\Users\admin\.config\opencode\opencode.json
[SEAL] SHA256: a1b2c3d4e5f6...
[SEAL] Writing hash to: C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode\opencode.json.sha256
[SEAL] Signing hash with Ed25519 key...
[SEAL] Signature written to: C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode\opencode.json.sha256.sig
[SEAL] Verifying signature...
[SEAL] ✓ Signature verified successfully

[SEAL] ═══════════════════════════════════════════════════
[SEAL] SEAL COMPLETE
[SEAL] ═══════════════════════════════════════════════════
```

### 7. Test Policy Enforcement

Verify that policy enforcement is working:

```powershell
# Test with a valid work directory
.\Test-OpenCodePolicy.ps1 `
    -ConfigPath ".\opencode_policy.config.v1.json" `
    -WorkRoot "C:\SintraPrime\CASES\TestProject"
```

**Expected output if successful**:
```
═══════════════════════════════════════════════════════════
         OpenCode Policy Validation (Enhanced)
═══════════════════════════════════════════════════════════

✓ Loading policy config: .\opencode_policy.config.v1.json
✓ Policy schema version: 1.1
ℹ Checking OpenCode config seal...
✓ Signature verified
✓ Config hash matches sealed hash
...
═══════════════════════════════════════════════════════════
                    POLICY CHECK PASSED
═══════════════════════════════════════════════════════════
```

### 8. Add opencode Function to PowerShell Profile

For convenience, add a function to your PowerShell profile that always uses the safe launcher:

```powershell
# Open your PowerShell profile for editing
notepad $PROFILE

# Add this function:
function opencode {
    param(
        [Parameter(Mandatory=$false)]
        [string]$WorkRoot = (Get-Location).Path,
        
        [Parameter(Mandatory=$false)]
        [string]$PlanPath
    )
    
    $launcherPath = "C:\path\to\SintraPrime\tools\OpenCodeSafe\Start-OpenCodeSafe.ps1"
    
    if ($PlanPath) {
        & pwsh -NoProfile -ExecutionPolicy Bypass $launcherPath -WorkRoot $WorkRoot -PlanPath $PlanPath
    } else {
        & pwsh -NoProfile -ExecutionPolicy Bypass $launcherPath -WorkRoot $WorkRoot
    }
}
```

After saving, reload your profile:
```powershell
. $PROFILE
```

Now you can use `opencode` from any directory, and it will automatically enforce policies.

## Key Security Notes

### Private Key Storage

**Critical**: The private key (`opencode-signing.ed25519`) is the root of trust for the entire policy system.

**Protection measures**:
1. **Encrypt the drive**: Ensure `C:\SintraPrime\keys` is on a BitLocker-encrypted volume
2. **Offline backup**: Keep an encrypted backup of the key in a secure location (encrypted USB drive, password manager, etc.)
3. **Access control**: Only authorized operators should have access to the key
4. **Never commit**: Never commit the private key to source control

### Public Material Distribution

The following can be safely committed to source control:
- `allowed_signers` file
- Policy configuration (`opencode_policy.config.v1.json`)
- Seal artifacts (hash and signature files)
- Public key (`.pub` file)

The private key must **never** be committed.

### Key Rotation Schedule

**Recommended**: Rotate signing keys annually or:
- Immediately if compromise is suspected
- When operator access changes
- As part of annual security reviews

**Rotation procedure**:
1. Generate new Ed25519 key pair
2. Update `allowed_signers` to include both old and new keys
3. Re-seal all configs with new key
4. After verification period (30 days), remove old key from `allowed_signers`
5. Securely destroy old private key

### Emergency Recovery

If the private key is lost:
1. Generate a new key pair (follow step 1 above)
2. Update `allowed_signers` with new public key
3. Re-seal OpenCode config with new key
4. Update audit logs with key rotation event

If you need to bypass policy enforcement (emergency only):
```powershell
.\Start-OpenCodeSafe.ps1 -WorkRoot "C:\path" -SkipPolicyCheck
```

**Warning**: This should only be used for emergency recovery and should be logged/reviewed.

## Verification

After setup, verify the complete chain:

```powershell
# 1. Verify key exists and has correct permissions
icacls "C:\SintraPrime\keys\opencode-signing.ed25519"

# 2. Verify seal exists
Test-Path "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode\opencode.json.sha256"
Test-Path "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode\opencode.json.sha256.sig"

# 3. Run policy check
.\Test-OpenCodePolicy.ps1 -ConfigPath ".\opencode_policy.config.v1.json"

# 4. Test launcher (dry run)
.\Start-OpenCodeSafe.ps1 -WorkRoot "C:\SintraPrime\CASES\TestProject" -WhatIf
```

## Troubleshooting

### "ssh-keygen: command not found"

Install OpenSSH Client via Windows Optional Features or run:
```powershell
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

### "Signature verification failed"

Possible causes:
1. OpenCode config has been modified without re-sealing
2. Wrong identity or namespace in verification
3. Public key in `allowed_signers` doesn't match private key used for signing

Solution: Re-seal the config with the correct key and parameters.

### "Config hash mismatch"

The OpenCode config has been modified since it was sealed. This is a **security event**.

1. Review what changed (compare with backup or git history)
2. If change was authorized, re-seal the config
3. If change was unauthorized, investigate and restore from backup

### "Policy check failed" when trying to launch

Review the policy check output for specific violations:
- Path outside allowed roots
- Command not in allowlist
- Network domain not in allowlist
- MCP server not allowlisted

Either:
1. Adjust your operation to comply with policy
2. If the policy needs updating, update the policy config and re-seal

## Next Steps

See [OPERATIONS.md](OPERATIONS.md) for day-to-day operational procedures including:
- Launching OpenCode sessions
- Re-sealing after config changes
- Reading audit logs
- Handling policy violations
