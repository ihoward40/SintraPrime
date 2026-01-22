# SintraPrime Mode Workflow Integration

## How SintraPrime Becomes a Felt Reality

This document maps SintraPrime Mode into your existing governance structure—not as decoration, but as operational enforcement.

---

## The Ritual: SintraPrime Session Lifecycle

### Phase 1: Entry (Mode Activation)

**User action:** Click SintraPrime icon (ChatGPT or desktop launcher)

**System response:** Automatic Mode Declaration appears

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — ACTIVE
Governance: Locked · Scope: Declared · Execution: Constrained
Authority Basis: Documentary Evidence Only
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SintraPrime constitutional framework is now active.
All reasoning operates under governance constraints.
See: docs/AI_BOUNDARY.md for operational limits.
```

**User perceives:** Mode switch (just like Agent Mode)

---

### Phase 2: Reasoning (Governed Execution)

**User:** Issues query or request

**SintraPrime behavior:** Reasoning loop operates under constraints

- No inference beyond evidence
- No execution without declaration
- All outputs are declarable
- Constitutional checks before response

**System logging:** Every decision point is logged

---

### Phase 3: Output (Declaration + Artifact)

**If analysis only:**
```
[Response]

---

**SintraPrime Mode Log:**
- Scope: Evidence analysis only
- Constraint checks: PASSED
- Authority: Documentary only
- Notarization: Not required (analysis)
```

**If action/execution proposed:**
```
[Response with action]

---

**SintraPrime Mode Declaration:**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — ACTIVE
Governance: Locked · Scope: Declared · Execution: Constrained
Authority Basis: Documentary Evidence Only
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Execution requires:**
1. Review of constraints (AI_BOUNDARY.md)
2. Audit trail (OPERATOR_LEDGER.md)
3. Operator authorization (if constrained)
4. Notarization (if write operation)

See: docs/notarization-sop.v1.md
```

---

### Phase 4: Exit (Session Closure)

**On session end:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — SESSION CLOSED
Governance: Archived · Execution: Logged
Authority Basis: Session Hash [SHA256]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Session artifacts archived to: [OPERATOR_LEDGER]
All outputs are reproducible and auditable.
```

---

## Integration Points (Specific Files to Update)

### 1. README.md (Top Level)

**Current state:** Generic introduction

**Add to top:**

```markdown
# SintraPrime

![SintraPrime](artifacts/sintraprime-icon.svg)

**🜂 SINTRAPRIME MODE** — Constitutional governance for AI reasoning  
*Deterministic replay. Auditable. Notarized.*

---

## Operating in SintraPrime Mode

SintraPrime is a governed analytical framework that enforces constitutional constraints on reasoning and execution.

When you activate SintraPrime Mode, you are:
- Operating under documented governance constraints
- Subject to deterministic replay verification
- Producing outputs that are notarizable and auditable
- Committing to evidence-only reasoning

See: [SintraPrime Mode Specification](docs/SINTRAPRIME_MODE_DECLARATION_SPEC.md)

---
```

---

### 2. OPERATOR_RUNBOOK.md (Section 1: Operating Modes)

**Add new section after Table of Contents:**

```markdown
## SintraPrime Mode: Quick Reference

### Activation

```bash
# ChatGPT
Click: SintraPrime GPT (left sidebar)

# CLI
./bin/sintraprime-cli --mode active

# Desktop
Double-click: SintraPrime shortcut (taskbar)
```

### Mode States

| State | Meaning | Output Format |
|-------|---------|---------------|
| **ACTIVE** | Governed reasoning, execution constrained | Standard + Mode Declaration |
| **OBSERVE ONLY** | Analysis without execution | Analysis + Audit Log |
| **REFUSAL ISSUED** | Constitutional constraint enforced | Refusal Document |
| **AUDIT RESPONSE** | Responding to regulatory inquiry | Formal Response + Evidence |

### Quick Checklist Before Operation

- [ ] Mode Declaration visible on screen
- [ ] Scope is declared (what are you doing?)
- [ ] Authority basis is understood (why can you do this?)
- [ ] Constraints are reviewed (what's forbidden?)
- [ ] Audit trail is recording (OPERATOR_LEDGER active)

See full spec: [SINTRAPRIME_MODE_DECLARATION_SPEC.md](docs/SINTRAPRIME_MODE_DECLARATION_SPEC.md)

---
```

---

### 3. AI_BOUNDARY.md (Top of File)

**Replace generic intro with:**

```markdown
# AI Boundary — Constitutional Enforcement

![SintraPrime](../artifacts/sintraprime-icon.svg)

**🜂 SINTRAPRIME MODE — OBSERVE ONLY**  
Governance: Locked · Scope: Analysis · Execution: Forbidden  
Authority Basis: Evidence Review, No Action

---

## Document Purpose

This document defines the constitutional constraints that SintraPrime Mode enforces. Every SintraPrime reasoning session operates under these limits.

**This is not optional.** These are hard constraints, not guidelines.

---
```

---

### 4. change-control.v1.1.md (Top of File)

```markdown
# Change Control Policy v1.1

![SintraPrime](../artifacts/sintraprime-icon.svg)

**🜂 SINTRAPRIME MODE — ACTIVE**  
Governance: Locked · Scope: Declared · Execution: Constrained  
Authority Basis: Documentary Evidence Only

---

## Policy Scope

All changes under SintraPrime Mode governance must:
1. Be declared in advance
2. Be reviewed against constitutional constraints
3. Be logged in OPERATOR_LEDGER
4. Be notarized if they execute writes

---
```

---

### 5. notarization-sop.v1.md (Top of File)

