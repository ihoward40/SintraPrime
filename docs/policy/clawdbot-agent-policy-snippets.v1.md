# SintraPrime Policy Snippets — ClawdBot Pattern Adoption

This document defines governance policies for adopting ClawdBot-style agent patterns within SintraPrime. These policies enforce isolation, least privilege, and gated execution to enable 24/7 delegated labor without operational risk.

---

## SintraPrime Agent Governance — The Three Laws

**Isolation (separate environment)**
Run agents in a dedicated machine or hardened VPS, never your daily driver.

**Least privilege (separate accounts, minimal scopes)**
Agents use role-based service accounts with only the permissions they need—nothing more.

**Execute requires consent (gated actions + receipts)**
Anything irreversible or external-facing requires explicit approval + a logged receipt.

**Outcome:** 24/7 delegated labor without unapproved side quests (like emailing your grandma a GitHub PR and panic-buying 600 pounds of chia seeds).

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

## Notion "Policy Database" Setup (Clean + SOP-ready)

### Database name

**SintraPrime Policies**

### Recommended properties

* **Policy_ID** (Title or Text)
* **Applies_To** (Multi-select: Agent, Skills, Email, GitHub, Notion, Drive, Make.com, VPS, Voice, etc.)
* **Policy_Type** (Select: Security, Operations, Execution, Data, Compliance)
* **Mode** (Select: Read/Research, Execute/Gated, Both)
* **Allowed** (Text)
* **Denied** (Text)
* **Logging_Requirements** (Text)
* **Failure_Handling** (Text)
* **Escalation_Path** (Text)
* **Owner** (Person/Select)
* **Status** (Select: Draft, Active, Deprecated)
* **Last_Reviewed** (Date)

### Page template (per policy)

Use a template with these headings in the body:

* **Purpose**
* **Applies_To**
* **Allowed**
* **Denied**
* **Logging Requirements**
* **Failure Handling**
* **Escalation Path**
* **Notes / Examples**

---

## Notion Enforcement Structure — Execution Receipts

### Create database: **Execution Receipts**

Properties (minimum viable):

* **Receipt_ID** (Title)
* **Task** (Relation → *Agent Task Queue*)
* **Policy** (Relation → *SintraPrime Policies*)
* **System** (Select) — Gmail / GitHub / Notion / Drive / Make / Web / Purchase / Voice / Other
* **Action_Type** (Select) — Send / Commit / Publish / Configure / Purchase / Call_Action / Other
* **Target** (Text) — repo/email/doc/scenario/phone_number
* **External_Proof** (Text) — message-id / PR link / publish URL / invoice ID / call_id / booking_id
* **Evidence_Link** (URL or Text) — Drive link, screenshot, export
* **Approved_By** (People or Text)
* **Approved_At** (Date)
* **Executed_At** (Date)
* **Status** (Select) — Pending / Executed / Failed / Reverted
* **Notes** (Text)

### Add relations to **Agent Task Queue**

In your **Agent Task Queue** database, add:

* **Mode** (Select): `Read/Research` | `Execute`
* **Policy_Link** (Relation → SintraPrime Policies)
* **Exec_Receipt** (Relation → Execution Receipts)
* **Gate_Status** (Formula)
* **Blocked_Reason** (Formula)

### Gate_Status formula (the "bouncer at the door")

Create **Gate_Status** (Formula) and paste:

```notion
if(
  prop("Mode") == "Execute",
  if(
    empty(prop("Policy_Link")),
    "BLOCKED: Missing Policy_ID",
    if(
      empty(prop("Exec_Receipt")),
      "BLOCKED: Missing Receipt",
      "READY"
    )
  ),
  "OK: Read/Research"
)
```

### Blocked_Reason formula

Create **Blocked_Reason** (Formula) and paste:

```notion
if(
  prop("Mode") != "Execute",
  "",
  if(
    empty(prop("Policy_Link")),
    "Add Policy_Link (Policy_ID required for Execute Mode).",
    if(
      empty(prop("Exec_Receipt")),
      "Create linked Execution Receipt row before execution.",
      ""
    )
  )
)
```

