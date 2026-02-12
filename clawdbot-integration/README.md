# ClawdBot Integration for SintraPrime

This directory contains the ClawdBot software integration for SintraPrime, implementing the governance policies defined in `/docs/policy/clawdbot-agent-policy-snippets.v1.md`.

## Overview

ClawdBot is a self-hosted AI assistant gateway with multi-platform chat integration. This integration follows SintraPrime's Three Laws:

1. **Isolation** (separate environment)
2. **Least privilege** (separate accounts, minimal scopes)
3. **Execute requires consent** (gated actions + receipts)

## Installation Status

- [x] ClawdBot integration directory created
- [x] Configuration templates prepared
- [x] Governance policies documented
- [ ] ClawdBot software installed (requires operator action)
- [ ] Environment configured
- [ ] Messaging platforms connected
- [ ] Skills installed and configured

## System Requirements

- **Node.js:** Version 22 or higher
- **OS Support:** macOS, Linux, or Windows (via WSL2)
- **Memory:** 2GB RAM minimum (8GB+ recommended)
- **Storage:** At least 500MB free
- **API Keys:** Anthropic Claude and/or OpenAI

## Installation Methods

### Option 1: Global Installation (Recommended)

Install ClawdBot globally on your system:

```bash
npm install -g clawdbot
```

Then run the onboarding wizard:

```bash
clawdbot onboard --install-daemon
```

### Option 2: Local Installation (Sandboxed)

Install ClawdBot locally in this directory:

```bash
cd clawdbot-integration
npm init -y
npm install clawdbot
npx clawdbot onboard
```

### Option 3: From Source (Development)

For development or customization:

```bash
cd clawdbot-integration
git clone https://github.com/clawdbot/clawdbot.git
cd clawdbot
pnpm install
pnpm build
npx clawdbot onboard
```

## Configuration

### Environment Variables

Create a `.env` file in this directory with the following configuration:

```bash
# AI Provider Configuration
ANTHROPIC_API_KEY=your_anthropic_key_here
OPENAI_API_KEY=your_openai_key_here

# Optional: Brave Search (for enhanced web search)
BRAVE_SEARCH_API_KEY=your_brave_search_key_here

# Workspace Configuration
CLAWDBOT_WORKSPACE=/path/to/dedicated/workspace
CLAWDBOT_MODE=research  # Start in research mode (default)

# Logging Configuration (required for governance)
CLAWDBOT_LOG_LEVEL=info
CLAWDBOT_LOG_FILE=/path/to/logs/clawdbot.log
```

### Governance Compliance Checklist

Before running ClawdBot in Execute Mode, ensure:

- [ ] **SP-AGENT-ENV-001**: Running on dedicated machine or hardened VPS
- [ ] **SP-AGENT-ACCT-002**: Using dedicated service accounts (not personal)
- [ ] **SP-AGENT-MODE-003**: Starting in Read/Research Mode
- [ ] **SP-AGENT-EXEC-004**: Execute Mode gates configured
- [ ] **SP-SKILL-GOV-005**: All skills registered and scoped
- [ ] Logging enabled and directed to SintraPrime audit trail
- [ ] Receipt generation configured for all Execute actions

## Messaging Platform Integration

### Supported Platforms

- Telegram
- WhatsApp
- Discord
- Slack
- Signal
- iMessage (macOS only)

### Setup Instructions

After running `clawdbot onboard`, you'll be guided through linking messaging accounts.

**Important:** Use dedicated accounts for the agent, NOT personal accounts (Policy SP-AGENT-ACCT-002).

## Skills and Capabilities

ClawdBot's functionality is extended through "skills". Register all skills in the governance system before enabling.

### Recommended Skills for SintraPrime Integration

1. **notion-skill** - Notion integration (read/write with proper scoping)
2. **github-skill** - GitHub operations (read-only in Research Mode)
3. **drive-skill** - Google Drive file management
4. **email-skill** - Email operations (requires Execute Mode approval)

### Skill Governance Requirements (SP-SKILL-GOV-005)

Each skill must declare:
- Purpose
- Required permissions
- Allowed targets (which repo/account/folder)
- Logging output format
- Support for dry-run/proposal mode

## Operating Modes

### Read/Research Mode (Default)

**Policy_ID:** `SP-AGENT-MODE-003`

Allowed actions:
- Browse and summarize
- Draft documents
- File/index within approved folders
- Prepare proposed actions (without executing)

Denied actions:
- Sending emails
- Committing code / opening PRs
- Publishing content
- Purchases / checkout actions

### Execute Mode (Explicit Consent Required)

**Policy_ID:** `SP-AGENT-EXEC-004`

To enable Execute Mode:

1. Create an Execution Receipt in Notion (SintraPrime Policies database)
2. Link the receipt to the specific task
3. Document approval and scope
4. Enable Execute Mode with explicit flag

