# OpenCodeSafe Quick Reference

## One-Time Setup Commands

```powershell
# 1. Generate signing key
ssh-keygen -t ed25519 -f "C:\SintraPrime\keys\opencode-signing.ed25519" -C "sintraprime-opencode-config"

# 2. Create allowed_signers
$publicKey = Get-Content "C:\SintraPrime\keys\opencode-signing.ed25519.pub"
"sintraprime-opencode-config $publicKey" | Out-File "C:\SintraPrime\keys\allowed_signers" -Encoding ASCII

# 3. Set key permissions
icacls "C:\SintraPrime\keys\opencode-signing.ed25519" /inheritance:r
icacls "C:\SintraPrime\keys\opencode-signing.ed25519" /grant:r "$env:USERNAME:(F)"

# 4. Create governance directories
New-Item -ItemType Directory -Path "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode" -Force
New-Item -ItemType Directory -Path "C:\SintraPrime\_GOVERNANCE\AUDIT\OpenCode" -Force

# 5. Initial seal
cd C:\path\to\SintraPrime\tools\OpenCodeSafe
.\Seal-OpenCodeConfig.ps1 `
    -OpenCodeConfigPath "$env:USERPROFILE\.config\opencode\opencode.json" `
    -SealDir "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode" `
    -PrivateKeyPath "C:\SintraPrime\keys\opencode-signing.ed25519" `
    -AllowedSignersPath "C:\SintraPrime\keys\allowed_signers" `
    -SignerIdentity "sintraprime-opencode-config" `
    -Namespace "sintraprime-opencode-config"
```

## Daily Use Commands

```powershell
# Launch OpenCode with policy enforcement
cd C:\path\to\SintraPrime\tools\OpenCodeSafe
.\Start-OpenCodeSafe.ps1 -WorkRoot "C:\SintraPrime\CASES\MyProject"

# Launch with plan file
.\Start-OpenCodeSafe.ps1 -WorkRoot "C:\SintraPrime\CASES\MyProject" -PlanPath ".\plan.json"

# Run policy check only (no launch)
.\Test-OpenCodePolicy.ps1 -ConfigPath ".\opencode_policy.config.v1.json"

# Run policy check with work root
.\Test-OpenCodePolicy.ps1 `
    -ConfigPath ".\opencode_policy.config.v1.json" `
    -WorkRoot "C:\SintraPrime\CASES\MyProject"
```

## Change Management Commands

```powershell
# After modifying OpenCode config, re-seal it:
.\Seal-OpenCodeConfig.ps1 `
    -OpenCodeConfigPath "$env:USERPROFILE\.config\opencode\opencode.json" `
    -SealDir "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode" `
    -PrivateKeyPath "C:\SintraPrime\keys\opencode-signing.ed25519" `
    -AllowedSignersPath "C:\SintraPrime\keys\allowed_signers" `
    -SignerIdentity "sintraprime-opencode-config" `
    -Namespace "sintraprime-opencode-config"

# Verify new seal
.\Test-OpenCodePolicy.ps1 -ConfigPath ".\opencode_policy.config.v1.json"

# View current sealed hash
Get-Content "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode\opencode.json.sha256"

# View current config hash
(Get-FileHash "$env:USERPROFILE\.config\opencode\opencode.json" -Algorithm SHA256).Hash.ToLower()
```

## Audit & Monitoring Commands

```powershell
# View recent policy checks
$auditDir = "C:\SintraPrime\_GOVERNANCE\AUDIT\OpenCode"
Get-ChildItem $auditDir -Filter "policy_check_*.json" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 10

# View most recent policy check
$latest = Get-ChildItem $auditDir -Filter "policy_check_*.json" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 1
Get-Content $latest.FullName | ConvertFrom-Json | Format-List

# View recent seal operations
Get-ChildItem $auditDir -Filter "seal_*.json" | 
    Sort-Object LastWriteTime -Descending | 
    Select-Object -First 10

# Generate audit report (last 30 days)
$since = (Get-Date).AddDays(-30)
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
        }
    } | Format-Table -AutoSize

# Count failures in last 24 hours
$since = (Get-Date).AddHours(-24)
$failures = Get-ChildItem $auditDir -Filter "policy_check_*.json" |
    Where-Object { $_.LastWriteTime -gt $since } |
    ForEach-Object {
        $data = Get-Content $_.FullName | ConvertFrom-Json
        if ($data.result -eq "BLOCK") { $data }
    }
Write-Host "Failures in last 24h: $($failures.Count)" -ForegroundColor $(if ($failures.Count -eq 0) { "Green" } else { "Red" })
```

## Troubleshooting Commands

```powershell
# Check if seal files exist
Test-Path "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode\opencode.json.sha256"
Test-Path "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode\opencode.json.sha256.sig"

# Check key permissions
icacls "C:\SintraPrime\keys\opencode-signing.ed25519"

# Manually verify signature
Get-Content "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode\opencode.json.sha256" | 
    ssh-keygen -Y verify `
        -f "C:\SintraPrime\keys\allowed_signers" `
        -I "sintraprime-opencode-config" `
        -n "sintraprime-opencode-config" `
        -s "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode\opencode.json.sha256.sig"

# Compare hashes
Write-Host "Sealed hash:"
Get-Content "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode\opencode.json.sha256"
Write-Host "`nCurrent config hash:"
(Get-FileHash "$env:USERPROFILE\.config\opencode\opencode.json" -Algorithm SHA256).Hash.ToLower()

