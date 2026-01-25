# OpenCodeSafe Operations Runbook

## Overview

This runbook covers day-to-day operations, change management, troubleshooting, and incident response for OpenCodeSafe.

## Daily Operations

### Launching OpenCode Sessions

#### Standard Launch

```powershell
# Navigate to your work directory
cd C:\SintraPrime\CASES\MyProject

# Launch OpenCode with policy enforcement
C:\path\to\SintraPrime\tools\OpenCodeSafe\Start-OpenCodeSafe.ps1 -WorkRoot .
```

Or, if you've added the function to your profile:
```powershell
cd C:\SintraPrime\CASES\MyProject
opencode
```

#### Launch with Plan File

```powershell
.\Start-OpenCodeSafe.ps1 -WorkRoot "C:\SintraPrime\CASES\MyProject" -PlanPath ".\plan.json"
```

#### What Happens During Launch

1. **Policy config loaded** - Reads `opencode_policy.config.v1.json`
2. **OpenCode config pinned** - Sets `OPENCODE_CONFIG` environment variable
3. **Cryptographic verification** - Validates signature and hash of OpenCode config
4. **Path validation** - Ensures WorkRoot is in allowed paths
5. **MCP validation** - Checks MCP servers against allowlist
6. **OpenCode launch** - If all checks pass, OpenCode starts

If any check fails, OpenCode will not start and you'll see a clear error message.

### Reading Audit Logs

Audit logs are written to `C:\SintraPrime\_GOVERNANCE\AUDIT\OpenCode\`.

#### View Recent Policy Checks

```powershell
$auditDir = "C:\SintraPrime\_GOVERNANCE\AUDIT\OpenCode"

# List recent audit files
Get-ChildItem $auditDir -Filter "policy_check_*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 10

# View most recent policy check
$latest = Get-ChildItem $auditDir -Filter "policy_check_*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Get-Content $latest.FullName | ConvertFrom-Json | Format-List
```

#### View Recent Seal Operations

```powershell
$auditDir = "C:\SintraPrime\_GOVERNANCE\AUDIT\OpenCode"

# List recent seal operations
Get-ChildItem $auditDir -Filter "seal_*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 10

# View most recent seal operation
$latest = Get-ChildItem $auditDir -Filter "seal_*.json" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
Get-Content $latest.FullName | ConvertFrom-Json | Format-List
```

#### Generate Audit Report

```powershell
$auditDir = "C:\SintraPrime\_GOVERNANCE\AUDIT\OpenCode"
$since = (Get-Date).AddDays(-30)

# All policy checks in last 30 days
Get-ChildItem $auditDir -Filter "policy_check_*.json" | 
    Where-Object { $_.LastWriteTime -gt $since } |
    ForEach-Object {
        $data = Get-Content $_.FullName | ConvertFrom-Json
        [PSCustomObject]@{
            Timestamp = $data.timestamp
            Operator = $data.operator
            Result = $data.result
            Blocks = $data.blocks
            Warnings = $data.warnings
            WorkRoot = $data.work_root
        }
    } | Format-Table -AutoSize
```

### Handling Policy Blocks

When a policy check blocks OpenCode from starting, follow this process:

#### 1. Review the Error Message

The policy checker provides detailed output showing exactly what failed:

```
✗ Config hash mismatch!
  Expected: a1b2c3d4e5f6...
  Current:  f6e5d4c3b2a1...
  Config may have been modified without re-sealing!

═══════════════════════════════════════════════════════════
           BLOCKED: Config seal verification failed
═══════════════════════════════════════════════════════════
```

#### 2. Identify the Root Cause

Common causes:
- **Config hash mismatch**: OpenCode config was modified without re-sealing
- **Path violation**: Trying to work in a prohibited directory
- **Command denied**: Plan contains a blocked command
- **Domain denied**: Plan includes network request to blocked domain
- **MCP server violation**: OpenCode config has unapproved MCP server

#### 3. Remediation

Choose appropriate action:

**If the operation is unauthorized:**
- Do not proceed
- Document the attempted violation
- Review with security/compliance team if needed

**If the operation is legitimate but blocked by policy:**
- Update the policy configuration (see Change Management below)
- Get approval if required
- Re-seal the config
- Retry the operation

**If the config was modified without authorization:**
- Investigate who made the change and why
- Restore from backup or git if change was malicious
- Re-seal the config after restoring
- File incident report

## Change Management

### Updating Policy Configuration

When you need to modify the policy (add allowed paths, commands, domains, etc.):

#### 1. Make the Change

```powershell
# Edit the policy config
notepad C:\path\to\SintraPrime\tools\OpenCodeSafe\opencode_policy.config.v1.json

