# SINTRAPRIME MODE DECLARATION — Canonical Specification

## Authority Statement

This document defines the **exact, non-negotiable Mode Declaration block** used across all SintraPrime contexts.

Consistency is not decorative. It is enforcement.

---

## Standard Form (Use Exactly As Written)

### Primary Form (Documents, PDFs, Notion)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — ACTIVE
Governance: Locked · Scope: Declared · Execution: Constrained
Authority Basis: Documentary Evidence Only
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**When to use:**
- Top of all governance documents
- Headers in PDFs (notarized output)
- Notion page headers
- Regulator packets
- Constitutional reference documents

---

### Variant A: Observation Mode

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — OBSERVE ONLY
Governance: Locked · Scope: Analysis · Execution: Forbidden
Authority Basis: Evidence Review, No Action
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**When to use:**
- Audits, reviews, analysis
- Investigative reports
- Findings that don't require action

---

### Variant B: Refusal State

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — REFUSAL ISSUED
Governance: Locked · Scope: Constrained · Execution: Blocked
Authority Basis: Constitutional Constraint [ref]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**When to use:**
- Responses where constitutional constraints block action
- Explicit refusal documents
- Boundary enforcement logs

---

### Variant C: Audit Response

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — AUDIT RESPONSE
Governance: Locked · Scope: Disclosed · Execution: Logged
Authority Basis: Regulatory Inquiry [ref]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**When to use:**
- Responses to external audits
- Regulatory disclosures
- Investigative responses

---

### Variant D: Emergency/Override

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — OVERRIDE EXECUTED
Governance: Relaxed · Scope: Emergency · Execution: Logged
Authority Basis: Explicit Operator Authorization [ref, date]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**When to use:**
- ONLY with explicit operator consent
- ONLY when documented with reference + date
- ONLY in actual emergencies (not routine work)

---

## Visual Anchor (Pair with Icon)

Every Mode Declaration includes:

1. **Icon**: `artifacts/sintraprime-icon.svg` (48–64px)
2. **Header Rule**: horizontal line, full width
3. **Text Block**: 3 lines (mode, governance state, authority)
4. **Footer Rule**: horizontal line, full width

Example in Markdown:

```markdown
![SintraPrime](artifacts/sintraprime-icon.svg)

**🜂 SINTRAPRIME MODE — ACTIVE**  
Governance: Locked · Scope: Declared · Execution: Constrained  
Authority Basis: Documentary Evidence Only

---

[Document content begins here]
```

Example in HTML/PDF:

```html
<div style="border-top: 2px solid #D4AF8C; border-bottom: 2px solid #D4AF8C; padding: 16px 0; margin-bottom: 32px;">
  <img src="icon.svg" alt="SintraPrime" style="width: 48px; height: 48px; margin-bottom: 8px;">
  <strong style="color: #D4AF8C; font-size: 14px;">🜂 SINTRAPRIME MODE — ACTIVE</strong>
  <div style="color: #666; font-size: 12px; margin-top: 4px;">
    Governance: Locked · Scope: Declared · Execution: Constrained
    <br>Authority Basis: Documentary Evidence Only
  </div>
</div>
```

---

## What Each Element Signals

| Element | Signal | Auditor Reads As |
|---------|--------|------------------|
| 🜂 Icon | Sovereignty | "This is a formal declaration" |
| MODE — [State] | Operational Status | "Here's what's happening" |
| Governance: [X] | Control Level | "How tight is the lock?" |
| Scope: [X] | Authority Boundary | "What's allowed?" |
| Execution: [X] | Action Permission | "Can this act?" |
| Authority Basis: [X] | Justification | "Why can you do this?" |

---

## DO NOT Freestyle These

**Banned variants:**
- ~~SINTRAPRIME MODE — CHILL~~
- ~~SINTRAPRIME MODE — VIBES~~
- ~~SINTRAPRIME MODE — MAYBE~~

Do not invent states. Use exactly one of:
- **ACTIVE** (default, governed execution allowed)
- **OBSERVE ONLY** (analysis, no action)
- **REFUSAL ISSUED** (constraint blocking action)
- **AUDIT RESPONSE** (regulatory reply)
- **OVERRIDE EXECUTED** (emergency only, documented)

---

## Integration Points

Add Mode Declaration header to:

1. **README.md** (top, after title)
2. **OPERATOR_RUNBOOK.md** (Section 1)
3. **All governance docs** (top of file):
   - AI_BOUNDARY.md
   - change-control.v1.1.md
   - notarization-sop.v1.md
   - audit-integrity-statement.v1.md
   - constitutional documents (all of them)

4. **PDF generation** (document header)
5. **Notion governance dashboard** (page header)
6. **CLI tools** (startup banner)
7. **ChatGPT Custom GPT** (system prompt, each response)

---

## Why This Matters

Agent Mode *feels* official because it:
- Always shows the same icon
- Always says the same thing
- Always appears in the same place

**SintraPrime Mode** uses the identical principle:

* Same icon (🜂)
* Same header structure
* Same governance signals
* Same "this is official" feeling

But you control the semantics. OpenAI doesn't.

---

## Authority Statement (For Regulators)

> "SINTRAPRIME MODE is a declared operational framework enforcing constitutional constraints on AI reasoning and execution. The Mode Declaration block signals operational state to stakeholders. Every declaration is auditable and logged."

That sentence is what makes this real.
