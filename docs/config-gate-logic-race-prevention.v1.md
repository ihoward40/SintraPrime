# Config Gate Logic & Race-Condition Prevention — Implementation Guide

**Version:** v1.0.0  
**Status:** Production-Ready  
**Last Updated:** 2026-01-25

This document specifies the enhanced configuration gate logic that prevents race conditions, ensures audit-grade provenance, and implements proper separation between human-controlled switches and system-computed locks.

---

## Problem Statement

The original implementation had several critical issues that could lead to operational failures:

1. **Incorrect Gate Logic:** Rollup `Pending_Config_Gate_Count` could keep PROD locked due to OLD or irrelevant pending changes
2. **Race Conditions:** Config changes during canary validation could cause re-enable against wrong config
3. **Ambiguous Control:** Mixing "hard off" (human toggle) with "gate off" (computed lock) created ownership confusion
4. **Missing Provenance:** No way to prove what config a canary actually validated
5. **Incomplete Audit Trail:** Blocked attempts didn't always generate receipts

---

## Part 1: Gate Logic — Latest Relevant Change

### The Core Principle

**Gate logic must reference "latest relevant change," not "any pending change."**

### Implementation

#### Step 1: Add `Gates_PROD_Execute` to Config Change Log

In `SP_Config_Change_Log`, add boolean property:

**Property:** `Gates_PROD_Execute` (Checkbox)

**Computation Logic:**
```
Gates_PROD_Execute = true IF:
  - Env = "PROD" 
  AND
  - Config_Domain in {ACTION_REGISTRY, PAE, RATE_LIMITS, SWITCHBOARD, PACK_PIPELINE}
  
Gates_PROD_Execute = false IF:
  - Env != "PROD" (e.g., DEV, STAGING)
  OR
  - Config_Domain in {DOCUMENTATION, OTHER}
```

**Why:** This allows us to distinguish between changes that should gate PROD execution (critical config) vs. changes that don't affect runtime behavior (documentation, non-prod changes).

#### Step 2: Update Switchboard Gate Logic

In `SP_Switchboard`, replace `Pending_Config_Gate_Count` with:

**Property:** `Latest_Gating_Config_Change_ID` (Text)

**Computation:** Relation/Rollup to `SP_Config_Change_Log` filtered by:
- `Gates_PROD_Execute = true`
- `Status = PENDING`
- Sorted by `Timestamp` descending
- Take first (most recent)

**Property:** `CONFIG_GATE_LOCKED` (Formula/Select)

**Formula:**
```notion
if(
  not empty(prop("Latest_Gating_Config_Change_ID")),
  true,
  false
)
```

**Property:** `CONFIG_GATE_REASON` (Formula/Text)

**Formula:**
```notion
if(
  prop("CONFIG_GATE_LOCKED"),
  "Pending config change " + prop("Latest_Gating_Config_Change_ID") + " awaiting canary validation",
  "No pending config changes"
)
```

### Step 3: Final Execute Gate Computation

**Property:** `Execute_Gate_Status` (Formula)

**Formula:**
```notion
if(
  not prop("EXECUTE_ENABLED"),
  "BLOCKED — EXECUTE_ENABLED OFF (human master switch)",
  if(
    prop("QUARANTINE_MODE"),
    "BLOCKED — QUARANTINE_MODE (human emergency lockdown)",
    if(
      prop("CONFIG_GATE_LOCKED"),
      "BLOCKED — " + prop("CONFIG_GATE_REASON"),
      "PASS — All gates clear"
    )
  )
)
```

**Key Separation:**
- `EXECUTE_ENABLED` = **Human-controlled master switch** ("should PROD ever execute?")
- `QUARANTINE_MODE` = **Human-controlled emergency lockdown** ("emergency stop")
- `CONFIG_GATE_LOCKED` = **System-computed lock** ("is it safe right now based on config state?")

Auditors can clearly see:
- Humans own strategic control
- System owns tactical safety
- No ambiguity about who/what controls what

---

## Part 2: Config Fingerprinting (Race-Condition Prevention)

### The Problem

**Scenario:**
1. Config change A → cooldown → canary runs
2. **During canary:** Config change B happens
3. Canary for A completes successfully
4. System re-enables based on canary A
5. **But now running with config B** (not validated by canary!)

**Result:** Production is running with unvalidated configuration.

### The Solution: Config Fingerprinting

#### Step 1: Add Fingerprint Properties to Config Change Log

In `SP_Config_Change_Log`:

**Property:** `Config_Fingerprint_SHA256` (Text)
- SHA-256 hash of the configuration snapshot at time of change
- Computed from canonical JSON of all relevant config tables

