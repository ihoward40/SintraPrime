# SintraPrime — Make.com Import Checklist (Fail-Closed)

Scenario: **SintraPrime — Mode-Locked Run Orchestrator**
Target Notion DB: **SintraPrime Runs**
Principle: No silent execution; fail closed.

---
## STEP 1 — Trigger Module
- App: Notion
- Action: Watch database items
- Configure: Database = SintraPrime Runs; Limit = default; Sort = Created time (ascending)
- Advanced filter: `Created By Automation` is `false` (prevents loops and retro edits)

## STEP 2 — Router: MODE_GATE
- Add Router named MODE_GATE
- Path A (VALID): all conditions (AND)
  1) `Mode Status` is not empty
  2) `Scope` is not empty
  3) `Mode Locked` equals `true`
  4) `Authority Basis` equals `Documentary Evidence Only`
- Path B (INVALID): no conditions (implicit else)

## STEP 3 — INVALID Path (Halt)
- Module: Notion → Update Page
- Set `Mode Status` → `OBSERVE ONLY`
- Append block at top:
  ⛔ SINTRAPRIME MODE — ENFORCEMENT HALT
  Reason: Missing or invalid mode declaration.
  No execution permitted until corrected.
- Do not connect further modules; stop here.

## STEP 4 — VALID Path: Insert Mode Header
- Module: Notion → Append Block(s)
- Position: Top of page
- Content:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  🜂 SINTRAPRIME MODE — {{Mode Status}}
  Governance: Locked · Scope: {{Scope}}
  Authority Basis: Documentary Evidence Only
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## STEP 5 — Router: MODE_BRANCH
- Add Router named MODE_BRANCH
- Paths by `Mode Status`:
  1) ACTIVE → route to generation modules
  2) OBSERVE ONLY → logging only (no outputs)
  3) REFUSAL ISSUED → refusal certificate generation
  4) AUDIT RESPONSE → evidence-only bundle

## STEP 6 — Provenance Stamp (per valid branch)
- Module: Notion → Update Page
- Set `Created By Automation` → `true`
- Append footer:
  Generated under SintraPrime Mode.
  Execution constrained by governance rules.
