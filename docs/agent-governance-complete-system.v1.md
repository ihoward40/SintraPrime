# SintraPrime Agent Governance — Complete System Specification v1

**Status:** Production-Ready Architecture  
**Version:** v1.0.0  
**Last Updated:** 2026-01-25

This document provides the complete architecture for implementing production-grade, audit-ready agent governance in SintraPrime, including Notion databases, formulas, policies, automation patterns, and compliance reporting.

---

## 0) The Architecture (SintraPrime Adoption Pattern)

**SintraPrime adopts the pattern as:**

* **Command Surface** → where you issue tasks (Notion / Slack / Telegram / Voice UI)
* **Memory Layer** → plaintext logs (diffable/exportable) + knowledge bases (NotebookLM)
* **Skill Bus** → tool registry with scopes, signatures, and allowed actions
* **Policy Gate** → **Execute Mode requires consent** + receipts + kill switches
* **Isolation + least privilege** → separate environments + separate accounts + minimal scopes

**Rule of the universe:**
If it mutates the world (sends, books, buys, commits, publishes) → it's Execute Mode → it must be gated → it must produce a receipt → it must point to a policy.

---

## 1) Notion Databases (The "Policy With Teeth" Stack)

Create these databases (one-time). Names are canonical so automations stay clean.

### A) `Policies` (one policy per page)

**Properties:**

* `Policy_ID` (Title) e.g. `SP-GATE-003`
* `Applies_To` (Multi-select)
* `Owner` (Person)
* `Severity` (Select: LOW/MED/HIGH/CRIT)
* `Active` (Checkbox)
* `Version` (Text) e.g. `v1.0`
* `Last_Reviewed` (Date)

### B) `Execution Tasks` (the backlog the agent works from)

**Properties:**

* `Task_ID` (Title) e.g. `TASK-2026-000214`
* `Mode` (Select: READ/EXECUTE)
* `Policy` (Relation → Policies) **required for EXECUTE**
* `Requested_By` (Person/Text)
* `Channel` (Select: Voice/Email/GitHub/Calendar/Slack/Docs/Web)
* `Intent` (Select: BOOK/TRANSFER/SEND_EMAIL/COMMIT/PUBLISH/BUY/SMS/OTHER)
* `Target_System` (Select: Cal.com/Gmail/GitHub/Slack/etc.)
* `Parameters_JSON` (Text)
* `Consent_Status` (Select: NONE/REQUESTED/GRANTED/DENIED/EXPIRED)
* `Consent_Record` (Relation → Consent Tokens)
* `Gate_Status` (Formula) ✅
* `Status` (Select: Backlog/In Progress/Blocked/Done/Needs Review)
* `Receipts` (Relation → Execution Receipts)

### C) `Execution Receipts` (the audit log that makes the system behave like an adult)

**Properties:**

* `Receipt_ID` (Title) `RCPT-2026-000982`
* `Task` (Relation → Execution Tasks) **required**
* `Policy` (Relation → Policies) **required**
* `Attempted_At` (Date) **required**
* `Executed_At` (Date)
* `Outcome` (Select: EXECUTED/BLOCKED/FAILED)
* `Channel` (Select)
* `Intent` (Select)
* `Actor` (Select: Agent/Human/System)
* `PAE_Check_Status` (Select: PASS/FAIL) **required**
* `PAE_Check_Reason` (Text) **required**
* `PAE_Check_Result` (Formula) ✅
* `Gate_Status_At_Time` (Text) e.g. `READY` or `BLOCKED — VOICE_EXEC_DISABLED`
* `External_Proof` (URL/Text) (call SID / PR link / message-id / calendar booking id)
* `Blocked_Reason` (Text)
* `Blocked_Reason_Code` (Select) — normalized codes for analytics
* `Receipt_Completeness` (Formula) ✅
* `Is_Complete` (Formula checkbox) ✅
* `Is_Blocked` (Formula checkbox) ✅
* `Is_Executed` (Formula checkbox) ✅

**Blocked_Reason_Code options:**
- `MISSING_PAE`
- `PAE_NOT_ACTIVE`
- `VOICE_EXEC_DISABLED`
- `MISSING_POLICY`
- `MISSING_RECEIPT`
- `MISSING_CALL_ID`
- `OUT_OF_HOURS`
- `UNAPPROVED_SERVICE`
- `CONSENT_REQUIRED`
- `CONSENT_EXPIRED`