# Example: Add a new allowed domain
# Before:
#   "domain_allowlist": ["github.com", "docs.microsoft.com"]
# After:
#   "domain_allowlist": ["github.com", "docs.microsoft.com", "pypi.org"]
```

#### 2. Validate the Change

```powershell
# Test the updated policy (without re-sealing yet)
.\Test-OpenCodePolicy.ps1 -ConfigPath ".\opencode_policy.config.v1.json"
```

**Note**: This will still verify the existing OpenCode config seal. If you're also changing the OpenCode config, you'll need to re-seal both.

#### 3. Document the Change

Create a change record:
```powershell
$changeLog = @{
    date = (Get-Date -Format "yyyy-MM-dd")
    operator = $env:USERNAME
    change_type = "policy_update"
    description = "Added pypi.org to domain allowlist"
    approval = "TICKET-123"
    files_modified = @("opencode_policy.config.v1.json")
}

$changeLog | ConvertTo-Json | Out-File "C:\SintraPrime\_GOVERNANCE\AUDIT\OpenCode\change_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
```

#### 4. Commit the Change

```powershell
# Policy configs can be committed to git
git add tools/OpenCodeSafe/opencode_policy.config.v1.json
git commit -m "Policy: Add pypi.org to domain allowlist (TICKET-123)"
git push
```

### Re-sealing OpenCode Config

**When to re-seal:**
- After any modification to `opencode.json` or `opencode.jsonc`
- When adding/removing MCP servers
- When changing OpenCode settings
- When rotating signing keys

**Re-sealing procedure:**

#### 1. Verify the Change

```powershell
# Review what changed in OpenCode config
git diff ~/.config/opencode/opencode.json

# Or compare with last known good version
Compare-Object `
    (Get-Content C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode\opencode.json.backup) `
    (Get-Content $env:USERPROFILE\.config\opencode\opencode.json)
```

#### 2. Test the New Config

Before sealing, test that the new config works:
```powershell
# Start OpenCode in a test environment
opencode --version  # or other safe command
```

#### 3. Re-seal the Config

```powershell
# Navigate to OpenCodeSafe directory
cd C:\path\to\SintraPrime\tools\OpenCodeSafe

# Backup the old seal (optional but recommended)
$sealDir = "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode"
Copy-Item "$sealDir\opencode.json.sha256" "$sealDir\opencode.json.sha256.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
Copy-Item "$sealDir\opencode.json.sha256.sig" "$sealDir\opencode.json.sha256.sig.backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"

# Seal the updated config
.\Seal-OpenCodeConfig.ps1 `
    -OpenCodeConfigPath "$env:USERPROFILE\.config\opencode\opencode.json" `
    -SealDir "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode" `
    -PrivateKeyPath "C:\SintraPrime\keys\opencode-signing.ed25519" `
    -AllowedSignersPath "C:\SintraPrime\keys\allowed_signers" `
    -SignerIdentity "sintraprime-opencode-config" `
    -Namespace "sintraprime-opencode-config"
```

#### 4. Verify the New Seal

```powershell
# Run policy check to verify seal
.\Test-OpenCodePolicy.ps1 -ConfigPath ".\opencode_policy.config.v1.json"

# Should show:
# ✓ Signature verified
# ✓ Config hash matches sealed hash
```

#### 5. Document the Re-seal

```powershell
$resealLog = @{
    date = (Get-Date -Format "yyyy-MM-dd")
    operator = $env:USERNAME
    operation = "reseal"
    config_path = "$env:USERPROFILE\.config\opencode\opencode.json"
    new_hash = (Get-Content "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode\opencode.json.sha256")
    reason = "Added new MCP server for testing"
    approval = "TICKET-124"
}

