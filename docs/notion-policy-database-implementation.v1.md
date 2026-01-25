# SintraPrime Policy Database — Complete Notion Implementation Guide

**Version:** v1.0.0  
**Status:** Production-Ready  
**Last Updated:** 2026-01-25

This document provides step-by-step instructions for implementing the complete SintraPrime agent governance system in Notion, including databases, templates, formulas, and automated enforcement hooks.

---

## Overview: What You're Building

A production-grade agent governance system where:

- **Policies** automatically ship with enforcement hooks
- **Receipts** are created with one-click buttons
- **Compliance** is measured automatically
- **Alerts** fire on spikes
- **Verifier Packs** export weekly for audits

This is the difference between "cool agent demo" and "court-safe, audit-grade operations."

---

## Part 1: Core Databases Setup

### Database 1: Policy Registry (SintraPrime)

**Create new database:** `Policy Registry (SintraPrime)`

**Required Properties:**

| Property Name | Type | Options/Formula |
|---------------|------|-----------------|
| `Policy_ID` | Unique ID | Prefix: `POL`, Number format |
| `Status` | Select | `Draft`, `Active`, `Deprecated` |
| `Applies_To` | Multi-select | `Voice`, `Email`, `GitHub`, `Calendar`, `SMS`, `All Agents` |
| `Risk_Level` | Select | `Low`, `Med`, `High`, `Critical` |
| `Owner` | Person | - |
| `Receipts` | Relation | → Execution Receipts (two-way) |
| `Policy_OK` | Formula | See below |

**Policy_OK Formula:**
```notion
and(prop("Status") = "Active", not empty(prop("Policy_ID")))
```

---

### Database 2: Execution Receipts (SintraPrime)

**Create new database:** `Execution Receipts (SintraPrime)`

**Required Properties:**

| Property Name | Type | Options/Formula |
|---------------|------|-----------------|
| `Receipt_ID` | Unique ID | Prefix: `RCP` |
| `Timestamp` | Created time | - |
| `Mode` | Select | `READ`, `EXECUTE` |
| `Action_Type` | Select | `VOICE_BOOKING`, `VOICE_TRANSFER`, `SMS_SEND`, `EMAIL_SEND`, `GITHUB_PR`, `PUBLISH`, `BUY`, `OTHER` |
| `Target_System` | Select | `Voice`, `Calendar`, `Slack`, `Gmail`, `GitHub`, `Notion`, `Drive`, `Other` |
| `Policy` | Relation | ← Policy Registry |
| `Policy_ID` | Rollup | Policy → Policy_ID → Show original |
| `Policy_OK` | Rollup | Policy → Policy_OK → Show original |
| `Request_ID` | Text | Idempotency key |
| `Confirmed_By_User` | Checkbox | - |
| `Consent_OK` | Checkbox | - |
| `RateLimit_OK` | Checkbox | - |
| `VOICE_EXEC_ENABLED` | Checkbox | Mirrored/filled by automation |
| `QUARANTINE_MODE` | Checkbox | Mirrored/filled by automation |
| `PAE_Check_Result` | Select | `PASS`, `FAIL` |
| `PAE_Reason` | Text | - |
| `Break_Glass_Used` | Checkbox | - |
| `Break_Glass_OK` | Checkbox | - |
| `Break_Glass_Reason` | Text | - |
| `Result` | Select | `PENDING`, `SUCCESS`, `FAILED`, `BLOCKED` |
| `External_Ref` | Text | message-id / PR URL / call SID / event URL |
| `Primary_Artifact_Link` | URL | - |
| `Evidence_Link` | URL | - |
| `Receipt_Hash` | Text | - |
| `Chain_Hash` | Text | - |
| `Gate_Status` | Formula | See below |
| `Receipt_Completeness` | Formula | See below |
| `Is_Complete` | Formula | See below |

