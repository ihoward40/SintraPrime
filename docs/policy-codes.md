# Policy Codes

## NOTION_LIVE_REQUIRES_READ_ONLY
Live Notion operations must be read-only.

## PROD_WRITE_CONFIRMATION_REQUIRED
Production writes require explicit confirmation.

## CONFIDENCE_TOO_LOW
Confidence is too low to execute write-capable steps.

## PROBATION_READ_ONLY_ENFORCED
Probation requires all steps to be explicitly read-only.

## ClawdBot Agent Policy Codes

### SP-AGENT-ENV-001
**ENVIRONMENT_ISOLATION_REQUIRED** — All autonomous/remote-controlled agents must run in dedicated environments with proper hardening (Docker, firewall, private network).

### SP-AGENT-ACCT-002
**LEAST_PRIVILEGE_BY_DEFAULT** — Agents must use dedicated service accounts with minimal scopes; personal accounts and banking credentials are prohibited.

### SP-AGENT-MODE-003
**MODE_READ_RESEARCH** — Default agent mode allows only non-executing actions (browse, summarize, draft, prepare). Execute actions are denied.

### SP-AGENT-EXEC-004
**MODE_EXECUTE_GATED** — Irreversible or reputation-risky actions require explicit Execute Mode with confirmation gates and execution receipts.

### SP-SKILL-GOV-005
**SKILL_SCOPE_DECLARATION_REQUIRED** — All agent skills/plugins must declare purpose, permissions, targets, and logging format; blanket admin permissions are denied.