### D) `PAE_Config` (Pre-Approved Action Envelope)

**Properties:**

* `PAE_ID` (Title) e.g. `PAE-VOICE-PRIMARY`
* `Active` (Checkbox) ✅ only one active per channel
* `Channel` (Select: Voice/Email/etc.)
* `Timezone` (Text) e.g. `America/New_York`
* `Business_Hours` (Text) e.g. `Mon–Fri 09:00–17:00`
* `Services_Allowed` (Multi-select)
* `Booking_Buffer_Min` (Number)
* `Min_Notice_Min` (Number)
* `Max_Days_Out` (Number)
* `Transfer_Number` (Phone/Text)
* `SMS_Enabled` (Checkbox)
* `Booking_Enabled` (Checkbox)
* `Transfer_Enabled` (Checkbox)
* `VOICE_EXEC_ENABLED` (Checkbox) ✅ kill switch (global for voice)
* `GLOBAL_EXEC_ENABLED` (Checkbox) ✅ optional master kill switch
* `Version` (Text)
* `Last_Changed` (Date)
* `Changed_By` (Person/Text)

### E) `Consent_Tokens` (explicit Execute permission, scoped + expiring)

**Properties:**

* `Consent_ID` (Title) `CONS-2026-000044`
* `Task` (Relation → Execution Tasks)
* `Scope` (Select: SINGLE_ACTION/SESSION/TIMEBOX)
* `Granted_By` (Person/Text)
* `Granted_At` (Date)
* `Expires_At` (Date)
* `Status` (Select: GRANTED/DENIED/EXPIRED)
* `Consent_Proof` (Text/URL) (Slack message permalink, signed approval, etc.)

### F) `Compliance_Weeks` (rollups + scoring)

**Properties:**

* `Week` (Title) `2026-W04`
* `Week_Start` (Date)
* `Week_End` (Date)
* `Receipts` (Relation → Execution Receipts)
* `Total_Attempts` (Rollup count)
* `Blocked_Count` (Rollup count from Is_Blocked)
* `Executed_Count` (Rollup count from Is_Executed)
* `Incomplete_Count` (Rollup count from Is_Complete unchecked)
* `Compliance_Score` (Formula) ✅
* `Status` (Formula) ✅

### G) `Skill_Registry` (skill bus + scopes)

**Properties:**

* `Skill_ID` (Title) `SKILL-CALBOOK-001`
* `Provider` (Select: cal.com/gmail/github/etc.)
* `Scopes` (Multi-select)
* `Allowed_Intents` (Multi-select)
* `Isolation_Required` (Checkbox)
* `Secrets_Location` (Text) (never the secret itself)
* `Version` (Text)
* `Signed` (Checkbox)

### H) `Memory_Logs` (plaintext memory layer)

**Properties:**

* `Log_ID` (Title)
* `Source` (Select: Agent/Voice/Slack/Email)
* `Date` (Date)
* `Summary` (Text)
* `Raw_Log_Link` (URL) (Drive/Git)
* `Hash` (Text) (optional)

### I) `Verifier_Packs` (weekly artifacts)

**Properties:**

* `Pack_ID` (Title) e.g. `VP-2026-W04`
* `Week_Start` (Date)
* `Week_End` (Date)
* `Compliance_Score` (Relation/Rollup from Compliance_Weeks)
* `PDF_Link` (URL)
* `Config_Snapshot_JSON_Link` (URL)
* `HashChain_Summary` (Text)
* `Prev_Pack_Hash` (Text)
* `Pack_Hash` (Text)
* `Merkle_Root` (Text)
* `Receipts_Included` (Relation → Execution Receipts)
* `Pack_Status` (Select: QUEUED/GENERATING/READY/FAILED)
* `Generated_At` (Date)
* `Generated_By` (Select: Agent/Human/System)
* `PDF_SHA256` (Text)
* `Artifacts_Folder` (URL)
* `Slack_Notification_Link` (URL)

---

## 2) Notion Formulas (Copy/Paste Ready)

### A) Gate_Status (Execution Tasks)

```notion
if(
  prop("Mode") == "READ",
  "READY — READ_MODE",
  if(
    empty(prop("Policy")),
    "BLOCKED — MISSING_POLICY",
    if(
      prop("Consent_Status") != "GRANTED",
      "BLOCKED — CONSENT_REQUIRED",
      "READY — EXECUTE_APPROVED"
    )
  )
)
```

