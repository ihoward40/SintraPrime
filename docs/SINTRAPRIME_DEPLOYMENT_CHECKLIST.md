# SINTRAPRIME MODE — Complete Deployment Checklist

## One Command to Rule Them All

Execute this checklist in order. This is your deployment script.

---

## Phase 0: Prep (5 minutes)

- [ ] You have GitHub access (repo: ihoward40/SintraPrime)
- [ ] You can create ChatGPT Custom GPT (requires ChatGPT Plus)
- [ ] You have Windows desktop (for shortcut creation)
- [ ] You have commit access to the repo

---

## Phase 1: Icon Assets (10 minutes)

### 1.1 Master SVG (Already Done)

```
✓ artifacts/sintraprime-icon.svg exists
  - Geometry: Inverted triangle + prime bar + seal ring
  - Colors: #0B0E14 (bg) + #D4AF8C (symbol)
  - Style: Governance-grade, flat, legible at 24px
```

### 1.2 Generate PNG Variants

**Option A: Manual (if you have design tools)**

Open `artifacts/sintraprime-icon.svg` in:
- Figma
- Adobe XD
- Inkscape
- Online converter (SVG → PNG)

Export as:
- `sintraprime-icon-512.png` (512×512, transparent bg)
- `sintraprime-icon-256.png` (256×256, transparent bg)
- `sintraprime-icon-128.png` (128×128, transparent bg)
- `sintraprime-icon-48.png` (48×48, transparent bg)

**Option B: Automated (using Node)**

```bash
cd c:\Users\admin\.sintraprime esm project

# Install image tools
npm install sharp jimp --save-dev

# Run generator
node scripts/generate-sintraprime-icon.mjs
```

(Script created earlier; installs will output PNGs)

**Option C: AI Generation**

Use this prompt with DALL-E, Midjourney, or Claude:

```
Create a formal sigil icon for a governance system called "SintraPrime."

Style: Geometric, flat, official (like a classified government document mark).

Composition:
- Background: solid dark navy (#0B0E14)
- Main symbol: inverted triangle with a centered vertical bar crossed by a horizontal rule
- Outer ring: subtle verification marks at cardinal points
- All strokes: muted gold/bone color (#D4AF8C)
- No text, no gradients, no shadows

Tone: Austere, authoritative, legible at 24px.

Deliverable: PNG, 512×512, solid dark background.
```

Generate 4 sizes (512, 256, 128, 48) and save to `artifacts/`.

### 1.3 Create Windows ICO

Use ICO converter (free online or tool):
- Input: `sintraprime-icon-256.png`
- Output: `artifacts/sintraprime-icon-256.ico`

This is for desktop shortcuts.

---

## Phase 2: Documentation (Already Done)

The following files are already created:

- [ ] ✓ `docs/SINTRAPRIME_MODE_BADGE.md` (visual specs)
- [ ] ✓ `docs/SINTRAPRIME_MODE_DECLARATION_SPEC.md` (canonical declarations)
- [ ] ✓ `docs/SINTRAPRIME_SIGIL_DESIGN_BRIEF.md` (design instructions)
- [ ] ✓ `docs/SINTRAPRIME_MODE_INTEGRATION.md` (rollout plan)
- [ ] ✓ `docs/SINTRAPRIME_MODE_WORKFLOW.md` (workflow integration)

**Verify they exist in your repo.**

---

## Phase 3: Update Core Docs (20 minutes)

### 3.1 Update README.md

1. Open `README.md`
2. After the title, add:

```markdown
# SintraPrime

![SintraPrime](artifacts/sintraprime-icon.svg)

**🜂 SINTRAPRIME MODE** — Constitutional governance for AI reasoning  
*Deterministic replay. Auditable. Notarized.*

---

## What Is SintraPrime?

SintraPrime is a [your description here].

Operating under SintraPrime Mode means:
✓ Deterministic replay (all outputs reproducible)
✓ Constitutional constraints (AI boundary enforcement)
✓ Notarized writes (tamper-evident operations)
✓ Full audit trail (governance-grade logging)

See: [SintraPrime Mode Specification](docs/SINTRAPRIME_MODE_DECLARATION_SPEC.md)

---
```