### Receipt_Completeness formula (on Execution Receipts)

Create **Receipt_Completeness** (Formula) in **Execution Receipts**:

```notion
if(
  empty(prop("Policy")),
  "INCOMPLETE: Policy missing",
  if(
    empty(prop("Task")),
    "INCOMPLETE: Task link missing",
    if(
      empty(prop("External_Proof")),
      "INCOMPLETE: Proof missing",
      if(
        empty(prop("Executed_At")),
        "INCOMPLETE: Executed_At missing",
        "COMPLETE"
      )
    )
  )
)
```

### Is_Complete formula (checkbox-style)

Create **Is_Complete** (Formula) in **Execution Receipts**:

```notion
prop("Receipt_Completeness") == "COMPLETE"
```

**Enforcement rule:**
A Task cannot move into "Executed/Done" unless `Gate_Status = READY` **and** `Receipt.Is_Complete = true`.

---

## Policy Snippet 6 — NotebookLM Source Governance

**Policy_ID:** `SP-NLM-SOURCE-006`

**Applies_To:** NotebookLM, Knowledge Base Creation, Research Sources, Voice Agent KB

### Allowed:

- User-provided sources (uploaded docs, Drive files, Workspace sources)
- Sources explicitly reviewed and approved by operator
- All imported sources logged with version/date/source URL

### Denied:

- Auto-discovered sources used without review
- Untrusted web sources imported directly to production KB
- Sources without provenance tracking

### Logging Requirements:

- Source registry: source name, URL/path, import date, approved by
- Source change log (what was added/removed, when, why)
- KB version tied to source list snapshot

### Failure Handling:

- If source conflict detected → flag for review + create reconciliation task
- If unapproved source detected → quarantine + require explicit approval

### Escalation Path:

1. "SOURCE REQUIRES REVIEW" alert
2. KB Maintainer reviews source + provenance
3. Approve or reject + update source registry
4. Redeploy KB with approved sources only

---

## Voice Channel Governance Policies

### Policy Snippet 7 — Voice Channel Architecture

**Policy_ID:** `SP-VOICE-ARCH-001`

**Applies_To:** Voice Agents, Telephony (Twilio/Carrier/Platform), STT/TTS, CRM/Calendar Integrations

### Allowed:

- FAQ answering from **approved Knowledge Base**
- Lead intake + basic qualification
- Call routing within defined rules
- Appointment scheduling **only** within predefined constraints (hours, services, duration, timezone)

### Denied:

- Payments / refunds / collections
- Collecting sensitive credentials (bank logins, SSN, full card numbers)
- Legal/medical advice
- Impersonation or "human deception"
- Outbound dialing unless explicitly authorized campaign-by-campaign

### Logging Requirements:

- Call metadata: `call_id`, timestamp, duration, masked caller number, disposition
- Transcript + tool invocation trace (inputs/outputs)
- Knowledge base version/hash used

### Failure Handling:

- If uncertain → clarify once → **handoff** or "take message + callback ticket"
- If tools fail (calendar/API) → stop booking → collect details → create follow-up task

### Escalation Path:

1. Agent → Voice Supervisor Queue (Notion)
2. Human On-Call
3. Incident Log

**Implementation Note:**
Voice is a **public command surface**. Enforce: versioned KB + scoped tools + escalation on uncertainty.

---

### Policy Snippet 8 — Voice Execute Requires Consent

**Policy_ID:** `SP-VOICE-EXEC-002`

**Applies_To:** Calendar Booking, Call Transfer, SMS Follow-ups, Email Follow-ups, CRM Writes

### Allowed:

- Auto-execute only inside the **Pre-Approved Action Envelope (PAE)**:
  - Book appointment for approved services + durations + hours + timezone + buffers
  - Transfer calls only to approved numbers
  - Create a callback ticket / lead record

