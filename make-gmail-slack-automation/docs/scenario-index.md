# Scenario Index (Operational Map)

**Purpose:**
This index makes the Make.com system **auditable and intentional** by listing
every scenario with its single responsibility and boundaries.

**Rules:**
- One scenario = one responsibility.
- Each scenario belongs to exactly one layer: INTAKE / PROCESSING / ACTIONS /
	LOGGING / WATCHDOGS.
- If a scenario spans layers, it must be refactored (see `make-scenario-electrical-panel-architecture.md`).

---

## How to maintain

- Add a row for every scenario that exists in Make.com.
- Update the row when a scenario’s trigger/output changes.
- Keep descriptions factual and short.

---

## Scenario table

<!-- markdownlint-disable MD013 -->
| Scenario name | Layer | Trigger | Output | Upstream | Downstream | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Sintra \| Gateway \| Ingress v1 | INTAKE | Webhook: `Sintra_Gateway_Ingress` | Routed internal worker invocation + ledger write | External producers (emitters/workers) | Sintra \| Worker \| Email Intake v1; Sintra \| Worker \| TTS Render v1; Sintra \| Worker \| Desktop Playback v1; Sintra \| Worker \| TikTok Comment Intake v1; Sintra \| Worker \| Refusal Registry v1 | Router-only; no business decisions; enforces auth + idempotency |
| Sintra \| Worker \| Email Intake v1 | PROCESSING | Webhook: `Worker_Email_Intake` (Gateway route `email.received`) | Emits gateway event `tts.requested` | Sintra \| Gateway \| Ingress v1 | Sintra \| Gateway \| Ingress v1 (routes `tts.requested`) | No side effects other than emitting next-step event |
| Sintra \| Worker \| TTS Render v1 | ACTIONS | Webhook: `Worker_TTS_Render` (Gateway route `tts.requested`) | Drive file upload + emits `tts.rendered` | Sintra \| Gateway \| Ingress v1 | Sintra \| Gateway \| Ingress v1 (routes `tts.rendered`) | Contains third-party action (TTS) + storage |
| Sintra \| Worker \| Desktop Playback v1 | ACTIONS | Webhook: `Worker_Desktop_Playback` (Gateway route `tts.rendered`) | Desktop playback action + (optional) emits completion event | Sintra \| Gateway \| Ingress v1 | Humans / local device | Keep minimal; no routing |
| Sintra \| Worker \| Slack Alert v1 | WATCHDOGS | Webhook: (Gateway route `tts.rendered` + high priority) | Slack message | Sintra \| Gateway \| Ingress v1 | Humans | Notifications only; do not trigger upstream systems |
| detect/events__tiktok_lead_capture | INTAKE | Webhook: TikTok lead capture (existing webhook) | Normalized `event.json` (webhook response) | TikTok Lead Capture (upstream webhook producer) | route/policy__redflag_only (optional chain) | Pure detector: normalize and stop |
| route/policy__redflag_only | PROCESSING | Webhook: `event_intake` | `decision.json` (response) | Detectors (normalized `event.json`) | EXECUTE rail (not yet defined) | Policy-only: no storage/notifications/actions |
| Sintra \| Emitter \| TikTok Comment Poller v1 | INTAKE | Schedule (every 15 min/hour) | Emits gateway event `tiktok.comment.received` (HTTP POST) | TikTok API (your account only) | Sintra \| Gateway \| Ingress v1 | Poll + diff + dedupe; never replies or posts |
| Sintra \| Worker \| TikTok Comment Intake v1 | ACTIONS | Webhook (Gateway route `tiktok.comment.received`) | Notion comment record + emits `tiktok.comment.logged` | Sintra \| Gateway \| Ingress v1 | Sintra \| Worker \| TikTok Draft Reply v1 (optional) | Includes policy gate; does not post replies |
| Sintra \| Worker \| Refusal Registry v1 | LOGGING | Webhook (Gateway route `refuse.*`) | Notion refusal record | Sintra \| Gateway \| Ingress v1; workers | Sintra \| Report \| Weekly Stability v1 | Make refusals first-class auditable outcomes |
| Sintra \| Control \| Policy Loader v1 | PROCESSING | Schedule (every 5 min) or Notion row updated | Data store write: `sintra.policy.current` | Notion System Policy DB | Sintra \| Gateway \| Ingress v1 | Injects `policy.mode` without touching signed payload |
| Sintra \| Report \| Weekly Stability v1 | WATCHDOGS | Schedule (weekly) | Stability report (Markdown) + optional Slack summary | Event ledger; refusal registry | Humans | Read-only reporting; no mutations |
| Sintra \| Worker \| TikTok Draft Reply v1 | ACTIONS | Event trigger: `tiktok.comment.logged` | Notion queue item + emits `tiktok.reply.drafted` | Sintra \| Gateway \| Ingress v1 | Sintra \| Worker \| TikTok Reply Execute HITL v1 | Draft only; never posts |
| Sintra \| Worker \| TikTok Reply Execute HITL v1 | ACTIONS | Notion watch: Approved To Post = true | TikTok reply posted + Notion update + emits `tiktok.reply.posted` | Notion queue + human approval | Sintra \| Gateway \| Ingress v1 | Re-validates policy + rate limit + immutability gate |
| briefing/voice__weekly_summary | WATCHDOGS | Schedule (weekly) | Weekly summary text + MP3 (uploaded) | Notion (sealed packet query) | Humans | Reporting output; keep under ~60 seconds |
| seal/pdf__life_event_packet | ACTIONS | Button / webhook | Sealed PDF + SHA-256 sidecar + Drive upload | Notion (packet + linked rows) | Humans | No overwrite; new seal per run |
| Gmail-Alert-to-Slack (Notify Only) | WATCHDOGS | Gmail watch (query: `label:ALERT_SLACK -label:ALERT_SLACK_POSTED`) | Slack message + Gmail label transition to POSTED | Gmail label state | Humans | Slack is output-only; label gate prevents repost spam |
| Gmail-Delete-After-Notify | ACTIONS | Gmail watch (query: `label:ALERT_SLACK_POSTED`) | Email deleted | Gmail label state | None | Cleanup-only; delete only after POSTED |
| TikTok_Comment_Intake_Core_v1.1_Guarded | PROCESSING | TikTok: Watch Comments | Sheets log + optional Slack notify | TikTok (module) | Humans | Multi-purpose “core” template; consider replacing with Gateway/Workers split |
| VERIZON_GUARDIAN__PRIMARY_PIPELINE | PROCESSING | Gmail: Watch Emails | Drive PDF + Notion case + Slack alert | Gmail inbox | Humans | Spans INTAKE/PROCESSING/ACTIONS/WATCHDOGS; refactor recommended |
<!-- markdownlint-enable MD013 -->

