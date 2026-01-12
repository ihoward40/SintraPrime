# GOVERNANCE RELEASE: SintraPrime_Mode_Governance_v1.1

GOVERNANCE_RELEASE: SintraPrime_Mode_Governance_v1.1
STATUS: Active
SUPERSEDES: SintraPrime_Mode_Governance_v1.0
SCOPE: Governance mechanics only (no execution authority added)
DATE: 2026-01-12

## Summary

This release introduces a minimal, opt-in automation for recording mode transitions and formalizes governance history tracking, while preserving all authority limits and separation of duties established in v1.0.

## Delta from v1.0 (explicit)

### Added

- Auto Mode Transition Ledger helper (append-only scribe)
  - Writes to `runs/governance/mode-transition-ledger.v1.log`
  - Triggered only after validation approval
  - Explicit Silent Halt entry on validation denial
  - Opt-in via `SINTRAPRIME_MODE_TRANSITION_LEDGER_AUTO=1`

- Governance History index (one-page, chronological)
  - Stable citation map from v1.0 forward

### Clarified

- Ledger storage location moved to `runs/` to keep governance sources immutable
- Validation timing clarified (ledger writes occur post-approval only)

### Unchanged

- Mode semantics and definitions
- Limb-activation clauses
- Validation gating requirements
- Silent Halt behavior
- Single-Voice policy
- API key documentation-only limitation
- Runtime enforcement hook semantics

## Assumptions

- No new execution authority is introduced.
- No autonomous behavior is enabled.
- Governance semantics from v1.0 remain intact unless explicitly stated above.

## References

- `README.md` (Governance section)
- `docs/governance/affidavit-language.md`
- `docs/governance/mode-transparency-report.q2-2026.v1.md`
- `docs/governance/governance-history.v1.md`

END OF RELEASE
