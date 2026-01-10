# VERIZON_GUARDIAN — Notion Consumption Pack (v1.0.1)

Goal: make the VERIZON_GUARDIAN JSON useful inside Notion *without relying on Notion parsing JSON in formulas*.

## Why this approach

Notion formulas are great for derived views, but they generally **do not support parsing arbitrary JSON text** reliably. The most stable pattern is:

1) Store the raw JSON for audit (optional)
2) In Make.com, **parse the JSON** and map specific fields into dedicated Notion properties
3) Use Notion formulas only on those mapped properties

---

## Recommended Notion properties

Create these properties on your database:

- `AI_JSON` (Text) — optional: store the full JSON blob
- `Email From` (Text)
- `Email Subject` (Text)
- `Email Date Received` (Date)
- `Gmail Message ID` (Text)
- `Gmail Link` (URL)

- `Severity` (Select): CRITICAL, HIGH, MEDIUM, LOW
- `Slack Priority` (Select): Critical, High, Medium, Low
- `Violation Strength` (Select): Strong, Moderate, Weak
- `Estimated Amount USD` (Text)
- `Damage Confidence` (Select): High, Medium, Low

- `Violation Types` (Multi-select):
  - Collection During Active Dispute
  - Service Disconnection or Threat During Dispute
  - No-Reply / Unreachable Mailbox
  - Equipment Harassment or Repeated Billing After Return
  - Billing Without Clear Contractual Basis
  - Bad Faith / Coercive Pressure Indicators
  - ADA / Hardship-Related Indicators
  - Notice / Timing / Procedural Indicators

- `Triggering Excerpts` (Text) — join excerpts with newlines in Make
- `Notify Owner` (Checkbox)

---

## Make.com mapping notes (deterministic)

After the AI module:

- Use **JSON > Parse JSON** (or equivalent) against the AI output
- Map:
  - `email_summary.from` → `Email From`
  - `email_summary.subject` → `Email Subject`
  - `email_summary.date_received` → `Email Date Received` (parse date if needed)
  - `email_summary.gmail_message_id` → `Gmail Message ID`
  - `email_summary.gmail_link` → `Gmail Link`

  - `routing.severity` → `Severity`
  - `routing.slack_priority` → `Slack Priority`
  - `routing.notify_owner` → `Notify Owner`

  - `impact.estimated_amount_usd` → `Estimated Amount USD`
  - `impact.confidence` → `Damage Confidence`

For arrays:
- `issue_indicators[].type` → `Violation Types` (multi-select)
- `issue_indicators[].triggering_excerpts[]` → flatten and join into `Triggering Excerpts`

---

## Notion formulas (work on mapped fields)

### Urgency badge

```notion
if(
  prop("Severity") == "CRITICAL",
  "CRITICAL",
  if(
    prop("Severity") == "HIGH",
    "HIGH",
    if(prop("Severity") == "MEDIUM", "MEDIUM", "LOW")
  )
)
```

### Slack routing flag

```notion
if(
  or(prop("Severity") == "CRITICAL", prop("Severity") == "HIGH"),
  "YES",
  "NO"
)
```

### Owner notification badge

```notion
if(prop("Notify Owner"), "Notify Owner", "—")
```

---

## Optional: keep the raw JSON

Storing the raw AI output in `AI_JSON` is useful for auditability and later reprocessing.
Just don’t depend on parsing it inside Notion formulas.