**Gate_Status Formula:**
```notion
if(prop("QUARANTINE_MODE"),
  "BLOCKED — QUARANTINE_MODE",
  if(prop("Mode") = "READ",
    "PASS — READ MODE",
    if(not prop("Policy_OK"),
      "BLOCKED — Missing/Invalid Policy",
      if(not prop("Confirmed_By_User") and not(prop("Break_Glass_Used") and prop("Break_Glass_OK")),
        "BLOCKED — Consent Required",
        if(prop("PAE_Check_Result") = "FAIL",
          "BLOCKED — PAE FAIL",
          if(not prop("RateLimit_OK"),
            "BLOCKED — Rate Limit",
            if(not prop("Consent_OK"),
              "BLOCKED — Consent Registry",
              if(not prop("VOICE_EXEC_ENABLED"),
                "BLOCKED — VOICE_EXEC_ENABLED OFF",
                "PASS — EXECUTE APPROVED"
))))))))
```

**Receipt_Completeness Formula:**
```notion
if(
  or(
    empty(prop("Policy_ID")),
    empty(prop("Action_Type")),
    empty(prop("Target_System")),
    empty(prop("Request_ID")),
    empty(prop("PAE_Check_Result")),
    empty(prop("Result")),
    empty(prop("Timestamp"))
  ),
  "INCOMPLETE",
  if(
    and(
      prop("Gate_Status") = "PASS — EXECUTE APPROVED",
      or(
        empty(prop("External_Ref")),
        empty(prop("Primary_Artifact_Link"))
      )
    ),
    "INCOMPLETE",
    "COMPLETE"
  )
)
```

**Is_Complete Formula:**
```notion
prop("Receipt_Completeness") == "COMPLETE"
```

---

## Part 2: Policy Page Template (Ships With Teeth)

In **Policy Registry**, create a new **Template** named:

**Policy Page — SintraPrime (With Teeth)**

### Template Page Body:

```markdown
# SintraPrime Policy Snippet

## Policy_ID
(autofilled by Policy_ID property)

## Applies_To
(Select tags in Applies_To property)

## Allowed/Denied
### ALLOWED:
- 

### DENIED:
- 

## Logging Requirements ✅
- [ ] Every EXECUTE references this Policy_ID
- [ ] Every EXECUTE generates an Execution Receipt row
- [ ] Receipt includes External_Ref (message-id / PR / call SID / event URL)
- [ ] Receipt includes Primary_Artifact_Link + Evidence_Link
- [ ] Receipt includes PAE_Check_Result (PASS/FAIL + reason) when Voice/SMS/Booking involved
- [ ] Receipt includes Request_ID (idempotency key)

## Failure Handling 🧯
- [ ] Fail closed (block execute) on missing policy link
- [ ] Fail closed on missing receipt write
- [ ] If tool failure repeats → QUARANTINE_MODE ON
- [ ] Slack alert on blocked spike threshold

## Escalation Path 📣
- [ ] Operator Review Queue
- [ ] Compliance Owner
- [ ] System Owner
- [ ] Break-Glass (POL-BG-001) only if urgent + reason logged

---

# Enforcement Hooks (auto-linked)

## Create a Receipt (this policy)
Use the buttons below to generate receipts that are automatically linked to THIS policy page.

[Button placeholders - see setup instructions below]

## Receipts (linked)
[Linked database view - filtered to this policy]

## Receipts Needing Attention
[Linked database view - filtered to incomplete or blocked]
```

### Add Buttons to Template:

**Button 1: ➕ Create EXECUTE Receipt (PENDING)**

Configure button:
- **Add page to:** `Execution Receipts (SintraPrime)`
- **Use template:** `Receipt — Standard (Execute)`
- **Set properties:**
  - `Policy` → **This page**
  - `Mode` → `EXECUTE`
  - `Result` → `PENDING`
  - `Confirmed_By_User` → unchecked
  - `RateLimit_OK` → checked
  - `Consent_OK` → unchecked

**Button 2: ➕ Create BLOCKED Attempt Receipt**

Configure button:
- **Add page to:** `Execution Receipts (SintraPrime)`
- **Use template:** `Receipt — Blocked`
- **Set properties:**
  - `Policy` → **This page**
  - `Mode` → `EXECUTE`
  - `Result` → `BLOCKED`

