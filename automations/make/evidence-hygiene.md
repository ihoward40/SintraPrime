# Make.com Scenario: Evidence Hygiene Task Creator

## Overview

This scenario watches the Notion **🧾 Cases** database for cases entering the "Wave-1 Sent" stage, enforces a gate check, ensures idempotency, and then:

- **ALLOWED** → creates exactly one Evidence Hygiene task (Draft-Only discipline)
- **BLOCKED** → does not create a task

In both paths it writes a **Run Receipt** record for auditability.

## Notion Databases

You will need (at minimum) three Notion databases:

1) **🧾 Cases** (trigger source)
- `Stage` (Select) — trigger value: `Wave-1 Sent`
- `WT Gate For Automation` (Select or Status) — gate value: `✅ ALLOWED` (else treated as blocked)
- `WT Gate Verdict` (Rich text or Select) — freeform reason / code to store when blocked
- `CaseID` (Text) — recommended stable ID (used for idempotency key)

2) **Tasks** (idempotency + work queue)
- `Name` (Title)
- `Case` (Relation → 🧾 Cases)
- `Idempotency Key` (Text)
- `Status` (Status or Select) — must include `Next` and `Done`
- `Priority` (Select) — must include `P0`
- `Mode` (Select) — must include `Draft-Only`

3) **Run Receipts** (append-only audit log)
- `Name` (Title) — e.g. `Evidence Hygiene`
- `Case` (Relation → 🧾 Cases)
- `Idempotency Key` (Text)
- `Outcome` (Select) — e.g. `created`, `duplicate`, `blocked`, `error`
- `Blocked Reason` (Text)
- `Run At` (Date)

## Idempotency Key

Use a stable, label-independent key:

- Preferred: `${CaseID}:evidence_hygiene:v1`
- Fallback (if you do not have `CaseID` yet): `${NotionPageIdNoDashes}:evidence_hygiene:v1`

The dedupe check is: "a Task exists where `Idempotency Key` equals this key and `Status` is not `Done`".

## Scenario Flow (Module-by-Module)

### 0) Trigger

**Module:** Notion → *Watch database items*

- Database: **🧾 Cases**
- Filter: `Stage = "Wave-1 Sent"`

Rationale: keep the trigger broad enough that the router can still write a receipt for blocked cases.

### 1) Compute fields (Set variables)

Create variables:

- `caseIdStable`:
  - If `CaseID` exists and is non-empty → use it
  - Else → use Notion page id (strip dashes)
- `idempotencyKey` = `${caseIdStable}:evidence_hygiene:v1`
- `gateValue` = value of `WT Gate For Automation`
- `gateVerdict` = value of `WT Gate Verdict` (empty string if missing)

### 2) Router

#### Route A — ALLOWED

**Filter:** `WT Gate For Automation = "✅ ALLOWED"`

1) **Search for existing task (dedupe)**
   - Module: Notion → *Search objects* (Database items)
   - Database: **Tasks**
   - Filter:
     - `Idempotency Key` equals `{{idempotencyKey}}`
     - AND `Status` is not `Done`

2) **If found**
   - Do **not** create a task
   - Create **Run Receipt** with:
     - Outcome: `duplicate`
     - Idempotency Key: `{{idempotencyKey}}`
     - Case: relation to the triggering case

3) **If not found**
   - Create task
     - Module: Notion → *Create a database item*
     - Database: **Tasks**
     - Fields:
       - Name: `Evidence Hygiene (Wave-1)`
       - Case: relation to triggering case
       - Idempotency Key: `{{idempotencyKey}}`
       - Priority: `P0`
       - Mode: `Draft-Only`
       - Status: `Next`

   - Create **Run Receipt** with:
     - Outcome: `created`
     - Idempotency Key: `{{idempotencyKey}}`
     - Case: relation to the triggering case

#### Route B — BLOCKED

**Filter:** `WT Gate For Automation != "✅ ALLOWED"` (or use an "else" route)

- Create **Run Receipt** with:
  - Outcome: `blocked`
  - Blocked Reason: `{{gateVerdict}}` (or `gateValue` if you prefer)
  - Idempotency Key: `{{idempotencyKey}}`
  - Case: relation to triggering case

## Importing the Make.com Blueprint

A ready-to-use Make.com blueprint is provided in this directory:

**File:** `evidence-hygiene-blueprint.json`

### Import Steps

1. **Open Make.com** and navigate to your organization/team
2. **Create New Scenario** → Choose "Import Blueprint"
3. **Upload** `evidence-hygiene-blueprint.json`
4. **Configure Connections** (after import):
   - Notion connection for all Notion modules
   - Ensure your Notion integration has access to all three databases

### Required Environment Variables

Before activating the scenario, set these connection variables in Make.com:

- `NOTION_CASES_DB_ID` - Database ID for 🧾 Cases
- `NOTION_TASKS_DB_ID` - Database ID for Tasks
- `NOTION_RUN_RECEIPTS_DB_ID` - Database ID for Run Receipts

**Finding Database IDs:**
1. Open the database in Notion
2. Copy the URL: `https://notion.so/workspace/DATABASE_ID?v=...`
3. The `DATABASE_ID` is the 32-character hex string (without dashes)

### Testing the Scenario

1. Create a test case in 🧾 Cases with:
   - `Stage` = `Wave-1 Sent`
   - `WT Gate For Automation` = `✅ ALLOWED`
   - `CaseID` = `TEST-CASE-001`

2. The scenario should:
   - Trigger on the new case
   - Compute idempotency key: `TEST-CASE-001:evidence_hygiene:v1`
   - Check for duplicate tasks
   - Create a new task (if no duplicate)
   - Write a Run Receipt with outcome `created`

3. Run the scenario again (manually or wait for trigger):
   - Should find the existing task
   - Write a Run Receipt with outcome `duplicate`
   - Should NOT create a second task

## Notes / Guardrails

- Keep **Run Receipts append-only**. Never edit prior receipts; create a new one each run.
- Prefer using **CaseID** over Notion page ids for long-term stability.
- If you later add retries, keep receipt outcomes explicit (`duplicate` vs `created` vs `blocked`) so you can audit behavior.
- The blueprint maintains `schemaVersion` stability - do not modify version fields unless updating the contract schema.
