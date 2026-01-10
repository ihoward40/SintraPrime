# Standardized Slack Message Templates (Schema-Bound)

Purpose: Slack is a **read-only truth surface**.
Messages are deterministic renderings of `schemas/verizon-guardian-output.v1.0.1.schema.json`.
No inference. No embellishment.

---

## 0) Inputs (authoritative)

All Slack messages are rendered **only** from fields defined in:

```text
schemas/verizon-guardian-output.v1.0.1.schema.json
```

Primary fields (present in v1.0.1):
- `routing.severity` (CRITICAL | HIGH | MEDIUM | LOW)
- `email_summary.from`
- `email_summary.subject`
- `email_summary.date_received`
- `email_summary.gmail_link`
- `issue_indicators[].type`
- `issue_indicators[].strength`
- `issue_indicators[].triggering_excerpts[]`
- `impact.estimated_amount_usd`
- `impact.confidence`

Optional fields (recommended; may be populated downstream in Make):
- `evidence.drive_pdf_url`
- `meta.case_number`
- `meta.undetermined_fields[]`

---

## 1) Global rendering rules (non-negotiable)

### 1.1 No inference rule

If a field is unknown, missing, or empty:
- Render `Undetermined`
- Do **not** paraphrase
- Do **not** speculate

### 1.2 Evidence-only linking

Only these links may appear:
- `email_summary.gmail_link`
- `evidence.drive_pdf_url` (if present)

No other links.
No “helpful” external URLs.

### 1.3 Conditional mentions

Include `@U0917LJH52L` **only if**:

```text
routing.severity ∈ {CRITICAL, HIGH}
```

No other mentions.

### 1.4 Deterministic list formatting

- Violation types: render as a bullet list from `issue_indicators[].type` (dedupe in Make, not in Slack).
- Excerpts: render only if already present in `issue_indicators[].triggering_excerpts`.

---

## 2) Canonical templates by severity

Implementation rule: use **one Slack module per severity route**.
All conditionals are resolved **before** Slack.

### 2.1 CRITICAL

Channel: `#verizon-watch`
Mentions: `@U0917LJH52L`

Header:

```text
🚨 VERIZON ALERT — CRITICAL
Case: {{meta.case_number | Undetermined}}
```

Body:

```text
Severity: CRITICAL
From: {{email_summary.from}}
Subject: {{email_summary.subject}}
Email Date: {{email_summary.date_received}}

Violation Types:
- {{issue_indicators[].type}}

Strengths:
- {{issue_indicators[].strength}}

Estimated Damages:
{{impact.estimated_amount_usd}}

Damage Confidence:
{{impact.confidence}}
```

Evidence:

```text
Evidence:
• PDF: {{evidence.drive_pdf_url | Undetermined}}
• Gmail: {{email_summary.gmail_link | Undetermined}}
```

Undetermined fields (conditional; render only if `meta.undetermined_fields[]` is non-empty):

```text
Undetermined Fields:
- {{meta.undetermined_fields[]}}

Note: No inference has been made for the above fields.
```

---

### 2.2 HIGH

Channel: `#verizon-watch`
Mentions: `@U0917LJH52L`

Same as CRITICAL, with:

```text
🚨 VERIZON ALERT — HIGH
Severity: HIGH
```

---

### 2.3 MEDIUM

Channel: `#verizon-watch`
Mentions: none

Header:

```text
⚠️ VERIZON NOTICE — MEDIUM
Case: {{meta.case_number | Undetermined}}
```

Body:

```text
Severity: MEDIUM
From: {{email_summary.from}}
Subject: {{email_summary.subject}}

Violation Types:
- {{issue_indicators[].type}}

Estimated Damages:
{{impact.estimated_amount_usd}}
```

Evidence:

```text
Evidence:
• PDF: {{evidence.drive_pdf_url | Undetermined}}
• Gmail: {{email_summary.gmail_link | Undetermined}}
```

Undetermined fields: same conditional block as above.

---

### 2.4 LOW

Channel: `#verizon-watch`
Mentions: none

Header:

```text
ℹ️ VERIZON LOG — LOW
Case: {{meta.case_number | Undetermined}}
```

Body:

```text
Severity: LOW
From: {{email_summary.from}}
Subject: {{email_summary.subject}}

Violation Types:
- {{issue_indicators[].type | Undetermined}}
```

Evidence:

```text
Evidence:
• PDF: {{evidence.drive_pdf_url | Undetermined}}
• Gmail: {{email_summary.gmail_link | Undetermined}}
```

Rule: do not render damages/confidence unless explicitly present.

---

## 3) Make.com mapping notes

- Compose Slack variables in a Tools step before the Slack module.
- Prefer joining arrays with `\n- ` prefixes so Slack rendering is stable.
- Slack never mutates data.

Slack is output, not logic.