$resealLog | ConvertTo-Json | Out-File "C:\SintraPrime\_GOVERNANCE\AUDIT\OpenCode\reseal_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
```

#### 6. Test Launch

```powershell
# Test that OpenCode launches successfully with new seal
.\Start-OpenCodeSafe.ps1 -WorkRoot "C:\SintraPrime\CASES\TestProject"
```

### Adding New Operators

When a new person needs to be able to seal configs:

#### Option 1: Shared Key (Simpler)

All operators share the same private key:

1. Securely transfer the private key to the new operator
2. Ensure they set correct NTFS permissions
3. Document the operator in governance records

**Pro**: Simple, no changes needed to allowed_signers
**Con**: No accountability per operator, key compromise affects all

#### Option 2: Individual Keys (Recommended)

Each operator has their own key pair:

1. New operator generates their own Ed25519 key
   ```powershell
   ssh-keygen -t ed25519 -f "C:\SintraPrime\keys\opencode-signing-$env:USERNAME.ed25519" -C "sintraprime-opencode-config-$env:USERNAME"
   ```

2. Add their public key to allowed_signers
   ```powershell
   $publicKey = Get-Content "C:\SintraPrime\keys\opencode-signing-$env:USERNAME.ed25519.pub"
   Add-Content "C:\SintraPrime\keys\allowed_signers" "`nsintraprime-opencode-config-$env:USERNAME $publicKey"
   ```

3. They use their own key when sealing
   ```powershell
   .\Seal-OpenCodeConfig.ps1 `
       -PrivateKeyPath "C:\SintraPrime\keys\opencode-signing-$env:USERNAME.ed25519" `
       -SignerIdentity "sintraprime-opencode-config-$env:USERNAME" `
       ...
   ```

**Pro**: Per-operator accountability, individual key revocation
**Con**: More complex, requires updating allowed_signers

### Removing/Revoking Operators

When an operator leaves or their key is compromised:

#### 1. Remove from allowed_signers

```powershell
# Edit allowed_signers and remove the line for that operator
notepad "C:\SintraPrime\keys\allowed_signers"

# Or programmatically:
$identity = "sintraprime-opencode-config-olduser"
$allowedSigners = Get-Content "C:\SintraPrime\keys\allowed_signers" | Where-Object { $_ -notmatch "^$identity " }
$allowedSigners | Out-File "C:\SintraPrime\keys\allowed_signers" -Encoding ASCII
```

#### 2. Re-seal All Configs

Since the old operator's signatures are still valid (but their key is revoked), re-seal to ensure only current operators can create new seals:

```powershell
.\Seal-OpenCodeConfig.ps1 ...  # Use a current operator's key
```

#### 3. Document the Revocation

```powershell
$revocationLog = @{
    date = (Get-Date -Format "yyyy-MM-dd")
    operator = $env:USERNAME
    revoked_identity = "sintraprime-opencode-config-olduser"
    reason = "Operator left organization"
}

$revocationLog | ConvertTo-Json | Out-File "C:\SintraPrime\_GOVERNANCE\AUDIT\OpenCode\revocation_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
```

## Incident Response

### Unauthorized Config Modification Detected

**Symptoms**: Policy check reports hash mismatch

**Steps**:

1. **Stop all operations** - Do not bypass policy
   
2. **Determine what changed**:
   ```powershell
   # Compare current config with last backup
   $current = Get-FileHash "$env:USERPROFILE\.config\opencode\opencode.json"
   Write-Host "Current hash: $($current.Hash)"
   
   $sealed = Get-Content "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode\opencode.json.sha256"
   Write-Host "Sealed hash:  $sealed"
   
   # Review actual changes
   code --diff "$env:USERPROFILE\.config\opencode\opencode.json.backup" "$env:USERPROFILE\.config\opencode\opencode.json"
   ```

3. **Investigate**:
   - Who made the change? (check file timestamps, Windows event logs)
   - When was it made?
   - Was it authorized?
   - What was changed?

4. **Remediate**:
   - If unauthorized: Restore from backup
   - If authorized but unsealed: Re-seal the config
   - If malicious: Investigate further, change keys

5. **Document**:
   ```powershell
   $incidentLog = @{
       date = (Get-Date -Format "yyyy-MM-dd")
       incident_type = "unauthorized_config_modification"
       detected_by = $env:USERNAME
       details = "OpenCode config hash mismatch detected"
       resolution = "Config restored from backup and re-sealed"
       followup_required = $true
   }
   
   $incidentLog | ConvertTo-Json | Out-File "C:\SintraPrime\_GOVERNANCE\AUDIT\OpenCode\incident_$(Get-Date -Format 'yyyyMMdd_HHmmss').json"
   ```

### Key Compromise

**Symptoms**: Private key accessed by unauthorized party

**Steps**:

1. **Immediate**: Generate new key pair
   ```powershell
   ssh-keygen -t ed25519 -f "C:\SintraPrime\keys\opencode-signing.ed25519.new" -C "sintraprime-opencode-config"
   ```

2. **Update allowed_signers** with new public key
   ```powershell
   $newPublicKey = Get-Content "C:\SintraPrime\keys\opencode-signing.ed25519.new.pub"
   "sintraprime-opencode-config $newPublicKey" | Out-File "C:\SintraPrime\keys\allowed_signers" -Encoding ASCII
   ```