### B) PAE_Check_Result (Execution Receipts)

```notion
prop("PAE_Check_Status") + " — " + if(empty(prop("PAE_Check_Reason")), "MISSING_REASON", prop("PAE_Check_Reason"))
```

### C) Receipt_Completeness (Execution Receipts)

```notion
if(
  empty(prop("Policy")) or empty(prop("Task")),
  "MISSING_LINKS",
  if(
    empty(prop("Attempted_At")) or empty(prop("Outcome")),
    "MISSING_CORE_FIELDS",
    if(
      empty(prop("PAE_Check_Status")) or empty(prop("PAE_Check_Reason")),
      "MISSING_PAE_CHECK",
      if(
        prop("Outcome") == "BLOCKED" and empty(prop("Blocked_Reason")),
        "MISSING_BLOCKED_REASON",
        if(
          prop("Outcome") == "EXECUTED" and empty(prop("External_Proof")),
          "MISSING_EXTERNAL_PROOF",
          "COMPLETE"
        )
      )
    )
  )
)
```

### D) Is_Complete (Execution Receipts)

```notion
prop("Receipt_Completeness") == "COMPLETE"
```

### E) Is_Blocked / Is_Executed (Execution Receipts)

```notion
prop("Outcome") == "BLOCKED"
```

```notion
prop("Outcome") == "EXECUTED"
```

### F) Compliance_Score (Compliance_Weeks)

```notion
max(
  0,
  100
  - (prop("Blocked_Count") * 2)
  - (prop("Executed_Count") * 0)
  - (prop("Incomplete_Count") * 10)
)
```

**Interpretation:**
- Start at 100 (perfect score)
- Blocked attempts: -2 points each (indicates broken gating)
- Incomplete receipts: -10 points each (missing proof is compliance failure)
- Score cannot go below 0

### G) Compliance Status (Compliance_Weeks)

```notion
if(prop("Compliance_Score") >= 95, "GREEN",
if(prop("Compliance_Score") >= 85, "YELLOW",
"RED"))
```

---

## 3) Policy Pages (Copy/Paste into Notion Policies Database)

### Policy Page 1 — Messaging-First Control Plane

**Policy_ID:** `SP-POL-CTRLPLANE-001`

**Applies_To:** All agents, automations, remote workers, voice agents, desktop runners, Make/n8n scenarios

**Allowed:**
- Messaging-first command surface (Telegram/Slack/Discord/etc.)
- Work happens via requests that become logged tasks

**Denied:**
- "Silent autonomy" where agent takes meaningful actions without leaving a trail

**Logging Requirements:**
- Every task must create or update a Task/Receipt record with: Request summary, timestamp, channel, operator identity (human vs agent), target system
- Memory must be stored as plaintext logs (diffable/exportable) + linked to receipts

**Failure Handling:**
- If logging fails → hard block any non-read action and create an Incident entry

**Escalation Path:**
Operator → Co-Trustee / Admin → Incident Review → Policy update

**Implementation Note:**
Treat messaging as the command surface, Notion as system-of-record, and receipts as proof of behavior.

---

### Policy Page 2 — Persistent Memory as Auditable Plaintext

**Policy_ID:** `SP-POL-MEMORY-002`

**Applies_To:** Agent memory, summaries, call transcripts, briefings, "second brain," NotebookLM exports

**Allowed:**
- Memory stored as plaintext + versioned snapshots (daily/weekly)

**Denied:**
- "Black box" memory you can't export, diff, or attribute to receipts

**Logging Requirements:**
- Store memory in append-only logs with stable IDs
- Link memory deltas to the Receipt_ID that generated them

**Failure Handling:**
- If memory write fails → task proceeds only in Read/Research Mode, and a Failure Receipt is generated

**Escalation Path:**
Operator → Compliance Review → Rotate memory store / fix pipeline

**Implementation Note:**
This is how you build "infinite memory" without sacrificing auditability.

---

### Policy Page 3 — Skills / Registry Ecosystem

**Policy_ID:** `SP-POL-SKILLBUS-003`

**Applies_To:** Skill registry, tool integrations, API connectors, "actions," voice tools (calendar/SMS/transfer)

**Allowed:**
- Tools only via registered skills with clear scopes

**Denied:**
- Random ad-hoc scripts or hidden connectors that bypass receipts

**Logging Requirements:**
- Each skill must declare: name, version, scopes, and required receipts
- Each invocation must write: skill name/version + input/output summary + evidence links

