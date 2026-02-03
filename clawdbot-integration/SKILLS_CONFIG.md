# ClawdBot Skills Configuration for SintraPrime

This document describes how to configure and register ClawdBot skills in compliance with Policy SP-SKILL-GOV-005.

## Skills Overview

ClawdBot's functionality is extended through "skills" - modular capabilities that connect to external services and perform specific actions.

## Skill Governance Requirements (SP-SKILL-GOV-005)

Every skill MUST declare:
1. **Purpose** - What the skill does
2. **Required permissions** - What access it needs
3. **Allowed targets** - Which resources it can access
4. **Logging output format** - How actions are recorded
5. **Dry-run support** - Whether it supports proposal mode

## Recommended Skills for SintraPrime

### 1. Notion Skill

**Purpose:** Integration with Notion for database reads/writes

**Configuration:**
```json
{
  "skill": "notion",
  "version": "1.0.0",
  "permissions": {
    "read": ["databases", "pages"],
    "write": ["page_properties", "page_content"]
  },
  "allowed_targets": {
    "databases": [
      "SintraPrime Policies",
      "Execution Receipts",
      "Agent Task Queue"
    ]
  },
  "mode_restrictions": {
    "research": ["read"],
    "execute": ["read", "write"]
  },
  "dry_run_supported": true,
  "logging": {
    "format": "json",
    "fields": ["action", "target", "timestamp", "result"]
  }
}
```

**Setup:**
1. Create dedicated Notion integration (service account)
2. Grant minimal permissions (specific databases only)
3. Configure in `.env`:
   ```
   NOTION_API_KEY=secret_xxx
   NOTION_RECEIPTS_DATABASE_ID=xxx
   NOTION_POLICIES_DATABASE_ID=xxx
   ```

**Policy Compliance:**
- ✓ SP-AGENT-ACCT-002: Uses dedicated service account
- ✓ SP-AGENT-MODE-003: Read-only in Research Mode
- ✓ SP-AGENT-EXEC-004: Writes require Execute Mode + Receipt
- ✓ SP-SKILL-GOV-005: Fully declared and scoped

### 2. GitHub Skill

**Purpose:** GitHub repository operations (read code, create PRs)

**Configuration:**
```json
{
  "skill": "github",
  "version": "1.0.0",
  "permissions": {
    "read": ["repos", "code", "issues", "prs"],
    "write": ["branches", "prs", "comments"]
  },
  "allowed_targets": {
    "repos": [
      "ihoward40/SintraPrime"
    ],
    "operations": {
      "research": ["read"],
      "execute": ["read", "create_branch", "create_pr", "comment"]
    }
  },
  "mode_restrictions": {
    "research": ["read"],
    "execute": ["read", "write"]
  },
  "dry_run_supported": true,
  "logging": {
    "format": "json",
    "fields": ["action", "repo", "pr_number", "commit_sha", "timestamp"]
  }
}
```

**Setup:**
1. Create GitHub PAT (Personal Access Token) with minimal scopes
2. Use dedicated GitHub account for agent
3. Configure in `.env`:
   ```
   GITHUB_TOKEN=ghp_xxx
   GITHUB_ALLOWED_REPOS=ihoward40/SintraPrime
   ```

**Policy Compliance:**
- ✓ SP-AGENT-ACCT-002: Dedicated GitHub account
- ✓ SP-AGENT-MODE-003: Read-only in Research Mode
- ✓ SP-AGENT-EXEC-004: PR creation requires Execute Mode
- ✓ SP-SKILL-GOV-005: Fully declared and scoped

### 3. Google Drive Skill

**Purpose:** File management in Google Drive

