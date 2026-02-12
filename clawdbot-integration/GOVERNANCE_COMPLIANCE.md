# ClawdBot Governance Compliance Guide

This document provides a comprehensive checklist for ensuring ClawdBot installation and operation complies with SintraPrime governance policies.

## Pre-Installation Compliance Checklist

### Environment Isolation (Policy SP-AGENT-ENV-001)

- [ ] **Dedicated Environment Secured**
  - [ ] Running on dedicated machine OR hardened VPS
  - [ ] NOT running on primary daily-use machine
  - [ ] Host firewall enabled (UFW, iptables, etc.)
  - [ ] Private network overlay configured (Tailscale recommended)
  - [ ] Inbound exposure restricted (VPN-only or allowlist)
  
- [ ] **Environment Documented**
  - [ ] Host name recorded
  - [ ] Instance ID recorded (if cloud)
  - [ ] OS version documented
  - [ ] Container IDs recorded (if using Docker)
  - [ ] Network access method documented

- [ ] **Security Baseline**
  - [ ] Firewall rules reviewed and documented
  - [ ] SSH key-based authentication only
  - [ ] Automatic security updates enabled
  - [ ] Exposed ports list documented
  - [ ] Backup strategy in place

### Account Separation (Policy SP-AGENT-ACCT-002)

- [ ] **Service Accounts Created**
  - [ ] Dedicated email account (NOT personal Gmail)
  - [ ] Dedicated Slack/Telegram/Discord accounts
  - [ ] Dedicated GitHub account (if needed)
  - [ ] Dedicated Notion account (if needed)
  - [ ] Dedicated Google Drive account (if needed)

- [ ] **Permissions Scoped**
  - [ ] Each account has minimal required permissions
  - [ ] Read-only access where possible
  - [ ] No admin-level tokens for routine tasks
  - [ ] Rotatable API keys configured
  - [ ] Token expiration dates set

- [ ] **Accounts Documented**
  - [ ] Account registry created
  - [ ] Service account IDs recorded
  - [ ] Roles and scopes documented
  - [ ] Token issuance dates recorded
  - [ ] Rotation schedule established (90 days max)

### Denied Accounts Verification

Verify that ClawdBot does NOT have access to:
- [ ] Personal iMessage
- [ ] Main personal Gmail
- [ ] Banking credentials
- [ ] Primary identity accounts
- [ ] Admin-level organizational accounts

## Installation Compliance

### Installation Method Selection

- [ ] **Method Chosen:**
  - [ ] Global installation (`npm install -g clawdbot`)
  - [ ] Local installation (sandboxed in clawdbot-integration/)
  - [ ] From source (for development/customization)

- [ ] **Dependencies Verified**
  - [ ] Node.js 22+ installed
  - [ ] npm/pnpm available
  - [ ] Git installed (if from source)
  - [ ] 500MB+ free storage available
  - [ ] 2GB+ RAM available

### Configuration Compliance

- [ ] **Environment Variables Configured**
  - [ ] `.env` file created from `.env.example`
  - [ ] API keys from dedicated service accounts only
  - [ ] Workspace path points to dedicated location
  - [ ] Starting mode set to `research` (not `execute`)
  - [ ] Logging enabled and configured

- [ ] **Logging Configuration**
  - [ ] Log level set (info recommended)
  - [ ] Log file path configured
  - [ ] JSON format enabled for structured logging
  - [ ] Logs directed to SintraPrime runs/ directory
  - [ ] Audit logging enabled separately
  - [ ] Log retention policy set (90 days recommended)

## Operational Compliance

### Read/Research Mode (Default) - Policy SP-AGENT-MODE-003

- [ ] **Mode Configuration**
  - [ ] `CLAWDBOT_MODE=research` in environment
  - [ ] Research mode verified on startup
  - [ ] Execute actions explicitly disabled

- [ ] **Allowed Actions Verified**
  - [ ] Can browse and summarize ✓
  - [ ] Can draft documents ✓
  - [ ] Can file/index in approved folders ✓
  - [ ] Can prepare proposed actions ✓

- [ ] **Denied Actions Verified**
  - [ ] Cannot send emails ✗
  - [ ] Cannot commit code or open PRs ✗
  - [ ] Cannot publish content ✗
  - [ ] Cannot make purchases ✗
  - [ ] Cannot modify production configs ✗

### Execute Mode Gates (Policy SP-AGENT-EXEC-004)

**DO NOT enable Execute Mode until:**

- [ ] **Notion Integration Configured**
  - [ ] SintraPrime Policies database created
  - [ ] Execution Receipts database created
  - [ ] Gate_Status formula configured
  - [ ] Receipt_Completeness formula configured

- [ ] **Receipt System Ready**
  - [ ] Receipt template documented
  - [ ] Receipt fields defined
  - [ ] External proof capture method established
  - [ ] Approval workflow documented

- [ ] **Execute Mode Policy Understood**
  - [ ] Policy SP-AGENT-EXEC-004 reviewed
  - [ ] Every action requires receipt
  - [ ] Approval process documented
  - [ ] Revert procedures established

### Execute Mode Pre-Approval Checklist

Before EACH execute action:

- [ ] **Receipt Created**
  - [ ] Receipt_ID generated
  - [ ] Task linked
  - [ ] Policy linked
  - [ ] System set to "ClawdBot"
  - [ ] Action_Type specified
  - [ ] Target specified
  - [ ] Approved_By documented
  - [ ] Approved_At timestamp recorded

- [ ] **Gate Checks Passed**
  - [ ] Policy_Link populated
  - [ ] Receipt linked
  - [ ] Gate_Status = "READY"
  - [ ] No blocking reasons

