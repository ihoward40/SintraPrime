# SINTRAPRIME SIGIL — Exact Design Brief

## For Designers / Image Generators

Use this brief **verbatim** if commissioning a designer or feeding to an image model.

---

## Design Intent (Read This First)

> "This is not a logo. This is a sigil: compact, symbolic, legible at 24 pixels, and intimidating in a quiet way. It should look like it belongs on the cover of a classified binder, not on an app store."

---

## Primary Sigil (Recommended)

### Geometry

**Three concentric geometric layers:**

1. **Inverted Triangle** (Authority/Jurisdiction)
   - Apex pointing down
   - Width: 60% of canvas
   - Stroke weight: 3–4px
   - Color: muted gold / bone
   - No fill (outline only)

2. **Vertical Prime Bar** (Enforcement)
   - Single straight line
   - Centered vertically through triangle
   - Height: 70% of triangle height
   - Stroke weight: 4–5px (thicker than triangle)
   - Crossed by horizontal enforcement rule
   - Creates a "plus sign" / cross-hairs effect

3. **Seal Ring** (Verification)
   - Full circle, outer boundary
   - Subtle (opacity 40%)
   - Four cardinal-point verification marks (dots)
   - Signals "this can be verified and checked"

### Color Palette

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| Background | Classified-Binder Dark | #0B0E14 | Solid fill (no gradients) |
| Symbol | Muted Gold / Bone | #D4AF8C | All strokes |
| Ring | Muted Gold / Bone | #D4AF8C | Verification marks (40% opacity) |

**Why these colors:**
- #0B0E14 is dark enough to feel formal (not pure black, which is sterile)
- #D4AF8C is warm, aged, suggests legitimacy (not neon)
- Together they evoke "official government document" or "classified binder"

### Size & Scaling

| Size | Use Case |
|------|----------|
| 512×512 px | Master; ChatGPT Custom GPT upload |
| 256×256 px | Desktop (ICO for Windows) |
| 128×128 px | Notion, dashboards, web embeds |
| 64×64 px | Small icons, sidebars |
| 48×48 px | PDF document headers |
| 24×24 px | Minimal (favicon alternative) |

All strokes should scale proportionally. At 24px, the symbol must remain legible.

---

## Style Specifications

### Line Work

- **Stroke linecap:** Round (not sharp)
- **Stroke linejoin:** Round (not sharp)
- **No antialiasing artifacts:** crisp edges
- **Flat color only:** no gradients, no shadows, no gloss

### Background

- **Solid fill:** #0B0E14
- **No rounded corners** (hard edges reinforce formality)
- **Square aspect ratio** only (256×256, 512×512, etc.)

### Symbol Clarity

- **Minimum stroke weight:** 2px (even at 24×24)
- **Maximum stroke weight:** 5px (at 512×512)
- **No text inside icon** (text goes in Mode Declaration header, not icon)
- **Negative space as important as positive** (breathing room)

---

## Alternative (If Preferred)

### Keyhole Variant

If the Prime Mark feels too austere, substitute:

**Stylized keyhole shape:**
- Flat top (represents access control)
- Tapered base (represents drilling down to authority)
- Same color palette
- Enclosed in subtle circle border

This variant reads as "access control" + "permissioned intelligence" but is slightly less intimidating.

---

## Visual References (Tone, Not Style)

These reference *feeling*, not literal copying:

- **US Government seal** (official, not ornate)
- **Classified document stamp** (direct, simple)
- **Military insignia** (geometric, authoritative)
- **Masonic symbols** (geometric purity)

**Do NOT copy:**
- Corporate tech logos (too friendly)
- Startup icons (too playful)
- Military insignia literally (legal risk)

---

## Deliverables

If commissioning a designer, they should provide:

1. **SVG master** (editable, all strokes/shapes defined)
2. **PNG 512×512** (for ChatGPT upload)
3. **ICO 256×256** (Windows desktop icon, multi-resolution)
4. **PNG variants:** 128px, 64px, 48px, 24px

All on dark background (#0B0E14), all with same color palette.

---

## Quality Checklist (For Designer or Self-Review)

- [ ] Legible at 24px
- [ ] No text inside icon
- [ ] Flat color only (no gradients)
- [ ] Dark background (#0B0E14)
- [ ] Muted gold/bone strokes (#D4AF8C)
- [ ] Round linecaps and linejoins
- [ ] Feels "classified document," not "startup"
- [ ] Works on light backgrounds (reverse option)
- [ ] SVG is clean and optimized
- [ ] All deliverable sizes included

---

## If Using AI Image Generation

**Prompt template (for DALL-E, Midjourney, Claude):**

```
Create a formal sigil icon for a governance system called "SintraPrime."

Style: Geometric, flat, official (like a classified government document mark, not a tech startup logo).

Composition:
- Background: solid dark navy (#0B0E14)
- Main symbol: inverted triangle with a centered vertical bar crossed by a horizontal rule (forming a plus/crosshairs effect)
- Outer ring: subtle verification marks at cardinal points
- All strokes: muted gold/bone color (#D4AF8C)
- No text, no gradients, no shadows

Tone: Austere, authoritative, legible at 24px. Should look like it belongs on the cover of a classified binder.

Deliverable: 512×512 PNG, transparent background NOT used (solid dark background instead).
```

**Key instruction for AI:** "Remove any warmth or personality. Make it look like it belongs in a government office, not a tech startup."

---

## Once You Have the Icon

1. Save as `artifacts/sintraprime-icon.svg`
2. Export PNG variants: `sintraprime-icon-512.png`, `sintraprime-icon-256.png`, `sintraprime-icon-128.png`, etc.
3. Convert to Windows ICO: `sintraprime-icon-256.ico`
4. Use in all integration points (see SINTRAPRIME_MODE_INTEGRATION.md)

That's it. The icon is the sigil. The Mode Declaration is the ritual. Together, they *are* the mode.
