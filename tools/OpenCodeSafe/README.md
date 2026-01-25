# OpenCodeSafe - Cryptographically-Enforced Policy Layer

## Overview

OpenCodeSafe implements a multi-layered security framework for OpenCode usage that prevents unauthorized execution through:

1. **Path sandbox** - Restricts file system access
2. **Command allow/deny lists** - Controls shell command execution  
3. **Network domain filtering** - Limits network access
4. **MCP server validation** - Validates Model Context Protocol servers
5. **Cryptographic config sealing** - Ensures config integrity via Ed25519 signatures

**Core Enforcement**: OpenCode cannot start unless its config file's SHA-256 hash matches a sealed record signed by an authorized operator.

## Quick Start

### First Time Setup

1. **Prerequisites**: Install OpenSSH Client, PowerShell 7+, OpenCode
2. **Generate keys**: Create Ed25519 signing key pair
3. **Initial seal**: Sign your OpenCode configuration
4. **Test**: Verify policy enforcement

See [SETUP.md](SETUP.md) for detailed setup instructions.

### Daily Usage

```powershell
# Launch OpenCode with policy enforcement
.\Start-OpenCodeSafe.ps1 -WorkRoot "C:\SintraPrime\CASES\MyProject"

# Or with a plan file
.\Start-OpenCodeSafe.ps1 -WorkRoot "C:\SintraPrime\CASES\MyProject" -PlanPath ".\plan.json"
```

## Files

- **`opencode_policy.config.v1.json`** - Policy configuration (paths, commands, domains, MCP settings)
- **`Seal-OpenCodeConfig.ps1`** - Creates cryptographic seal of OpenCode config
- **`Test-OpenCodePolicy.ps1`** - Validates policy compliance and verifies seals
- **`Start-OpenCodeSafe.ps1`** - Safe launcher with policy enforcement
- **`SETUP.md`** - Complete setup guide
- **`OPERATIONS.md`** - Day-to-day operations runbook
- **`README.md`** - This file

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Operator Action                     │
│              (wants to use OpenCode)                 │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│            Start-OpenCodeSafe.ps1                    │
│              (Safe Launcher)                         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│           Test-OpenCodePolicy.ps1                    │
│            (Policy Enforcement)                      │
├─────────────────────────────────────────────────────┤
│  1. Verify OpenCode config seal (Ed25519)    ✓      │
│  2. Check path constraints                   ✓      │
│  3. Validate commands (allow/deny)           ✓      │
│  4. Check network domains                    ✓      │
│  5. Validate MCP servers                     ✓      │
└────────────────────┬────────────────────────────────┘
                     │
          ┌──────────┴──────────┐
          │                     │
     ✗ BLOCK                ✓ ALLOW
     (Exit 2)              (Exit 0)
          │                     │
          │                     ▼
          │      ┌──────────────────────────┐
          │      │   OpenCode Launches      │
          │      │  (with sealed config)    │
          │      └──────────────────────────┘
          │
          ▼
  ┌────────────────┐
  │  Audit Log     │
  │  Entry Created │
  └────────────────┘