- [ ] **Scope Verified**
  - [ ] Action within Pre-Approved Action Envelope (PAE)
  - [ ] Target account/resource verified
  - [ ] Timeframe appropriate
  - [ ] Reversible or has undo plan

### Skills Governance (Policy SP-SKILL-GOV-005)

For EACH skill enabled:

- [ ] **Skill Declaration Complete**
  - [ ] Purpose documented
  - [ ] Required permissions listed
  - [ ] Allowed targets specified
  - [ ] Logging output format defined
  - [ ] Dry-run mode supported

- [ ] **Skill Registered**
  - [ ] Added to skills registry
  - [ ] Version recorded
  - [ ] Scopes documented
  - [ ] Owner/maintainer assigned

- [ ] **Skill Tested**
  - [ ] Dry-run mode tested
  - [ ] Logging output verified
  - [ ] Failure handling verified
  - [ ] Scope boundaries tested

### Denied Skills

Verify these skills are NOT enabled without explicit approval:
- [ ] Banking/payment skills
- [ ] Mass email/messaging skills
- [ ] Admin-level GitHub operations
- [ ] Database deletion operations
- [ ] Broad file system access

## Monitoring and Alerting Compliance

### Logging Integration

- [ ] **SintraPrime Integration**
  - [ ] Logs writing to `runs/clawdbot/` directory
  - [ ] JSON format for structured parsing
  - [ ] Timestamps included in all logs
  - [ ] Hashes generated for audit trail

- [ ] **Log Categories**
  - [ ] Runtime logs (start/stop)
  - [ ] Action logs (every command)
  - [ ] Error logs (failures)
  - [ ] Audit logs (sensitive operations)

### Alert Configuration

- [ ] **Make.com Integration**
  - [ ] Webhook URL configured
  - [ ] Runs Logger scenario connected
  - [ ] Severity Classifier scenario connected
  - [ ] Slack Alerts scenario connected
  - [ ] Weekly Review scenario connected

- [ ] **Alert Triggers Set**
  - [ ] Unexpected outbound traffic
  - [ ] Repeated authentication failures
  - [ ] File access outside sandbox
  - [ ] Privilege escalation attempts
  - [ ] Execute Mode without receipts
  - [ ] Memory/CPU anomalies

### Incident Response

- [ ] **Escalation Path Documented**
  - [ ] Primary contact identified
  - [ ] Backup contact identified
  - [ ] Alert channels configured (Slack/Telegram)
  - [ ] Incident log template ready
  - [ ] Freeze procedure documented

- [ ] **Auto-Disable Triggers**
  - [ ] Suspicious behavior detection enabled
  - [ ] Credential rotation procedure ready
  - [ ] Session revocation method tested
  - [ ] Evidence bundle capture tested

## Post-Installation Verification

### Installation Test

- [ ] **Basic Functionality**
  - [ ] `clawdbot --version` works
  - [ ] `clawdbot doctor` passes
  - [ ] `clawdbot status` shows correct state
  - [ ] Logs are being written

- [ ] **Research Mode Test**
  - [ ] Can respond to basic queries
  - [ ] Can browse and summarize
  - [ ] Can draft documents
  - [ ] Execute actions properly blocked

### Security Verification

- [ ] **Environment Check**
  - [ ] Running on correct machine/VPS
  - [ ] Firewall active
  - [ ] Private network functioning
  - [ ] No public exposure

- [ ] **Account Check**
  - [ ] Service accounts in use
  - [ ] No personal accounts connected
  - [ ] API keys from correct accounts
  - [ ] Permissions are minimal

- [ ] **Logging Check**
  - [ ] Logs writing correctly
  - [ ] Audit logs separate
  - [ ] Retention policy active
  - [ ] Make.com receiving data

## Ongoing Compliance

### Weekly Reviews

- [ ] **Activity Review**
  - [ ] Log volume checked
  - [ ] Error rate reviewed
  - [ ] Alert frequency assessed
  - [ ] Usage patterns analyzed

- [ ] **Compliance Review**
  - [ ] No personal accounts added
  - [ ] No scope creep detected
  - [ ] All execute actions have receipts
  - [ ] No blocked actions succeeded

### Monthly Reviews

- [ ] **Security Review**
  - [ ] API keys rotated (if 90+ days)
  - [ ] Firewall rules reviewed
  - [ ] Access logs reviewed
  - [ ] Permissions revalidated

- [ ] **Documentation Review**
  - [ ] Account registry updated
  - [ ] Skills registry updated
  - [ ] Policy compliance verified
  - [ ] Incident log reviewed

### Quarterly Reviews

- [ ] **Comprehensive Audit**
  - [ ] All policies re-reviewed
  - [ ] Environment hardening re-verified
  - [ ] Backup/restore tested
  - [ ] Disaster recovery plan updated

## Compliance Sign-Off

**Installation Completed By:** ___________________________  
**Date:** ___________________________  
**Environment:** ___________________________  
**Node.js Version:** ___________________________  
**ClawdBot Version:** ___________________________  

### Governance Policies Acknowledged

- [ ] SP-AGENT-ENV-001 (Environment Isolation Required)
- [ ] SP-AGENT-ACCT-002 (Least Privilege + Separate Accounts)
- [ ] SP-AGENT-MODE-003 (Two-Mode Operations)
- [ ] SP-AGENT-EXEC-004 (Execute Mode Requires Consent)
- [ ] SP-SKILL-GOV-005 (Skill Bus Governance)

**Operator Signature:** ___________________________  
**Date:** ___________________________

---

**Version:** 1.0  
**Last Updated:** 2026-02-03  
**Status:** Active governance compliance checklist  
**Review Frequency:** Update with each ClawdBot version upgrade or policy change