**Failure Handling:**
- Unknown skill/tool → block execute, log as Policy Violation Attempt

**Escalation Path:**
Operator → Skill Owner → Security review

**Implementation Note:**
Skills are your "bus." Receipts are your seatbelts.

---

### Policy Page 4 — Isolation (Separate Environment)

**Policy_ID:** `SP-POL-ISOLATION-004`

**Applies_To:** Desktop agent box, VPS, containers, voice infra, any "computer control" agent

**Allowed:**
- Dedicated machine or hardened VPS
- Container isolation
- Network restrictions

**Denied:**
- Running agent on your daily driver with personal messages/accounts exposed

**Logging Requirements:**
- Environment identity: Host_ID, Container_ID, Git SHA, Build version
- Network policy snapshot (firewall/tailscale routing) attached to weekly Verifier Pack

**Failure Handling:**
- If isolation check fails → force Read/Research Mode only and raise Slack alert

**Escalation Path:**
Operator → Infra Admin → Quarantine environment

**Implementation Note:**
This is your "blast radius limiter."

---

### Policy Page 5 — Least Privilege (Separate Accounts + Minimal Scopes)

**Policy_ID:** `SP-POL-LEASTPRIV-005`

**Applies_To:** Email, Slack, GitHub, calendars, Notion tokens, voice providers

**Allowed:**
- Separate accounts for agents
- Minimal scopes
- Per-workspace credentials

**Denied:**
- Personal iMessage, main Gmail, banking logins
- "Just use my everything"

**Logging Requirements:**
- Credential usage logged as: which account, which scope, which skill, which receipt
- Any permission change creates a Privilege Change Receipt

**Failure Handling:**
- Scope too broad or unknown → block execute; create incident entry

**Escalation Path:**
Operator → Security Owner → Credential rotation

**Implementation Note:**
If the agent gets "confused," it can't ruin your life.

---

### Policy Page 6 — Two-Mode Operation (Read/Research vs Execute)

**Policy_ID:** `SP-POL-TWOMODE-006`

**Applies_To:** All agent operations

**Allowed:**
- **Read/Research Mode (default):** browse, summarize, draft, file, index
- **Execute Mode (explicit):** send email, commit code, publish, buy, book, transfer

**Denied:**
- Execute actions without explicit mode + gate outcome

**Logging Requirements:**
- Every Execute Mode attempt must:
  1. Link a Policy_ID
  2. Generate an Execution Receipt row with evidence (message-id/PR link/etc.)
  3. Record Gate_Status + PAE_Check_Result (for voice)

**Failure Handling:**
- Missing Policy_ID or receipt → hard block, log as Blocked Attempt

**Escalation Path:**
Operator → Compliance → update policy or fix automation

**Implementation Note:**
"Rules with teeth" = receipts + gates.

---

### Policy Page 7 — Execute Requires Consent

**Policy_ID:** `SP-POL-CONSENT-007`

**Applies_To:** Email send, purchases, publishing, code commits, calendar booking, call transfer, SMS

**Allowed:**
- Execute only when Gate_Status returns **APPROVED** (human) OR **AUTO_ALLOWED** (voice only, inside PAE + kill switch enabled)

**Denied:**
- Background exec, ambiguous approval, "agent guessed yes"

**Logging Requirements:**
- Receipt must include: target system, action type, outcome, evidence link
- Store "before/after" snapshot where possible

**Failure Handling:**
- Gate fails → block + Slack ping + count toward Blocked metrics

**Escalation Path:**
Operator → On-call Admin → Incident Review

**Implementation Note:**
Consent is the difference between "assistant" and "liability."

---

### Policy Page 8 — Voice: PAE + Global Kill Switch

**Policy_ID:** `SP-POL-VOICE-PAE-008`

**Applies_To:** Voice agents (booking, transfer, SMS, reminders), inbound receptionist flows

**Allowed:**
- Voice executes only inside a Pre-Approved Action Envelope (PAE)
- Only when VOICE_EXEC_ENABLED = true

**Denied:**
- Booking/transfer/SMS outside hours/services/timezone/buffers
- Actions when kill switch is off

**Logging Requirements:**
- Every voice execute attempt must write:
  - PAE_Check_Result (PASS/FAIL + reason)
  - VOICE_EXEC_ENABLED snapshot value
  - Tool calls used (calendar check, booking, transfer, SMS)
  - Evidence (Call_ID, booking ID, transfer result)

