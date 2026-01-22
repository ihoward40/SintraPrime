# SintraPrime Notion Template — Database Schema

**Use this schema to auto-create SintraPrime Mode runs in Notion.**

This is not JSON you paste directly—it's a **field specification** you use to create a Notion database manually (or via Make.com automation).

---

## Database Setup (Manual)

### Step 1: Create New Database

In Notion:
1. Click "Add a block" → "Database"
2. Choose "Table"
3. Name it: `SintraPrime Runs`

### Step 2: Add Properties

Delete the default "Name" property and create these (in order):

#### Property 1: Run ID (Title)

| Field | Value |
|-------|-------|
| Name | Run ID |
| Type | Title |
| Description | Unique identifier for this run (auto-generated) |

**Format:** `STP-YYYY-MM-DD-[HH:MM]` or UUID

---

#### Property 2: Mode Status (Select)

| Field | Value |
|-------|-------|
| Name | Mode Status |
| Type | Select |
| Description | Current mode state |

**Options (create these):**
- ACTIVE (default)
- OBSERVE ONLY
- REFUSAL ISSUED
- AUDIT RESPONSE
- OVERRIDE (rare)

---

#### Property 3: Scope (Text)

| Field | Value |
|-------|-------|
| Name | Scope |
| Type | Text |
| Description | What this run does (1-line summary) |

**Examples:**
- "Governance review"
- "Audit analysis"
- "Constitutional constraint test"

---

#### Property 4: Evidence Links (URL)

| Field | Value |
|-------|-------|
| Name | Evidence Links |
| Type | URL |
| Description | GitHub commit, document, or external reference |

---

#### Property 5: Operator (Person)

| Field | Value |
|-------|-------|
| Name | Operator |
| Type | Person |
| Description | Who initiated this run |

---

#### Property 6: Timestamp (Date)

| Field | Value |
|-------|-------|
| Name | Timestamp |
| Type | Date |
| Description | When run occurred (ISO 8601) |

---

#### Property 7: Run Hash (Text)

| Field | Value |
|-------|-------|
| Name | Run Hash |
| Type | Text |
| Description | SHA256 of inputs + outputs (for reproducibility) |

---

#### Property 8: Constraint Checks (Checkbox)

| Field | Value |
|-------|-------|
| Name | Constraint Checks |
| Type | Checkbox |
| Description | Passed constitutional constraint checks? |

---

#### Property 9: Authority Basis (Rich Text)

| Field | Value |
|-------|-------|
| Name | Authority Basis |
| Type | Rich Text (Text with formatting) |
| Description | Why this mode was invoked |

**Examples:**
- "Documentary Evidence Only"
- "Regulatory Inquiry — [regulation ref]"
- "Constitutional Constraint — [constraint ref]"

---

#### Property 10: Output Artifacts (Files & media)

| Field | Value |
|-------|-------|
| Name | Output Artifacts |
| Type | Files & media |
| Description | PDFs, reports, or notarized outputs |

---

#### Property 11: GitHub Issue Link (URL)

| Field | Value |
|-------|-------|
| Name | GitHub Issue |
| Type | URL |
| Description | Link to GitHub issue if applicable |

---

#### Property 12: Status (Select)

| Field | Value |
|-------|-------|
| Name | Status |
| Type | Select |
| Description | Run status (separate from Mode Status) |

**Options:**
- In Progress
- Completed
- Blocked
- Archived

---

## Template View

Once properties are created, set up a template view:

1. Click "Add a view"
2. Choose "Table"
3. Name it: "All Runs"
4. Configure columns (in order):
   - Run ID
   - Mode Status
   - Status
   - Scope
   - Operator
   - Timestamp
   - Constraint Checks

5. Sort by: Timestamp (descending)

---

## Database Template (Pre-fill Defaults)

Create a **template** row in the database to auto-fill common fields:

**Template Name:** "New SintraPrime Run"

**Pre-filled Values:**
- Mode Status: ACTIVE
- Authority Basis: "Documentary Evidence Only"
- Status: In Progress

Users can duplicate this template to create new runs instantly.

---

## Make.com Automation (Optional)

If you want to auto-create runs via webhook (e.g., when a GitHub action triggers):

### Step 1: Create Make Scenario

1. Go to Make.com
2. Create new scenario
3. Trigger: **Webhook** → Catch a Webhook
4. Action: **Notion** → Add Database Item

### Step 2: Map Fields

