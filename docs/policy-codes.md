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

### SP-NLM-SOURCE-006
**NLM_SOURCE_APPROVAL_REQUIRED** — All NotebookLM sources must be reviewed and explicitly approved; auto-discovered sources require operator review before production use.

## Voice Channel Policy Codes

### SP-VOICE-ARCH-001
**VOICE_CHANNEL_GOVERNANCE** — Voice agents limited to approved KB, defined routing rules, and predefined scheduling constraints; payments and sensitive credential collection prohibited.

### SP-VOICE-EXEC-002
**VOICE_EXECUTE_CONSENT** — Voice actions must stay within Pre-Approved Action Envelope (PAE); out-of-policy requests escalate to human approval with execution receipts required.

### SP-VOICE-SEC-003
**VOICE_SECURITY_ISOLATION** — Voice platforms require dedicated service accounts, minimal OAuth scopes, separate environments, and signed webhooks with rotation schedules.

### SP-VOICE-CONSENT-004
**VOICE_CALLER_CONSENT** — Call recording/transcription requires proper disclosure and compliant configuration; silent recording and indefinite retention prohibited.

### SP-NLM-VOICE-KB-005
**VOICE_KB_INTEGRITY** — NotebookLM synthesizes business docs into versioned KB packs only; drifting sources and unreviewed imports prohibited.
