# Mode Governance Runtime Hook (v1)

This engine can optionally enforce mode/limb governance at runtime via environment variables.

## Enable
- Set `SINTRAPRIME_MODE_GOVERNANCE_ENFORCE=1`

## Inputs
- `SINTRAPRIME_MODE_DECLARATION_PATH` (required when enforcement enabled)
  - Path to the completed Mode Declaration Sheet for the current execution window.
- `SINTRAPRIME_MODE` (required)
  - One of: `READ_ONLY`, `SINGLE_RUN_APPROVED`, `FROZEN`
- `SINTRAPRIME_ACTIVE_LIMBS` (required)
  - Comma-separated limb identifiers (example: `notion.read,notion.live.read,notion.write`)

## Current enforcement scope
When enabled, the policy layer denies plans that:
- include Notion write/live-write steps while mode is `READ_ONLY` or the corresponding limb is not active, or
- attempt execution while mode is `FROZEN`, or
- lack a declared mode or declaration sheet path.

This is additive to existing policy gates (approval, budgets, autonomy modes).