**Failure Handling:**
- PAE FAIL or kill switch off → block, end call gracefully, log blocked attempt

**Escalation Path:**
Operator → Voice Admin → Compliance

**Implementation Note:**
PAE is how you avoid "chia-seed disasters" at scale.

---

### Policy Page 9 — Verifier Pack Export

**Policy_ID:** `SP-POL-VERIFY-009`

**Applies_To:** Weekly compliance reporting + Verifier Pack generation

**Allowed:**
- Weekly PDF export with score + key receipts + ledger summary + config snapshots

**Denied:**
- Execute operations without auditable weekly verification artifacts

**Logging Requirements:**
- Pack row must include PDF hash + ledger anchors + PAE snapshot JSON

**Failure Handling:**
- Pack generation failure triggers Slack alert + creates "Verifier Pack Fix" task

**Escalation Path:**
System → Ops Owner → Security Queue (if ledger FAIL)

**Implementation Note:**
This is your "audit button." It must run even when nothing else does.

---

### Policy Page 10 — Compliance Score Monitoring

**Policy_ID:** `SP-POL-COMP-010`

**Applies_To:** Compliance scoring, spike detection, drift detection

**Allowed:**
- Weekly rollup scoring + alerts on spikes (>10 blocked/day)
- Drift detection when blocked reason distribution changes

**Denied:**
- Running Execute Mode without telemetry and score reporting
- Ignoring spikes or drift

**Logging Requirements:**
- Weekly row must be reproducible from receipts
- Spike alerts must include top blocked reasons + dashboard link

**Failure Handling:**
- "Telemetry Degraded" alert if scoring inputs missing
- Auto-disable VOICE_EXEC if spike exceeds threshold (optional)

**Escalation Path:**
Ops Owner → Security Review → PAE/Prompt update

**Implementation Note:**
Scores are early warning, not vanity metrics.

---

## 4) Verifier Pack Selection Logic

For week W, include in the pack:

1. Pull all Execution Receipts where `Attempted_At` within Week_Start–Week_End
2. Include **all** of:
   - Any receipt where `Outcome = FAILED`
   - Any receipt where `Outcome = BLOCKED`
   - Any receipt where `Is_Complete = false`
   - Any receipt where Intent is high-risk (Purchase/Publish/EmailSend/GitCommit)
3. Plus: a random sample of successes (e.g., top 10 by recency) to prove "good behavior"
4. Snapshot:
   - PAE Config (entire row serialized)
   - VOICE_EXEC_ENABLED value
   - Any policy changes that week

---

## 5) Verifier Pack PDF Structure

**Page 1 — Cover**
- Verifier Pack ID
- Week range
- Generated timestamp + environment/workspace ID
- Prepared by (System/Agent)

**Page 2 — Executive Summary**
- Compliance score (and GREEN/YELLOW/RED)
- Attempts / Executed / Blocked / Incomplete
- "Top blocked reasons" table

**Page 3 — Controls Snapshot**
- Kill switches state
- PAE snapshot summary (hours/timezone/buffers/services)
- Any daily budgets

**Page 4 — Key Receipts**
Table with:
- Receipt_ID
- Task_ID
- Intent
- Outcome
- PAE_Check_Result
- External Proof (PR link / message-id / booking id)
- Completeness

**Page 5 — Ledger Integrity**
- First hash / last hash
- Integrity PASS/FAIL + notes
- Receipt count + timestamp range

**Appendix**
- Full PAE_Snapshot_JSON (or redacted version)
- Optional: Skills snapshot (scopes + allowed intents)

---

## 6) Hash Chain & Integrity

### Receipt Hash-Chaining (Optional but Elite)

Add fields to Execution Receipts:
- `Prev_Receipt_Hash` (Text)
- `Receipt_Hash` (Text)

Automation computes:
```
Receipt_Hash = sha256(Policy_ID + Task_ID + Attempted_At + Outcome + External_Proof + Prev_Receipt_Hash)
```

Now receipts become a **ledger**. If someone edits history, it shows.

### Verifier Pack Hash Chain

Pack hash computed as:
```
pack_hash = sha256(prev_pack_hash + receipts_sha256 + config_sha256 + merkle_root)
```

Store in `Pack_Hash` field, reference `Prev_Pack_Hash` from prior week.

---

## 7) Make.com Automation Blueprints