- [ ] README.md updated

### 3.2 Update OPERATOR_RUNBOOK.md

1. Open `OPERATOR_RUNBOOK.md`
2. After table of contents, add new section:

```markdown
## SintraPrime Mode: Quick Reference

### Activation

Click: SintraPrime GPT (left sidebar, ChatGPT)

### Mode Declaration Appears

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — ACTIVE
Governance: Locked · Scope: Declared · Execution: Constrained
Authority Basis: Documentary Evidence Only
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

See: [SINTRAPRIME_MODE_DECLARATION_SPEC.md](docs/SINTRAPRIME_MODE_DECLARATION_SPEC.md)

---
```

- [ ] OPERATOR_RUNBOOK.md updated

### 3.3 Update AI_BOUNDARY.md (Top)

1. Open `docs/AI_BOUNDARY.md`
2. Add to very top (before current intro):

```markdown
![SintraPrime](../artifacts/sintraprime-icon.svg)

**🜂 SINTRAPRIME MODE — OBSERVE ONLY**  
Governance: Locked · Scope: Analysis · Execution: Forbidden  
Authority Basis: Evidence Review, No Action

---
```

- [ ] AI_BOUNDARY.md updated

### 3.4 Update change-control.v1.1.md (Top)

1. Open `docs/change-control.v1.1.md`
2. Add to very top:

```markdown
![SintraPrime](../artifacts/sintraprime-icon.svg)

**🜂 SINTRAPRIME MODE — ACTIVE**  
Governance: Locked · Scope: Declared · Execution: Constrained  
Authority Basis: Documentary Evidence Only

---
```

- [ ] change-control.v1.1.md updated

### 3.5 Update notarization-sop.v1.md (Top)

1. Open `docs/notarization-sop.v1.md`
2. Add to very top:

```markdown
![SintraPrime](../artifacts/sintraprime-icon.svg)

**🜂 SINTRAPRIME MODE — ACTIVE**  
Governance: Locked · Scope: Declared · Execution: Constrained  
Authority Basis: Documentary Evidence Only

---
```

- [ ] notarization-sop.v1.md updated

### 3.6 Update OPERATOR_LEDGER.md

1. Open `docs/OPERATOR_LEDGER.md`
2. Add new section:

```markdown
## SintraPrime Mode Sessions

Every SintraPrime session is logged here.

| Date | Session ID | Mode | Scope | Status | Hash |
|------|------------|------|-------|--------|------|
| 2026-01-13 | STP-001 | ACTIVE | Governance setup | ✓ | [SHA] |

---
```

- [ ] OPERATOR_LEDGER.md updated

---

## Phase 4: GitHub Commit (5 minutes)

1. Open terminal in repo root:

```bash
cd "c:\Users\admin\.sintraprime esm project"

# Stage all new files
git add artifacts/sintraprime-icon.svg
git add artifacts/sintraprime-icon-*.png  # if generated
git add artifacts/sintraprime-icon-*.ico  # if generated
git add docs/SINTRAPRIME_MODE_*.md
git add scripts/generate-sintraprime-icon.mjs

# Stage doc updates
git add README.md
git add OPERATOR_RUNBOOK.md
git add docs/AI_BOUNDARY.md
git add docs/change-control.v1.1.md
git add docs/notarization-sop.v1.md
git add docs/OPERATOR_LEDGER.md

# Commit
git commit -m "feat: add SintraPrime Mode identity package

- Add governance-grade sigil icon (inverted triangle + prime bar)
- Define canonical Mode Declaration specifications (5 variants)
- Document exact sigil design brief for replication
- Map workflow integration into existing governance docs
- Create complete deployment checklist

SintraPrime Mode now has persistent visual identity and consistent
declaration across ChatGPT, desktop, PDFs, and documentation.

Closes: [issue #X if applicable]"

# Push
git push origin master
```

