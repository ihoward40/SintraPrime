# VERIZON_GUARDIAN — Nightly Reconciliation v1.1.1-R1 (Make)

Nightly reconciliation repairs mismatches that slip past normal ingest + retry:
- Notion wrote / Drive failed
- Drive wrote / Notion failed (orphan evidence)

## Schedule
- Nightly 2:15 AM America/New_York
- Optional second run 2:15 PM during high-volume periods

## Inputs (Config-as-Code)
- Manifest JSON (Drive): `/Evidence_Vault/Verizon_Guardian/_config/VERIZON_GUARDIAN.manifest.json`

## Safety rules (non-negotiable)
1) Never delete evidence during reconciliation.
2) Never overwrite hashes when there is a mismatch; mismatch escalates.
3) Don’t move originals into binder folders; use copy/shortcut.
4) Respect idempotency: if links/hashes present, no-op.

## Phase 1 — “Notion needs Drive” repair
Query Notion `Verizon_Case_Tracker` for records where any of:
- `Evidence_Drive_Link` empty
- `SHA256_PDF` empty
- `SHA256_Metadata` empty

For each record:
1) Compute expected month folder from `Email_Date`.
2) Search Drive for `{gmail_api_id}.metadata.json` and `{gmail_api_id}.pdf` in that folder.
3) If both found: download metadata.json → parse → backfill Notion links + hashes.
4) If partial (only one found): mark `Reconcile_Status=Partial` (optional) and alert in digest.
5) If neither found: mark `Reconcile_Status=MissingDrive` (optional) and alert in digest.

## Phase 2 — “Drive needs Notion” orphan repair
Search Drive for `*.metadata.json` in a bounded window (start with last 7 days for rate limits).

For each metadata.json:
1) Download → parse JSON.
2) Query Notion for record where `Gmail_API_ID == gmail_api_id`.
3) If exists: backfill missing links/hashes.
4) If NOT exists: create Notion record (Status=Detected, Severity=Unknown/Low), set evidence links + hashes.

## Phase 3 — Hash mismatch handling
If computed hash ≠ recorded hash (or metadata indicates mismatch):
- Do not auto-fix.
- Set case `Status=Escalate` and/or `Reconcile_Status=HashMismatch`.
- Post Slack alert to critical fallback channel.

## Reporting
Aggregate counts:
- fixed_notion_missing_drive
- created_notion_from_orphans
- partial_evidence
- drive_missing
- hash_mismatch

Post a Slack digest to watch channel only if any count > 0.
Write a run log entry (Notion or Sheets) including run timestamps + counts + list of affected Gmail_API_IDs.