**Button 3: 🧨 Create BREAK-GLASS Receipt**

Configure button:
- **Add page to:** `Execution Receipts (SintraPrime)`
- **Use template:** `Receipt — Break-Glass`
- **Set properties:**
  - `Policy` → **This page**
  - `Mode` → `EXECUTE`
  - `Result` → `PENDING`
  - `Break_Glass_Used` → checked

### Add Linked Database Views to Template:

**View 1: Receipts (This Policy)**
- Type: `/linked view of database`
- Select: `Execution Receipts (SintraPrime)`
- Filter: `Policy` **contains** `This page`
- Sort: `Timestamp` descending

**View 2: Receipts Needing Attention**
- Type: `/linked view of database`
- Select: `Execution Receipts (SintraPrime)`
- Filters:
  - `Policy` **contains** `This page`
  - AND `Is_Complete` = false **OR** `Gate_Status` **contains** `"BLOCKED"`

---

## Part 3: Receipt Templates

### Template 1: Receipt — Standard (Execute)

Create in **Execution Receipts** database.

**Template body:**

```markdown
# Execution Receipt (Standard)

## What is being attempted?
- **Action_Type:** [Select from property]
- **Target_System:** [Select from property]
- **Request_ID (idempotency key):** [Fill in property]
- **Operator/Caller Context:** [Describe]

## Gate Inputs (must be true to execute) ✅
- [ ] Policy linked
- [ ] Confirmed_By_User checked
- [ ] Consent_OK checked (if outbound)
- [ ] RateLimit_OK checked
- [ ] PAE_Check_Result = PASS (voice/sms/booking)
- [ ] QUARANTINE_MODE is OFF
- [ ] VOICE_EXEC_ENABLED is ON (voice/sms/booking)

## Execution Result
- **Result:** [PENDING → SUCCESS/FAILED/BLOCKED]
- **External_Ref:** [message-id / PR URL / call SID / event URL]

## Artifacts
- **Primary_Artifact_Link:** [URL]
- **Evidence_Link:** [URL]

## PAE Check (required for voice)
- **PAE_Check_Result:** [PASS/FAIL]
- **PAE_Reason:** [Text]

## Hashing (audit-grade)
- **Receipt_Hash:** [Computed by automation]
- **Chain_Hash:** [Computed by automation]

## Notes / Anomalies
- Anything weird?
- Any injection attempts?
- Any tool failure?
```

### Template 2: Receipt — Blocked

**Template body:**

```markdown
# Execution Receipt (Blocked)

## Why was this blocked?
- **Gate_Status:** [Formula shows reason]
- **Missing fields / failed checks:** [List them]
- **PAE_Check_Result + reason:** [If applicable]

## Evidence
- **Evidence_Link:** [URL if any]
- **External_Ref:** [Text if any]

## Follow-up
- [ ] Notify Slack (if spike)
- [ ] Open Incident page (if threshold exceeded)
- [ ] Add to retry queue (only if safe + idempotent)
```

### Template 3: Receipt — Break-Glass

**Template body:**

```markdown
# Execution Receipt (Break-Glass)

## Emergency Justification (mandatory)
- **Break_Glass_Reason:** [Required text]
- **Why delay causes harm:** [Explain]
- **What safer options failed:** [List]

## Approvals
- [ ] Break_Glass_OK (approved)
- [ ] Confirmed_By_User (still required unless physically impossible)

## Execution
- **External_Ref:** [Evidence]
- **Result:** [SUCCESS/FAILED]
- **Artifacts:** [Links]

## Post-Action
- [ ] Auto-create Incident
- [ ] Postmortem stub created
- [ ] Review permissions + prevent recurrence
```

---

## Part 4: Additional Databases

### Database 3: PAE Config (Pre-Approved Action Envelope)

**Create new database:** `PAE Config (SintraPrime)`

**Single-row config table.**

**Properties:**