Every action in Execute Mode must generate a receipt with:
- Who approved (operator ID)
- What executed (exact command/action)
- Where (account/system/repo)
- When (timestamp)
- Proof (message-id, PR link, publish URL)

## Integration with SintraPrime

### Logging Integration

Configure ClawdBot to write logs to SintraPrime's `runs/` directory:

```bash
# In ClawdBot config
{
  "logDirectory": "/path/to/SintraPrime/runs/clawdbot/",
  "logFormat": "json",
  "includeTimestamps": true,
  "includeHashes": true
}
```

### Receipt Generation

For Execute Mode actions, integrate with SintraPrime's receipt system:

```javascript
// Example receipt template
{
  "Receipt_ID": "CLAWD-{timestamp}-{action}",
  "Task": "Link to Notion task",
  "Policy": "Link to applicable policy",
  "System": "ClawdBot",
  "Action_Type": "Send/Commit/Publish/etc",
  "Target": "Specific target resource",
  "External_Proof": "Message ID / PR link / etc",
  "Approved_By": "Operator name",
  "Executed_At": "ISO timestamp"
}
```

## Security Considerations

### Environment Isolation (SP-AGENT-ENV-001)

**CRITICAL:** Do NOT run ClawdBot on your primary daily-use machine.

Recommended deployment options:
1. Dedicated Linux VPS (DigitalOcean, Linode, etc.)
2. Docker container with network restrictions
3. Separate physical machine
4. VM with Tailscale for secure access

### Network Security

- Enable firewall (UFW on Linux)
- Use private network overlay (Tailscale recommended)
- Restrict inbound connections to operator-only
- No public exposure of admin panels

### Credential Management

- Use environment variables, never hardcode keys
- Rotate API keys regularly (90-day maximum)
- Use service accounts with minimal scopes
- Store keys in secure vault (1Password, HashiCorp Vault, etc.)

## Monitoring and Alerts

### Required Monitoring

- Runtime logs: start/stop events
- Action logs: every command executed
- Error logs: failures and escalations
- Resource logs: memory, CPU, network usage

### Alert Triggers

Configure alerts for:
- Unexpected outbound traffic
- Repeated authentication failures
- File access outside sandbox
- Privilege escalation attempts
- Execute Mode actions without receipts

### Integration with Make.com

Use SintraPrime's existing Make.com automation scenarios:

1. **Runs Logger** - Monitor ClawdBot activity logs
2. **Severity Classifier** - Classify ClawdBot actions
3. **Slack Alerts** - Alert on suspicious behavior
4. **Weekly Review** - Include ClawdBot usage in weekly reports

## Troubleshooting

### Installation Issues

```bash
# Check Node.js version
node --version  # Must be 22+

# Check npm/pnpm installation
npm --version
pnpm --version

# Verify ClawdBot installation
clawdbot --version

# Run diagnostics
clawdbot doctor
```

### Common Problems

1. **Node.js version too old**
   - Solution: Install Node.js 22+ via nvm or official installer

2. **Permission denied errors**
   - Solution: Don't use sudo; install with proper user permissions

3. **API key not recognized**
   - Solution: Verify `.env` file format and key validity

4. **Messaging platform won't connect**
   - Solution: Check dedicated account setup, not personal account

## Documentation References

- **ClawdBot Pattern Brief:** `/docs/external-notes/clawdbot-pattern-brief.v1.md`
- **Policy Snippets:** `/docs/policy/clawdbot-agent-policy-snippets.v1.md`
- **Governance Index:** `/docs/governance/index.md`
- **Agent Governance Summary:** `/docs/AGENT_GOVERNANCE_EXECUTIVE_SUMMARY.md`
- **Official ClawdBot Docs:** https://getclawdbot.org/docs/

## Next Steps

1. **Review governance policies** in `/docs/policy/clawdbot-agent-policy-snippets.v1.md`
2. **Prepare dedicated environment** (VPS, VM, or separate machine)
3. **Create service accounts** for all integrations
4. **Install ClawdBot** using one of the methods above
5. **Configure environment** following the templates
6. **Test in Read/Research Mode** before enabling Execute Mode
7. **Set up monitoring and alerts**
8. **Document all configurations** in governance records

## Support

For issues specific to:
- **ClawdBot software:** See official docs or GitHub issues
- **SintraPrime governance:** Review policy documents in `/docs/policy/`
- **Integration questions:** Create an issue in this repository

---

**Version:** 1.0  
**Date:** 2026-02-03  
**Status:** Integration prepared, software installation pending operator action  
**Governance Compliance:** Follows SP-AGENT-ENV-001, SP-AGENT-ACCT-002, SP-AGENT-MODE-003, SP-AGENT-EXEC-004, SP-SKILL-GOV-005
