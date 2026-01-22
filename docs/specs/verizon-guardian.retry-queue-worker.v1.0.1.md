# VERIZON_GUARDIAN — Retry Queue Worker v1.0.1 (Make)

This spec describes a self-healing worker that processes jobs from a Notion-backed retry queue with safe locking, exponential backoff, and deterministic evidence naming.

## 0) Inputs / Config-as-Code
- Manifest JSON (Drive): `/Evidence_Vault/Verizon_Guardian/_config/VERIZON_GUARDIAN.manifest.json`
  - Example shape: [core/examples/verizon-guardian.manifest.v1.example.json](../../core/examples/verizon-guardian.manifest.v1.example.json)
  - Schema: [core/schemas/verizon-guardian.manifest.v1.schema.json](../../core/schemas/verizon-guardian.manifest.v1.schema.json)

## 1) Notion DB: `Guardian_Retry_Queue` (minimum required fields)
- Identity: `Retry_ID` (Title), `Workflow` (Select), `Job_Type` (Select)
- Linkage: `Case_ID` (Text), `Gmail_API_ID` (Text), `Notion_Record_URL` (URL optional)
- Payload: `Payload_JSON` (Text)
- Control: `Status` (Queued|Running|Succeeded|Escalated|DeadLetter), `Priority` (P0..P3), `Attempts` (Number), `Max_Attempts` (Number), `Next_Run_At` (Date)
- Locks: `Lock_Token` (Text), `Locked_At` (Date), `Lock_Expires_At` (Date)
- Diagnostics: `Last_Error` (Text), `Last_Error_Code` (Text), `Last_Error_Source` (Select)
- Optional but recommended: `Retry_Type` (TransientFailure|AuthExpired|ResourceMissing|ValidationError|RateLimited), `Backoff_Seconds`, `Jitter_Seconds`, `Resolution_Notes`, `Job_Key`

Job uniqueness (recommended):
- `Job_Key = Workflow + ':' + Job_Type + ':' + Gmail_API_ID`
- Upsert retry items by `Job_Key` to prevent duplicates.

## 2) Backoff Policy
- Base: 60 seconds
- Cap: 6 hours (21600s)
- Backoff: `backoff = min(60 * 2^Attempts, 21600)`
- Jitter:
  - if rate-limited (429): random 60–300s
  - else if attempts_next ≤ 3: random 0–30s
  - else: random 0–300s

Hard-stop / decision map:
- 401/403 → Escalate (`AuthExpired`)
- 422 → Escalate (`ValidationError`)
- 410 → Escalate (`ResourceMissing`)
- 404 → Retry once, then escalate (`ResourceMissing`)
- 409 → Retry (`TransientFailure`)
- 429 → Retry with longer jitter (`RateLimited`)
- 5xx/timeouts/network → Retry (`TransientFailure`)

## 3) Safe Locking
- LOCK_TTL = 10 minutes
- Heartbeat: extend lock at branch start (and mid-branch for long branches)

Acquisition logic per item:
1) Update retry item: `Status=Running`, `Lock_Token=uuid()`, `Locked_At=now`, `Lock_Expires_At=now+10m`
2) If lock acquisition fails due to concurrent update, skip this item.

## 4) Payload_JSON (design rule)
Payload_JSON MUST be reference-only (no full email bodies) to avoid Notion size limits.

Example payload for `UPLOAD_EVIDENCE`:
```json
{
  "job_type": "UPLOAD_EVIDENCE",
  "case_id": "VZN-2025-a7f2k",
  "gmail_api_id": "18c9f...",
  "gmail_message_id_rfc": "<...>",
  "email_date": "2026-01-20T14:30:00Z",
  "email_subject": "Past due notice",
  "drive_folder_id": "DRIVE_FOLDER_ID__MONTH",
  "expected": {
    "pdf_name": "VZN_20260120-1430_VZN-2025-a7f2k_Past_due_notice_18c9f.pdf",
    "metadata_name": "VZN_20260120-1430_VZN-2025-a7f2k_18c9f.metadata.json"
  },
  "notion_record_id": "NOTION_PAGE_ID__CASE"
}
```

## 5) Evidence naming (deterministic)
Compute these values inside the worker (even if payload includes them), so retries remain stable:
- `ts = formatDate(email_date, 'YYYYMMDD-HHmm')`
- `short_subject = sanitize(subject) → [A-Za-z0-9_], collapse underscores, truncate to 30`
- `file_base = 'VZN_' + ts + '_' + case_id + '_' + short_subject + '_' + gmail_api_id`
- `pdf_name = file_base + '.pdf'`
- `metadata_name = 'VZN_' + ts + '_' + case_id + '_' + gmail_api_id + '.metadata.json'`

## 6) Make Scenario: skeleton
Trigger: Schedule every 5 minutes.

Steps:
1) Download manifest from Drive → JSON parse.
2) Notion Query: `Status=Queued AND Next_Run_At <= now` (sort Priority asc, Next_Run_At asc, limit 25).
3) Iterator → Acquire lock for each item → Parse Payload_JSON.
4) Router by Job_Type. Build one branch first: `UPLOAD_EVIDENCE`.
5) Shared Success Handler.
6) Shared Failure Handler.

### 6.1) Branch: UPLOAD_EVIDENCE (build first)
**Two traps**
- Google Drive modules typically require Folder ID, not a path string. Prefer `drive_folder_id` in payload or store `constants.drive_root_folder_id` in manifest and resolve chain.
- Gmail fetch must use `gmail_api_id` (Gmail internal id), not RFC 2822 Message-ID.

Branch flow:
1) Heartbeat: extend `Lock_Expires_At`.
2) Drive search for expected PDF (exact name) in `drive_folder_id`.
3) Drive search for expected metadata.json (exact name).
4) If both exist:
   - Download metadata.json → parse JSON
   - Update Notion case with Drive links + hashes
   - Mark retry item succeeded
5) Else regenerate:
   - Gmail get message by `gmail_api_id`
   - Normalize body (prefer text/plain else html→text); set `hash_body_format`
   - Render PDF (Docs template → export PDF)
   - Upload PDF with exact name
   - Create metadata.json (include gmail ids, filenames, hashes, hash_body_format, worker_version)
   - Update Notion case
   - Mark retry item succeeded

Hash mismatch rule:
- If an evidence file exists but hashes do not match recorded hashes, do NOT “fix”; escalate (tamper-risk).

## 7) Companion scenarios
- Stale lock reaper (hourly): reset items stuck in Running with expired lock.
- Daily digest (9:05 AM): summarize queued/running/deadletter counts + top error codes.