### Denied:

- Any action outside PAE (after-hours booking, exceptions, discounts, policy overrides)
- Commitments that change terms (pricing promises, refunds, cancellations outside policy)

### Logging Requirements:

- Every tool action must generate/update an **Execution Receipt**:
  - `policy_id`, `call_id`, `action_type`, `target`, `external_proof` (event_id / link / message_id)

### Failure Handling:

- Out-of-policy request → "I can't do that directly; I'll have someone call you back" + task

### Escalation Path:

1. Voice Agent → Exec Gate (Notion Gate_Status)
2. Human Approver
3. Receipt Finalization

**Implementation Note:**
Voice is "Execute-adjacent by default." Treat booking/transfer as **execution** with receipts.

---

### Policy Snippet 9 — Voice Security & Isolation

**Policy_ID:** `SP-VOICE-SEC-003`

**Applies_To:** Voice Platforms, API Keys, Cal/Google Calendar, CRM, Webhooks, Hosting

### Allowed:

- Dedicated service accounts for calendar/CRM
- Minimal OAuth scopes (read availability vs full access)
- Separate phone numbers + environments (sandbox vs production)
- Signed webhooks + key rotation schedule

### Denied:

- Personal Google accounts
- Broad "full calendar access" if read-only is enough
- Shared keys across environments
- Storing raw secrets in prompts or Notion pages

### Logging Requirements:

- Key inventory (name, scope, created, rotated, owner)
- Webhook audit (request_id, signature verification result, payload hash)

### Failure Handling:

- Auth/webhook anomalies → disable voice execution (kill switch) + alert + rotate keys

### Escalation Path:

1. System Alert → Security Queue
2. Rotate Keys
3. Postmortem Log

**Implementation Note:**
Run voice like production software: separate envs, scoped creds, signed webhooks, rotation.

---

### Policy Snippet 10 — Voice Consent & Caller Safety

**Policy_ID:** `SP-VOICE-CONSENT-004`

**Applies_To:** Call Recording, Transcript Storage, Analytics, Training Data

### Allowed:

- Recording/transcription only with proper disclosure + compliant configuration
- Retention policy tags + scheduled deletion
- "No-record mode" where supported

### Denied:

- Silent recording
- Using call data for training unless explicitly permitted
- Indefinite retention without policy

### Logging Requirements:

- Disclosure script version + whether caller acknowledged (if applicable)
- Retention tag + deletion schedule
- Storage location link(s) (recording/transcript)

### Failure Handling:

- If consent denied → no-record mode or offer alternate channel (SMS/email)

### Escalation Path:

1. Compliance Queue
2. Review config
3. Update script/prompt/IVR

**Implementation Note:**
Voice data is spicy. Treat it like evidence: documented, retained intentionally, deleted intentionally.

---

### Policy Snippet 11 — Voice Knowledge Base Integrity

**Policy_ID:** `SP-NLM-VOICE-KB-005`

**Applies_To:** NotebookLM, Knowledge Base Docs, Prompt Writer Outputs, FAQs, Pricing/Hours Policies

### Allowed:

- NotebookLM used to synthesize business docs into a **versioned KB pack**
- KB outputs stored as clean docs with change log + approvals

### Denied:

- NotebookLM as drifting "live truth" without version control
- Importing unknown sources without review
- Letting the agent browse random sources during live calls for policy answers

### Logging Requirements:

- KB source list + version + hash
- Change log (what changed, why, who approved)
- Voice agent prompt version tied to KB version

### Failure Handling:

- KB conflict during call → "I'll confirm and call you back" + discrepancy ticket

### Escalation Path:

1. KB Maintainer
2. Policy Owner
3. Redeploy prompt/KB version

**Implementation Note:**
NotebookLM is your **KB refinery**. The agent consumes only approved, versioned outputs.

---

### Policy Snippet 12 — Pre-Approved Action Envelope (PAE)

**Policy_ID:** `SP-VOICE-PAE-006`

