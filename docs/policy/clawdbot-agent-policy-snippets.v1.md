# SintraPrime Policy Snippets — ClawdBot Pattern Adoption

This document defines governance policies for adopting ClawdBot-style agent patterns within SintraPrime. These policies enforce isolation, least privilege, and gated execution to enable 24/7 delegated labor without operational risk.

---

## Policy Snippet 1 — Environment Isolation Required

**Policy_ID:** `SP-AGENT-ENV-001`

**Applies_To:** All autonomous/remote-controlled agents (ClawdBot-style), including any "computer control" gateways, bots reachable via chat apps, and any agent with access to files/accounts.

### Allowed:

- Deploy agents on a **dedicated machine** or **hardened VPS**
- Containerization (Docker) and service separation
- Private network access (e.g., Tailscale) for operator-only control
- Restricted inbound exposure (VPN-only / allowlist-only)

### Denied:

- Running the agent on your **primary daily-use machine**
- Publicly exposed admin panels without hardening + allowlists
- Direct access to personal folders outside the agent sandbox

### Logging Requirements:

- Environment record: host name, instance ID, OS, container IDs, network access method
- Security baseline checklist logged (firewall enabled, private network enabled, exposed ports list)
- Agent runtime logs retained (start/stop events, version hashes, config hash)

### Failure Handling:

- Auto-disable agent access if suspicious behavior detected (unexpected outbound traffic, repeated auth failures, file access outside sandbox)
- Rotate credentials + revoke sessions immediately
- Snapshot logs + preserve evidence bundle for review

### Escalation Path:

1. Operator notification (Slack/Telegram) → "SECURITY ALERT"
2. Freeze: disable agent + cut network access
3. Review: generate incident summary + remediation checklist
4. Re-enable only after re-hardening verification

---

## Policy Snippet 2 — Least Privilege + Separate Accounts

**Policy_ID:** `SP-AGENT-ACCT-002`

**Applies_To:** Email, Slack/Telegram/Discord, GitHub, Notion, Drive, and any third-party services used by agents.

### Allowed:

- Dedicated **service accounts** per agent role (Researcher, Drafter, Ops, Deployer)
- Scoped permissions (read-only where possible)
- Rotatable API keys and short-lived tokens
- Role-based access control (RBAC) aligned to job function

### Denied:

- Personal iMessage access
- Main Gmail access
- Banking credentials (direct login, stored passwords, autofill)
- Admin-level tokens for day-to-day tasks
- "One account to rule them all" setups

### Logging Requirements:

- Account registry: service account IDs, roles, scopes, token issuance date, rotation schedule
- Permission snapshots (exported settings or screenshots logged in evidence folder)
- Access change log: who changed what, when, and why

### Failure Handling:

- Immediate credential revocation if scope creep is detected
- Rotate keys if agent attempts restricted actions
- Quarantine the agent role until permissions are revalidated

### Escalation Path:

1. Alert: "PRIVILEGE VIOLATION" with attempted resource + timestamp
2. Revoke tokens + force sign-out
3. Review permissions vs. policy
4. Create a corrected least-privilege role template and redeploy

---

## Policy Snippet 3 — Two-Mode Operations (Read/Research Default)

**Policy_ID:** `SP-AGENT-MODE-003`

**Applies_To:** All agent sessions and task execution flows (chat commands, scheduled runs, tool calls).

### Allowed (Read/Research Mode — Default):

- Browse, summarize, extract requirements
- Draft documents/templates
- File/index within approved folders
- Prepare proposed actions (without executing)

### Denied (Read/Research Mode):

- Sending emails
- Committing code / opening PRs
- Publishing content
- Purchases / checkout actions
- Changing Make.com / production automation settings

### Logging Requirements:

- Every task produces a "Proposed Actions" log entry:
  - Intent, target system, affected objects, artifact outputs
- Source citations for research tasks
- File outputs named consistently and stored in the agent sandbox

### Failure Handling:

- If ambiguity detected: agent must stop and output a clarification note (not execute)
- If a restricted action is attempted: block + log violation

### Escalation Path:

1. Flag task as "Needs Operator Approval"
2. Route to Operator Queue (Notion/Slack)
3. Only proceed if Execute Mode is explicitly granted

---

## Policy Snippet 4 — Execute Mode Requires Consent (Gated Actions)

**Policy_ID:** `SP-AGENT-EXEC-004`

**Applies_To:** Any irreversible, reputation-risky, or externally visible actions.

### Allowed (Execute Mode — Explicit Only):

- Send email (from service account)
- Commit code / create PR (role-limited)
- Publish content (role-limited)
- Make.com scenario edits (role-limited)
- Purchases only under tightly scoped "Procurement" role

### Denied (Even in Execute Mode, unless explicitly whitelisted):

- Banking transfers / payments
- Legal filing submissions under personal identity
- Mass messaging or bulk outreach
- Deleting repositories, Drive folders, or Notion databases

### Logging Requirements:

- "Execution Receipt" required for each action:
  - Who approved (operator ID)
  - What executed (exact command/action)
  - Where (account/system/repo)
  - When (timestamp)
  - Proof (message-id, PR link, publish URL, invoice ID)
- Store receipts in the Evidence Vault + link back to the Notion record

### Failure Handling:

- Auto-revert where possible (e.g., rollback commit, undo config)
- If non-reversible: immediate incident workflow + containment steps
- Lock Execute Mode after any violation until reviewed

### Escalation Path:

1. "EXECUTION GATE TRIPPED" alert
2. Freeze Execute Mode (global kill-switch)
3. Incident review + remediation
4. Re-enable only after operator sign-off

---

## Policy Snippet 5 — Skill Bus Governance (Skills Must Declare Scope)

**Policy_ID:** `SP-SKILL-GOV-005`

**Applies_To:** Any "skill," plugin, connector, or tool integration used by the agent (Notion, Drive, Gmail, GitHub, web automation, etc.).

### Allowed:

- Skills that declare:
  - Purpose
  - Required permissions
  - Allowed targets (which repo/account/folder)
  - Logging output format
- Skills that support dry-run/proposal mode
- Skills that can be disabled centrally

### Denied:

- Skills without declared scopes
- Skills that require blanket admin permissions
- Skills that do not emit logs/receipts

### Logging Requirements:

- Skill registry entry per skill:
  - Version, source, scopes, permissions, owner role
- Every skill action logs:
  - inputs → outputs → affected resources

### Failure Handling:

- Auto-disable any skill that:
  - touches unapproved resources
  - fails repeatedly (loop risk)
  - produces incomplete logs
- Quarantine the skill and require re-approval

### Escalation Path:

1. "SKILL QUARANTINED" notice with reason
2. Operator reviews skill manifest + logs
3. Patch scope/permissions + redeploy
4. Re-enable skill under monitored mode

---

## Implementation Note (SintraPrime Adoption Standard)

Treat this architecture as a **command surface + memory layer + skill bus**, and enforce three laws:

1. **Isolation** (separate environment)
2. **Least privilege** (separate accounts, minimal scopes)
3. **Execute requires consent** (gated actions + receipts)

That's how you get the 24/7 delegated labor without your agent doing unapproved "side quests" like emailing your grandma a GitHub PR and panic-buying 600 pounds of chia seeds.

---

## Usage in Notion

If you paste these into Notion, they'll read clean as a "Policy Database" with one policy per page. Each policy can be linked to execution logs, incident reports, and compliance audits.

---

**Version:** v1  
**Last Updated:** 2026-01-25  
**Status:** Active governance policies for agent operations