### Scenario A — EXEC_GATEKEEPER (Universal)

**Trigger:** Notion → Watch database items (Execution Tasks) where `Mode=EXECUTE` and `Status=Backlog`

**Steps:**
1. Notion: Get page (Task)
2. Router: Check `Gate_Status`
   - If starts with `BLOCKED` → go to "Block Path"
   - Else → go to "PAE + Consent Path"
3. Notion: Create Database Item (Execution Receipts) immediately
   - Outcome = `BLOCKED` (default)
   - Attempted_At = now
   - Copy Policy + Task + Channel + Intent
4. Notion: Query Database (PAE Config) where `Active=true` and `Channel=Task.Channel`
5. Tools/Functions: Evaluate PAE check
   - Check kill switches
   - Check hours/timezone
   - Check allowed intent/service/buffers
6. Notion: Update Receipt with:
   - `PAE_Check_Status` PASS/FAIL
   - `PAE_Check_Reason`
   - `Gate_Status_At_Time` READY/BLOCKED reason
7. Router: Based on PAE result
   - If FAIL → finalize blocked (write Blocked_Reason, set Task Status=Blocked, notify Slack)
   - If PASS → proceed
8. Consent validation:
   - Notion: Get Consent Token from relation
   - If not granted or expired → block + notify "needs consent"
9. Execute action subflow (by Intent):
   - BOOK → call booking tool (Cal.com / scheduling)
   - TRANSFER → call transfer tool
   - SEND_EMAIL → Gmail send
   - COMMIT → GitHub PR/commit
10. Update Receipt:
    - Outcome = EXECUTED (or FAILED)
    - Executed_At = now
    - External_Proof = booking id / call id / message id / PR link
11. Update Task:
    - Status = Done
    - Link Receipt

### Scenario B — VOICE_KILL_SWITCH_GUARD

**Trigger:** Any voice execute request

**Steps:**
1. Notion: Query PAE Config (Active voice)
2. Router:
   - If `VOICE_EXEC_ENABLED` unchecked → Block + Receipt + Slack ping
   - Else → continue into Execute Gatekeeper

### Scenario C — COMPLIANCE_SPIKE_MONITOR

**Schedule:** Every 15 minutes

**Steps:**
1. Notion: Query Execution Receipts:
   - Outcome = BLOCKED
   - Attempted_At = today
   - Channel = Voice (or All)
2. Aggregator: Count
3. Router:
   - If Count > 10 → Slack message with:
     - count
     - top Blocked_Reason (if coded)
     - dashboard link
     - current kill switch state
4. Optional auto-brake:
   - If Count > 25 → set `VOICE_EXEC_ENABLED=false` + create review task

### Scenario D — DRIFT_DETECTOR

**Schedule:** Daily at 8:05 AM

**Steps:**
1. Query receipts: last 7 days blocked, group by Blocked_Reason_Code
2. Query receipts: today blocked, group by Blocked_Reason_Code
3. Compute drift:
   - If today's top reason not in baseline top 3 OR % jump > threshold (e.g. +30%)
4. Slack alert + create "Investigate drift" task
5. Optional: auto-disable voice exec if drift is extreme

### Scenario E — WEEKLY_VERIFIER_PACK_EXPORT

**Schedule:** Weekly (Sunday night)

**Steps:**
1. Notion: Search Objects (Compliance_Weeks) where Week_Start = this week
2. Notion: Get a Database Item (the week row)
3. Notion: Search Objects (Execution Receipts) where Attempted_At within week range
4. Tools: Aggregate counts: attempts/blocked/executed/incomplete
5. Notion: Search Objects (PAE Config) where Active=true
6. Compose JSON: Pack_Input_JSON including:
   - week metadata
   - compliance score + counts
   - key receipts list (IDs + core fields)
   - ledger summary (first/last hash)
   - PAE snapshot
   - switches snapshot
7. Notion: Create Database Item in Verifier_Packs
   - Pack_Status=GENERATING
   - attach week relation
   - store PAE_Snapshot_JSON, Switches_Snapshot
   - store ledger anchors
8. Google Docs: Create document from template
9. Google Drive: Export as PDF
10. Drive: Move file into Verifier Packs folder
11. Tools: Compute PDF hash (SHA-256)
12. Notion: Update Verifier Pack row
    - Pack_Status=READY
    - PDF_Link / PDF_File
    - PDF_SHA256
