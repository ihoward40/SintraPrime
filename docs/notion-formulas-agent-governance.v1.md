# Notion Formulas — Agent Governance Enforcement

This document contains copy-paste ready Notion formulas for enforcing agent governance policies.

---

## Agent Task Queue Formulas

### Gate_Status (Basic)

Create a **Formula** property in your **Agent Task Queue** called `Gate_Status`:

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

**What it does:**
- Execute + no policy → **BLOCKED**
- Execute + policy but no receipt → **BLOCKED**
- Execute + policy + receipt → **READY**
- Read/Research → **OK**

---

### Gate_Status (Voice-Aware)

Create a **Formula** property in your **Agent Task Queue** called `Gate_Status` (if you use Voice channel):

```notion
if(
  prop("Mode") != "Execute",
  "OK: Read/Research",
  if(
    empty(prop("Policy_Link")),
    "BLOCKED: Missing Policy_ID",
    if(
      empty(prop("Exec_Receipt")),
      "BLOCKED: Missing Receipt",
      if(
        prop("Channel") == "Voice" and empty(prop("Call_ID")),
        "BLOCKED: Missing Call_ID",
        "READY"
      )
    )
  )
)
```

**Requires:**
- `Mode` (Select: Read/Research | Execute)
- `Policy_Link` (Relation → Policies)
- `Exec_Receipt` (Relation → Execution Receipts)
- `Channel` (Select: Voice | Web | Email | GitHub | Other)
- `Call_ID` (Text) — required for voice execution items

---

### Blocked_Reason

Create **Blocked_Reason** (Formula) for cleaner operator view:

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

---

### Requires_Receipt

Create **Requires_Receipt** (Formula) to make filters easy:

```notion
prop("Mode") == "Execute"
```

---

## Execution Receipts Formulas

### Receipt_Code (Auto-Label)

Create **Receipt_Code** (Formula) to auto-label receipts:

```notion
"XR-" + formatDate(prop("Created"), "YYYYMMDD-HHmm")
```

**Output example:** `XR-20260125-1430`

---

### Receipt_Completeness

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

**Requires:**
- `Policy` (Relation → Policies)
- `Task` (Relation → Agent Task Queue)
- `External_Proof` (Text)
- `Executed_At` (Date)

---

### Is_Complete (Checkbox-Style)

Create **Is_Complete** (Formula) in **Execution Receipts**:

```notion
prop("Receipt_Completeness") == "COMPLETE"
```

**Usage:**
- Filter instantly: **Show me receipts where Is_Complete = false**
- Dashboard: "Incomplete Receipts" view

---

## Recommended Notion Views

### Agent Task Queue Views

**1) "EXEC — Blocked"**
Filter:
- `Mode` is `Execute`
- `Gate_Status` contains `BLOCKED`

**2) "EXEC — Ready"**
Filter:
- `Mode` is `Execute`
- `Gate_Status` is `READY`

**3) "Research — Default"**
Filter:
- `Mode` is `Read/Research`

---

### Execution Receipts Views

**1) "Incomplete Receipts"**
Filter:
- `Is_Complete` is `false`

**2) "Completed Receipts"**
Filter:
- `Is_Complete` is `true`

**3) "Pending Approval"**
Filter:
- `Status` is `Pending`

**4) "Recent Executions"**
Sort:
- `Executed_At` descending

---

## Implementation Notes

### Enforcement Rule

A Task cannot move into "Executed/Done" unless:
1. `Gate_Status = READY`
2. `Receipt.Is_Complete = true`

### Kill Switch Pattern

Create a single-row Notion config database: **System Config**
Property: `Execute_Enabled` (Checkbox)

In Make.com scenarios, check this property before any Execute action.
If false, block all execution and alert operator.

---

**Version:** v1  
**Last Updated:** 2026-01-25  
**Status:** Active formulas for agent governance