**Property:** `Config_Snapshot_B64` (Text) **OR** `Config_Snapshot_URL` (URL)
- Complete snapshot of configuration state
- Base64-encoded canonical JSON **OR** URL to stored blob (Drive)

**Property:** `Fingerprint_Matches_Current` (Select: PASS/FAIL/NOT_CHECKED)
- Computed at re-enable time
- PASS only if: fingerprint used by canary == current fingerprint
- FAIL if fingerprints differ (config changed during canary)

#### Step 2: Add Current Fingerprint to Switchboard

In `SP_Switchboard`:

**Property:** `Current_Config_Fingerprint_SHA256` (Text)
- Updated by Make.com automation whenever config snapshot is taken
- Represents the SHA-256 of current effective configuration
- Source of truth for "what config is running now"

#### Step 3: Canary Validation Logic

**Rule:** Canary PASS only counts if:
```
Config_Fingerprint_SHA256 (from canary test) 
== 
Current_Config_Fingerprint_SHA256 (at re-enable time)
```

**Workflow:**
1. Config change CFG-001234 created with fingerprint `abc123...`
2. PROD execute gate locks
3. Cooldown period expires
4. Canary runs with config fingerprint `abc123...`
5. **Before re-enabling:** Check if `Current_Config_Fingerprint_SHA256` still equals `abc123...`
6. If YES → PASS, re-enable
7. If NO → FAIL, stay locked, notify operator

**Implementation in Config Change Log:**

Add properties:
- `Reenable_Attempted_At` (Date)
- `Reenable_Result` (Select: PASS/FAIL/NOT_ATTEMPTED)
- `Reenable_Receipt` (Relation → Execution Receipts)

**Make.com Re-Enable Logic:**
```
1. Read Config Change row (CFG-XXXXX)
2. Get Config_Fingerprint_SHA256 from change
3. Read Switchboard Current_Config_Fingerprint_SHA256
4. IF fingerprints match:
     Set Fingerprint_Matches_Current = "PASS"
     Set Reenable_Result = "PASS"
     Update Switchboard: CONFIG_GATE_LOCKED = false
     Create Success Receipt
5. ELSE:
     Set Fingerprint_Matches_Current = "FAIL"
     Set Reenable_Result = "FAIL"
     Keep CONFIG_GATE_LOCKED = true
     Create Blocked Receipt with reason
     Send Slack alert: "Config changed during canary, manual review required"
```

### Step 4: Snapshot Canonicalization

**To ensure fingerprints are reproducible:**

1. **Stable Field Ordering:** Sort all object keys alphabetically
2. **Consistent Formatting:** Use JSON.stringify with separators `(',', ':')`
3. **No Extra Whitespace:** Remove all unnecessary whitespace
4. **Timestamp Normalization:** All timestamps in ISO 8601 UTC
5. **Boolean Normalization:** Use `true`/`false` (not "✅" or "Yes")

**Example Canonical Snapshot:**
```json
{
  "action_registry_version": "v1.2.0",
  "captured_at": "2026-01-25T10:00:00Z",
  "controls": [
    {
      "control_name": "EXECUTE_ENABLED",
      "is_enabled": true,
      "scope": "GLOBAL"
    },
    {
      "control_name": "QUARANTINE_MODE",
      "is_enabled": false,
      "scope": "GLOBAL"
    }
  ],
  "pae_config": {
    "buffers": {
      "after_minutes": 10,
      "before_minutes": 10
    },
    "timezone": "America/New_York"
  },
  "rate_limits": {
    "max_bookings_per_day": 10,
    "max_sms_per_day": 10
  },
  "snapshot_version": "canon.v1"
}
```

**Compute Fingerprint:**
```javascript
const canonical = JSON.stringify(snapshot, Object.keys(snapshot).sort(), (',', ':'));
const fingerprint = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
```

---

## Part 3: Evidence JSON (Scalable Evidence Validation)

### The Problem

Notion formulas can't dynamically read "Required_Evidence_Fields" and check arbitrary properties by name. As Action Registry grows, formula-only completeness checks don't scale.

### The Solution: Evidence JSON

#### Step 1: Add Evidence_JSON to Execution Receipts

In `SP_Execution_Receipts`:

**Property:** `Evidence_JSON` (Text)
- Canonical JSON string containing all evidence fields
- **Source of truth** for evidence
- Can still keep convenience columns (sms_sid, pr_url, etc.) but JSON is authoritative

**Property:** `Missing_Fields` (Text)
- Comma-separated list of required fields that are missing
- Computed before execute

**Property:** `Receipt_Completeness` (Select: COMPLETE/MISSING)
- Based on Evidence_JSON validation

