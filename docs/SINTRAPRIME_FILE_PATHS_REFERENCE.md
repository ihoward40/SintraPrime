# SINTRAPRIME DEPLOYMENT — EXACT FILE PATHS

This is a quick reference for where everything lives. Use this when you need to find an asset or spec fast.

---

## Asset Locations (What to Use Where)

### Icons / Assets

```
artifacts/sintraprime-icon.svg
  → Master source. Edit here. SVG format.
  → ALL other sizes export from this.
  → Tracked in Git. Auditable.

artifacts/sintraprime-sigil-512.png
  → ChatGPT Custom GPT upload (exactly this size)
  → Upload to: https://chat.openai.com/gpts/editor → Configure → Icon

artifacts/sintraprime-sigil-256.ico
  → Windows desktop icon (ICO, multi-resolution embedded)
  → Use for: Desktop shortcut icon assignment
  → Right-click shortcut → Properties → Change Icon → Browse to this file

artifacts/sintraprime-sigil-128.png
  → Notion page icons / web dashboards
  → Use in: Notion page icon selector

artifacts/sintraprime-sigil-48.png
  → PDF document headers (top-left corner)
  → Copy to: templates/pdf/header-sigil-48.png (reference copy)
  → Use in: scripts/sintraprime_pdf_header.py (icon_path parameter)

artifacts/sintraprime-sigil-64.png
  → Compact sidebars / medium contexts
  → Use in: Web UIs, secondary displays

artifacts/sintraprime-sigil-24.png
  → Minimal / favicon-like
  → Use in: Tiny UI elements, favicon fallback
```

---

## Specification Documents (COPY FROM THESE)

### Canonical Mode Declaration (EXACT LANGUAGE)

**Location:** `docs/mode-declaration.md`

**What to do:** Copy the exact text block (one of 4 variants). Do not edit. Paste at top of:
- Notion pages
- PDFs (use in header template)
- Markdown documents
- ChatGPT system prompt

**DO NOT FREESTYLE.** These forms are locked.

---

### Brand Specification (All Rules)

**Location:** `brand/SINTRAPRIME_BRAND_SPEC.md`

**Sections:**
- Geometry (exact SVG construction)
- Meaning (what each shape signals)
- Export specs (which size for which use case)
- Placement & spacing rules
- Color palette (locked colors)
- Sizing rules (legibility + scaling)
- Typography (paired fonts)
- Deployment checklist (quick ref)

**Use this when:** You need to verify the exact spec, regenerate the icon, or answer "why does it look like that?"

---

### Design Brief (For Designers/AI Models)

**Location:** `docs/SINTRAPRIME_SIGIL_DESIGN_BRIEF.md`

**Contains:**
- 3 design prompts (A: Prime Mark, B: Keyhole, C: Fractured Seal)
- Exact SVG construction spec
- Color palette + philosophy

**Use this when:** Regenerating the icon or briefing a designer.

---

## Implementation Guides (FOLLOW THESE STEP-BY-STEP)

### Main Deployment Runbook (Execute This)

**Location:** `docs/SINTRAPRIME_DEPLOYMENT_RUNBOOK.md`

**What it contains:**
- 10 phases (0–10)
- Each phase has exact steps
- Times listed (total ~60 min)
- Verification checklist
- Troubleshooting

**How to use:** Start at Phase 0. Execute each step in order. Don't skip.

---

### Python/ReportLab PDF Integration

**Location:** `scripts/sintraprime_pdf_header.py`

**What it does:**
- Drop-in function: `add_sintraprime_header()`
- Adds sigil + mode declaration to PDFs
- Includes watermark option
- Full example function

**How to use:**
```python
from scripts.sintraprime_pdf_header import add_sintraprime_header

story = []
add_sintraprime_header(
    story,
    mode="ACTIVE",
    scope="Your scope",
    icon_path="brand/sintraprime/sintraprime-sigil-48.png"
)
```

---

### Notion Database Setup

**Location:** `templates/notion/NOTION_DATABASE_SCHEMA.md`

**What it contains:**
- Database field specs (12 properties)
- Field types + descriptions
- Validation rules
- Make.com webhook setup (automation)
- Example database entry

**How to use:**
1. Create new Notion database
2. Add each property exactly as specified
3. (Optional) Connect via Make.com for automation

---

## Templates (COPY & PASTE THESE)

### Notion Mode Declaration Block

**Location:** `templates/notion/mode-declaration-template.md`

**What to do:** Copy the entire Markdown block. Paste at top of Notion run pages.

---

### PDF Header HTML

**Location:** `templates/pdf/header.html`

**What to do:** Use in your PDF generation code:
```python
from reportlab.platypus import HtmlBlock
story.append(HtmlBlock(open("templates/pdf/header.html").read()))
```

---

### Canonical Mode Declarations (5 Forms)

**Location:** `docs/mode-declaration.md`

**Contains:**
- ACTIVE
- OBSERVE ONLY
- REFUSAL ISSUED
- AUDIT RESPONSE
- OVERRIDE (emergency only)