```markdown
# Notarization SOP v1.0

![SintraPrime](../artifacts/sintraprime-icon.svg)

**🜂 SINTRAPRIME MODE — ACTIVE**  
Governance: Locked · Scope: Declared · Execution: Constrained  
Authority Basis: Documentary Evidence Only

---

## When Notarization Is Required

Under SintraPrime Mode, the following trigger notarization:
- Any write operation to external systems
- Any transformation of official records
- Any output sent to regulators
- Any decision affecting compliance state

---
```

---

### 6. OPERATOR_LEDGER.md (New Section)

**Add this section:**

```markdown
## SintraPrime Mode Log

Every session operating under SintraPrime Mode governance is recorded here.

| Date | Session ID | Mode | Scope | Outcome | Authority |
|------|------------|------|-------|---------|-----------|
| 2026-01-13 | STP-001 | ACTIVE | Governance review | ✓ Completed | Documentary |
| 2026-01-14 | STP-002 | OBSERVE | Audit analysis | ✓ Completed | Regulatory |

---

### Session Closure Template

Each SintraPrime session ends with:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — SESSION CLOSED
Governance: Archived · Execution: Logged · Hash: [SHA256]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Session ID: STP-[N]
Duration: [time]
Scope: [declared scope]
Constraint Checks: PASSED
Notarization: [if required]
Auditor Access: [OPERATOR_LEDGER reference]
```

---
```

---

## PDF & Formal Document Integration

For any PDF output under SintraPrime Mode:

```html
<!-- Top of document (after title/date) -->
<div style="border: 1px solid #D4AF8C; padding: 16px; margin-bottom: 32px;">
  <img src="../artifacts/sintraprime-icon-48.png" alt="SintraPrime" 
       style="width: 48px; height: 48px; margin-bottom: 12px;">
  
  <p style="font-weight: bold; color: #0B0E14; margin: 0;">
    🜂 SINTRAPRIME MODE — ACTIVE
  </p>
  <p style="color: #666; font-size: 12px; margin: 4px 0 0 0;">
    Governance: Locked · Scope: Declared · Execution: Constrained  
    Authority Basis: Documentary Evidence Only
  </p>
</div>
```

---

## Notion Dashboard Integration

For any Notion page operating under SintraPrime Mode:

1. **Page title:** Add 🜂 prefix (e.g., "🜂 Governance Dashboard")
2. **Page header:** Add Mode Declaration block
3. **Database property:** Add "SintraPrime Mode" field (dropdown)
   - Values: ACTIVE | OBSERVE ONLY | REFUSAL ISSUED | AUDIT RESPONSE | OVERRIDE
4. **Page relations:** Link to docs/SINTRAPRIME_MODE_DECLARATION_SPEC.md

---

## ChatGPT Custom GPT Integration

### System Prompt Addition

Add to SintraPrime Custom GPT system prompt:

```
You are SintraPrime, a governed analytical agent.

OPERATIONAL CONSTRAINTS:
- No inference beyond documentary evidence
- No execution without explicit operator consent
- All outputs are auditable and reproducible
- Constitutional constraints are non-negotiable

MODE DECLARATION:
Before responding, declare the mode:

🜂 SINTRAPRIME MODE — ACTIVE
Governance: Locked · Scope: [declare scope] · Execution: Constrained
Authority Basis: Documentary Evidence Only

---

See governance documents:
- AI Boundary: https://github.com/ihoward40/SintraPrime/blob/master/docs/AI_BOUNDARY.md
- Mode Specification: https://github.com/ihoward40/SintraPrime/blob/master/docs/SINTRAPRIME_MODE_DECLARATION_SPEC.md
```

### Response Footer

Every response includes:

```
---

**SintraPrime Mode Session Log:**
- Mode: ACTIVE
- Constraint checks: PASSED
- Audit trail: OPERATOR_LEDGER
- Reproducibility: ✓ Deterministic
```

---

## CLI Tool Integration

If you have CLI tools, add startup banner:

```bash
#!/bin/bash
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  ⬡′ SINTRAPRIME MODE — Governance Locked                 ║"
echo "║  Auditable | Deterministic | Verified                     ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Operating under SintraPrime constitutional constraints."
echo "See: docs/AI_BOUNDARY.md"
echo ""
```

---

## Desktop Shortcut Integration

### Windows (Create `.lnk`)

1. Right-click → New → Shortcut
2. Target: `https://chat.openai.com/gpts/[SINTRAPRIME_GPT_ID]`
3. Name: `SintraPrime`
4. Icon: Point to `artifacts/sintraprime-icon-256.ico`
5. Pin to taskbar

### Desktop Launcher (Python)

```python
import webbrowser
import os

# SintraPrime Mode Launcher
icon_path = "artifacts/sintraprime-icon-256.ico"
gpt_url = "https://chat.openai.com/gpts/[YOUR_GPT_ID]"

print("""
╔════════════════════════════════════════════════════════════╗
║  🜂 SINTRAPRIME MODE — Starting                           ║
║  Governance: Locked | Execution: Constrained              ║
╚════════════════════════════════════════════════════════════╝
""")

webbrowser.open(gpt_url)
```

---

## Result: What Users Experience

1. **Click SintraPrime icon** → Mode Declaration appears (like Agent Mode)
2. **Query SintraPrime** → Reasoning operates under constraints
3. **Get response** → Includes audit trail + Mode Declaration
4. **Session closes** → Logged to OPERATOR_LEDGER

Muscle memory forms. People stop confusing SintraPrime with casual chat.

It *feels* like Agent Mode because **you control the consistency.**

OpenAI doesn't.