3. **Re-seal all configs** with new key
   ```powershell
   .\Seal-OpenCodeConfig.ps1 `
       -PrivateKeyPath "C:\SintraPrime\keys\opencode-signing.ed25519.new" `
       ...
   ```

4. **Replace old key**:
   ```powershell
   Remove-Item "C:\SintraPrime\keys\opencode-signing.ed25519" -Force
   Move-Item "C:\SintraPrime\keys\opencode-signing.ed25519.new" "C:\SintraPrime\keys\opencode-signing.ed25519"
   ```

5. **Audit**: Review all seals created with compromised key

### Emergency Bypass

**Only use in true emergencies** (system recovery, critical incident response)

```powershell
.\Start-OpenCodeSafe.ps1 -WorkRoot "C:\path" -SkipPolicyCheck
```

**Warning**: This completely bypasses all policy enforcement.

**Required**:
- Document the bypass in audit logs
- Include justification and approval
- Review all operations performed during bypass
- Re-enable policy enforcement as soon as possible

## Monitoring & Alerting

### Key Metrics to Monitor

1. **Failed policy checks** - Spike may indicate misconfiguration or attack
2. **Config modifications** - Unauthorized changes
3. **Emergency bypasses** - Should be rare
4. **Seal operations** - Unusual frequency may indicate issues

### Example Monitoring Script

```powershell
# Check for policy failures in last 24 hours
$auditDir = "C:\SintraPrime\_GOVERNANCE\AUDIT\OpenCode"
$since = (Get-Date).AddHours(-24)

$failures = Get-ChildItem $auditDir -Filter "policy_check_*.json" |
    Where-Object { $_.LastWriteTime -gt $since } |
    ForEach-Object {
        $data = Get-Content $_.FullName | ConvertFrom-Json
        if ($data.result -eq "BLOCK") { $data }
    }

if ($failures.Count -gt 0) {
    Write-Warning "Found $($failures.Count) policy check failures in last 24 hours"
    $failures | Format-List
}
```

## Backup & Recovery

### What to Backup

**Critical** (encrypted backup required):
- Private keys: `C:\SintraPrime\keys\*.ed25519` (NOT .pub files)

**Important** (can be in regular backup):
- Policy config: `opencode_policy.config.v1.json`
- Allowed signers: `C:\SintraPrime\keys\allowed_signers`
- OpenCode config: `~/.config/opencode/opencode.json`
- Seal artifacts: `C:\SintraPrime\_GOVERNANCE\SEALS\`
- Audit logs: `C:\SintraPrime\_GOVERNANCE\AUDIT\`

### Backup Procedure

```powershell
# Create backup archive
$backupDir = "C:\Backups\OpenCodeSafe\$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force

# Copy critical files (except private keys - handle separately)
Copy-Item "C:\path\to\SintraPrime\tools\OpenCodeSafe\*.json" $backupDir
Copy-Item "C:\SintraPrime\keys\allowed_signers" $backupDir
Copy-Item -Recurse "C:\SintraPrime\_GOVERNANCE" $backupDir

# Private key backup (encrypted)
# Use BitLocker To Go for USB drives or encrypted archive
```

### Recovery Procedure

If you need to restore from backup:

1. Restore files from backup
2. Verify file permissions (especially on private keys)
3. Run policy check to verify integrity
4. Test with a safe operation

## Best Practices

1. **Regular audits**: Review audit logs weekly
2. **Key rotation**: Rotate signing keys annually
3. **Principle of least privilege**: Only seal configs when necessary
4. **Documentation**: Document all policy changes and seal operations
5. **Testing**: Test policy changes in non-production first
6. **Backups**: Maintain encrypted backups of keys and configs
7. **Monitoring**: Set up automated monitoring for policy failures
8. **Training**: Ensure all operators understand the policy system

## Troubleshooting Quick Reference

| Symptom | Likely Cause | Solution |
|---------|-------------|----------|
| "Config hash mismatch" | Config modified without re-seal | Re-seal config after reviewing changes |
| "Signature verification failed" | Wrong key or corrupted seal | Re-seal with correct key |
| "Path in prohibited zone" | Working directory not allowed | Move to allowed path or update policy |
| "Command DENIED" | Command not in allowlist | Use allowed command or update policy |
| "Domain DENIED" | Network request to blocked domain | Change domain or update policy |
| "MCP server not allowlisted" | Unapproved MCP server in config | Remove server or add to allowlist |

## Support & Contact

For issues with OpenCodeSafe:

1. Check this runbook first
2. Review audit logs for details
3. Consult [SETUP.md](SETUP.md) for configuration help
4. Contact your security team for policy questions
5. File GitHub issue for bugs or feature requests