13. Slack: Send message
    - "Verifier Pack READY: VP-2026-W04"
    - include: score, blocked count, ledger PASS/FAIL, PDF link, PDF sha256
14. Notion: Update Verifier Pack row with Slack permalink

**Failure Path:**
- On any error after step 7:
  - Update pack: Pack_Status=FAILED
  - write error message
  - Slack ping to #alerts-compliance

---

## 8) Verifier Pack Index (Last 12 + Trend Lines)

Create a Notion page: **"Verifier Pack Index"** with:

* Linked view: **Verifier Packs — Last 12** (sorted desc)
* Linked view: **Compliance Weekly — Chart view (line)** for Compliance_Score
* Linked view: **Compliance Daily — Chart view (line)** for Exec_Blocked
* KPI blocks:
  - Latest score
  - 7-day blocked total
  - "Blocked spike days" count
* Optional: a "Consistency Badge" formula (Gold/Silver/Red)

**Why auditors love this:**
It proves **stability over time**, not just one heroic week.

---

## 9) NotebookLM Integration (Read-Only Analysis Layer)

Use NotebookLM as a **read-only analysis layer** for:

* Last 12 Verifier Pack PDFs
* PAE snapshots
* Policy pages
* Weekly compliance summaries

**Operational rule:** NotebookLM may summarize and explain, but **it never triggers execute**. It's your "auditor copilot," not your intern with keys.

**Policy for NotebookLM:**
- Only user-provided sources (uploaded docs, Drive files)
- Sources explicitly reviewed and approved
- All imported sources logged with version/date/source URL
- Auto-discovered sources require operator review before production use

---

## 10) Extra "You May Not Know" Upgrades

### 1) Break-Glass Policy + Token
Emergency override requires:
- Dedicated Policy_ID
- Special receipt
- Mandatory reason field
- Two-person approval
- Auto-disables after 30 minutes

### 2) Rate Limits per Action Type
Example: max 3 bookings/minute; max 10 SMS/day. Stops runaway loops.

### 3) Prompt-Injection Firewall
Treat inbound messages/calls as hostile until validated. Keep a "Safe Intent Parser" step.

### 4) Quarantine Mode Switch
Separate from VOICE_EXEC_ENABLED: when enabled, **all execute becomes blocked** except pre-approved internal tasks.

### 5) Golden Run / Canary Pack
Weekly "known-good" scripted run that generates predictable receipts. If it breaks, you catch drift instantly.

### 6) Four Eyes for Money / Public Publishing
Any intent: `BUY`, `PUBLISH`, `PAYMENT` requires:
- Consent token from human
- Secondary confirmation step (two-person or two-click)

### 7) Canary Releases for Prompts/Skills
Add fields to Skill Registry:
- `Canary_Enabled` checkbox
- `Canary_Scope` (only one workspace)

New prompt/skill runs in canary for 24–48h → only then roll out.

### 8) Secret Hygiene (No Secrets in Notion)
Skills store only:
- where secret lives (Vault, env var, 1Password, etc.)
- rotation date
- last use

---

## 11) Compliance Dashboard Views

Create these views in Notion:

**Today: Blocked Attempts (Voice)**
- Filter: Outcome=BLOCKED, Channel=Voice, Attempted_At=today

**Spike Trend (Last 14 Days)**
- Group by day; show count of blocked

**Top Blocked Reasons (7 days)**
- Group by Blocked_Reason_Code; sort by count

**Receipts Incomplete (Needs Fix)**
- Filter: Is_Complete=false

**Weekly Compliance Score**
- View Compliance Weeks: last 8 weeks with score + status

---

## Final Summary

You now have:

✅ **Policies + Teeth** (receipts)  
✅ **Voice Safety Envelope** (PAE)  
✅ **Kill Switches** (global + voice)  
✅ **Dashboards** (compliance + spike + drift)  
✅ **Weekly Verifier Pack** (PDF + hash chain)  
✅ **12-Pack Index** with trend lines  
✅ **NotebookLM integration** (read-only auditor copilot)  
✅ **Make.com automation blueprints** (5 scenarios)  
✅ **Extra security upgrades** (break-glass, rate limits, canary releases)

This is the difference between "cool agent demo" and "court-safe, audit-grade operations" that won't email grandma a pull request or panic-buy 600 pounds of chia seeds.

---

**Version:** v1.0.0  
**Status:** Production-Ready  
**Last Updated:** 2026-01-25