#### Step 2: Evidence JSON Format

**Example for VOICE_BOOKING:**
```json
{
  "action_type": "VOICE_BOOKING",
  "timestamp": "2026-01-25T14:30:00Z",
  "calendar_event_id": "evt_abc123",
  "calendar_event_url": "https://calendar.google.com/event/...",
  "service_name": "Trust Review Call",
  "start_time": "2026-01-27T10:00:00-05:00",
  "end_time": "2026-01-27T10:45:00-05:00",
  "attendee_email": "client@example.com",
  "confirmation_sent": true,
  "twilio_call_sid": "CA1234567890abcdef",
  "pae_check_result": "PASS",
  "pae_details": {
    "within_hours": true,
    "service_approved": true,
    "buffer_ok": true
  }
}
```

**Example for SMS_SEND:**
```json
{
  "action_type": "SMS_SEND",
  "timestamp": "2026-01-25T14:30:00Z",
  "twilio_message_sid": "SM1234567890abcdef",
  "to_number": "+1XXXXXXXXXX",
  "from_number": "+1YYYYYYYYYY",
  "message_body": "Your appointment is confirmed for...",
  "message_status": "delivered",
  "template_used": "appointment_confirmation_v1",
  "consent_verified": true
}
```

#### Step 3: Validation Logic (Make.com)

**Pre-Execute Validation:**
```
1. Read Action Registry row for action_type
2. Get Required_Evidence_Fields (JSON array)
3. Build Evidence_JSON object with available fields
4. Check for missing required fields
5. IF missing:
     Set Missing_Fields = "calendar_event_id,attendee_email"
     Set Receipt_Completeness = "MISSING"
     Create BLOCKED receipt
     STOP
6. ELSE:
     Proceed with execute
```

**Post-Execute Update:**
```
1. Execute tool call
2. Capture all evidence (API responses, IDs, timestamps)
3. Update Evidence_JSON with complete evidence
4. Set Missing_Fields = "" (empty)
5. Set Receipt_Completeness = "COMPLETE"
6. Compute receipt hash including Evidence_JSON
```

---

## Part 4: Universal Blocked Attempt Receipts

### The Rule

**Every attempted action produces a receipt, even preflight failures.**

### Implementation

**Make.com Preflight Subroutine (Universal):**

```
START: Preflight Gate Check

1. Create Receipt (PENDING)
   - Mode = "EXECUTE"
   - Result = "PENDING"
   - Action_Type = [from request]
   - Request_ID = [idempotency key]
   - Timestamp = NOW()

2. Read Switchboard
   IF Execute_Gate_Status != "PASS":
     Update Receipt:
       - Result = "BLOCKED"
       - Blocked_Reason_Code = [from gate status]
       - Blocked_Reason_Detail = [from CONFIG_GATE_REASON or other]
       - Receipt_Completeness = "COMPLETE"
     STOP (do not execute)

3. Read Action Registry
   IF action_type not found:
     Update Receipt:
       - Result = "BLOCKED"
       - Blocked_Reason_Code = "MISSING_POLICY"
       - Receipt_Completeness = "COMPLETE"
     STOP

4. Resolve Required_Policy_ID + Required_Evidence_Fields
   IF policy missing:
     Update Receipt:
       - Result = "BLOCKED"
       - Blocked_Reason_Code = "MISSING_POLICY"
       - Receipt_Completeness = "COMPLETE"
     STOP

5. IF PAE required:
     Evaluate PAE → PASS/FAIL
     IF FAIL:
       Update Receipt:
         - Result = "BLOCKED"
         - Blocked_Reason_Code = "PAE_FAIL"
         - PAE_Check_Result = "FAIL"
         - PAE_Reason = [details]
         - Receipt_Completeness = "COMPLETE"
       STOP

6. Rate limit check using receipt counts
   IF rate limit exceeded:
     Update Receipt:
       - Result = "BLOCKED"
       - Blocked_Reason_Code = "RATE_LIMIT"
       - Receipt_Completeness = "COMPLETE"
     STOP

7. Create pre-exec receipt with snapshot hashes
   Update Receipt:
     - Switchboard_Snapshot_SHA256 = [current]
     - PAE_Snapshot_SHA256 = [current if applicable]
     - ActionRegistry_Snapshot_SHA256 = [current]
     - Config_Fingerprint_SHA256 = [current]
     - Evidence_JSON = [initial/partial]
     - Receipt_Completeness = "MISSING"

8. EXECUTE tool call

9. Update receipt with evidence + finalize hashes
   Update Receipt:
     - Result = "SUCCESS" or "FAILED"
     - Evidence_JSON = [complete]
     - External_Ref = [from tool response]
     - Primary_Artifact_Link = [URL]
     - Receipt_Completeness = "COMPLETE"
     - Receipt_Hash = [computed]

10. Emit to Pack chain (weekly + optionally canary)

END
```

