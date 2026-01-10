# Phase III — Make Scenario Artifacts (ZIP)

This folder defines the **Phase III** Make.com scenario artifacts that correspond to Notion “button → webhook” commands.

## Mapping (Scenario → Button → Lint)

| Scenario ID | Notion Button (Cases DB) | Lint Profile |
|---|---|---|
| `PACKET_BUILD_COURT` | Build Court Packet | `audit-only` |
| `FOIA_BUILD_PACKET` | Build FOIA Packet (variant) | `audit-only` |
| `MAIL_CREATE_TRACK` | Create Mailing Record + Track | `audit-only` |
| `PUBLISH_MANIFEST` | Publish Manifest + Update Verifier | `audit-only` |

## Build the ZIP

- `npm run ci:phase3-zip`
- Output (ignored by git): `make-gmail-slack-automation/dist/phase3/make-scenarios-phase3.zip`

## Contract

- The authoritative button payload contract is in `docs/notion-button-webhook-contract.md`.
- Scenario enforcement is via `scenarios/<SCENARIO_ID>.lint.json` + `scripts/check-make-lint.mjs`.
