# Changelog

## v1.2.0 — 2025-12-28

- Add `ShellAdapter` execution steps (local command execution with captured stdout/stderr/exit code) and approval gating.
- Add governed Notion database insert (`NotionAdapter method: insert` compiled to `notion.live.insert` POST `/v1/pages`) with approval-scoped prestate + fingerprint.
- Add workflow receipts stored as timestamped JSON under `runs/workflow/<workflow_id>/<timestamp>.json`.
- Add `workflow.replay --receipt <path>` to print stored workflow receipts.
- Add `BrowserAgent` (Playwright) step support with domain allowlisting via `browser.allowlist.json` and per-step artifacts (HAR + screenshot).

## v1.0.0

- Deterministic evidence lifecycle (ELC v1.0)
- Merkle-based set integrity
- RFC3161 TSA anchoring (strict + imprint modes)
- Notary anchor with metadata validation
- Dual-anchor comparison report
- Court pack renderers (NJ Special Civil)
- Federal-ready validation primitives
- Public offline verifier
- CI-enforced lifecycle validation