**Key Principle:** A receipt is created in step 1 (PENDING), and then updated throughout the process. Even if the action never executes, a receipt exists showing it was attempted and why it was blocked.

---

## Part 5: Canary Packs (Sealed Artifacts)

### The Requirement

If canary is what re-opens PROD, it needs to be auditable as a **sealed artifact**, not just a database entry.

### Implementation

#### Step 1: Create Canary Packs Database

**Database:** `Canary Packs (SintraPrime)`

**Properties:**

| Property Name | Type | Notes |
|---------------|------|-------|
| `Canary_Pack_ID` | Title | Format: `CAN-YYYYMMDD-NNN` |
| `Config_Change_ID` | Relation | → Config Change Log |
| `Triggered_At` | Created time | When canary started |
| `Canary_Type` | Select | `ACTION_REGISTRY`, `PAE`, `RATE_LIMITS`, `SWITCHBOARD` |
| `Test_Receipts` | Relation | → Execution Receipts (canary test receipts) |
| `Test_Result` | Select | `PASS`, `FAIL`, `ERROR` |
| `Config_Fingerprint_SHA256` | Text | Fingerprint of config being tested |
| `Canary_Pack_JSON` | Text | Small JSON or PDF artifact |
| `Canary_Pack_Hash` | Text | SHA-256 of pack |
| `Chain_Hash` | Text | Links to weekly pack chain |
| `Notes` | Text | What was tested, results |

#### Step 2: Canary Test Process

**Workflow:**
1. Config change triggers cooldown
2. After cooldown expires, canary test begins
3. Create Canary Pack row (PENDING)
4. Execute test actions (e.g., test booking, test SMS)
5. Create Execution Receipts for each test (linked to Canary Pack)
6. Evaluate results (all PASS?)
7. Generate Canary Pack JSON with:
   - Config fingerprint
   - Test receipt IDs + hashes
   - Pass/fail results
   - Config snapshot
8. Compute Canary_Pack_Hash
9. Update Canary Pack row:
   - Test_Result = PASS/FAIL
   - Canary_Pack_Hash = [computed]
10. IF PASS and fingerprint matches current:
      Update Config Change: Reenable_Result = PASS
      Create Reenable Receipt
      Clear CONFIG_GATE_LOCKED
11. ELSE:
      Keep locked, notify operator

**Canary Pack JSON Format:**
```json
{
  "canary_pack_version": "canary.v1",
  "canary_pack_id": "CAN-20260125-001",
  "config_change_id": "CFG-001234",
  "triggered_at": "2026-01-25T15:00:00Z",
  "canary_type": "PAE",
  "config_fingerprint_sha256": "abc123...",
  "test_receipts": [
    {
      "receipt_id": "RCP-999001",
      "action_type": "VOICE_BOOKING",
      "result": "SUCCESS",
      "receipt_hash": "def456..."
    },
    {
      "receipt_id": "RCP-999002",
      "action_type": "SMS_SEND",
      "result": "SUCCESS",
      "receipt_hash": "ghi789..."
    }
  ],
  "test_result": "PASS",
  "test_summary": "All 2 test actions completed successfully",
  "pack_hash": "jkl012...",
  "generated_at": "2026-01-25T15:10:00Z"
}
```

---

## Part 6: Snapshot Hashes in Receipts

### The Requirement

Receipts must prove what config state they were governed by at the moment of execution.

Weekly packs prove "that week." Receipts prove "that moment."

### Implementation

Each receipt stores snapshot hashes:

**In `SP_Execution_Receipts`:**

- `Switchboard_Snapshot_SHA256` (Text)
- `PAE_Snapshot_SHA256` (Text) — if PAE required
- `ActionRegistry_Snapshot_SHA256` (Text)
- `Config_Fingerprint_SHA256` (Text) — overall config state

**How to Populate:**

**Make.com Preflight (Step 7 from above):**
```
1. Read Switchboard → generate canonical JSON → SHA256 → store
2. Read PAE Config (if required) → canonical JSON → SHA256 → store
3. Read Action Registry row → canonical JSON → SHA256 → store
4. Compute overall config fingerprint (or read from Switchboard.Current_Config_Fingerprint_SHA256)
5. Update Receipt with all snapshot hashes
```

**Why This Matters:**