**Configuration:**
```json
{
  "skill": "drive",
  "version": "1.0.0",
  "permissions": {
    "read": ["files", "folders"],
    "write": ["files", "folders"]
  },
  "allowed_targets": {
    "folders": [
      "SintraPrime Evidence Vault",
      "Agent Workspace"
    ]
  },
  "mode_restrictions": {
    "research": ["read", "list"],
    "execute": ["read", "write", "create"]
  },
  "dry_run_supported": true,
  "logging": {
    "format": "json",
    "fields": ["action", "file_id", "file_name", "folder", "timestamp"]
  }
}
```

**Setup:**
1. Create Google service account
2. Grant access to specific folders only
3. Configure in `.env`:
   ```
   GOOGLE_SERVICE_ACCOUNT_KEY=/path/to/service-account.json
   DRIVE_ALLOWED_FOLDERS=folder_id_1,folder_id_2
   ```

**Policy Compliance:**
- ✓ SP-AGENT-ACCT-002: Service account with minimal scopes
- ✓ SP-AGENT-MODE-003: Read/list only in Research Mode
- ✓ SP-AGENT-EXEC-004: Writes require Execute Mode
- ✓ SP-SKILL-GOV-005: Fully declared and scoped

### 4. Email Skill (Gmail)

**Purpose:** Send emails (high-risk, requires strict governance)

**Configuration:**
```json
{
  "skill": "email",
  "version": "1.0.0",
  "permissions": {
    "read": ["inbox", "labels"],
    "write": ["send", "draft"]
  },
  "allowed_targets": {
    "accounts": [
      "agent@sintraprime.example.com"
    ],
    "restrictions": {
      "no_external_recipients": false,
      "require_approval": true,
      "max_recipients": 10
    }
  },
  "mode_restrictions": {
    "research": ["read", "draft"],
    "execute": ["read", "draft", "send"]
  },
  "dry_run_supported": true,
  "logging": {
    "format": "json",
    "fields": ["action", "to", "subject", "message_id", "timestamp"]
  }
}
```

**Setup:**
1. Create dedicated Gmail account (NOT personal)
2. Use OAuth2 with minimal scopes
3. Configure in `.env`:
   ```
   GMAIL_SERVICE_ACCOUNT_KEY=/path/to/gmail-service-account.json
   GMAIL_ALLOWED_ACCOUNT=agent@sintraprime.example.com
   ```

**Policy Compliance:**
- ✓ SP-AGENT-ACCT-002: Dedicated email account
- ✓ SP-AGENT-MODE-003: Draft-only in Research Mode
- ✓ SP-AGENT-EXEC-004: Sending requires Execute Mode + Receipt
- ✓ SP-SKILL-GOV-005: Fully declared and scoped

**WARNING:** Email is high-risk. Every send action MUST:
- Have an Execution Receipt
- Be approved by operator
- Log message-id as external proof
- Be within approved communication scope

## Denied Skills (Require Explicit Approval)

These skills should NOT be enabled without explicit governance approval:

### ❌ Banking/Payment Skills
- Direct bank account access
- Payment processing
- Cryptocurrency transactions
- **Reason:** Financial risk, irreversible actions

### ❌ Mass Communication Skills
- Bulk email/SMS sending
- Social media posting
- **Reason:** Reputation risk, spam potential

### ❌ Admin-Level Operations
- User management
- Permission changes
- Database schema modifications
- **Reason:** Security risk, privilege escalation

### ❌ Destructive Operations
- File/database deletion
- Repository deletion
- Account closure
- **Reason:** Data loss risk, irreversible

## Skill Registration Process

For each new skill:

1. **Declare Skill** - Fill out skill configuration template
2. **Document Scope** - List exact resources and permissions
3. **Add to Registry** - Update skills registry (see below)
4. **Test Dry-Run** - Verify proposal mode works
5. **Test Research Mode** - Verify read-only operations
6. **Document in Notion** - Add to Policies database
7. **Enable in ClawdBot** - Add to configuration

## Skills Registry

Create a skills registry file: `skills-registry.json`