- [ ] Committed to GitHub

---

## Phase 5: ChatGPT Custom GPT Setup (10 minutes)

1. Go to: **https://chat.openai.com/gpts/editor**
2. Click: **"Create a new GPT"**
3. Fill in:

| Field | Value |
|-------|-------|
| **Name** | SintraPrime |
| **Description** | Governance-locked analytical agent. Constitutional enforcement. Evidence-only reasoning. |
| **Instructions** | See below |
| **Icon** | Upload `artifacts/sintraprime-icon-512.png` |

4. **Instructions (System Prompt):**

```
You are SintraPrime, a governed analytical agent operating under constitutional constraints.

OPERATIONAL PRINCIPLES:
- No inference beyond documentary evidence
- No execution without explicit operator consent
- All outputs are auditable and reproducible
- Constitutional constraints are non-negotiable
- Every decision is loggable

MODE DECLARATION (start every session):

🜂 SINTRAPRIME MODE — ACTIVE
Governance: Locked · Scope: [user declares] · Execution: Constrained
Authority Basis: Documentary Evidence Only

---

GOVERNANCE DOCUMENTS (reference in responses):
- AI Boundary: https://github.com/ihoward40/SintraPrime/blob/master/docs/AI_BOUNDARY.md
- Change Control: https://github.com/ihoward40/SintraPrime/blob/master/docs/change-control.v1.1.md
- Notarization: https://github.com/ihoward40/SintraPrime/blob/master/docs/notarization-sop.v1.md

When uncertain, declare the constraint. When constrained, explain why.
```

5. Click: **"Save"** (not publish yet)
6. Click: **"Publish to Store"** (or keep private if preferred)
7. Copy GPT link: `https://chat.openai.com/gpts/[GPT_ID]`

- [ ] ChatGPT Custom GPT created
- [ ] Icon uploaded
- [ ] System prompt configured
- [ ] GPT ID noted: `[PASTE_HERE]`

---

## Phase 6: Desktop Integration (5 minutes)

### 6.1 Windows Shortcut

1. Right-click desktop → **New → Shortcut**
2. Location: `https://chat.openai.com/gpts/[YOUR_GPT_ID]`
3. Name: `SintraPrime`
4. Finish
5. Right-click shortcut → **Properties**
6. **Change Icon** → Browse to `artifacts/sintraprime-icon-256.ico`
7. Right-click → **Pin to Taskbar**

Result: SintraPrime appears in taskbar next to ChatGPT

- [ ] Desktop shortcut created
- [ ] Icon assigned
- [ ] Pinned to taskbar

### 6.2 CLI Launch (Optional)

Create `bin/sintraprime-launch.ps1`:

```powershell
#!/usr/bin/env powershell

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗"
Write-Host "║  🜂 SINTRAPRIME MODE — Starting                           ║"
Write-Host "║  Governance: Locked | Execution: Constrained              ║"
Write-Host "╚════════════════════════════════════════════════════════════╝"
Write-Host ""

# Replace with your actual GPT ID
$GPT_URL = "https://chat.openai.com/gpts/[YOUR_GPT_ID]"

Start-Process $GPT_URL

Write-Host "Mode activated. Session is auditable and reproducible."
Write-Host ""
```

Usage:
```bash
.\bin\sintraprime-launch.ps1
```

- [ ] CLI launcher created (optional)

---

## Phase 7: Notion Integration (10 minutes, if applicable)

If you have a Notion governance dashboard:

1. Go to main SintraPrime page
2. Add **page icon**: Upload `artifacts/sintraprime-icon-128.png`
3. Add **page header block**:

```
🜂 SINTRAPRIME MODE — ACTIVE
Governance: Locked · Scope: Declared · Execution: Constrained
Authority Basis: Documentary Evidence Only

See: docs/SINTRAPRIME_MODE_DECLARATION_SPEC.md
```

