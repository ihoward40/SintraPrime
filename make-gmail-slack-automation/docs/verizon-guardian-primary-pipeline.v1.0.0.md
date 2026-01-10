# VERIZON_GUARDIAN — Make.com Primary Pipeline (v1.0.0)

Scenario name: `VERIZON_GUARDIAN__PRIMARY_PIPELINE`

Design principle: deterministic linear spine + severity router + side buses.
Electrical Panel rule: one responsibility per module; no logic leaks.

Note: This runbook describes an evidence-preservation + issue-classification workflow. It is not legal advice.

---

## PANEL A — INGEST (LEFT BUS)

### A1 — Gmail: Watch Emails

- Module: Gmail → Watch emails
- Filter: From contains `@verizon`
- Max age: 2 minutes
- Outputs used:
  - From
  - Subject
  - Date
  - Message ID
  - Body (plain)
  - Gmail permalink

### A2 — Text Filter: Exclude Pure Marketing

- Module: Tools → Text contains (or equivalent)
- Condition:
  - Body does *not* contain promo-only markers
  - No bill, no amount, no account, no disconnect
- Fail path: route to LOW severity logging only

---

## PANEL B — AI CLASSIFICATION (CORE BRAIN)

### B1 — AI: Verizon Guardian Analysis

- Module: AI → Create a completion (or Gemini)
- Prompt: use `docs/verizon-guardian-prompts.v1.0.1.md`
- Output: strict JSON string

### B2 — JSON: Parse AI Output

- Module: Tools → Parse JSON
- Schema: `schemas/verizon-guardian-output.v1.0.1.schema.json`
- This module is CRITICAL.
  - All downstream logic reads from this node only.

---

## PANEL C — SEVERITY ROUTER (CENTER BREAKER)

### C1 — Router: Severity Split

Routes (name exactly):

- C1A — ROUTE_CRITICAL
  - Condition: `routing.severity = "CRITICAL"` (or `violation_analysis.severity = "Critical"` if using the older v1.0 schema)

- C1B — ROUTE_HIGH
  - Condition: `routing.severity = "HIGH"`

- C1C — ROUTE_MEDIUM_LOW
  - Condition: `routing.severity IN ("MEDIUM", "LOW")`

---

## PANEL D — EVIDENCE PRESERVATION BUS

### D1 — HTML → PDF

- Module: PDF → Create PDF from HTML
- HTML includes:
  - Full email headers (as available)
  - Body
  - AI classification summary
- Filename template:
  - `VERIZON_{{date}}_{{subject}}_Evidence.pdf`

### D2 — Google Drive: Upload File

- Folder: `Verizon_Legal_Evidence/YYYY/MM/`
- Capture: share link

---

## PANEL E — NOTION CASE LOGGING

### E1 — Notion: Create Case

- DB: `Verizon_Case_Tracker`
- Fields populated:
  - Subject
  - From
  - Email Date
  - Gmail Link
  - Severity
  - Violation Types
  - Violation Strength
  - Estimated Damages (number if possible)
  - Damages Text (fallback)
  - Pattern Key (formula)
  - Status = `Detected`
  - Dispute Stage = `Notice`
  - Evidence PDF link

Implementation note:
- Prefer mapping parsed JSON fields into dedicated Notion properties (see `docs/verizon-guardian-notion-consumption.v1.0.1.md`).

---

## PANEL F — SLACK ALERT BUS (INSTANT LOOP)

### F1 — Tools: Compose Slack Variables

- Join violations
- Join excerpts
- Severity badge
- Owner mention logic

### F2 — Slack: Send Message

- Channel: `#verizon-watch`
- Mention: only if CRITICAL or HIGH
- Message: standardized alert template (compose from parsed JSON)

---

## PANEL G — PATTERN-OF-CONDUCT ENGINE

### G1 — Notion: Search Patterns

- DB: `Verizon_Patterns`
- Filter: Pattern Key = Case.Pattern Key

### G2 — Router: Pattern Exists?

- YES → G3A
- NO → G3B

### G3A — Notion: Update Pattern

- Add relation to Case

### G3B — Notion: Create Pattern

- Pattern Key
- Description (auto-generated)
- Escalation Threshold = 3
- Relate Case

---

## PANEL H — CLAIM SUMMARY BUS

### H1 — Router: Numeric Damages Only

- Condition: Estimated Damages is numeric

### H2 — Notion: Find Claim Month

- DB: `Verizon_Claim_Summary`
- Key: Incident Month

### H3 — Router: Month Exists?

- YES → H4A
- NO → H4B

### H4A — Update Running Total

- Running Total += Estimated Damages

### H4B — Create Month + Set Running Total

---

# CFPB / AG COMPLAINT EXHIBITS (AUTO-GENERATED)

Pattern → Exhibit mapping:
- Each Pattern = One Exhibit
- Pattern 1 → Exhibit A-1
- Pattern 2 → Exhibit A-2
- Pattern 3 → Exhibit A-3

Exhibit generator modules:
1) Notion → Get Pattern Record
2) HTML Generator:
   - Pattern description
   - Incident count
   - First / Last seen
   - Total damages
   - Case table
3) PDF → Create Exhibit PDF
4) Drive → Upload to `/Exhibits/CFPB/`

Filename:

```text
EXHIBIT_A-{{index}}_{{PATTERN_KEY}}.pdf
```

---

# NOTICE → CURE → DEFAULT ESCALATION LOGIC

New fields (Case DB):
- `Notice Date`
- `Cure Deadline`
- `Default Date`
- `Dispute Stage`

Automation rule (daily scheduled scenario):
- If Stage = Notice AND today > Cure Deadline → set Stage = Cure
- If Stage = Cure AND no response after X days → set Stage = Default
- On Default:
  - Slack alert
  - Flag for CFPB / AG inclusion

---

# Willful vs Negligent inference flag (Notion)

If you implement an internal flag, keep it explicitly as a **workflow routing / prioritization signal**, not a legal conclusion.

Suggested Notion formula shape (adjust property names):

```notion
if(
  and(
    prop("Incident Count") >= 3,
    dateBetween(prop("Last Seen"), prop("First Seen"), "days") > 14
  ),
  "WILLFUL",
  "NEGLIGENT"
)
```
