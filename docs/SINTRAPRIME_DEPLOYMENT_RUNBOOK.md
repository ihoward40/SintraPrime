# SINTRAPRIME MODE — DEPLOYMENT RUNBOOK

**Execute this in order. No deviations. No skips.**

---

## PHASE 0: PREP (5 min)

**You need:**
- [ ] Git repo access (ihoward40/SintraPrime)
- [ ] ChatGPT Plus (for Custom GPT creation)
- [ ] Windows desktop or equivalent (for icon generation)
- [ ] Ability to export SVG → PNG/ICO (Figma, Inkscape, or online converter)

**Verify:**
```bash
cd "c:\Users\admin\.sintraprime esm project"
git status  # should show no errors
```

If any issues, stop and fix before proceeding.

---

## PHASE 1: ASSET GENERATION (10 min)

### Step 1.1: Verify Master SVG

```bash
ls artifacts/sintraprime-icon.svg
```

Should exist. If not:
- Copy the exact SVG from SINTRAPRIME_BRAND_SPEC.md, Geometry section
- Save to `artifacts/sintraprime-icon.svg`

### Step 1.2: Export PNGs (pick one method)

**Method A: Figma (fastest)**
1. Create new file in Figma
2. Upload `artifacts/sintraprime-icon.svg`
3. Select the SVG object
4. Right panel → Export → PNG
5. Batch export: 512, 256, 128, 64, 48, 24
6. Save to `artifacts/sintraprime-sigil-[SIZE].png`

**Method B: Inkscape (free)**
1. Open `artifacts/sintraprime-icon.svg` in Inkscape
2. File → Export As → PNG Image
3. Set width to 512, height to 512
4. Export as `artifacts/sintraprime-sigil-512.png`
5. Repeat for 256, 128, 64, 48, 24

**Method C: Online Converter (no install)**
1. Go to CloudConvert.com or Convertio.co
2. Upload `artifacts/sintraprime-icon.svg`
3. Convert to PNG
4. Set output size: 512×512
5. Download → save to `artifacts/sintraprime-sigil-512.png`
6. Repeat for each size

**Verification:**
```bash
ls artifacts/sintraprime-sigil-*.png
# Should list: 512.png, 256.png, 128.png, 64.png, 48.png, 24.png
```

- [ ] All 6 PNG files created

### Step 1.3: Create Windows ICO

Use an online ICO converter (e.g., CloudConvert, icoconvert.com):

1. Upload `artifacts/sintraprime-sigil-256.png`
2. Convert to Windows ICO
3. Ensure multi-resolution (embeds 16, 32, 48, 256)
4. Download → save as `artifacts/sintraprime-sigil.ico`

Verification:
```bash
ls artifacts/sintraprime-sigil.ico  # should exist
```

- [ ] ICO file created

---

## PHASE 2: REPO STRUCTURE (5 min)

Create folder structure:

```bash
mkdir -p brand/sintraprime
mkdir -p templates/pdf
mkdir -p templates/notion
```

Move/verify assets:

```bash
# Confirm layout
ls -R brand/
ls -R templates/
```

Expected:
```
brand/
  └─ sintraprime/
      ├─ SINTRAPRIME_BRAND_SPEC.md
      ├─ sintraprime-sigil.svg
      ├─ sintraprime-sigil-512.png
      ├─ sintraprime-sigil-256.png
      ├─ sintraprime-sigil-128.png
      ├─ sintraprime-sigil-64.png
      ├─ sintraprime-sigil-48.png
      ├─ sintraprime-sigil-24.png
      └─ sintraprime-sigil.ico

templates/
  ├─ pdf/
  │   ├─ header-sigil-48.png (copy of artifacts/sintraprime-sigil-48.png)
  │   └─ header-rule.svg
  └─ notion/
      └─ mode-declaration-template.md
```

- [ ] Folder structure created

---

## PHASE 3: MODE DECLARATION TEMPLATES (5 min)

### Step 3.1: Create Notion Template

File: `templates/notion/mode-declaration-template.md`

```markdown
# 🜂 SINTRAPRIME RUN — [DATE]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — ACTIVE
Governance: Locked · Scope: Declared · Execution: Constrained
Authority Basis: Documentary Evidence Only
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## Scope Declaration

[Describe what this run does]

## Constraints Applied

- No inference beyond documentary evidence
- No execution without explicit authorization
- All outputs auditable and reproducible

## Evidence Links

[Link to supporting documents]

## Run Status

**Mode:** ACTIVE / OBSERVE ONLY / REFUSAL ISSUED / AUDIT RESPONSE  
**Hash:** [SHA256 of inputs/outputs]  
**Operator:** [Name]  
**Timestamp:** [ISO 8601]  
```

- [ ] Notion template created

### Step 3.2: Create Canonical Mode Declaration File

File: `docs/mode-declaration.md` (or `brand/sintraprime/mode-declaration.md`)