**Applies_To:** Voice Agents + any automation that can schedule, transfer, SMS, email, or write CRM

### Allowed:

- Only actions that match current PAE config:
  - Approved services (by name + duration)
  - Operating hours + blackout windows
  - Timezone must match PAE timezone
  - Buffers (before/after appointments)
  - Approved transfer numbers
  - Approved follow-up channels (SMS/email) and templates

### Denied:

- Anything outside envelope (out-of-hours booking, unapproved services, non-approved phone transfers, custom pricing promises, "exceptions")

### Logging Requirements:

- Every executed action logs:
  - `PAE_Version`
  - `PAE_Check_Result` (PASS/FAIL + reason)
  - `Policy_ID` reference
  - Execution Receipt row with external proof

### Failure Handling:

- If PAE check fails → **do not execute**
- Create follow-up task + handoff message: "I'll have a human confirm and get back to you."

### Escalation Path:

1. Agent → Voice Supervisor Queue
2. Human Approver
3. Update PAE
4. Redeploy

**Implementation Note:**
PAE is the "seatbelt." It defines *what execution even means* for voice.

---

### Policy Snippet 13 — PAE Check Result + Compliance Telemetry

**Policy_ID:** `SP-VOICE-REC-007`

**Applies_To:** Execution Receipts (all Execute Mode), Voice stack (booking/transfer/SMS/email), Make/n8n scenarios

### Allowed:

- Execute actions **only** when `PAE_Check_Result = PASS`
- Block-and-log actions when `PAE_Check_Result = FAIL` (with reason)

### Denied:

- Any Execute action that does **not** write `PAE_Check_Result`
- Any Receipt marked complete without PAE check evidence (PASS/FAIL + reason)

### Logging Requirements:

- Every Execute attempt (even blocked) must create an Execution Receipt row containing:
  - `Policy` (Policy_ID relation)
  - `Task` (relation)
  - `PAE_Check_Result` (PASS/FAIL + reason)
  - `Gate_Status_At_Time` (READY/BLOCKED + reason)
  - `External_Proof` (if executed) OR `Blocked_Proof` (if blocked)
  - `Executed_At` or `Attempted_At`
  - `Actor` (Agent/Human/System)

### Failure Handling:

- If `PAE_Check_Result` is missing → treat as FAIL → block execution
- If PAE check fails → no action executed; create handoff task + notify escalation channel

### Escalation Path:

1. Agent → Voice Supervisor Queue
2. Human Approver
3. Update PAE / Flags
4. Redeploy

**Implementation Note:**
Receipts must record **attempts**, not just successes. That's how you get "who tried what, when, and why it didn't happen."

---

### Policy Snippet 14 — Weekly Compliance Score + Block-Spike Alerting

**Policy_ID:** `SP-COMP-SCORE-008`

**Applies_To:** Execution Receipts, Compliance Dashboard, Slack Alerts, Make/n8n "Execute Mode" scenarios

### Allowed:

- Weekly compliance scoring derived from receipts (executed vs blocked vs missing fields)
- Slack alerts when blocked attempts spike above threshold (default: **>10/day**)

### Denied:

- Running Execute Mode without telemetry (no receipts = no score = no operations)
- Silent failures (blocked spike must notify)

### Logging Requirements:

- Receipts must include `Attempted_At`, `Outcome`, `Channel`, `Policy`, `Blocked_Reason`, `Receipt_Completeness`
- Weekly rollup must be reproducible from the receipts dataset

### Failure Handling:

- If scoring inputs missing → score degrades + alert can trigger ("Telemetry Degraded")
- If spike detected → throttle execution (optional) + escalate to human review

### Escalation Path:

1. Slack `#alerts-voice`
2. Voice Supervisor Queue
3. Ops Owner
4. Update PAE/Flags/Scopes
5. Redeploy

**Implementation Note:**
Scores are not "vanity metrics." They're early-warning radar for misconfigurations and runaway agents.

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