# View OpenCode config location
$env:OPENCODE_CONFIG

# Check OpenSSH version
ssh-keygen -V

# Test script syntax
pwsh -NoProfile -ExecutionPolicy Bypass -Command "
    Get-Command .\Seal-OpenCodeConfig.ps1
    Get-Command .\Test-OpenCodePolicy.ps1
    Get-Command .\Start-OpenCodeSafe.ps1
"
```

## Emergency Commands

```powershell
# Emergency bypass (DANGEROUS - use only in emergencies)
.\Start-OpenCodeSafe.ps1 -WorkRoot "C:\path" -SkipPolicyCheck

# Restore config from backup
Copy-Item "C:\Backups\opencode.json" "$env:USERPROFILE\.config\opencode\opencode.json" -Force

# Generate new key (after compromise)
ssh-keygen -t ed25519 -f "C:\SintraPrime\keys\opencode-signing.ed25519.new" -C "sintraprime-opencode-config"

# Update allowed_signers with new key
$newPublicKey = Get-Content "C:\SintraPrime\keys\opencode-signing.ed25519.new.pub"
"sintraprime-opencode-config $newPublicKey" | Out-File "C:\SintraPrime\keys\allowed_signers" -Encoding ASCII

# Re-seal with new key
.\Seal-OpenCodeConfig.ps1 `
    -OpenCodeConfigPath "$env:USERPROFILE\.config\opencode\opencode.json" `
    -SealDir "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode" `
    -PrivateKeyPath "C:\SintraPrime\keys\opencode-signing.ed25519.new" `
    -AllowedSignersPath "C:\SintraPrime\keys\allowed_signers" `
    -SignerIdentity "sintraprime-opencode-config" `
    -Namespace "sintraprime-opencode-config"

# Replace old key
Remove-Item "C:\SintraPrime\keys\opencode-signing.ed25519" -Force
Move-Item "C:\SintraPrime\keys\opencode-signing.ed25519.new" "C:\SintraPrime\keys\opencode-signing.ed25519"
```

## Policy Update Commands

```powershell
# Edit policy config
notepad C:\path\to\SintraPrime\tools\OpenCodeSafe\opencode_policy.config.v1.json

# Test policy changes
.\Test-OpenCodePolicy.ps1 -ConfigPath ".\opencode_policy.config.v1.json"

# Commit policy changes
cd C:\path\to\SintraPrime
git add tools/OpenCodeSafe/opencode_policy.config.v1.json
git commit -m "Policy: <description of change>"
git push
```

## Backup Commands

```powershell
# Backup critical files
$backupDir = "C:\Backups\OpenCodeSafe\$(Get-Date -Format 'yyyyMMdd')"
New-Item -ItemType Directory -Path $backupDir -Force

# Backup policy and configs (safe to backup)
Copy-Item "C:\path\to\SintraPrime\tools\OpenCodeSafe\*.json" $backupDir
Copy-Item "C:\SintraPrime\keys\allowed_signers" $backupDir
Copy-Item -Recurse "C:\SintraPrime\_GOVERNANCE\SEALS" $backupDir

# Backup private key (ENCRYPT THIS!)
# DO NOT store unencrypted private keys in regular backups
# Use BitLocker, encrypted USB, or password manager
```

## Information Commands

```powershell
# Show file sizes
Get-ChildItem C:\path\to\SintraPrime\tools\OpenCodeSafe | 
    Select-Object Name, @{Name="Size";Expression={"{0:N2} KB" -f ($_.Length / 1KB)}}

# Show policy schema version
$policy = Get-Content ".\opencode_policy.config.v1.json" | ConvertFrom-Json
Write-Host "Schema version: $($policy.schema_version)"

# Count allowed domains
$policy.network.domain_allowlist.Count

# Count allowed commands
$policy.commands.allowlist_regex.Count

# List MCP servers in config
$opencodeConfig = Get-Content "$env:USERPROFILE\.config\opencode\opencode.json" | ConvertFrom-Json
$opencodeConfig.mcpServers.PSObject.Properties.Name
```

## Path Aliases (Add to PowerShell Profile)

```powershell
# Add to $PROFILE
$OpenCodeSafePath = "C:\path\to\SintraPrime\tools\OpenCodeSafe"

function opencode-seal {
    & "$OpenCodeSafePath\Seal-OpenCodeConfig.ps1" `
        -OpenCodeConfigPath "$env:USERPROFILE\.config\opencode\opencode.json" `
        -SealDir "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode" `
        -PrivateKeyPath "C:\SintraPrime\keys\opencode-signing.ed25519" `
        -AllowedSignersPath "C:\SintraPrime\keys\allowed_signers" `
        -SignerIdentity "sintraprime-opencode-config" `
        -Namespace "sintraprime-opencode-config"
}

function opencode-check {
    & "$OpenCodeSafePath\Test-OpenCodePolicy.ps1" `
        -ConfigPath "$OpenCodeSafePath\opencode_policy.config.v1.json" @args
}

function opencode {
    param([string]$WorkRoot = (Get-Location).Path)
    & "$OpenCodeSafePath\Start-OpenCodeSafe.ps1" -WorkRoot $WorkRoot
}

# Usage:
# opencode-seal        # Seal current config
# opencode-check       # Run policy check
# opencode             # Launch OpenCode in current directory
# opencode -WorkRoot "C:\SintraPrime\CASES\Project1"  # Launch in specific directory
```