| Property Name | Type | Notes |
|---------------|------|-------|
| `PAE_ID` | Title | e.g., "PAE — Production" |
| `Timezone` | Text | e.g., "America/New_York" |
| `Hours_Open` | Text | e.g., "09:00" |
| `Hours_Close` | Text | e.g., "17:00" |
| `Service_List` | Multi-select | Services allowed for booking |
| `Buffer_Before_Min` | Number | Minutes before appointment |
| `Buffer_After_Min` | Number | Minutes after appointment |
| `Transfer_Number_List` | Text | Comma-separated phone numbers |
| `Approved_Calendars` | Text | Calendar IDs |
| `Approved_SMS_Templates` | Multi-select | Template names |
| `Config_Version` | Text | e.g., "v1.2.0" |
| `Config_Hash` | Text | SHA-256 of config |

### Database 4: Switchboard (Global Toggles)

**Create new database:** `Switchboard (SintraPrime)`

**Single-row control center.**

**Properties:**

| Property Name | Type | Default |
|---------------|------|---------|
| `Switchboard_ID` | Title | "MAIN" |
| `VOICE_EXEC_ENABLED` | Checkbox | ✓ |
| `QUARANTINE_MODE` | Checkbox | ☐ |
| `BUDGET_GOV_ENABLED` | Checkbox | ✓ |
| `MAX_BOOKINGS_PER_MIN` | Number | 3 |
| `MAX_SMS_PER_DAY` | Number | 10 |
| `Spike_Threshold_Per_Day` | Number | 10 |

### Database 5: Compliance Metrics (Daily)

**Create new database:** `Compliance Metrics (SintraPrime)`

**Properties:**

| Property Name | Type | Notes |
|---------------|------|-------|
| `Date` | Date | - |
| `Blocked_Exec_Attempts` | Number | Count of blocked |
| `Execute_Success_Count` | Number | Count of successful |
| `Execute_Fail_Count` | Number | Count of failed |
| `Injection_Flags` | Number | Count of injection attempts |
| `Compliance_Score` | Formula | See below |
| `Notes` | Text | - |

**Compliance_Score Formula:**
```notion
if(
  prop("Blocked_Exec_Attempts") + prop("Execute_Success_Count") + prop("Execute_Fail_Count") == 0,
  100,
  round(
    100 * prop("Execute_Success_Count") / 
    (prop("Blocked_Exec_Attempts") + prop("Execute_Success_Count") + prop("Execute_Fail_Count"))
  )
)
```

### Database 6: Verifier Packs

**Create new database:** `Verifier Packs (SintraPrime)`

**Properties:**

| Property Name | Type | Notes |
|---------------|------|-------|
| `Pack_ID` | Title | Format: "VP-YYYY-WXX" |
| `Week_Start` | Date | - |
| `Week_End` | Date | - |
| `Pack_PDF_Link` | URL | Link to generated PDF |
| `Pack_Hash` | Text | SHA-256 of pack |
| `Chain_Hash` | Text | Links to previous pack |
| `Top_Receipts` | Relation | → Execution Receipts |
| `Compliance_Score` | Rollup | From Compliance Metrics |
| `Config_Snapshot_Hash` | Text | PAE + Switchboard hash |

### Database 7: Incidents

**Create new database:** `Incidents (SintraPrime)`

**Properties:**

| Property Name | Type | Options |
|---------------|------|---------|
| `Incident_ID` | Unique ID | Prefix: "INC" |
| `Triggered_By` | Select | `BlockedSpike`, `CanaryFail`, `InjectionDetected`, `ToolFailure`, `BudgetExceeded` |
| `Severity` | Select | `Low`, `Med`, `High`, `Critical` |
| `Linked_Receipts` | Relation | → Execution Receipts |
| `Timeline` | Text | Event timeline |
| `Owner` | Person | - |
| `Status` | Select | `Open`, `Investigating`, `Resolved` |
| `Postmortem_Link` | URL | - |

---

## Part 5: Global Views & Safety Nets

### View 1: 🚨 EXECUTE with No Policy (Should Be Empty)

In **Execution Receipts**, create a view:

**Name:** `🚨 EXECUTE with No Policy`

