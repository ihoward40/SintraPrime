# Notion Buttons → Make Webhooks (Contract)

This document is a **contract**, not guidance.

- Notion buttons may only trigger Make scenarios that are linted and governed.
- Scenario IDs and lint profiles are authoritative (must match repo enforcement).

## Button → Webhook mapping

| Notion Button (Cases DB) | Make Webhook / Scenario ID | Lint Profile | Required payload fields (minimum) | Notes |
|---|---|---|---|---|
| Build Court Packet | `PACKET_BUILD_COURT` | `audit-only` | `Case ID`, `Include Appendix`, `Include Declaration` | Must compute hashes and write Runs Ledger before export. |
| Build FOIA Packet (variant) | `FOIA_BUILD_PACKET` | `audit-only` | `Case ID`, `FOIA Variant`, `Include Appendix`, `Include Declaration` | Variant must be explicit; no inferred routing. |
| Create Mailing Record + Track | `MAIL_CREATE_TRACK` | `audit-only` | `Case ID`, `Carrier`, `Service`, `Tracking Number` | Tracking updates write to Runs Ledger. |
| Create USPS Label + Record Mailing | `MAIL_LABEL_PRINT` | `audit-only` | `Case ID`, `Carrier`, `Service`, `Recipient Name`, `Recipient Address`, `Return Receipt` | Produces a printable label URL and records label hash; writes Runs Ledger. |
| Track USPS Certified (Notify) | `MAIL_TRACK_CERTIFIED` | `notify-only` | `Mailing ID` or `Tracking Number` | May be run on a schedule; must be state-change gated to avoid periodic Slack spam. |
| Publish Manifest + Update Verifier | `PUBLISH_MANIFEST` | `audit-only` | `Case ID`, `Manifest URL`, `Last Packet ZIP Hash` | Public verifier is a read-only surface; no new facts. |

## Phase alignment (important)

- Phase II (this phase): defines the **button contract** (names + payload fields) and reserves scenario IDs.
- Phase III: adds the actual Make.com scenario JSON exports + repo artifacts for these IDs (so they become lint-enforced runtime scenarios).

## Existing scenarios in this repo (not Notion-triggered)

| Scenario ID | Trigger lane | Lint Profile |
|---|---|---|
| `GMAIL_ALERT_TO_SLACK_NOTIFY` | Gmail label-gated | `notify-only` |
| `GMAIL_DELETE_AFTER_NOTIFY` | Gmail label-gated | `notify-only` |
| `TIKTOK_COMMENT_INTAKE_CORE_v1_1` | TikTok event trigger | `notify-only` |

## Contract invariants

- Payload fields must match the property names in the Notion schema artifacts under `notion/schemas/`.
- If a Make scenario is referenced here, it must exist in the repo with:
  - a deterministic artifact under `make-gmail-slack-automation/templates/` containing `scenario_id`
  - a sidecar declaration under `scenarios/<SCENARIO_ID>.lint.json`
  - `npm run ci:make-lint` passing
