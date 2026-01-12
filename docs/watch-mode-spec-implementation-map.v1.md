# Watch Mode — Spec to Implementation Map (v1)

This document maps a narrative “Watch Mode / I watched it do it” spec to **concrete, auditable repo implementation**.

- Source conversation snapshot: <https://chatgpt.com/share/6964de58-45f8-8011-80c7-7229e8447d21>
- Posture: **observation-only**. Watch Mode does not grant, imply, or expand authority.
- Claims discipline: only claim what **artifacts + ledger** can support.

## Implemented (auditable)

| Spec claim / requirement | Implemented by (repo reference) | Evidence produced |
| --- | --- | --- |
| Watch Mode is optional and must not change execution authority | Watch settings read from config/env; feature is gated by `WATCH_MODE` and phase selection | Presence/absence of watch artifacts does not change run outcome |
| Config knobs: enable/disable; video; screenshots; slow-mo; headless; best-effort redaction | [control/config.yaml](control/config.yaml) and `ControlConfig` in [src/clean/config.ts](src/clean/config.ts) | Run ledger includes watch manifest/start fields (when enabled) |
| Env wiring: `WATCH_MODE`, Playwright headless + slow-mo, browser selection | Example env vars in [control/secrets.env.example](control/secrets.env.example) | Run ledger emits a watch-mode manifest entry (when enabled) |
| Run-scoped outputs under `runs/<RUN_ID>/…` | Directory creation in [src/watch/runArtifacts.ts](src/watch/runArtifacts.ts) | `runs/<RUN_ID>/ledger.jsonl`, `runs/<RUN_ID>/plan/summary.md`, `runs/<RUN_ID>/apply/*`, `runs/<RUN_ID>/screen/*` |
| Visual proof: per-system tour recording (Notion/Make/Slack URLs) | Tour capture in [src/watch/watchMode.ts](src/watch/watchMode.ts) | `runs/<RUN_ID>/screen/<system>.webm` (+ optional `.mp4` conversion), plus tour screenshots |
| Visual proof: screenshots (tour + step) | Tour + per-step capture in [src/watch/watchMode.ts](src/watch/watchMode.ts) and invocation hooks in [src/cli/run-command.ts](src/cli/run-command.ts) | `runs/<RUN_ID>/screen/tour/*.png` and (if enabled) `runs/<RUN_ID>/screen/steps/*.png` |
| Receipts: watch activity must be logged | Ledger writes in [src/watch/runArtifacts.ts](src/watch/runArtifacts.ts) and watch-mode events in [src/watch/watchMode.ts](src/watch/watchMode.ts) | `runs/<RUN_ID>/ledger.jsonl` contains `kind: "watch_mode"` entries |
| Review guidance: auditors/operators can review a run without trusting the agent | Operator review doc [docs/how-to-review-a-run.v1.md](docs/how-to-review-a-run.v1.md) | Review flow: ledger → plan summary → apply logs → optional screen artifacts |

## Intentionally not implemented (by design)

These items are often mentioned in narrative demos but are **not shipped** unless explicitly added and policy-approved.

| Narrative feature | Status | Rationale |
| --- | --- | --- |
| “Highlight reel” generation (`HIGHLIGHTS.md`, `highlights.mp4`) | Not implemented | Nice-to-have demo polish; not required for audit integrity |
| Automated posting/engagement in third-party UIs during watch (e.g., posting to Slack channels as part of “choreography”) | Not implemented by Watch Mode itself | Avoids scope creep and platform-policy risk; Watch Mode remains observational |
| Any bypass, scraping, automation for data extraction | Not implemented | Watch Mode posture is observation-only and does not create alternate access paths |
| Authority escalation (Watch Mode approving plans, initiating execution, changing plans) | Not implemented | Preserves approval boundary and governance model |

## Notes for reviewers

- Watch Mode artifacts are **best-effort observational receipts**, not proofs of correctness.
- Integrity is supported by run-scoped hashing/verification mechanisms elsewhere in the repo; Watch Mode does not claim “authorization,” only “recorded evidence exists.”