**Filters:**
- `Mode` = `EXECUTE`
- AND `Policy` **is empty**

**Purpose:** If this ever has rows, your system caught a policy violation before it escaped.

### View 2: Blocked Spike Alert

In **Execution Receipts**, create a view:

**Name:** `🔴 Blocked Today (Spike Watch)`

**Filters:**
- `Result` = `BLOCKED`
- AND `Timestamp` **is today**

**Purpose:** Quick visual check for blocked attempts spike.

### View 3: Incomplete Receipts

In **Execution Receipts**, create a view:

**Name:** `⚠️ Incomplete Receipts`

**Filters:**
- `Is_Complete` = false

**Purpose:** Shows all receipts missing required fields.

---

## Part 6: Enforcement Logic Summary

### What Makes This "Have Teeth"

1. **Auto-Linking:** Every receipt created from a policy page automatically links back to that policy
2. **One-Click Creation:** Buttons on policy pages create properly-structured receipts instantly
3. **Formula Enforcement:** `Gate_Status` formula blocks execution if requirements not met
4. **Completeness Checking:** `Receipt_Completeness` formula ensures all required fields are filled
5. **Global Safety Nets:** Views catch policy violations before they escape
6. **Audit Trail:** Every action has a receipt with evidence links

### The Enforcement Flow

```
1. Policy Page → Create Receipt Button → Receipt Created (auto-linked)
2. Receipt Properties Set → Gate_Status Formula Evaluates → PASS/BLOCKED
3. If PASS → Automation Executes → Updates Receipt with External_Ref
4. Receipt_Completeness Formula Checks → COMPLETE/INCOMPLETE
5. Global Views Monitor → Alert on Violations
```

---

## Part 7: Quick Start Checklist

- [ ] Create **Policy Registry** database with all properties
- [ ] Create **Execution Receipts** database with all properties and formulas
- [ ] Create **PAE Config** database (single row)
- [ ] Create **Switchboard** database (single row)
- [ ] Create **Compliance Metrics** database
- [ ] Create **Verifier Packs** database
- [ ] Create **Incidents** database
- [ ] Create Policy Page template with buttons and linked views
- [ ] Create 3 Receipt templates (Standard, Blocked, Break-Glass)
- [ ] Create 3 global views (No Policy, Blocked Spike, Incomplete)
- [ ] Test: Create a policy → Use button → Verify receipt auto-links
- [ ] Test: Set QUARANTINE_MODE → Verify Gate_Status blocks

---

## Part 8: Next-Level Enhancements

### Enhancement 1: Switchboard Rollups

Make `VOICE_EXEC_ENABLED` and `QUARANTINE_MODE` in Receipts into **rollups** from the Switchboard DB instead of manual checkboxes. This makes them single-source-of-truth toggles.

### Enhancement 2: Action Type Validation

Add `Allowed_Action_Types` (Multi-select) to Policy pages, then validate that receipts only use allowed action types for their linked policy.

### Enhancement 3: Automated Compliance Scoring

Create a Make.com/n8n scenario that:
1. Runs daily
2. Counts receipts by Result
3. Updates Compliance Metrics DB
4. Sends Slack alert if score drops below threshold

### Enhancement 4: Weekly Verifier Pack Automation

Create automation that:
1. Runs Sunday night
2. Queries receipts for the week
3. Generates PDF with key receipts + config snapshots
4. Computes hashes
5. Creates Verifier Pack row
6. Sends Slack notification

---

## What You Just Built

You now have a **Policy Database That Ships With Enforcement Hooks**:

✅ **Policies** automatically create matching receipts  
✅ **Receipts** enforce requirements via formulas  
✅ **Global views** catch violations  
✅ **Audit trail** is automatic  
✅ **One-click buttons** for common actions  
✅ **Templates** ensure consistency  
✅ **Compliance scoring** is built-in  

This is the difference between "policies" (documentation) and **policies with teeth** (enforcement).

---

**Version:** v1.0.0  
**Status:** Production-Ready  
**Last Updated:** 2026-01-25
