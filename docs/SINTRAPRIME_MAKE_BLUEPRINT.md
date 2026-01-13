# SintraPrime — Make.com Scenario Blueprint (Router + Guardrails)

## Scenario Name
SintraPrime — Mode-Locked Run Orchestrator

## Trigger
- **Notion → Watch Database Items**
- Database: `SintraPrime Runs`
- Filter at trigger (if supported): `Created By Automation` is unchecked (prevents loops)

## Router (Mode Gate)
- Path A — VALID (proceed) when ALL:
  - `Mode Status` is not empty
  - `Scope` is not empty
  - `Mode Locked` = true
  - `Authority Basis` = "Documentary Evidence Only"
- Path B — INVALID (fail closed) when ANY fails

### Path B — Guardrail (Fail Closed)
- **Notion → Update Page**
  - Set `Mode Status` = `OBSERVE ONLY`
  - Prepend block to page body:
    ```
    ⛔ SINTRAPRIME MODE — ENFORCEMENT HALT
    Reason: Missing or invalid mode declaration.
    No execution permitted until corrected.
    ```
- Optional: Slack/Email alert to operator
- Scenario ends (no downstream actions)

### Path A — Valid Run Pipeline
1) **Normalize Mode Header** (Text aggregator / Set variable)
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🜂 SINTRAPRIME MODE — {{Mode Status}}
Governance: Locked · Scope: {{Scope}}
Authority Basis: Documentary Evidence Only
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

2) **Insert Header** — Notion → Append block(s) at top of page (lock page if you use permissions)

3) **Branch by Mode Status** (Router)
- ACTIVE → Generate PDFs / analysis
- OBSERVE ONLY → Log only (no outputs)
- REFUSAL ISSUED → Generate refusal packet
- AUDIT RESPONSE → Generate auditor bundle

4) **Stamp Automation Provenance** — Notion → Update Page
- `Created By Automation` = true
- Append footer:
```
Generated under SintraPrime Mode.
Execution constrained by governance rules.
```

## Why It Matters
- Declared mode/scope/authority are mandatory; otherwise the run halts.
- This is fail-closed automation: no declaration → no action.

## Minimal Field Expectations (Notion `SintraPrime Runs`)
- Mode Status (select: ACTIVE | OBSERVE ONLY | REFUSAL ISSUED | AUDIT RESPONSE)
- Mode Locked (checkbox, default true)
- Scope (text/rich text)
- Authority Basis (select, value: Documentary Evidence Only)
- Evidence Links (relation/URL)
- Output Artifacts (files)
- Run Hash / Manifest (text)
- Created By Automation (checkbox)
- Created Time (timestamp)

## Guardrail Logic (copy-ready for filters)
- `Mode Status` is not empty
- `Scope` is not empty
- `Mode Locked` = true
- `Authority Basis` = "Documentary Evidence Only"

If any fail: set Mode Status → OBSERVE ONLY; add halt banner; stop scenario.