```

## Security Model

### Chain of Trust

1. **Ed25519 Private Key** (operator-controlled)
   - Used to sign config hashes
   - Must be kept secure (encrypted drive, restricted permissions)

2. **Allowed Signers** (public record)
   - Lists authorized public keys
   - Can be safely committed to source control

3. **Sealed Config** (hash + signature)
   - SHA-256 hash of OpenCode config
   - Signature from authorized operator
   - Stored in governance directory

4. **Policy Enforcement** (automated)
   - Verifies signature before every launch
   - Verifies hash matches current config
   - Hard block if verification fails

### Attack Prevention

| Attack Vector | Mitigation |
|--------------|------------|
| Unauthorized config modification | Cryptographic seal breaks → hard block |
| Key theft | Restricted NTFS permissions, encryption at rest |
| Key compromise | Key rotation procedure, audit trail |
| Policy bypass | Launcher enforces checks before OpenCode starts |
| Path traversal | Explicit allow/deny lists with fail-safe defaults |
| Command injection | Regex-based command filtering |
| Malicious network requests | Domain allowlist/denylist |
| Rogue MCP servers | Server type and name validation |

## Configuration Schema (v1.1)

The policy config contains:

- **`paths`** - allowed_roots and prohibited_paths
- **`commands`** - allowlist_regex, denylist_regex, require_approval_regex
- **`network`** - domain_allowlist and domain_denylist
- **`mcp`** - MCP server validation settings
- **`integrity`** - seal enforcement configuration
- **`audit`** - logging configuration

See `opencode_policy.config.v1.json` for the complete schema.

## Operational Procedures

### Creating a Seal

```powershell
.\Seal-OpenCodeConfig.ps1 `
    -OpenCodeConfigPath "$env:USERPROFILE\.config\opencode\opencode.json" `
    -SealDir "C:\SintraPrime\_GOVERNANCE\SEALS\OpenCode" `
    -PrivateKeyPath "C:\SintraPrime\keys\opencode-signing.ed25519" `
    -AllowedSignersPath "C:\SintraPrime\keys\allowed_signers" `
    -SignerIdentity "sintraprime-opencode-config" `
    -Namespace "sintraprime-opencode-config"
```

### Validating Policy

```powershell
.\Test-OpenCodePolicy.ps1 `
    -ConfigPath ".\opencode_policy.config.v1.json" `
    -WorkRoot "C:\SintraPrime\CASES\MyProject"
```

### Updating Policy

1. Edit `opencode_policy.config.v1.json`
2. Test changes with `Test-OpenCodePolicy.ps1`
3. Document change in audit logs
4. Commit to source control

### Re-sealing After Config Change

1. Review changes to OpenCode config
2. Test new config
3. Re-seal with `Seal-OpenCodeConfig.ps1`
4. Verify with `Test-OpenCodePolicy.ps1`
5. Document in audit logs

## Audit Trail

All operations are logged to `C:\SintraPrime\_GOVERNANCE\AUDIT\OpenCode\`:

- **Policy checks**: `policy_check_YYYYMMDD_HHMMSS.json`
- **Seal operations**: `seal_YYYYMMDD_HHMMSS.json`
- **Change records**: `change_YYYYMMDD_HHMMSS.json`
- **Incidents**: `incident_YYYYMMDD_HHMMSS.json`

Logs include:
- Timestamp
- Operator identity
- Operation performed
- Result (pass/fail)
- Details (hashes, paths, violations)

## Governance

### Public vs Private Artifacts

**Safe to commit** (public):
- Policy configuration
- Allowed signers file
- Public keys (.pub)
- Seal artifacts (hash + signature)
- Documentation

**Never commit** (private):
- Private keys (.ed25519 without .pub)
- Operator credentials
- Sensitive paths or patterns

### Key Rotation

Recommended annually or immediately upon:
- Suspected compromise
- Operator access changes
- Security audit recommendations

See OPERATIONS.md for key rotation procedure.

## Troubleshooting

### Common Issues

**"Config hash mismatch"**
- Config was modified without re-sealing
- Solution: Re-seal the config or restore from backup

**"Signature verification failed"**  
- Wrong key or corrupted seal
- Solution: Re-seal with correct key and parameters

**"Path in prohibited zone"**
- Work directory not in allowed roots
- Solution: Move to allowed path or update policy

**"Command DENIED"**
- Command not in allowlist or in denylist
- Solution: Use allowed command or update policy

See [OPERATIONS.md](OPERATIONS.md) for full troubleshooting guide.

## Documentation

- **[SETUP.md](SETUP.md)** - Complete setup guide with prerequisites, key generation, and initial configuration
- **[OPERATIONS.md](OPERATIONS.md)** - Day-to-day operations, change management, incident response

## Support

For issues or questions:

1. Check documentation (SETUP.md, OPERATIONS.md)
2. Review audit logs for details
3. Consult your security team for policy questions
4. File GitHub issue for bugs or feature requests

## Version

- **Schema Version**: 1.1
- **Implementation**: SintraPrime v1.0
- **Last Updated**: 2024

## License

Part of the SintraPrime project. See repository root for license information.