---

## Definitions (keep consistent)

- **Layer**: the folder category the scenario must live under.
- **Trigger**: the module/event that starts the scenario.
- **Output**: the single primary output artifact/event.
- **Upstream**: the immediate producer feeding this scenario (often a webhook).
- **Downstream**: the immediate consumer(s) this scenario triggers.

---

### End of Index

---

## Notes & suggestions

1. Promote any “implicit” execution paths to first-class scenarios.
	- Example: desktop playback is already specified as `Sintra | Worker | Desktop
	  Playback v1`; keep it listed and minimal.
	- If you add exporters/verifier writers later, list them here immediately.

2. For every **INTAKE** / emitter scenario, record:
	- Poll interval / schedule
	- Platform rate limits (if applicable)
	- Idempotency strategy (Data store key + behavior)

3. For every **PROCESSING** / **ACTIONS** worker scenario, record:
	- Input contract (schema/event type)
	- Output artifact/event
	- Refusal conditions (and whether they emit `refuse.*`)

4. Keep **LOGGING** scenarios append-only.
	- `Sintra | Worker | Refusal Registry v1` should remain write-only and
	  non-blocking.

5. This file is the execution map.
	- Any Make scenario not listed here is considered non-production.

6. Prefer the Gateway/Workers pattern for anything that currently spans layers
	(e.g., `VERIZON_GUARDIAN__PRIMARY_PIPELINE`,
	`TikTok_Comment_Intake_Core_v1.1_Guarded`).

7. When you export real Make blueprints, add scenario IDs to the table and store
	the exports under `make-gmail-slack-automation/templates/` as true Make
	blueprint JSON.