```json
{
  "registry_version": "1.0.0",
  "skills": [
    {
      "skill_id": "notion-v1",
      "name": "Notion Integration",
      "version": "1.0.0",
      "status": "enabled",
      "policy_id": "SP-SKILL-GOV-005",
      "owner": "operator@sintraprime.example.com",
      "enabled_date": "2026-02-03",
      "last_reviewed": "2026-02-03",
      "config_file": "skills/notion.config.json"
    },
    {
      "skill_id": "github-v1",
      "name": "GitHub Integration",
      "version": "1.0.0",
      "status": "enabled",
      "policy_id": "SP-SKILL-GOV-005",
      "owner": "operator@sintraprime.example.com",
      "enabled_date": "2026-02-03",
      "last_reviewed": "2026-02-03",
      "config_file": "skills/github.config.json"
    }
  ]
}
```

## Skill Monitoring

### Required Metrics

For each skill, monitor:
- **Usage count** - How many times invoked
- **Success rate** - Percentage of successful operations
- **Error rate** - Failures per hour/day
- **Response time** - Average operation duration
- **Scope violations** - Attempts outside allowed targets

### Alert Triggers

Configure alerts for:
- Repeated failures (>5 in 10 minutes)
- Scope violations (any attempt outside allowed targets)
- Unusual volume (>10x normal usage)
- New skill enabled without approval
- Skill attempting Execute Mode without receipt

### Integration with Make.com

Add skill metrics to existing scenarios:
1. **Runs Logger** - Log all skill invocations
2. **Severity Classifier** - Flag high-risk skill actions
3. **Slack Alerts** - Alert on skill anomalies
4. **Weekly Review** - Include skill usage statistics

## Skill Testing Checklist

Before enabling a skill in production:

- [ ] Configuration documented
- [ ] Dry-run mode tested
- [ ] Research Mode tested (read-only operations)
- [ ] Execute Mode gated correctly
- [ ] Logging format verified
- [ ] Scope boundaries tested (attempt denied operation)
- [ ] Error handling tested
- [ ] Receipt generation tested (Execute Mode)
- [ ] Monitoring integrated
- [ ] Alerts configured
- [ ] Documentation in Notion Policies database
- [ ] Skills registry updated

## Skill Lifecycle

### Adding a New Skill

1. Research skill requirements
2. Complete configuration template
3. Test in isolated environment
4. Document in SKILLS_CONFIG.md (this file)
5. Add to skills registry
6. Enable in development mode
7. Test thoroughly
8. Get operator approval
9. Enable in production
10. Monitor for 48 hours

### Updating an Existing Skill

1. Document changes needed
2. Create new version config
3. Test in development
4. Create migration plan if needed
5. Update skills registry
6. Deploy to production
7. Monitor for regressions

### Disabling a Skill

1. Document reason for disabling
2. Create execution receipt (if mid-task)
3. Disable in ClawdBot config
4. Update skills registry (status: "disabled")
5. Archive configuration
6. Document in Notion

## Troubleshooting

### Skill Not Working

1. Check configuration syntax
2. Verify credentials/API keys
3. Test API access manually
4. Review logs for errors
5. Check scope/permissions
6. Verify mode restrictions

### Scope Violations

1. Review skill configuration
2. Check allowed_targets
3. Verify request matches scope
4. Update configuration if legitimate
5. Block if malicious

### Performance Issues

1. Check API rate limits
2. Review response times
3. Optimize requests
4. Consider caching
5. Add retry logic

## References

- **Policy:** `/docs/policy/clawdbot-agent-policy-snippets.v1.md` (SP-SKILL-GOV-005)
- **Integration README:** `/clawdbot-integration/README.md`
- **Compliance Guide:** `/clawdbot-integration/GOVERNANCE_COMPLIANCE.md`

---

**Version:** 1.0  
**Date:** 2026-02-03  
**Status:** Skills configuration guide for ClawdBot integration  
**Compliance:** Follows SP-SKILL-GOV-005 (Skill Bus Governance)