```markdown
# SINTRAPRIME MODE DECLARATION — CANONICAL

Use these EXACTLY. Do not freestyle.

## ACTIVE (Default)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — ACTIVE
Governance: Locked · Scope: Declared · Execution: Constrained
Authority Basis: Documentary Evidence Only
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## OBSERVE ONLY

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — OBSERVE ONLY
Governance: Locked · Scope: Analysis · Execution: Forbidden
Authority Basis: Evidence Review, No Action
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## REFUSAL ISSUED

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — REFUSAL ISSUED
Governance: Locked · Scope: Constrained · Execution: Blocked
Authority Basis: Constitutional Constraint [cite rule]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## AUDIT RESPONSE

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — AUDIT RESPONSE
Governance: Locked · Scope: Disclosed · Execution: Logged
Authority Basis: Regulatory Inquiry [cite authority]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
```

- [ ] Canonical mode declaration created

---

## PHASE 4: CHATGPT CUSTOM GPT (10 min)

1. Open: https://chat.openai.com/gpts/editor
2. Click: "Create a new GPT"

**Fill in:**

| Field | Value |
|-------|-------|
| Name | SintraPrime |
| Description | Governance-locked analytical agent. Evidence-only reasoning. Constitutional enforcement. No execution without declaration. |
| Instructions | [See below] |
| Icon | Upload `artifacts/sintraprime-sigil-512.png` |

**Instructions (paste exactly):**

```
You are SintraPrime, a governed analytical agent.

OPERATIONAL CONSTRAINTS:
- No inference beyond documentary evidence
- No execution without explicit operator consent
- All outputs are auditable and reproducible
- Constitutional constraints are non-negotiable

EVERY RESPONSE INCLUDES MODE DECLARATION:

🜂 SINTRAPRIME MODE — ACTIVE
Governance: Locked · Scope: [user declares] · Execution: Constrained
Authority Basis: Documentary Evidence Only

---

REFERENCE DOCUMENTS:
- Brand Spec: https://github.com/ihoward40/SintraPrime/blob/master/brand/SINTRAPRIME_BRAND_SPEC.md
- Governance: https://github.com/ihoward40/SintraPrime/blob/master/docs/AI_BOUNDARY.md

When uncertain, declare the constraint. When constrained, explain why.
```

3. Click: Save
4. Click: Publish to Store (or keep private)
5. Copy GPT URL from browser (format: `https://chat.openai.com/gpts/[ID]`)

- [ ] ChatGPT Custom GPT created
- [ ] Icon uploaded
- [ ] GPT URL noted: `_______________________________`

---

## PHASE 5: DESKTOP INTEGRATION (5 min)

### Step 5.1: Create Windows Shortcut

1. Right-click desktop → New → Shortcut
2. Location: Paste your ChatGPT GPT URL from Phase 4
3. Name: `SintraPrime`
4. Click Finish
5. Right-click shortcut → Properties
6. Advanced button (bottom left) → check "Run as Administrator" (optional)
7. Change Icon button → Browse to `artifacts/sintraprime-sigil.ico`
8. Apply → OK
9. Right-click shortcut → Pin to Taskbar

Result: SintraPrime icon appears in taskbar next to ChatGPT.

- [ ] Desktop shortcut created
- [ ] Icon assigned
- [ ] Pinned to taskbar

### Step 5.2: Test

Click the SintraPrime icon in taskbar. It should:
1. Open ChatGPT
2. Navigate to your SintraPrime GPT
3. Mode declaration appears in chat

If not, verify:
- URL is correct (copy fresh from browser)
- Icon file exists (`artifacts/sintraprime-sigil.ico`)
- ChatGPT is accessible

- [ ] Tested and working

---

## PHASE 6: NOTION INTEGRATION (10 min, if you use Notion)

### Step 6.1: Create Run Template

1. Go to your Notion workspace
2. Create a new page: "SintraPrime Run Template"
3. Add icon: Upload `brand/sintraprime/sintraprime-sigil-128.png` as page icon
4. Add Mode Declaration header (copy from `templates/notion/mode-declaration-template.md`)
5. Create database properties:
   - **Mode Status** (Select): ACTIVE | OBSERVE ONLY | REFUSAL ISSUED | AUDIT RESPONSE
   - **Scope** (Text)
   - **Operator** (Person)
   - **Run Hash** (Text)
   - **Constraint Checks** (Checkbox)

6. Duplicate template for each new run (database entry)

- [ ] Notion template created
- [ ] Properties configured

### Step 6.2: Link to GitHub

In your Notion template, add a relation or URL field that links to:
- GitHub commit: https://github.com/ihoward40/SintraPrime/blob/[branch]/[path]
- OPERATOR_LEDGER: https://github.com/ihoward40/SintraPrime/blob/master/docs/OPERATOR_LEDGER.md

- [ ] Notion linked to GitHub

---

## PHASE 7: PDF HEADER TEMPLATE (5 min)

