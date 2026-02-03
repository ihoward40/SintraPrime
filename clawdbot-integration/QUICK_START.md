# ClawdBot Quick Start Guide

**For operators who want to get ClawdBot running quickly while maintaining governance compliance.**

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Dedicated machine or VPS (NOT your daily computer)
- [ ] Node.js 22+ installed
- [ ] Reviewed governance policies in `/docs/policy/clawdbot-agent-policy-snippets.v1.md`
- [ ] Created service accounts (NOT personal accounts) for:
  - [ ] AI providers (Anthropic/OpenAI)
  - [ ] Messaging platforms (Telegram/Discord/Slack)
  - [ ] Services (Notion/GitHub/Drive) 
- [ ] API keys ready from service accounts

## 5-Minute Installation (Guided)

### Step 1: Run Installation Script

```bash
cd clawdbot-integration
./install.sh
```

The script will:
- Check Node.js version
- Verify you're on a dedicated machine
- Guide you through installation method selection
- Set up configuration templates
- Provide next steps

### Step 2: Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit with your API keys
nano .env  # or vim, code, etc.
```

**Required variables:**
```bash
ANTHROPIC_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
CLAWDBOT_WORKSPACE=/path/to/workspace
CLAWDBOT_MODE=research  # IMPORTANT: Start in research mode
```

### Step 3: Run Onboarding

```bash
npx clawdbot onboard
```

Follow the wizard to:
- Select AI provider
- Configure chat platforms
- Set up skills
- Test basic functionality

### Step 4: Verify Installation

```bash
# Check version
npx clawdbot --version

# Run diagnostics
npx clawdbot doctor

# Check status
npx clawdbot status
```

### Step 5: Test Research Mode

```bash
# Send a test message
npx clawdbot chat "Hello, please summarize what you can do in Research Mode"
```

**Expected behavior:**
- Bot responds with capabilities
- No execute actions performed
- Logs written to configured location

## Manual Installation (Control Freaks)

### For Global Installation

```bash
# Install ClawdBot globally
npm install -g clawdbot

# Create config directory
mkdir -p ~/.clawdbot

# Copy config template
cp clawdbot-integration/.env.example ~/.clawdbot/.env

# Edit configuration
nano ~/.clawdbot/.env

# Run onboarding
clawdbot onboard --install-daemon

# Test
clawdbot chat "test message"
```

### For Local Installation

```bash
cd clawdbot-integration

# Install locally
npm install clawdbot

# Config already here (.env.example)
cp .env.example .env
nano .env

# Run onboarding
npx clawdbot onboard

# Test
npx clawdbot chat "test message"
```

### For From-Source Installation

```bash
cd clawdbot-integration

# Install pnpm if needed
npm install -g pnpm

# Clone repository
git clone https://github.com/clawdbot/clawdbot.git
cd clawdbot

# Install and build
pnpm install
pnpm build

# Configure
cp ../env.example .env
nano .env

# Run
npx clawdbot onboard
```

## Configuration Quick Reference

### Minimum Required .env

```bash
# AI Provider (pick one or both)
ANTHROPIC_API_KEY=sk-ant-xxx
# or
OPENAI_API_KEY=sk-xxx

# Mode (ALWAYS start here)
CLAWDBOT_MODE=research

# Logging (for governance)
CLAWDBOT_LOG_LEVEL=info
CLAWDBOT_LOG_FILE=/path/to/SintraPrime/runs/clawdbot/clawdbot.log
```

### Recommended .env Additions

```bash
# Workspace
CLAWDBOT_WORKSPACE=/dedicated/workspace

# Audit logging
CLAWDBOT_AUDIT_LOG=true
CLAWDBOT_AUDIT_LOG_FILE=/path/to/SintraPrime/runs/clawdbot/audit.log

# Governance
CLAWDBOT_REQUIRE_RECEIPT=true
SINTRAPRIME_RUNS_DIR=/path/to/SintraPrime/runs
```

## Messaging Platform Setup

### Telegram (Easiest)

1. Talk to [@BotFather](https://t.me/BotFather) on Telegram
2. Create a new bot: `/newbot`
3. Copy the token
4. Add to `.env`:
   ```
   TELEGRAM_BOT_TOKEN=your_token_here
   ```
5. During onboarding, scan QR code to link

### Discord

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create New Application
3. Go to Bot section → Add Bot
4. Copy token
5. Add to `.env`:
   ```
   DISCORD_BOT_TOKEN=your_token_here
   ```
6. Invite bot to your server during onboarding

### Slack

1. Go to [Slack API](https://api.slack.com/apps)
2. Create New App
3. Add Bot Token Scopes (chat:write, im:read, etc.)
4. Install to workspace
5. Copy Bot User OAuth Token
6. Add to `.env`:
   ```
   SLACK_BOT_TOKEN=xoxb-your-token
   ```

## Common Commands

```bash
# Start ClawdBot
npx clawdbot start

# Start as daemon (background)
npx clawdbot start --daemon

# Stop daemon
npx clawdbot stop

# Check status
npx clawdbot status

# Send chat message
npx clawdbot chat "your message here"

# View logs
npx clawdbot logs

# View logs (live tail)
npx clawdbot logs --follow

# Run diagnostics
npx clawdbot doctor

# Show version
npx clawdbot --version

