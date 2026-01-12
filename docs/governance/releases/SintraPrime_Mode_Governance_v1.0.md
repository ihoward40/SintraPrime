# GOVERNANCE RELEASE: SintraPrime_Mode_Governance_v1.0

GOVERNANCE_RELEASE: SintraPrime_Mode_Governance_v1.0

## Freeze scope
This governance release freezes the semantics and artifacts for mode- and limb-governed operation.

Included:
- Mode declaration: `docs/governance/mode-declaration-sheet.v1.md`
- Demo blank mode sheet: `docs/governance/mode-declaration-sheet.demo.blank.v1.md`
- Transition ledger: `docs/governance/mode-transition-ledger.v1.md`
- Transparency report template: `docs/governance/mode-transparency-report.q1-template.v1.md`
- How-to-read guide: `docs/governance/how-to-read-mode-transparency-report.v1.md`
- Affidavit language: `docs/governance/affidavit-language.md`
- Agent prompt limb clauses:
  - `prompts/validation-agent.md`
  - `prompts/planner-agent.md`
  - `prompts/document-intake.md`
- Runtime enforcement hook (opt-in): `src/policy/checkPolicy.ts` (see `docs/governance/mode-governance-runtime-hook.v1.md`)
- Optional PDF verification renderer (isolated): `scripts/pdf/render-court-pdf-verified.mjs`

## Runtime opt-ins
- Mode governance enforcement:
  - `SINTRAPRIME_MODE_GOVERNANCE_ENFORCE=1`
  - `SINTRAPRIME_MODE_DECLARATION_PATH`
  - `SINTRAPRIME_MODE`
  - `SINTRAPRIME_ACTIVE_LIMBS`

- Mode transition ledger scribe (append-only):
  - `SINTRAPRIME_MODE_TRANSITION_LEDGER_AUTO=1`

## Notes
- This release does not expand execution authority.
- Typecheck failures unrelated to governance may exist and are treated as separate technical debt.
