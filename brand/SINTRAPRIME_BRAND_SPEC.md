# SintraPrime Brand Specification — One-Pager

**Authority:** Governance-grade visual identity standard  
**Effective:** 2026-01-13  
**Status:** LOCKED (no variations without amendment)

---

## The Sigil

### Geometry (Deterministic Construction)

```
Canvas: 512×512 (scales 1:1 to any size)

Shapes:
  • Inverted triangle (128,140) → (384,140) → (256,400)
  • Vertical prime bar: x=256, y=180→350 (center)
  • Horizontal checkpoint: y=238, x=212→300 (above center)
  • Bottom notch: triangular cut at (256,400)
  • Optional inner border: 55% opacity, reinforces at small sizes

Strokes:
  • Width: 18px (scales proportionally)
  • Linecap: square
  • Linejoin: miter
  • Inner border: 6px width (optional)

Colors:
  • Background: #0B0E14 (near-black, matte, 100% opacity)
  • Foreground: #E9E4D8 (bone white, government-standard)
  • Alternative foreground: #C9A227 (muted gold, if warmer tone desired)
```

### Meaning (Why This Geometry)

| Element | Signal | Auditor Reads As |
|---------|--------|------------------|
| Inverted triangle | Jurisdiction / authority | "This is a formal declaration" |
| Prime bar (vertical) | Enforcement / cryptographic prime | "Mathematical precision governs this" |
| Checkpoint rule | Verification threshold | "Every decision is checkpointed" |
| Bottom notch | Adversarial transparency | "This can be broken open, examined" |

---

## Export Specifications

### Master Asset

| File | Size | Format | Use Case |
|------|------|--------|----------|
| `sintraprime-sigil.svg` | – | SVG (512 viewBox) | Source of truth; edit here |

### Distribution Assets

| File | Size | Format | Use Case |
|------|------|--------|----------|
| `sintraprime-sigil-512.png` | 512×512 | PNG (transparent bg) | ChatGPT Custom GPT upload |
| `sintraprime-sigil-256.ico` | 256×256 | Windows ICO (multi-res) | Desktop shortcuts, taskbar |
| `sintraprime-sigil-128.png` | 128×128 | PNG (transparent bg) | Notion, web dashboards |
| `sintraprime-sigil-64.png` | 64×64 | PNG (transparent bg) | Small sidebars, compact UI |
| `sintraprime-sigil-48.png` | 48×48 | PNG (transparent bg) | PDF document headers |
| `sintraprime-sigil-24.png` | 24×24 | PNG (transparent bg) | Favicon-like, minimal contexts |

**Rule:** Always export from SVG. Do not resize raster files.

---

## Placement & Spacing Rules

### Document Header

```
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║  [icon 48px] [SPACE] SINTRAPRIME MODE — ACTIVE              ║
║              [SPACE] Governance: Locked · Scope: Declared    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
[horizontal rule, full width, #E9E4D8 or #D4AF8C]
[content begins here]
```

**Spacing:**
- Icon size: 48–64px (depending on context)
- Icon to text: 12px margin
- Line height: 1.4× font size
- Rule thickness: 1–2px
- Rule color: match icon foreground color

### Notion Page Header

```
🜂 [page title or "SINTRAPRIME MODE — ACTIVE"]
Governance: Locked · Scope: Declared · Execution: Constrained
Authority Basis: Documentary Evidence Only
```

(Icon rendered as emoji in Notion; SVG embedded in summary block if needed)

### PDF Header

```
[Icon 48×48] [12px space] SINTRAPRIME MODE — ACTIVE
             [12px space] Governance: Locked · Scope: Declared
                          Authority Basis: Documentary Evidence Only
[horizontal rule, full page width]
```

**Watermark (optional background):**
- Same sigil, 10–20% opacity
- Centered, repeated if needed
- Must not interfere with text legibility

---

## Color Palette (Locked)

| Use | Hex | RGB | Pantone | Context |
|-----|-----|-----|---------|---------|
| Background | #0B0E14 | 11, 14, 20 | – | Always (primary bg) |
| Foreground Primary | #E9E4D8 | 233, 228, 216 | 12-0603 | Default (bone white) |
| Foreground Alt | #C9A227 | 201, 162, 39 | 16-1619 | Optional warmth (muted gold) |

**Why these colors:**
- #0B0E14: "classified binder" (not stark black)
- #E9E4D8: government document standard (aged, official)
- #C9A227: gold reserve aesthetic (if warmer signal preferred)

**Never use:**
- Pure black (#000000)
- Neon colors
- Gradients
- Drop shadows
- Gloss or bevel

---

## Sizing Rules

### Minimum Legibility: 24px

At 24×24:
- Sigil remains recognizable
- Prime bar visible
- Checkpoint rule visible
- Notch distinguishable

**Test:** squint at it. If you still see triangle + bar + rule, it works.

### Scaling (Proportional)

All dimensions scale proportionally:
- Stroke width scales 1:1 with canvas
- Spacing scales 1:1 with canvas
- No fine details added for "large" versions

### Contexts

| Size | Context |
|------|---------|
| 24px | Favicon, tiny sidebar, minimal UI |
| 48px | PDF headers, small docs |
| 64px | Medium docs, Notion sidebars |
| 128px | Web dashboards, larger Notion blocks |
| 256px | Windows taskbar, desktop icon |
| 512px | ChatGPT Custom GPT, high-res displays |

---

## Typography (Paired with Sigil)

When text appears with the sigil:

| Element | Font | Weight | Size | Color |
|---------|------|--------|------|-------|
| Mode status | Monospace or sans-serif | Bold | 14–16pt | #0B0E14 (or #E9E4D8 on dark bg) |
| Governance line | Monospace | Regular | 11–12pt | #666 (or lighter on dark bg) |
| Authority line | Monospace | Regular | 11–12pt | #666 (or lighter on dark bg) |

**Example:**

```
SINTRAPRIME MODE — ACTIVE
Governance: Locked · Scope: Declared · Execution: Constrained
Authority Basis: Documentary Evidence Only
```

No emojis except 🜂 (geometric prime symbol), which is optional and not required.

---

## Deployment Checklist (Quick Ref)

- [ ] SVG saved to `/brand/sintraprime/sintraprime-sigil.svg`
- [ ] PNG exports created (512, 256, 128, 64, 48, 24)
- [ ] Windows ICO created with multi-resolution embedding
- [ ] All distribution files tracked in Git
- [ ] ChatGPT Custom GPT icon uploaded (512×512)
- [ ] Desktop shortcut uses ICO file
- [ ] PDF header template includes sigil + mode declaration
- [ ] Notion template includes sigil + mode block
- [ ] Repo README links to `/brand/sintraprime/`
- [ ] Mode declaration language standardized everywhere

---

## Amendments (If You Change This)

This specification is locked. Changes require:

1. Date amendment (YYYY-MM-DD)
2. Section reference (e.g., "Colors: Foreground Primary")
3. Rationale (one sentence)
4. Commit hash (proof of change)

Example:
```
Amendment 2026-01-20:
  Section: Colors
  Change: Foreground Primary #E9E4D8 → #F5F3F0 (increased contrast)
  Rationale: Improved legibility at small sizes on bright displays
  Commit: abc123d
```

This locks in audit trail.

---

## Authority Statement

> "This specification defines the visual identity of SintraPrime Mode governance. Consistency of this sigil across all contexts (ChatGPT, desktop, PDFs, Notion, CLI) is a material component of the governance system's credibility and auditor recognition."

*Signed: Governance Specification v1.0*

---

**Status: LOCKED for deployment**  
**Next: Execute Deployment Runbook**
