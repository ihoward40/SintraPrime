# SintraPrime Mode Declaration

## Visual Identity Standard

SintraPrime's mode badge establishes consistent visual recognition across governance documents, PDFs, dashboards, and CLI outputs.

---

## Primary Badge (Markdown/Web)

Use this at the top of any SintraPrime-related document:

```markdown
![SintraPrime Mode](../artifacts/sintraprime-icon.svg)

**🜂 SINTRAPRIME MODE** — Governance Locked | Auditable  
*Deterministic replay. Integrity verified. Constitutional enforcement.*
```

**Renders as:** Icon + mode declaration + governance promise

---

## Compact Badge (CLI / Logs)

For terminal output and log headers:

```
╔════════════════════════════════════════════════════════════╗
║  ⬡′  SINTRAPRIME MODE  — Notarized Run                    ║
║  Auditable | Deterministic | Verified                      ║
╚════════════════════════════════════════════════════════════╝
```

Or minimal:
```
[⬡′ SINTRAPRIME] governance locked
```

---

## PDF Header Block

For notarized/official documents:

```
────────────────────────────────────────────────────────
🜂 SINTRAPRIME MODE — GOVERNANCE LOCKED
Deterministic replay | Auditable | Constitutional
────────────────────────────────────────────────────────
```

Place this immediately after title/date, before body content.

---

## Dashboard / Notion Integration

Embed icon + declaration as:

- **Icon**: Use `artifacts/sintraprime-icon.svg` (512px + transparent)
- **Label**: "SintraPrime Mode" (bold, blue #2563eb)
- **Descriptor**: "Governance locked" (italic, secondary color)

---

## Implementation Checklist

- [ ] Add to README.md introduction
- [ ] Add to OPERATOR_RUNBOOK.md header
- [ ] Add to all governance documents (docs/*.md)
- [ ] Add to PDF templates (notarization headers)
- [ ] Add to CLI tool startup message
- [ ] Add to Notion dashboard pages
- [ ] Add to public verifier pages
- [ ] Pin icon as taskbar/desktop shortcut (Windows)

---

## Icon Specs

| Use Case | Format | Size | Background |
|----------|--------|------|------------|
| ChatGPT Custom GPT | PNG | 512×512 | Transparent |
| Markdown docs | SVG | 24px–64px | Auto |
| PDF headers | PNG | 48×48 | Transparent |
| Desktop shortcut | ICO | 256×256 | #0a0e27 (dark blue) |
| Notion embed | PNG | 128×128 | Transparent |

---

## Color Palette

| Element | Color | Hex | Usage |
|---------|-------|-----|-------|
| Primary | Blue | #2563eb | Icon strokes, mode text |
| Accent | Light Blue | #60a5fa | Seal, verification marks |
| Background | Dark Navy | #0a0e27 | Icon background |
| Text | White | #ffffff | Headers, labels |

---

## What This Signals

When someone sees the **SintraPrime Mode** badge, they instantly understand:

✓ This is a governed, auditable context  
✓ Deterministic replay is in effect  
✓ Constitutional constraints are enforced  
✓ Output is notarizable  

It's not a cosmetic choice—it's a **context declaration** that precedes content.

---

## Governance Parity with Agent Mode

| Feature | Agent Mode (OpenAI) | SintraPrime Mode (This standard) |
|---------|---------------------|-----------------------------------|
| Visual affordance | ⚡ Lightning icon | ⬡′ Hexagon + prime sigil |
| Persistent identity | Yes (sidebar) | Yes (docs + CLI + dashboard) |
| Context switching | One-click mode toggle | Mode declaration header |
| Auditability | Black box | **Full governance trail** |
| User recognition | Instant | Instant (with consistency) |

---

## Next: Roll-out

Use this standard everywhere:
1. **Docs** → Mode Declaration markdown
2. **PDFs** → Header block
3. **CLI** → Startup banner
4. **Notion** → Dashboard label
5. **Desktop** → Icon pinned to taskbar

The power isn't in the UI—it's in **consistency + recognition + governance.**