**How to use:** Copy exact text. Paste without editing.

---

## Quick Reference By Scenario

### "I need the icon for [use case]"

| Use Case | File | Size |
|----------|------|------|
| ChatGPT | `sintraprime-sigil-512.png` | 512×512 |
| Desktop | `sintraprime-sigil.ico` | 256×256 multi-res |
| Notion | `sintraprime-sigil-128.png` | 128×128 |
| PDF header | `sintraprime-sigil-48.png` | 48×48 |
| Markdown / docs | `sintraprime-icon.svg` | Any size (vector) |

---

### "I need to know what to write"

| Situation | File | Section |
|-----------|------|---------|
| Top of document | `docs/mode-declaration.md` | Copy exact form |
| ChatGPT system prompt | `docs/mode-declaration.md` | ACTIVE variant |
| Notion page | `templates/notion/mode-declaration-template.md` | Full template |
| PDF header | `scripts/sintraprime_pdf_header.py` | mode parameter |

---

### "I need exact specs"

| Spec | File | Section |
|------|------|---------|
| Icon geometry | `brand/SINTRAPRIME_BRAND_SPEC.md` | "Geometry (Deterministic Construction)" |
| Colors | `brand/SINTRAPRIME_BRAND_SPEC.md` | "Color Palette (Locked)" |
| Sizing | `brand/SINTRAPRIME_BRAND_SPEC.md` | "Sizing Rules" |
| Placement | `brand/SINTRAPRIME_BRAND_SPEC.md` | "Placement & Spacing Rules" |

---

### "I need to deploy"

**Start here:** `docs/SINTRAPRIME_DEPLOYMENT_RUNBOOK.md`

Execute phases 0–10 in order. ~60 minutes.

---

### "I need to integrate with code"

**Python + PDF:** `scripts/sintraprime_pdf_header.py`  
**Notion:** `templates/notion/NOTION_DATABASE_SCHEMA.md`  
**ChatGPT:** `docs/mode-declaration.md` (for system prompt)

---

## File Size Reference (For Uploads)

```
sintraprime-icon.svg              ~2 KB (vector, scalable)
sintraprime-sigil-512.png         ~50–80 KB (PNG, 512×512)
sintraprime-sigil-256.ico         ~100 KB (ICO, multi-res)
sintraprime-sigil-128.png         ~12–20 KB
sintraprime-sigil-48.png          ~3–5 KB
sintraprime-sigil-24.png          ~1–2 KB

Total assets: ~200 KB (negligible)
```

All files are Git-tracked. No storage issues.

---

## Version Control (Audit Trail)

All files live in Git:

```bash
git log --oneline -- artifacts/sintraprime-icon.svg
git log --oneline -- brand/SINTRAPRIME_BRAND_SPEC.md
git show HEAD:artifacts/sintraprime-icon.svg
```

Every change is auditable. Every spec amendment is dated + rationalized.

---

## When to Update What

### Icon Changes

1. Edit: `artifacts/sintraprime-icon.svg`
2. Export: SVG → PNG (512, 256, 128, 64, 48, 24) + ICO
3. Commit with rationale:
   ```
   git commit -m "refine: sintraprime sigil geometry
   
   - Adjusted stroke width for improved legibility at 24px
   - Rationale: feedback from PDF test suite
   ```

### Spec Changes

1. Edit: `brand/SINTRAPRIME_BRAND_SPEC.md`
2. Add amendment section with:
   - Date (YYYY-MM-DD)
   - Section reference
   - Rationale (one sentence)
   - Commit hash
3. Commit

Example:
```
Amendment 2026-01-20:
  Section: Colors
  Change: Foreground Primary #E9E4D8 → #F5F3F0
  Rationale: Improved contrast on bright displays
  Commit: abc123d
```

### Mode Declaration Changes

Changes to the 5 canonical forms require unanimous agreement. Don't edit lightly.

If you must change:
1. Create new variant (don't replace existing)
2. Document rationale
3. Version the change (e.g., "v1.1" appended to mode)

---

## Audit Trail Commands

Check who changed what:

```bash
# View all commits touching the brand spec
git log --oneline brand/SINTRAPRIME_BRAND_SPEC.md

# View all commits touching the icon
git log --oneline artifacts/sintraprime-icon.svg

# See the full history of a file
git log -p artifacts/sintraprime-icon.svg

# Check who last edited a specific line
git blame brand/SINTRAPRIME_BRAND_SPEC.md
```

Everything is auditable.

---

## One-Command Reference

If you're lost:

```bash
# Show all SintraPrime-related files
find . -name "*sintraprime*" -o -name "*SINTRAPRIME*"

# List all assets
ls -lh artifacts/sintraprime-*

# List all specs/docs
ls docs/SINTRAPRIME*

# List all templates
ls templates/
```

---

**This is your deployment map. Use it to find anything instantly.**

**Next step:** `docs/SINTRAPRIME_DEPLOYMENT_RUNBOOK.md`