Create `templates/pdf/header.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Courier New', monospace;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 2px solid #E9E4D8;
      padding: 16px 24px;
      margin-bottom: 32px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .header img {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
    }
    .header-text {
      flex: 1;
    }
    .header-title {
      font-weight: bold;
      color: #0B0E14;
      margin: 0;
      font-size: 14px;
    }
    .header-subtitle {
      color: #666;
      font-size: 11px;
      margin: 4px 0 0 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="brand/sintraprime/sintraprime-sigil-48.png" alt="SintraPrime">
    <div class="header-text">
      <p class="header-title">🜂 SINTRAPRIME MODE — ACTIVE</p>
      <p class="header-subtitle">Governance: Locked · Scope: Declared · Execution: Constrained</p>
      <p class="header-subtitle">Authority Basis: Documentary Evidence Only</p>
    </div>
  </div>
  <!-- Content goes here -->
</body>
</html>
```

- [ ] PDF header template created

---

## PHASE 8: GIT COMMIT (5 min)

```bash
cd "c:\Users\admin\.sintraprime esm project"

# Add all new files
git add brand/
git add templates/
git add artifacts/sintraprime-sigil-*.png
git add artifacts/sintraprime-sigil.ico

# Commit
git commit -m "feat: deploy SintraPrime Mode identity package

- Exact SVG sigil spec (inverted triangle + prime bar + checkpoint rule)
- Brand specification (locked colors, sizing, placement)
- Deployment runbook (executable 8-phase checklist)
- ChatGPT Custom GPT setup with icon
- Desktop integration (taskbar shortcut with icon)
- Notion template with mode declaration
- PDF header template for branding
- Mode declaration canonical forms (5 variants)

SintraPrime Mode is now visually persistent across all contexts.
Icon + Mode Declaration + Ritual = Recognized Governance Mode."

# Push
git push origin master

# Verify
git log --oneline -1
```

- [ ] Committed to GitHub

---

## PHASE 9: VERIFICATION (5 min)

Test each integration point:

**ChatGPT:**
- [ ] Click SintraPrime in left sidebar
- [ ] Mode declaration appears in chat
- [ ] Icon shows next to name

**Desktop:**
- [ ] Click SintraPrime in taskbar
- [ ] Opens ChatGPT → SintraPrime GPT
- [ ] Icon is visible in taskbar

**Notion (if enabled):**
- [ ] Notion page displays sigil as icon
- [ ] Mode declaration block is visible
- [ ] Database properties populate

**PDF:**
- [ ] Generate a test PDF using header template
- [ ] Sigil appears top-left
- [ ] Mode declaration text renders correctly

**Repo:**
- [ ] All files are tracked in Git
- [ ] Brand spec is readable at `brand/SINTRAPRIME_BRAND_SPEC.md`
- [ ] Assets are accessible from all docs

---

## PHASE 10: ANNOUNCE (Optional, 2 min)

If you want to signal that SintraPrime Mode is live:

```markdown
**🜂 SintraPrime Mode Deployed**

SintraPrime is now a recognized governance mode across:
✓ ChatGPT Custom GPT (sidebar icon)
✓ Desktop (taskbar shortcut)
✓ PDFs (header sigil + declaration)
✓ Notion (page icon + template)
✓ Governance docs (canonical mode declarations)

When you see 🜂, you know:
- This is a governed, auditable context
- Constitutional constraints are active
- Output is reproducible and notarizable

Start here: Click SintraPrime in ChatGPT.
```

- [ ] (Optional) Announcement sent

---

## TOTAL TIME: ~60 minutes

| Phase | Task | Time |
|-------|------|------|
| 0 | Prep | 5 min |
| 1 | Asset generation | 10 min |
| 2 | Repo structure | 5 min |
| 3 | Mode declaration templates | 5 min |
| 4 | ChatGPT Custom GPT | 10 min |
| 5 | Desktop integration | 5 min |
| 6 | Notion (optional) | 10 min |
| 7 | PDF header | 5 min |
| 8 | Git commit | 5 min |
| 9 | Verification | 5 min |
| 10 | Announcement (opt) | 2 min |

---

## IF YOU GET STUCK

| Problem | Solution |
|---------|----------|
| SVG won't export to PNG | Use online converter (CloudConvert.com) |
| ChatGPT Custom GPT not visible | Wait 5 minutes after publish, refresh |
| Icon doesn't appear in taskbar | Verify ICO file exists, try re-assigning icon |
| Mode declaration formatting looks wrong | Copy-paste exact text from `templates/notion/mode-declaration-template.md` |
| Git commit fails | `git status` to check for conflicts, then retry |

---

## WHAT YOU NOW HAVE

A **complete, deployed governance mode** that:

✓ Has visual identity (sigil + brand spec)  
✓ Is persistent across contexts (ChatGPT, desktop, PDFs, Notion)  
✓ Is auditable (all tracked in Git)  
✓ Feels official (brand spec locked, no variations)  
✓ Is ritual-based (mode declaration structure enforces consistency)  

**SintraPrime Mode is now real.**

---

**Status: READY FOR EXECUTION**

Execute Phase 0 now. Continue through Phase 10.

No deviations. This is the checklist.