| Notion Field | Source |
|--------------|--------|
| Run ID | `webhook.body.run_id` |
| Mode Status | `webhook.body.mode` (default: ACTIVE) |
| Scope | `webhook.body.scope` |
| Operator | `webhook.body.operator` |
| Timestamp | `webhook.body.timestamp` |
| Authority Basis | `webhook.body.authority` |
| Evidence Links | `webhook.body.github_url` |

### Step 3: Webhook Payload Example

```json
{
  "run_id": "STP-2026-01-13-14:30",
  "mode": "ACTIVE",
  "scope": "Governance review",
  "operator": "SintraPrime Agent",
  "timestamp": "2026-01-13T14:30:00Z",
  "authority": "Documentary Evidence Only",
  "github_url": "https://github.com/ihoward40/SintraPrime/commit/abc123"
}
```

### Step 4: Trigger from GitHub

In your GitHub Actions workflow:

```yaml
- name: Create SintraPrime Run Entry
  uses: fjogelberg/http-request-action@v1
  with:
    url: 'https://hook.make.com/YOUR_WEBHOOK_ID'
    method: 'POST'
    headers: '{"Content-Type": "application/json"}'
    data: |
      {
        "run_id": "STP-${{ github.run_id }}",
        "mode": "ACTIVE",
        "scope": "CI/CD Pipeline Run",
        "operator": "GitHub Actions",
        "timestamp": "${{ github.event.head_commit.timestamp }}",
        "authority": "Automated Execution",
        "github_url": "${{ github.server_url }}/${{ github.repository }}/actions/runs/${{ github.run_id }}"
      }
```

---

## Database Views (Optional)

### View 1: "Active Runs"

Filter: Mode Status = ACTIVE  
Sort: Timestamp (descending)

### View 2: "Refusals"

Filter: Mode Status = REFUSAL ISSUED  
Sort: Timestamp (descending)

### View 3: "Audit Trail"

Filter: Mode Status = AUDIT RESPONSE  
Sort: Timestamp (ascending)

### View 4: "By Operator"

Group by: Operator

---

## Notion Database Icon & Header

### Database Icon

- Click icon next to database name
- Upload `brand/sintraprime/sintraprime-sigil-128.png`

### Database Description

```
SintraPrime Mode Run Log

Every SintraPrime governance operation is logged here.

Mode statuses:
- ACTIVE: Governed reasoning under constitutional constraints
- OBSERVE ONLY: Analysis without execution
- REFUSAL ISSUED: Constitutional constraint enforced
- AUDIT RESPONSE: Regulatory disclosure

All runs are auditable, reproducible, and notarizable.
```

---

## Field Validation (Keep It Clean)

### Run ID

- Must be unique
- Format: `STP-YYYY-MM-DD-HH:MM` or UUID
- Set to **Required**

### Mode Status

- Must be one of: ACTIVE | OBSERVE ONLY | REFUSAL ISSUED | AUDIT RESPONSE
- Set to **Required**

### Scope

- Max 200 characters
- Set to **Required**

### Timestamp

- ISO 8601 format
- Set to **Required**

### Constraint Checks

- Checkbox (true/false)
- Default: false
- When checked, signals "passed all checks"

---

## Example Database Entry

```
Run ID:               STP-2026-01-13-14:30
Mode Status:          ACTIVE
Status:               Completed
Scope:                Governance boundary testing
Operator:             SintraPrime Agent
Timestamp:            2026-01-13 14:30 UTC
Constraint Checks:    ✓ (checked)
Authority Basis:      Documentary Evidence Only
Evidence Links:       https://github.com/.../commit/abc123
Output Artifacts:     [governance-review.pdf]
GitHub Issue:         https://github.com/ihoward40/SintraPrime/issues/42
```

---

## Why This Matters

This schema gives you:

1. **Audit Trail** — Every run is logged with timestamp + operator
2. **Governance Signal** — Mode status is immediately visible
3. **Reproducibility** — Run hash allows deterministic replay
4. **Authority Tracking** — Why each run was invoked (documented)
5. **Automation Ready** — Can be fed by GitHub Actions, webhooks, etc.

**Result:** Notion becomes your governance ledger, not just a dashboard.

---

## Next: Import This Schema

Once you create the database manually, you can:
1. Export as CSV (for backup)
2. Link to GitHub (via GitHub-Notion integration)
3. Automate via Make.com (for CI/CD triggers)

All while maintaining SintraPrime Mode rigor.