- Auditor can verify: "This receipt claims it was governed by PAE config X. Is that true?"
- Forensics: "On 2026-01-25 at 14:30, what config was in effect?"
- Tamper evidence: "Did someone change config retroactively?"

The snapshots can be stored:
- As base64 JSON in a Config Snapshots database
- As URLs to Drive blobs
- Both (JSON for small configs, URLs for large)

**Receipt hash includes all snapshot hashes**, creating tamper-evident linkage.

---

## Part 7: Rate Limit Changes Must Gate PROD

### The Problem

Rate limits are where runaway loops hide. If rate limit logic changes, PROD could suddenly send 10x SMS without realizing.

### The Solution

**Rule:** Any change to rate limits must trigger PROD lock + canary.

**In Config Change Log:**

If `Config_Domain = "RATE_LIMITS"` and `Env = "PROD"`:
- Set `Gates_PROD_Execute = true`
- Trigger cooldown
- Require canary with rate-limited actions
- Only re-enable after canary PASS

**Rate Limit Change Examples:**
- Changing `MAX_SMS_PER_DAY` from 10 to 50
- Changing rate limit scope (per-user vs. global)
- Changing receipt counting filters
- Changing time window (per-day vs. per-hour)

**Canary Test for Rate Limits:**
- Execute test actions near the new limit
- Verify limit enforcement works correctly
- Verify no runaway loops

---

## Part 8: Make.com Preflight Enforcement

### The Universal Subroutine

**Every scenario (voice/text/workflow) must start with the same preflight:**

```
Module 1: Preflight Gate Check (Universal)

INPUT: 
  - action_type
  - request_id (idempotency key)
  - action_context (caller, target, etc.)

1. Create Receipt (PENDING)
2. Check Switchboard Execute_Gate_Status
3. IF blocked → Update Receipt (BLOCKED) → STOP
4. Read Action Registry for action_type
5. Resolve policy + evidence requirements
6. IF missing policy → Update Receipt (BLOCKED) → STOP
7. IF PAE required → Evaluate PAE → IF FAIL → Update Receipt (BLOCKED) → STOP
8. Check rate limits
9. IF exceeded → Update Receipt (BLOCKED) → STOP
10. Snapshot config hashes → Update Receipt
11. PROCEED to execute module

Module 2: Execute Tool Call

12. Call external tool/API
13. Capture response

Module 3: Finalize Receipt

14. Update Receipt with evidence
15. Compute receipt hash
16. Emit to pack chain
17. RETURN success/fail

ERROR HANDLING:
  - ANY failure in Module 1 → Receipt created (BLOCKED)
  - ANY failure in Module 2 → Receipt updated (FAILED)
  - ALL paths create a receipt
```

**Key Invariant:**

> **Every attempted action produces a receipt.**
> 
> **Every receipt links to Action Registry + Policy + Switchboard snapshot hash.**

This makes governance **enforced**, not aspirational.

---

## Summary: What We Built

### 8 Critical Upgrades

1. ✅ **Gate logic references latest relevant change** (not any pending change)
2. ✅ **Config fingerprinting prevents race-condition canaries**
3. ✅ **"Hard off" vs "gate off" separation** (human vs. system control)
4. ✅ **Evidence JSON for scalable validation**
5. ✅ **Universal blocked attempt receipts**
6. ✅ **Canary packs as sealed artifacts**
7. ✅ **Snapshot hashes in receipts**
8. ✅ **Rate limit changes gate PROD**

### Result

The system is now:

- **Race-condition safe** — Fingerprints prevent validating wrong config
- **Auditor-readable** — Clear separation of human vs. system control
- **Machine-verifiable** — Snapshot hashes prove config state
- **Self-governing** — System enforces rules, not just documents them

### Next Level: Config Change Packs

For maximum provenance, add **"Config Change Pack"** (JSON-only) for every PROD-gating change, chained just like weekly packs. Then even configuration history is provenance-evident.

**Format:**
```json
{
  "config_change_pack_version": "cfgpack.v1",
  "config_change_id": "CFG-001234",
  "config_domain": "PAE",
  "timestamp": "2026-01-25T10:00:00Z",
  "before_snapshot_sha256": "before_abc123...",
  "after_snapshot_sha256": "after_def456...",
  "canary_pack_id": "CAN-20260125-001",
  "reenable_receipt_id": "RCP-888888",
  "chain_prev_pack_sha256": "prev_cfg_pack...",
  "chain_this_pack_sha256": "this_cfg_pack..."
}
```

This creates an immutable audit trail of every configuration change, with provable canary validation and hash chain continuity.

---

**Version:** v1.0.0  
**Status:** Production-Ready  
**Last Updated:** 2026-01-25
