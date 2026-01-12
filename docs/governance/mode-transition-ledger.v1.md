# Mode Transition Ledger (v1)

Append-only log of changes to operating mode and limb activation.

Rules:
- Do not edit prior rows. Append new rows only.
- Every row must reference evidence (receipts, approvals, or configuration diffs).

## Ledger

| Timestamp (UTC) | From mode | To mode | Limb changes | Operator | Reason | Evidence links (paths) |
|---|---|---|---|---|---|---|
| `<YYYY-MM-DDTHH:MM:SSZ>` | `<READ_ONLY>` | `<SINGLE_RUN_APPROVED>` | `notion.live.write: INACTIVE→ACTIVE` | `<name>` | `<reason>` | `<runs/...>` |
| `<YYYY-MM-DDTHH:MM:SSZ>` | `<SINGLE_RUN_APPROVED>` | `<READ_ONLY>` | `notion.live.write: ACTIVE→INACTIVE` | `<name>` | `auto reversion after single-run` | `<runs/...>` |

## Entries (append-only, machine)

Append-only lines written by the optional scribe helper.

Default output path:

`runs/governance/mode-transition-ledger.v1.log`

Format (exact):

`[UTC_TIMESTAMP] | MODE_FROM → MODE_TO | ACTIVE_LIMBS | AUTH=VALIDATION | STATUS=DECLARED`

