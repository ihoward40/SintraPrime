# SINTRAPRIME MODE — COMPLETE DEPLOYMENT PACKAGE

**Everything you need. Locked. Executable. Auditable.**

---

## What You Have (Comprehensive List)

### Core Assets

| File | Purpose | Location |
|------|---------|----------|
| `sintraprime-icon.svg` | Master SVG (source of truth) | `artifacts/` |
| `sintraprime-sigil-512.png` | ChatGPT upload | `artifacts/` |
| `sintraprime-sigil-256.ico` | Windows desktop | `artifacts/` |
| `sintraprime-sigil-{128,64,48,24}.png` | Various contexts | `artifacts/` |

### Specification Documents (LOCKED — No Variations)

| File | Purpose | Read When |
|------|---------|-----------|
| `brand/SINTRAPRIME_BRAND_SPEC.md` | Colors, sizing, geometry (ONE-PAGER) | "What are the exact specs?" |
| `docs/mode-declaration.md` | Canonical declarations (5 variants, copy-paste) | "What do I write at the top?" |
| `templates/notion/mode-declaration-template.md` | Notion template block | Setting up Notion |
| `templates/pdf/header.html` | PDF header HTML template | PDF generation |

### Implementation Guides

| File | Purpose | Read When |
|------|---------|-----------|
| `docs/SINTRAPRIME_DEPLOYMENT_RUNBOOK.md` | **MAIN CHECKLIST** (10 phases, 60 min) | "I'm ready to deploy" |
| `scripts/sintraprime_pdf_header.py` | Drop-in ReportLab function | PDF generation in Python |
| `templates/notion/NOTION_DATABASE_SCHEMA.md` | Notion database field specs + Make.com automation | Notion automation setup |

### Supporting Documentation

| File | Purpose | Reference |
|------|---------|-----------|
| `docs/SINTRAPRIME_MODE_DECLARATION_SPEC.md` | Extended mode declaration rules | Governance policy |
| `docs/SINTRAPRIME_SIGIL_DESIGN_BRIEF.md` | Designer brief (3 variants) | If regenerating icon |
| `docs/SINTRAPRIME_MODE_WORKFLOW.md` | Workflow integration map | How mode appears everywhere |

---

## Quick Navigation

### "I'm Ready to Deploy Right Now"

→ Open `docs/SINTRAPRIME_DEPLOYMENT_RUNBOOK.md`  
→ Execute Phase 0 → Phase 10 in order  
→ Total time: **~60 minutes**

### "I Need to Understand First"

1. Read `brand/SINTRAPRIME_BRAND_SPEC.md` (5 min)
2. Skim `docs/SINTRAPRIME_DEPLOYMENT_RUNBOOK.md` (10 min)
3. Then execute

### "I'm Integrating This Into Python/PDF Generation"

→ Copy `scripts/sintraprime_pdf_header.py` into your codebase  
→ Use the example function calls  
→ Done

### "I'm Setting Up Notion Automation"

→ Read `templates/notion/NOTION_DATABASE_SCHEMA.md`  
→ Create database manually (20 min)  
→ Or connect via Make.com (webhook automation)

### "I Need Exact Specifications"

→ `brand/SINTRAPRIME_BRAND_SPEC.md` (geometry, colors, sizing, placement)  
→ All other variations derive from this

---

## The Icon (Geometry Locked)

```
Canvas: 512×512

Primary Shapes:
  • Inverted triangle (authority container)
  • Vertical prime bar (enforcement marker)
  • Horizontal checkpoint rule (verification)
  • Bottom notch cut (transparency signal)

Colors:
  • Background: #0B0E14 (near-black matte)
  • Foreground: #E9E4D8 (bone white)
  
Philosophy: "Looks like it belongs on a classified binder, not an app store."
```

**Master SVG:** `artifacts/sintraprime-icon.svg`  
**Export:** SVG → PNG (512, 256, 128, 64, 48, 24) + ICO

---

## The Mode Declaration (Language Locked)

Use EXACTLY these forms. Do not freestyle.

### ACTIVE (Default)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — ACTIVE
Governance: Locked · Scope: Declared · Execution: Constrained
Authority Basis: Documentary Evidence Only
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### OBSERVE ONLY

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — OBSERVE ONLY
Governance: Locked · Scope: Analysis · Execution: Forbidden
Authority Basis: Evidence Review, No Action
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### REFUSAL ISSUED

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — REFUSAL ISSUED
Governance: Locked · Scope: Constrained · Execution: Blocked
Authority Basis: Constitutional Constraint [cite]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### AUDIT RESPONSE

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — AUDIT RESPONSE
Governance: Locked · Scope: Disclosed · Execution: Logged
Authority Basis: Regulatory Inquiry [cite]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Source:** `docs/mode-declaration.md` (copy-paste)

---

## Deployment Timeline

| Phase | Task | Time |
|-------|------|------|
| 0 | Prep (verify access) | 5 min |
| 1 | Asset generation (SVG → PNG/ICO) | 10 min |
| 2 | Repo structure (create folders) | 5 min |
| 3 | Mode declaration templates | 5 min |
| 4 | ChatGPT Custom GPT setup | 10 min |
| 5 | Desktop integration (shortcut + icon) | 5 min |
| 6 | Notion (optional) | 10 min |
| 7 | PDF header template | 5 min |
| 8 | Git commit | 5 min |
| 9 | Verification (test all) | 5 min |
| 10 | Announcement (optional) | 2 min |

**Total: ~60 minutes**

**Checklist:** `docs/SINTRAPRIME_DEPLOYMENT_RUNBOOK.md`

---

## Integration Points

Where the sigil + mode declaration appear:

| Context | Asset | Declaration | Reference |
|---------|-------|-------------|-----------|
| ChatGPT | 512px PNG | In system prompt | Phase 4 runbook |
| Desktop | 256px ICO | N/A | Phase 5 runbook |
| PDFs | 48px PNG | Header block | `scripts/sintraprime_pdf_header.py` |
| Notion | 128px PNG | Database entry | `templates/notion/NOTION_DATABASE_SCHEMA.md` |
| Docs | SVG/24px | Markdown block | `docs/mode-declaration.md` |
| CLI | SVG/24px | Startup banner | Phase 4 system prompt |

---

## Code Integration

### For Python PDF Generation

```python
from scripts.sintraprime_pdf_header import add_sintraprime_header

story = []
add_sintraprime_header(
    story,
    mode="ACTIVE",
    scope="Governance Review",
    icon_path="brand/sintraprime/sintraprime-sigil-48.png"
)
# ... add content ...
doc.build(story)
```

### For ChatGPT System Prompt

Paste into Custom GPT instructions:

```
You are SintraPrime, a governed analytical agent.

MODE DECLARATION:

🜂 SINTRAPRIME MODE — ACTIVE
Governance: Locked · Scope: [user declares] · Execution: Constrained
Authority Basis: Documentary Evidence Only

CONSTRAINTS:
- No inference beyond documentary evidence
- No execution without explicit consent
- All outputs auditable and reproducible
- Constitutional checks before response
```

### For Notion Database

Create database with properties from:  
`templates/notion/NOTION_DATABASE_SCHEMA.md`

Add each entry with mode status + scope + timestamp.

---

## Git Repository Structure (Post-Deployment)

```
/
  artifacts/
    sintraprime-icon.svg
    sintraprime-sigil-512.png
    sintraprime-sigil-256.ico
    sintraprime-sigil-{128,64,48,24}.png
  
  brand/
    sintraprime/
      SINTRAPRIME_BRAND_SPEC.md
      [icon files above]
  
  templates/
    pdf/
      header.html
      header-sigil-48.png
    notion/
      mode-declaration-template.md
      NOTION_DATABASE_SCHEMA.md
  
  docs/
    SINTRAPRIME_DEPLOYMENT_RUNBOOK.md
    mode-declaration.md
    SINTRAPRIME_MODE_DECLARATION_SPEC.md
    SINTRAPRIME_SIGIL_DESIGN_BRIEF.md
    SINTRAPRIME_MODE_WORKFLOW.md
  
  scripts/
    sintraprime_pdf_header.py
    generate-sintraprime-icon.mjs
```

All tracked in Git. All auditable.

---

## What You Can Do Next (No Additional Setup)

1. **Brand Spec Extension**
   - Add usage examples (resize rules, spacing in different contexts)
   - Add negative examples (what NOT to do)

2. **CLI Integration**
   - Add startup banner to your CLI tool
   - Reference: Phase 4 system prompt

3. **GitHub Actions**
   - Auto-create Notion entries on pipeline runs
   - Reference: `templates/notion/NOTION_DATABASE_SCHEMA.md` Make.com section

4. **PDF Watermark**
   - Add optional background sigil (10–20% opacity)
   - Reference: `scripts/sintraprime_pdf_header.py` watermark function

---

## Authority Statement

> **SINTRAPRIME MODE is a declared operational framework enforcing constitutional constraints on AI reasoning and execution.**
>
> The sigil (🜂) and mode declaration are the visual + linguistic anchors of this framework.
>
> Consistency across all contexts (ChatGPT, desktop, PDFs, Notion, CLI) is material to the framework's credibility and auditor recognition.
>
> This specification is locked. Changes require dated amendment + rationale + commit hash.

---

## Success Criteria

When you've deployed SintraPrime Mode, you should observe:

✅ **Week 1:** Icon appears in ChatGPT sidebar. Feels native.  
✅ **Week 2:** Desktop shortcut muscle memory. Taskbar shows SintraPrime.  
✅ **Week 3:** Notion dashboard populated. Mode status is visible on every entry.  
✅ **Week 4:** PDF headers standardized. Every formal output has the sigil.  
✅ **Week 5:** Team references "SintraPrime Mode" in conversation. It feels real.

That's when you know it worked.

---

## Status

```
✅ Icon: LOCKED (exact SVG spec)
✅ Brand Spec: LOCKED (one-pager, all specs)
✅ Mode Declaration: LOCKED (5 variants, copy-paste)
✅ Deployment Runbook: LOCKED (10 phases, 60 min)
✅ ReportLab Function: READY (drop-in)
✅ Notion Schema: READY (field specs + Make.com)
✅ Repository Structure: READY (layout defined)
```

**Status: READY FOR EXECUTION**

Execute `docs/SINTRAPRIME_DEPLOYMENT_RUNBOOK.md` starting with Phase 0.

---

## Questions?

| Question | Answer File |
|----------|-------------|
| "What's the exact icon spec?" | `brand/SINTRAPRIME_BRAND_SPEC.md` |
| "What do I write in the mode declaration?" | `docs/mode-declaration.md` |
| "How do I deploy?" | `docs/SINTRAPRIME_DEPLOYMENT_RUNBOOK.md` |
| "How do I integrate with Python/PDFs?" | `scripts/sintraprime_pdf_header.py` |
| "How do I set up Notion?" | `templates/notion/NOTION_DATABASE_SCHEMA.md` |
| "What's the philosophy?" | `brand/SINTRAPRIME_BRAND_SPEC.md` (intro) |

All answers are in the docs. No ambiguity.

---

**This is your governance mode.**

**Go deploy it.**