4. Add **database property**: "SintraPrime Mode" (select/dropdown)
   - Options: ACTIVE | OBSERVE ONLY | REFUSAL ISSUED | AUDIT RESPONSE | OVERRIDE

5. Tag relevant pages with mode status

- [ ] Notion page updated (if applicable)

---

## Phase 8: Verification (5 minutes)

Run through this checklist:

- [ ] Icon displays at 512px (ChatGPT)
- [ ] Icon displays at 256px (desktop)
- [ ] Icon displays at 48px (PDF headers)
- [ ] Mode Declaration renders correctly in Markdown
- [ ] README shows icon + mode badge
- [ ] ChatGPT Custom GPT is accessible
- [ ] Desktop shortcut works (opens ChatGPT → SintraPrime)
- [ ] CLI startup message displays correctly
- [ ] Governance docs have Mode Declaration headers
- [ ] OPERATOR_LEDGER has SintraPrime section

---

## Phase 9: Announcement (Optional)

Once verified, you can announce:

```markdown
**SintraPrime Mode is now live.**

🜂 SintraPrime now has persistent visual identity across:
- ChatGPT Custom GPT (with icon)
- Desktop shortcut (pinned to taskbar)
- All governance documents (Mode Declaration headers)
- CLI tools (startup banner)
- Notion dashboards (page icon + status)

When you see the SintraPrime sigil, you know:
✓ You're in a governed, auditable context
✓ Constitutional constraints are active
✓ Output is reproducible and notarizable

Get started: Click SintraPrime in the ChatGPT sidebar.
```

- [ ] (Optional) Announcement sent

---

## Total Time: ~60 minutes

| Phase | Task | Time | Status |
|-------|------|------|--------|
| 0 | Prep | 5 min | [ ] |
| 1 | Icon Assets | 10 min | [ ] |
| 2 | Documentation | 0 min | [✓] Done |
| 3 | Update Docs | 20 min | [ ] |
| 4 | GitHub Commit | 5 min | [ ] |
| 5 | ChatGPT Setup | 10 min | [ ] |
| 6 | Desktop Integration | 5 min | [ ] |
| 7 | Notion (optional) | 10 min | [ ] |
| 8 | Verification | 5 min | [ ] |
| 9 | Announcement | 5 min | [ ] |

---

## If You Get Stuck

| Issue | Solution |
|-------|----------|
| Icon not rendering | Check file path (relative to repo root) |
| Mode Declaration formatting | Copy-paste from SINTRAPRIME_MODE_DECLARATION_SPEC.md (don't freestyle) |
| ChatGPT Custom GPT not visible | Ensure ChatGPT Plus subscription + wait 5 min for publish |
| Desktop shortcut won't open GPT | Verify GPT URL is correct (copy from browser) |
| PNG export failed | Use online SVG→PNG converter (CloudConvert, Convertio) |

---

## After Deployment

Once SintraPrime Mode is live:

1. **Use it** (click the icon, see the mode switch)
2. **Log sessions** (add to OPERATOR_LEDGER)
3. **Iterate** (if sigil needs tweaking, update SVG and regenerate PNGs)
4. **Socialize** (show teams/auditors what the mode declaration means)

**The power is in consistency.** If you do this right, people will start *recognizing* SintraPrime the way they recognize Agent Mode.

Without OpenAI permission. Without asking.

Just because you made it real.

---

## Questions?

Refer back to:
- **Icon specs?** → `docs/SINTRAPRIME_SIGIL_DESIGN_BRIEF.md`
- **Mode declarations?** → `docs/SINTRAPRIME_MODE_DECLARATION_SPEC.md`
- **Workflow?** → `docs/SINTRAPRIME_MODE_WORKFLOW.md`
- **Integration?** → `docs/SINTRAPRIME_MODE_INTEGRATION.md`

All specs are in the repo. All files are tracked. All decisions are auditable.

Go build.