# Show help
npx clawdbot --help
```

## Research Mode Testing

### Safe Tests (Always OK)

```bash
# Ask about capabilities
npx clawdbot chat "What can you do?"

# Request a summary
npx clawdbot chat "Summarize the README.md file"

# Draft a document
npx clawdbot chat "Draft a meeting agenda for project planning"

# Search and analyze
npx clawdbot chat "Search our docs for governance policies"
```

### What Should Work in Research Mode

✅ Browse and read files  
✅ Summarize content  
✅ Draft documents  
✅ Answer questions  
✅ Propose actions (without executing)  
✅ File and index within allowed folders  

### What Should NOT Work in Research Mode

❌ Send emails  
❌ Commit code or create PRs  
❌ Publish content  
❌ Make purchases  
❌ Modify configurations  

## Enabling Execute Mode (Advanced)

**⚠️ WARNING:** Do NOT enable Execute Mode until you've completed the governance checklist.

### Prerequisites for Execute Mode

1. ✅ Research Mode tested and working
2. ✅ Notion Execution Receipts database set up
3. ✅ Monitoring integrated with Make.com
4. ✅ All skills properly scoped and registered
5. ✅ Alert system tested
6. ✅ Compliance checklist completed

### How to Enable Execute Mode

1. **Review GOVERNANCE_COMPLIANCE.md** in full
2. **Complete all pre-Execute checklists**
3. **Change mode in .env:**
   ```bash
   CLAWDBOT_MODE=execute
   ```
4. **Restart ClawdBot**
5. **Test with low-risk action**
6. **Verify receipt generation**
7. **Monitor for 24 hours**

### Execute Mode First Action

```bash
# Example: Create a draft PR (low risk)
npx clawdbot chat "Create a draft PR for the README update"

# Verify:
# 1. Receipt created in Notion
# 2. Approval requested
# 3. Action logged
# 4. External proof captured
```

## Troubleshooting

### "Node.js version too old"

```bash
# Install Node.js 22+ via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22
node --version  # Should be 22.x.x
```

### "Cannot find module 'clawdbot'"

```bash
# If globally installed:
npm install -g clawdbot

# If locally installed:
cd clawdbot-integration
npm install clawdbot
```

### "Permission denied" errors

```bash
# Don't use sudo! Install with proper permissions
# If you must fix permissions:
sudo chown -R $USER:$USER ~/.npm
sudo chown -R $USER:$USER ~/.nvm
```

### "API key not recognized"

1. Check `.env` file exists and has correct format
2. Verify no spaces around `=`: `KEY=value` not `KEY = value`
3. Test API key manually: `curl -H "Authorization: Bearer YOUR_KEY" https://api.anthropic.com/v1/...`
4. Regenerate key if expired

### "Bot not responding"

```bash
# Check if running
npx clawdbot status

# Check logs
npx clawdbot logs

# Restart
npx clawdbot stop
npx clawdbot start

# Run diagnostics
npx clawdbot doctor
```

### "Execute actions blocked"

**This is correct behavior!**

If you're in Research Mode, execute actions SHOULD be blocked.

To proceed:
1. Verify you need Execute Mode (most tasks don't)
2. Complete governance compliance
3. Enable Execute Mode explicitly
4. Create execution receipt first

## Quick Reference: Governance Rules

### The Three Laws

1. **Isolation** - Dedicated machine/VPS only
2. **Least Privilege** - Service accounts with minimal scopes
3. **Execute Requires Consent** - Receipt + approval required

### Mode Rules

- **Research Mode (default)**: Read, summarize, draft, propose
- **Execute Mode (explicit)**: Send, commit, publish, modify

### Account Rules

- ✅ Dedicated service accounts
- ❌ Personal Gmail, iMessage, GitHub
- ❌ Banking credentials
- ❌ Admin tokens

### Skills Rules

- Each skill must be declared and scoped
- Test in dry-run mode first
- Register in skills registry
- Monitor usage and errors

## Support Resources

### Documentation

- **Full Integration Guide:** `README.md`
- **Governance Compliance:** `GOVERNANCE_COMPLIANCE.md`
- **Skills Configuration:** `SKILLS_CONFIG.md`
- **Monitoring Integration:** `MONITORING_INTEGRATION.md`

### External Resources

- **Official Docs:** https://getclawdbot.org/docs/
- **GitHub:** https://github.com/clawdbot/clawdbot
- **Community:** Discord/Slack (check official docs)

### SintraPrime Resources

- **Policy Snippets:** `/docs/policy/clawdbot-agent-policy-snippets.v1.md`
- **Pattern Brief:** `/docs/external-notes/clawdbot-pattern-brief.v1.md`
- **Governance Summary:** `/docs/AGENT_GOVERNANCE_EXECUTIVE_SUMMARY.md`

## Next Steps After Installation

1. **Test thoroughly in Research Mode** (at least 48 hours)
2. **Set up monitoring** (Make.com integration)
3. **Configure skills** (start with read-only)
4. **Document usage patterns**
5. **Only then consider Execute Mode**

## Remember

- Start in Research Mode
- Use service accounts
- Test before deploying
- Monitor continuously
- Review logs regularly
- Update compliance checklist

---

**Version:** 1.0  
**Date:** 2026-02-03  
**Purpose:** Quick start for ClawdBot installation  
**Audience:** SintraPrime operators  
**Estimated Time:** 5-15 minutes for basic setup
