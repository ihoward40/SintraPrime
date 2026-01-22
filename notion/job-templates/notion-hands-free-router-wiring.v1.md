# Notion hands-free wiring: deterministic router templates (v1)

## Version contract

- Spec Version: v1
- Compatible Job Schema: core/schemas/job-command.v1.schema.json
- Canonical System Settings JSON: [system-settings.v1.json](system-settings.v1.json)
- Outputs Required: TEMPLATES.json / SELF_CHECK.json / PROVENANCE.json

## Canonical wiring gate update procedure (checksum + version bump)

When you intentionally change the canonical pinned-mode wiring section below:

1) Edit the canonical section.
2) Bump `WIRING_VERSION: vN` (e.g., `v1` → `v2`).
3) Recompute the canonical section checksum + header version:

- `npm run -s ci:notion:wiring-meta`

4) Add exactly one changelog entry for the new version in `notion/job-templates/CANONICAL_WIRING_CHANGELOG.md`:

- `vN | YYYY-MM-DD | One sentence (10–140 chars), ends with a period.`

5) Update CI env pins in `.github/workflows/ci.yml`:

- `CANONICAL_WIRING_SECTION_SHA256` ← new
- `CANONICAL_WIRING_HEADER_VERSION` ← new

6) Commit. CI should be green.

## Pinned-Mode Make Wiring (Module 0 → 90)
WIRING_VERSION: v1

This is the **only** authoritative pinned-mode wiring diagram for this runbook.
Any other doc (including OPERATOR_RUNBOOK.md) must link here and must not restate the module sequence.

### Required Notion properties (minimum)

- `PASS/FAIL` (Select: `PASS`, `FAIL`)
- `FAIL_REASON` (Text)
- `LOCKED_AT` (Date, include time)
- `PIN_MODE` (Select: `heading_pair` | `pinned_block_id`)
- `PIN_MODE_LOCKED` (Checkbox)
- `PIN_TEMPLATES_BLOCK_ID` (Text)
- `PIN_SELF_CHECK_BLOCK_ID` (Text)
- `PIN_PROVENANCE_BLOCK_ID` (Text)
- `PIN_SET_DIGEST_SHA256` (Text)
- `run_digest_sha256` (Text)
- `run_blocks_sha256` (Text)

### Retry/timeout policy (pinned block GETs; deterministic, non-negotiable)

Policy constants (Make variables):

- `MAX_ATTEMPTS = 6`
- `BASE_SLEEP_SECONDS = 2`
- `CAP_SLEEP_SECONDS = 32`
- Exponential backoff, **no jitter**: `sleep = min(CAP_SLEEP_SECONDS, BASE_SLEEP_SECONDS * 2^(attempt-1))`
- `TOTAL_TIMEOUT_SECONDS = 140` (hard stop)

Retry only on:

- `429`
- `500`, `502`, `503`, `504`
- transient network errors (timeouts, DNS, connection reset)

Never retry on:

- `400`, `401`, `403`, `404`
- `409` (unless you have confirmed it is transient for your integration)

Hard rule:

- If **any** of the 3 pinned block reads fails (fatal or timeout), **do not compute digests**; fail the run.

### Stop Signs (preflight summary; no module numbering)

- **Mode downgrade blocked:** if `PIN_MODE_LOCKED == true` and `PIN_MODE != pinned_block_id` → FAIL `PIN_MODE_DOWNGRADE_BLOCKED`
- **Pins imply locked:** if any pins exist (`ANY_PINS_PRESENT == true`) and `PIN_MODE_LOCKED != true` → FAIL `PIN_SET_NOT_LOCKED`
- **Pin set integrity:** refuse half-pin / lying pinned mode / missing or mismatched pin-set digest before any writes

Optional strict mode (enable after migration window):

- If `ALL_PINS_PRESENT` and `PIN_MODE_LOCKED != true` → FAIL `PINNED_BUT_NOT_LOCKED_INVALID_STATE`
- If `PIN_MODE_LOCKED == true` and `LOCKED_AT` empty → FAIL `LOCK_MISSING_FOR_LOCKED_PIN_MODE`
- If `LOCKED_AT` set and `page.last_edited_time > LOCKED_AT` → FAIL `NOTION_PAGE_EDITED_AFTER_LOCK`

Note: the repo’s current pinned-mode enforcement tokens for page lock are `LOCKED_AT_MISSING_FOR_LOCKED_PIN_MODE`, `LOCK_TIMESTAMP_INVALID`, `PAGE_LAST_EDITED_TIME_INVALID`, and `LOCKED_PAGE_EDITED_AFTER_LOCK`.

### FAIL_REASON precedence (first match wins; deterministic)

This list is ordered so that “stronger stop signs” win deterministically.

| Rank | FAIL_REASON |
|---:|---|
| 1 | `PIN_MODE_DOWNGRADE_BLOCKED` |
| 2 | `PIN_SET_NOT_LOCKED` |
| 3 | `PIN_MODE_INVALID` |
| 4 | `PIN_MODE_CLAIMS_PINNED_BUT_NO_PINS` |
| 5 | `PIN_SET_PARTIAL_REFUSED` |
| 6 | `PIN_SET_PRESENT_BUT_MODE_NOT_PINNED` |
| 7 | `PIN_SET_DIGEST_MISSING_FOR_PINNED_SET` |
| 8 | `PIN_SET_TAMPERED` |
| 9 | `LOCKED_AT_MISSING_FOR_LOCKED_PIN_MODE` |
| 10 | `LOCK_TIMESTAMP_INVALID` |
| 11 | `PAGE_LAST_EDITED_TIME_INVALID` |
| 12 | `LOCKED_PAGE_EDITED_AFTER_LOCK` |
| 13 | `LOCKED_BLOCK_EDITED_AFTER_LOCK` |
| 14 | `NOTION_READBACK_FATAL_HTTP` |
| 15 | `NOTION_READBACK_TIMEOUT_OR_RATE_LIMIT` |
| 16 | `PIN_BLOCK_LANGUAGE_DRIFT` |
| 17 | `PIN_BLOCK_NOT_CODE` |
| 18 | `MISSING_TEMPLATES_BLOCK` |
| 19 | `MISSING_SELF_CHECK_BLOCK` |
| 20 | `MISSING_PROVENANCE_BLOCK` |
| 21 | `DIGEST_DRIFT_NOTION_EDITED_CONTENT` |
| 22 | `NOTION_APPEND_MISSING_BLOCK_IDS` |
| 23 | `PRECONDITION_FAILED` |

If your Make scenario detects multiple failures, set `FAIL_REASON` to the first token in this table that is true.

### Variant A — Notion connector modules (preferred)

Use Notion connector modules where they exist and are stable:

- Notion → Watch database items
- Notion → Retrieve a page
- Notion → Append block children
- Notion → Get a block
- Notion → Update a page

### Variant B — HTTP Notion API (fallback)

Use direct Notion API calls:

- `GET /v1/pages/{page_id}`
- `PATCH /v1/blocks/{page_id}/children`
- `GET /v1/blocks/{block_id}`
- `PATCH /v1/pages/{page_id}`

Headers (every Notion HTTP call):

```json
{
  "Authorization": "Bearer {{NOTION_TOKEN}}",
  "Notion-Version": "2022-06-28",
  "Content-Type": "application/json"
}
```

### Module-by-module (0..90)

### Step 0 — Trigger

Module 0

- Notion → Watch database items (Runs)
- Filter must exclude locked runs (example): `LOCKED_AT is empty`

### Module 1 — Fetch page last_edited_time (optional)

- Variant A: Notion → Retrieve a page
- Variant B: HTTP `GET /v1/pages/{page_id}`

### Module 2 — Load run properties

- Load: `PIN_MODE`, `PIN_MODE_LOCKED`, `LOCKED_AT`, the 3 `PIN_*_BLOCK_ID`, `PIN_SET_DIGEST_SHA256`, `run_digest_sha256`

### Module 3 — Normalize pin-state flags

- Compute: `ALL_PINS_EMPTY`, `ALL_PINS_PRESENT`, `HALF_PIN`, `ANY_PINS_PRESENT`, plus `LOCKED_AT_ISO`

### Module 4 — Recompute PIN_SET_DIGEST_CALC

- Canonical bytes (exact):

```
SINTRAPRIME_PIN_SET_V1
templates_block_id={PIN_TEMPLATES_BLOCK_ID}
self_check_block_id={PIN_SELF_CHECK_BLOCK_ID}
provenance_block_id={PIN_PROVENANCE_BLOCK_ID}
```

- Hash (SHA-256) → `PIN_SET_DIGEST_CALC`

### Module 5 — Preflight Stop Signs (deterministic)

- Evaluate stop signs using the precedence table above; on first match, set FAIL and stop.

### Module 6 — Route: first-run vs pinned readback

- If `PIN_MODE == heading_pair` and `ALL_PINS_EMPTY == true` → Module 7
- If `PIN_MODE == pinned_block_id` and `ALL_PINS_PRESENT == true` → Module 13
- Else → Module 90 (`PRECONDITION_FAILED`)

### Module 7 — Prepare payload strings (first-run only)

- Build `TEMPLATES_TEXT`, `SELF_CHECK_TEXT`, `PROVENANCE_TEXT`

### Module 8 — Compute run_digest_sha256 (pre-write)

Canonical bytes (exact):

```
SINTRAPRIME_RUN_BLOCKS_V1
---TEMPLATES.json---
{TEMPLATES_TEXT}
---SELF_CHECK.json---
{SELF_CHECK_TEXT}
---PROVENANCE.json---
{PROVENANCE_TEXT}
```

### Module 9 — Append 3 labeled blocks (heading_2 + code ×3)

- Variant A: Notion → Append block children
- Variant B: HTTP `PATCH /v1/blocks/{page_id}/children` with `{ "children": [...] }`

### Module 10 — Extract 3 new code block IDs

- If not exactly 3 code block IDs → Module 90 (`NOTION_APPEND_MISSING_BLOCK_IDS`)

### Module 11 — Recompute PIN_SET_DIGEST_CALC (post-append IDs)

- Rebuild the pin-set canonical bytes with the newly extracted IDs and hash → `PIN_SET_DIGEST_CALC`

### Module 12 — Atomic pin commit (do NOT set LOCKED_AT yet)

- Update page in one operation: set `PIN_MODE=pinned_block_id`, `PIN_MODE_LOCKED=true`, write 3 IDs, write `PIN_SET_DIGEST_SHA256`, write `run_digest_sha256`

### Module 13 — Initialize readback loop state

- Reset `attempt=1` for the next pinned block GET

### Module 14 — Read pinned block: TEMPLATES (attempt)

- `GET /v1/blocks/{PIN_TEMPLATES_BLOCK_ID}`

### Module 15 — TEMPLATES HTTP router

- Retryable (429/5xx/network) → Module 16
- Fatal (400/401/403/404) → Module 90 (`NOTION_READBACK_FATAL_HTTP`)
- Success → Module 17

### Module 16 — TEMPLATES retry sleep + increment

- Sleep per deterministic policy; if exhausted → Module 90 (`NOTION_READBACK_TIMEOUT_OR_RATE_LIMIT`)

### Module 17 — Validate + extract TEMPLATES

- Require `type==code` else Module 90 (`PIN_BLOCK_NOT_CODE`)
- Require allowed language else Module 90 (`PIN_BLOCK_LANGUAGE_DRIFT`)
- If `LOCKED_AT_ISO != ""` and `last_edited_time > LOCKED_AT_ISO` → Module 90 (`LOCKED_BLOCK_EDITED_AFTER_LOCK`)
- Extract joined plain_text; if empty → Module 90 (`MISSING_TEMPLATES_BLOCK`)

### Module 18 — Initialize SELF_CHECK readback loop state

- Reset `attempt=1`

### Module 19 — Read pinned block: SELF_CHECK (attempt)

- `GET /v1/blocks/{PIN_SELF_CHECK_BLOCK_ID}`

### Module 20 — SELF_CHECK HTTP router

- Retryable → Module 21
- Fatal → Module 90 (`NOTION_READBACK_FATAL_HTTP`)
- Success → Module 22

### Module 21 — SELF_CHECK retry sleep + increment

- Sleep per deterministic policy; if exhausted → Module 90 (`NOTION_READBACK_TIMEOUT_OR_RATE_LIMIT`)

### Module 22 — Validate + extract SELF_CHECK

- Same validation/extraction pattern as Module 17; if empty → Module 90 (`MISSING_SELF_CHECK_BLOCK`)

### Module 23 — Initialize PROVENANCE readback loop state

- Reset `attempt=1`

### Module 24 — Read pinned block: PROVENANCE (attempt)

- `GET /v1/blocks/{PIN_PROVENANCE_BLOCK_ID}`

### Module 25 — PROVENANCE HTTP router

- Retryable → Module 26
- Fatal → Module 90 (`NOTION_READBACK_FATAL_HTTP`)
- Success → Module 27

### Module 26 — PROVENANCE retry sleep + increment

- Sleep per deterministic policy; if exhausted → Module 90 (`NOTION_READBACK_TIMEOUT_OR_RATE_LIMIT`)

### Module 27 — Validate + extract PROVENANCE

- Same validation/extraction pattern as Module 17; if empty → Module 90 (`MISSING_PROVENANCE_BLOCK`)

### Module 28 — Build post-write canonical string (run_blocks_c14n)

Canonical bytes (exact):

```
SINTRAPRIME_RUN_BLOCKS_V1
---TEMPLATES.json---
{TEMPLATES_TEXT_READBACK}
---SELF_CHECK.json---
{SELF_CHECK_TEXT_READBACK}
---PROVENANCE.json---
{PROVENANCE_TEXT_READBACK}
```

### Module 29 — Hash run_blocks_sha256

- SHA-256(run_blocks_c14n) → `run_blocks_sha256`

### Module 30 — Drift gate

- If `run_blocks_sha256 != run_digest_sha256` → Module 90 (`DIGEST_DRIFT_NOTION_EDITED_CONTENT`)

### Module 31 — PASS writeback (no lock yet)

- Set `PASS/FAIL=PASS`, clear `FAIL_REASON`, write `run_blocks_sha256`

### Module 32 — Lock latch

- Set `LOCKED_AT = now()` only if currently empty; never clear it

### Module 33 — Optional post-lock page edit check

- Re-fetch page `last_edited_time`; if `last_edited_time > LOCKED_AT` → Module 90 (`LOCKED_PAGE_EDITED_AFTER_LOCK`)

### Module 34 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 35 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 36 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 37 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 38 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 39 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 40 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 41 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 42 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 43 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 44 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 45 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 46 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 47 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 48 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 49 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 50 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 51 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 52 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 53 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 54 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 55 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 56 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 57 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 58 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 59 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 60 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 61 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 62 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 63 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 64 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 65 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 66 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 67 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 68 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 69 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 70 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 71 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 72 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 73 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 74 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 75 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 76 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 77 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 78 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 79 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 80 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 81 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 82 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 83 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 84 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 85 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 86 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 87 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 88 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 89 — Reserved (numbering contract)

- Intentionally reserved; do not delete.

### Module 90 — FAIL handler (single exit)

- Update page: `PASS/FAIL=FAIL`, `FAIL_REASON=<token>`, and do **not** set `LOCKED_AT`.

      "object": "block",
      "type": "heading_2",
      "heading_2": {
        "rich_text": [
          { "type": "text", "text": { "content": "TEMPLATES.json" } }
        ]
      }
    },
    {
      "object": "block",
      "type": "code",
      "code": {
        "language": "json",
        "rich_text": [
          { "type": "text", "text": { "content": "{{TEMPLATES_JSON_STRING}}" } }
        ]
      }
    },
    {
      "object": "block",
      "type": "heading_2",
      "heading_2": {
        "rich_text": [
          { "type": "text", "text": { "content": "SELF_CHECK.json" } }
        ]
      }
    },
    {
      "object": "block",
      "type": "code",
      "code": {
        "language": "json",
        "rich_text": [
          { "type": "text", "text": { "content": "{{SELF_CHECK_JSON_STRING}}" } }
        ]
      }
    },
    {
      "object": "block",
      "type": "heading_2",
      "heading_2": {
        "rich_text": [
          { "type": "text", "text": { "content": "PROVENANCE.json" } }
        ]
      }
    },
    {
      "object": "block",
      "type": "code",
      "code": {
        "language": "json",
        "rich_text": [
          { "type": "text", "text": { "content": "{{PROVENANCE_JSON_STRING}}" } }
        ]
      }
    }
  ]
}
```

If Make hides the wrapper and only wants the array, paste just the array:

```json
[
  { "object": "block", "type": "heading_2", "heading_2": { "rich_text": [ { "type": "text", "text": { "content": "TEMPLATES.json" } } ] } },
  { "object": "block", "type": "code", "code": { "language": "json", "rich_text": [ { "type": "text", "text": { "content": "{{TEMPLATES_JSON_STRING}}" } } ] } },
  { "object": "block", "type": "heading_2", "heading_2": { "rich_text": [ { "type": "text", "text": { "content": "SELF_CHECK.json" } } ] } },
  { "object": "block", "type": "code", "code": { "language": "json", "rich_text": [ { "type": "text", "text": { "content": "{{SELF_CHECK_JSON_STRING}}" } } ] } },
  { "object": "block", "type": "heading_2", "heading_2": { "rich_text": [ { "type": "text", "text": { "content": "PROVENANCE.json" } } ] } },
  { "object": "block", "type": "code", "code": { "language": "json", "rich_text": [ { "type": "text", "text": { "content": "{{PROVENANCE_JSON_STRING}}" } } ] } }
]
```

HTTP module → Notion API direct (wrapper required):

- Endpoint: `PATCH https://api.notion.com/v1/blocks/{block_id}/children`
- Headers:
  - `Authorization: Bearer <NOTION_TOKEN>`
  - `Notion-Version: 2022-06-28`
  - `Content-Type: application/json`
- Body: same wrapper shape as above (`{ "children": [...] }`)

Non-negotiable gotchas:

- Code block size limits: if any JSON string is huge, split deterministically into more blocks:
  - `TEMPLATES.part1.json`, `TEMPLATES.part2.json` (same for `SELF_CHECK` / `PROVENANCE`)
- Rich text needs plain text: no markdown fences, no smart quotes.
- Always stringify JSON objects: Make often tries to send objects; send strings.

### Required generator output shape (so Make never slices strings)

Require your generator output to include pre-chunked arrays:

```json
{
  "templates": { "...": "..." },
  "self_check": { "...": "..." },
  "provenance": { "...": "..." },

  "notion_code_chunks": {
    "TEMPLATES.json": ["<=1800 chars", "..."],
    "SELF_CHECK.json": ["<=1800 chars", "..."],
    "PROVENANCE.json": ["<=1800 chars", "..."]
  }
}
```

### Async poll loop for Ops jobs (Make pattern)

Assumptions:

- `POST /jobs/submit` returns `{ job_id }`
- `GET /jobs/status?job_id=...` returns `{ status: "queued|running|done|error", result_paths?, error? }`

Canonical modules:

1) HTTP → Make a request

- POST `http://127.0.0.1:OPS_PORT/jobs/submit`
- Headers: `X-Operator-Secret: ...`
- Body: your job JSON
- Capture `job_id`

2) Tools → Sleep (e.g., 2 seconds)

3) HTTP → Make a request

- GET `http://127.0.0.1:OPS_PORT/jobs/status?job_id={{job_id}}`

4) Router

- If `status` in (queued, running) → loop back to Sleep (limit attempts, e.g., 60)
- If `status` == done → success branch
- If `status` == error → fail branch

Loop safety (never hang):

- Track an `attempt` counter; after N tries:
  - Set FAIL_REASON = `SELF_CHECK:JOB_TIMEOUT — exceeded poll attempts`
  - Set PASS/FAIL = FAIL
  - Leave LOCKED_AT empty

### Provenance triple digest (run_digest_sha256)

Make must compute `run_digest_sha256` over the canonicalized triple strings:

```
TEMPLATES.json\n---\nSELF_CHECK.json\n---\nPROVENANCE.json\n
```

Hash that string (byte-stable), then write:

- into `PROVENANCE.json.run_digest_sha256`
- into a Notion property `run_digest_sha256`
- optionally into `RUN_DIGEST_SHORT`

Note: compute the digest on the PROVENANCE string before inserting `run_digest_sha256`, then insert it.

---

## Make-native `run_digest_sha256` recipe (provenance_base → hash → provenance_final)

### Inputs (from Notion AI output parsing)

You already have three objects (or you can build them from parsed JSON):

- `templates_obj`
- `self_check_obj`
- `provenance_base_obj` (IMPORTANT: does NOT contain `run_digest_sha256` yet)

Also set these string vars:

- `case_id`
- `run_id` (or use Notion page ID / created timestamp — just keep it deterministic)
- `ops_base_url` (ex: `http://127.0.0.1:49003`)
- `operator_secret`

### Step A — Stringify the three objects (no regex hacks)

Module: Tools → Set variable

Variable name: `templates_json`

```
toJSON(templates_obj)
```

Variable name: `self_check_json`

```
toJSON(self_check_obj)
```

Variable name: `provenance_base_json`

```
toJSON(provenance_base_obj)
```

If you’re using “JSON > Create JSON” modules, you can map the module output string instead of `toJSON()` — either is fine.

### Step B — Normalize line endings + trim (cheap canonicalization)

Module: Tools → Set variable

Variable name: `templates_norm`

```
trim(replace(replace(templates_json; "\r\n"; "\n"); "\r"; "\n"))
```

Variable name: `self_check_norm`

```
trim(replace(replace(self_check_json; "\r\n"; "\n"); "\r"; "\n"))
```

Variable name: `provenance_base_norm`

```
trim(replace(replace(provenance_base_json; "\r\n"; "\n"); "\r"; "\n"))
```

### Step C — Build the canonical “triple” string

Module: Tools → Set variable

Variable name: `run_triple_c14n`

Value (exact separators + order):

```
"SINTRAPRIME_RUN_TRIPLE_V1\n" &
"---TEMPLATES.json---\n" & templates_norm & "\n" &
"---SELF_CHECK.json---\n" & self_check_norm & "\n" &
"---PROVENANCE_BASE.json---\n" & provenance_base_norm & "\n"
```

This is what you hash. Always.

## Option 1: SHA-256 inside Make (only if your Make has it)

If you have a hashing module (some accounts show Tools → Hash or a “Cryptography/Hash” app):

- Algorithm: SHA-256
- Input: `run_triple_c14n`
- Output: `run_digest_sha256`

Then go to Step E.

## Option 2 (recommended): SHA-256 via your Ops stack (works everywhere)

### Step D1 — Write `run_triple_c14n` into the vault (deterministic path)

Module: HTTP → Make a request

- Method: POST
- URL: `{{ops_base_url}}/fs_command`
- Headers:
  - `X-Operator-Secret: {{operator_secret}}`
  - `Content-Type: application/json`

Body (raw):

```json
{
  "action": "write_file",
  "case_id": "{{case_id}}",
  "path": "Cases/{{case_id}}/Runs/{{run_id}}/run_triple.c14n.txt",
  "purpose": "run_digest_input",
  "content": "{{run_triple_c14n}}",
  "idempotency_key": "{{case_id}}:{{run_id}}:run_triple"
}
```

### Step D2 — Submit sha256 job

Module: HTTP → Make a request

- Method: POST
- URL: `{{ops_base_url}}/jobs/submit`
- Headers:
  - `X-Operator-Secret: {{operator_secret}}`
  - `Content-Type: application/json`

Body (raw):

```json
{
  "job_type": "sha256_file",
  "case_id": "{{case_id}}",
  "idempotency_key": "{{case_id}}:{{run_id}}:sha256:run_triple",
  "params": {
    "path": "Cases/{{case_id}}/Runs/{{run_id}}/run_triple.c14n.txt"
  }
}
```

Response gives `job_id`.

### Step D3 — Poll loop (attempt cap + JOB_TIMEOUT)

Pattern: Repeater (max attempts, ex 30) → Sleep (2s) → GET status → Router break

Module: HTTP → Make a request

- Method: GET
- URL: `{{ops_base_url}}/jobs/status/{{job_id}}`
- Headers:
  - `X-Operator-Secret: {{operator_secret}}`

Router conditions:

- If `status == "done"` → set `run_digest_sha256 = result.sha256` and break
- If `status == "error"` → FAIL hard (`PASS/FAIL=FAIL`, `FAIL_REASON="JOB_ERROR"` + message)
- If attempts exhausted → FAIL hard (`FAIL_REASON="JOB_TIMEOUT"`)

### Step E — Build `PROVENANCE_FINAL` (inject digest)

Module: Tools → Set variable

Variable name: `provenance_final_obj`

Set it to the same object plus:

- `run_digest_sha256`
- `run_digest_source_version: "SINTRAPRIME_RUN_TRIPLE_V1"`
- optional `run_digest_short: substring(run_digest_sha256; 0; 12)`

Then:

Variable name: `provenance_final_json`

```
toJSON(provenance_final_obj)
```

### Step F — Append Notion blocks (3 blocks + PASS/FAIL gate)

Append, in order:

1) Heading 2: `TEMPLATES.json`
2) Code block: `templates_json`
3) Heading 2: `SELF_CHECK.json`
4) Code block: `self_check_json`
5) Heading 2: `PROVENANCE.json`
6) Code block: `provenance_final_json`

Then set:

- `PASS/FAIL = PASS` only if all three blocks successfully appended AND digest exists
- `LOCKED_AT = now()` only on PASS
- On FAIL: `FAIL_REASON = SELF_CHECK.first_failed_rule` (or your deterministic rule ID ordering)

## Tiny but important: circularity avoidance (why “base” exists)

You never hash a provenance that already contains the digest, or you get an impossible loop.

So:

- hash `PROVENANCE_BASE`
- store digest in `PROVENANCE_FINAL`

### Make modules to append each block (repeat 3 times)

For each of: `TEMPLATES.json`, `SELF_CHECK.json`, `PROVENANCE.json`:

- Tools: set variable `block_title` (one of the three names)
- Iterator: iterate `notion_code_chunks[block_title]`
- Array aggregator: build `rich_text_array` with objects:

```json
{ "type": "text", "text": { "content": "..." } }
```

- Notion: Append block children (parent = the page id)

Append two blocks each time:

- a heading (visual label)
- the code block (json)

If Make’s Notion module wants raw “Blocks” JSON, use:

```json
[
  {
    "object": "block",
    "type": "heading_3",
    "heading_3": {
      "rich_text": [
        { "type": "text", "text": { "content": "{{block_title}}" } }
      ]
    }
  },
  {
    "object": "block",
    "type": "code",
    "code": {
      "language": "json",
      "rich_text": {{rich_text_array}}
    }
  }
]
```

Important: `{{rich_text_array}}` must be the aggregated array object (not a JSON string).

### Suggested contents

- `TEMPLATES.json`: the generated job templates (and optionally naming/path policy summary).
- `SELF_CHECK.json`: deterministic validation report (pass, checks, failures, warnings).
- `PROVENANCE.json`: run lineage (case_id, job_id, idempotency_key, generator/prompt version, input/output digests, timestamps), plus a tamper-evident digest field:
  - `run_digest_sha256`: SHA-256 of the canonicalized triple `{templates, self_check, provenance}` (with `run_digest_sha256` omitted or null during hashing).
  - `run_blocks_sha256`: SHA-256 of the Notion readback triple (what Notion stored).
  - `blocks_drift_detected`: boolean set true when `run_blocks_sha256 != run_digest_sha256`.
  - `blocks_drift_reason`: short string, stable code (ex: `NOTION_EDITED_CONTENT`).

Digest note: the goal is to detect Notion-side edits. If the three blocks change, `run_digest_sha256` must no longer match.

---

### Post-write drift digest (run_blocks_sha256)

Rule:

- `run_digest_sha256` = hash of your pre-write canonical triple (what you intended to write)
- `run_blocks_sha256` = hash of the post-write strings as stored in Notion (what actually got written)

If they differ, you have proof of drift (Notion or a connector normalized/rewrote content).

#### Make wiring (readback + hash)

1) After you append the 3 code blocks, immediately read them back from Notion.

- Module: Notion → Retrieve block children (or HTTP Notion API `GET /v1/blocks/{block_id}/children`)
- Goal: extract the literal stored code text for `TEMPLATES.json`, `SELF_CHECK.json`, `PROVENANCE.json`
- Important: don’t trust your in-flight variables; trust what Notion returns.

Reliability note (recommended): capture and pin the three code block IDs at creation time, then read back those specific code blocks. Don’t “search” the page.

##### Exact Notion API readback call

Endpoint:

```
GET https://api.notion.com/v1/blocks/{block_id}/children?page_size=100
```

Headers:

- `Authorization: Bearer <NOTION_TOKEN>`
- `Notion-Version: 2022-06-28`
- `Content-Type: application/json`

Notes:

- `{block_id}` should be the page content root block (or a known container block if you create one).
- If your Notion module doesn’t expose nested arrays cleanly, prefer HTTP so you can parse raw JSON in Make.

##### Exact extraction paths (readback)

Blocks array:

- `results[]`

Code block text:

- Type check: `results[i].type == "code"`
- Rich text fragments: `results[i].code.rich_text[]`
- Fragment text: `results[i].code.rich_text[j].plain_text`
- Literal stored code string: `join(results[i].code.rich_text[].plain_text, "")`

Heading anchor label:

- Type check: `results[i].type == "heading_2"`
- Rich text fragments: `results[i].heading_2.rich_text[]`
- Fragment text: `results[i].heading_2.rich_text[j].plain_text`
- Anchor label: `join(results[i].heading_2.rich_text[].plain_text, "")`

##### Deterministic matcher: “heading_2 anchors the next code block”

Canonical rule:

- Scan `results[]` in order.
- Maintain `pending_label` (last seen `heading_2` label).
- When you encounter a `code` block, bind it to `pending_label` if it’s one of: `TEMPLATES.json`, `SELF_CHECK.json`, `PROVENANCE.json`.
- Consume the label so you bind exactly one code block per anchor.

Pseudocode:

```
targets = {"TEMPLATES.json","SELF_CHECK.json","PROVENANCE.json"}
found = {}  // map label -> code_text
pending_label = null

for block in results:
  if block.type == "heading_2":
    label = join(block.heading_2.rich_text[].plain_text, "")
    label = label.trim()              // optional
    pending_label = (label in targets) ? label : null
    continue

  if block.type == "code" and pending_label != null:
    code_text = join(block.code.rich_text[].plain_text, "")
    found[pending_label] = code_text
    pending_label = null              // consume so it binds only once
    continue
```

Hardening gate (recommended): refuse ambiguity.

- Must find all three labels.
- Fail if you see a second `heading_2` of the same label before binding a code block.
- Fail if you bind a second code block under the same label.
- Optional adjacency rule: only accept the next non-empty block after the heading (allow divider/empty paragraph; fail on any other “content-y” block before the code).

2) Extract exact code text from Notion blocks.

Notion code blocks return `rich_text[]`. Join in order:

`code_text = join(map(block.code.rich_text; "plain_text"); "")`

Do that for each of:

- `templates_notionsaved`
- `selfcheck_notionsaved`
- `provenance_notionsaved`

3) Build the post-write canonical concat string (v1).

Variable: `run_blocks_c14n`

```
"SINTRAPRIME_RUN_BLOCKS_V1\n" &
"---TEMPLATES.json---\n" & templates_notionsaved & "\n" &
"---SELF_CHECK.json---\n" & selfcheck_notionsaved & "\n" &
"---PROVENANCE.json---\n" & provenance_notionsaved & "\n"
```

No trimming, no normalization. This is literally what Notion gave back.

4) Hash it to compute `run_blocks_sha256`.

- Option A: SHA-256 inside Make (if available)
- Option B (recommended): SHA-256 via Ops (same lane as `run_digest_sha256`)

Ops lane example:

Write `run_blocks_c14n`:

```json
{
  "action": "write_file",
  "case_id": "{{case_id}}",
  "path": "Cases/{{case_id}}/Runs/{{run_id}}/run_blocks.c14n.txt",
  "purpose": "run_blocks_input",
  "content": "{{run_blocks_c14n}}",
  "idempotency_key": "{{case_id}}:{{run_id}}:run_blocks"
}
```

Submit sha job:

```json
{
  "job_type": "sha256_file",
  "case_id": "{{case_id}}",
  "idempotency_key": "{{case_id}}:{{run_id}}:sha256:run_blocks",
  "params": {
    "path": "Cases/{{case_id}}/Runs/{{run_id}}/run_blocks.c14n.txt"
  }
}
```

5) Store it and fail fast on drift.

Write into provenance (preferred):

- `run_blocks_sha256`
- `run_blocks_digest_source_version: "SINTRAPRIME_RUN_BLOCKS_V1"`
- `run_blocks_digest_note: "hash of Notion-readback code block strings"`
- `blocks_drift_detected: true|false`
- `blocks_drift_reason` (short)

Tripwire:

- If `run_blocks_sha256 != run_digest_sha256`:
  - Set `PASS/FAIL = FAIL`
  - Set `FAIL_REASON = "DIGEST_DRIFT_NOTION_EDITED_CONTENT"`
  - Do not set `LOCKED_AT`

Patch policy (recommended): never update existing code blocks on a locked run. If you need to add readback fields after the initial 3 blocks, append a new `PROVENANCE_PATCH.json` block instead of editing prior text.

Ops-side helper (Node): if you prefer doing the readback binding + hashing in your Ops stack instead of Make, use [src/notion/readbackNormalizer.ts](src/notion/readbackNormalizer.ts) (`normalizeNotionReadback`) to produce `run_blocks_sha256` plus `per_block_digests[]` receipts (including `ordinal`) and a deterministic `readback_blocks_sha256` evidence digest.

#### Extra-ruthless mode: readback evidence list + evidence digest (readback_blocks_sha256)

Goal: when Make computes `run_blocks_sha256`, it also records exactly what Notion returned at readback time (so “Notion ate my whitespace” is provable).

Maintain an array `READBACK_BLOCKS[]` of entries:

- `ordinal` (the order the block appeared in Notion `results[]`)
- `block_id`
- `type` (`heading_2` or `code`)
- `label` (the bound heading label)
- `text_sha256`
- `bytes`

Make procedure:

1) Read `/v1/blocks/{page_id}/children` with pagination.
2) Aggregate to `ALL_BLOCKS[]`.
3) Iterate `ALL_BLOCKS[]` in order (do not sort) and build `READBACK_BLOCKS[]` as you bind heading_2 → code.

Evidence digest canonicalization:

- Canonical line format (one line per evidence entry, in ordinal order):

`{ordinal}|{type}|{label}|{block_id}|{bytes}|{text_sha256}`

- Join lines with `\n` and add a trailing `\n`.
- Hash the resulting bytes as SHA-256 → `readback_blocks_sha256`.

Storage (recommended):

- Database properties (fast triage): `run_blocks_sha256`, `readback_blocks_sha256`, `PASS/FAIL`, `FAIL_REASON`, `LOCKED_AT`.
- Provenance (full receipts): add `provenance.readback` fields (page_id, read_at_iso, readback_blocks_sha256, run_blocks_sha256, digest_expected_sha256, match).
- Optional: store only the 6 entries you care about (3 headings + 3 code blocks) instead of the full list.

Deterministic FAIL_REASON codes (first-hit wins):

1) `CODE_WITHOUT_HEADING`
2) `CODE_WITHOUT_TARGET_LABEL`
3) `NON_CODE_BETWEEN_HEADING_AND_CODE:<type>`
4) `DUPLICATE_TEMPLATES_BLOCK` / `DUPLICATE_SELF_CHECK_BLOCK` / `DUPLICATE_PROVENANCE_BLOCK`
5) `MISSING_TEMPLATES_BLOCK` / `MISSING_SELF_CHECK_BLOCK` / `MISSING_PROVENANCE_BLOCK`
6) `DIGEST_DRIFT_NOTION_EDITED_CONTENT`

Final boss hardening (optional): pinned block_id mode.

- On the first PASS, store the three code block IDs in DB properties (or provenance).
- On future readbacks, fetch those blocks directly and compare their text digests.
- This prevents anyone from inserting a fake `TEMPLATES.json` section above the real one.

---

### Pinned block_id mode (no imposters allowed)

Pinned mode turns Notion into a dumb storage bucket: you stop searching for blocks and only fetch the exact three code blocks you “blessed” on the first clean PASS.

#### Notion database properties (copy/paste runbook-grade)

Note: Notion formulas are case-sensitive. If your database uses different property names (e.g., `RUN_DIGEST_SHA256` vs `run_digest_sha256`), update formulas accordingly.

Core run fields:

1) `case_id` — Title (or Text if Title is used elsewhere)
2) `PASS/FAIL` — Select (`PASS`, `FAIL`)
3) `FAIL_REASON` — Text (short)
4) `LOCKED_AT` — Date (include time)

Pin-mode fields:

5) `PIN_MODE` — Select (`heading_pair`, `pinned_block_id`)
5b) `PIN_MODE_LOCKED` — Checkbox
6) `PINNED_AT` — Date (include time)
6b) `PINNED_AT_ISO` — Text (ISO) (optional; easier to log/compare)
7) `PIN_TEMPLATES_BLOCK_ID` — Text
8) `PIN_SELF_CHECK_BLOCK_ID` — Text
9) `PIN_PROVENANCE_BLOCK_ID` — Text
10) `PIN_SET_DIGEST_SHA256` — Text (64-hex)
10h) `PIN_SET_VERSION` — Text (optional; recommended: `v1`)

Pinned invariants (stored on first PASS; verified on every pinned run):

10b) `PIN_TEMPLATES_LAST_EDITED_TIME` — Text (ISO)
10c) `PIN_SELF_CHECK_LAST_EDITED_TIME` — Text (ISO)
10d) `PIN_PROVENANCE_LAST_EDITED_TIME` — Text (ISO)
10e) `PIN_TEMPLATES_LANGUAGE` — Text
10f) `PIN_SELF_CHECK_LANGUAGE` — Text
10g) `PIN_PROVENANCE_LANGUAGE` — Text

Digest fields:

11) `run_digest_sha256` — Text (64-hex) (pre-write intent digest)
12) `run_blocks_sha256` — Text (64-hex) (post-write readback digest)
12b) `run_blocks_bytes` — Number (optional but recommended)
13) `readback_blocks_sha256` — Text (64-hex) (evidence-list digest)
13b) `readback_blocks_json_sha256` — Text (64-hex) (receipt-ledger digest; optional)
14) `RUN_DIGEST_SHORT` — Formula

```notion
slice(prop("run_digest_sha256"), 0, 12)
```

15) `PINS_OK` — Formula

```notion
and(
  prop("PIN_MODE") = "pinned_block_id",
  length(prop("PIN_TEMPLATES_BLOCK_ID")) > 0,
  length(prop("PIN_SELF_CHECK_BLOCK_ID")) > 0,
  length(prop("PIN_PROVENANCE_BLOCK_ID")) > 0,
  length(prop("PIN_SET_DIGEST_SHA256")) = 64
)
```

15b) `PIN_SET_OK` — Formula (alias; same semantics as `PINS_OK`)

```notion
and(
  prop("PIN_MODE") = "pinned_block_id",
  prop("PIN_MODE_LOCKED"),
  length(prop("PIN_TEMPLATES_BLOCK_ID")) > 0,
  length(prop("PIN_SELF_CHECK_BLOCK_ID")) > 0,
  length(prop("PIN_PROVENANCE_BLOCK_ID")) > 0,
  length(prop("PIN_SET_DIGEST_SHA256")) = 64
)
```

16) `RUN_VALID` — Formula (downstream “green light” gate)

```notion
and(
  prop("PASS/FAIL") = "PASS",
  not(empty(prop("LOCKED_AT"))),
  length(prop("run_digest_sha256")) = 64,
  length(prop("run_blocks_sha256")) = 64,
  prop("run_digest_sha256") = prop("run_blocks_sha256"),
  or(prop("PIN_MODE") != "pinned_block_id", prop("PINS_OK")),
  or(not(prop("PIN_MODE_LOCKED")), prop("PIN_MODE") = "pinned_block_id")
)
```

Optional “don’t touch pins” warning flag:

17) `PIN_TAMPER_FLAG` — Formula

```notion
and(
  prop("PIN_MODE") = "pinned_block_id",
  not(empty(prop("LOCKED_AT"))),
  empty(prop("PINNED_AT"))
)
```

#### Make module sequence (pinned mode: 3× block fetch + digest checks)

0) Notion → Retrieve a Database Item (or Get a Page)

- Pull: `PASS/FAIL`, `LOCKED_AT`, `PIN_MODE`, `PIN_MODE_LOCKED`, the three `PIN_*_BLOCK_ID` values, `PIN_SET_DIGEST_SHA256`, and `run_digest_sha256`.
- Router: if `PIN_MODE == pinned_block_id` → pinned path. Else → heading-pair path (your matcher) and pin IDs on first PASS.
- Hardening: if `PIN_MODE_LOCKED = true` and `PIN_MODE != pinned_block_id` → hard FAIL (no writes, no jobs) `FAIL_REASON = PIN_MODE_DOWNGRADE_BLOCKED`.

Route 3 (NOT LOCKED YET) preflight: refuse “half-pinned” zombie pages (hard FAIL)

Do this gate inside your Route 3 path, before any writes or `/jobs/submit`.

Required pinned ID properties (page-level):

- `PIN_TEMPLATES_BLOCK_ID` (Text)
- `PIN_SELF_CHECK_BLOCK_ID` (Text)
- `PIN_PROVENANCE_BLOCK_ID` (Text)
- `PIN_SET_DIGEST_SHA256` (Text) (optional but recommended)

Stop Sign 0 — Quiet downgrade blocked (hard FAIL)

- IF `PIN_MODE_LOCKED == true` AND `PIN_MODE != "pinned_block_id"`:
  - Notion → Update a page:
    - `PASS/FAIL = FAIL`
    - `FAIL_REASON = "PIN_MODE_DOWNGRADE_BLOCKED"`
    - Leave `LOCKED_AT` empty/unchanged
  - STOP scenario

Then run the rest of Route 3 preflight stop signs in this order:

Define helpers (conceptual):

- Pin set (explicit): `PIN_TEMPLATES_BLOCK_ID`, `PIN_SELF_CHECK_BLOCK_ID`, `PIN_PROVENANCE_BLOCK_ID`
- `ALL_PINS_EMPTY` = all three are empty
- `ALL_PINS_PRESENT` = all three are non-empty
- `HALF_PIN` = (some filled) AND (some empty)
- `ANY_PINS_PRESENT` = (any filled)

Stop Sign 0b — Pins imply locked (hard FAIL)

- IF `ANY_PINS_PRESENT == true` AND `PIN_MODE_LOCKED != true`:
  - Notion → Update a page:
    - `PASS/FAIL = FAIL`
    - `FAIL_REASON = "PIN_SET_NOT_LOCKED"`
    - Leave `LOCKED_AT` empty/unchanged
  - STOP scenario

Stop Sign 1 — PIN_MODE invalid (hard FAIL)

- IF `PIN_MODE` is empty or not in `{ "heading_pair", "pinned_block_id" }`:
  - Notion → Update a page:
    - `PASS/FAIL = FAIL`
    - `FAIL_REASON = "PIN_MODE_INVALID"`
    - Leave `LOCKED_AT` empty/unchanged
  - STOP scenario

Add a Router inside Route 3 with these branches (in order):

Branch 1 — PINNED MODE LIE (hard FAIL)

- Condition:
  - `PIN_MODE == "pinned_block_id"` AND `ALL_PINS_EMPTY == true`
- Actions:
  - Notion → Update a page:
    - `PASS/FAIL = FAIL`
    - `FAIL_REASON = "PIN_MODE_CLAIMS_PINNED_BUT_NO_PINS"`
    - Leave `LOCKED_AT` empty/unchanged
  - STOP scenario

Branch 2 — HALF-PIN SABOTAGE / FRANKENSTEIN (hard FAIL)

- Condition:
  - `HALF_PIN == true`
- Actions:
  - Notion → Update a page:
    - `PASS/FAIL = FAIL`
    - `FAIL_REASON = "PIN_SET_PARTIAL_REFUSED"`
    - Leave `LOCKED_AT` empty
    - Do not change `PIN_MODE`
  - STOP scenario

Branch 3 — PIN SET DIGEST MISSING (hard FAIL)

- Condition:
  - `ALL_PINS_PRESENT == true`
  - AND `PIN_SET_DIGEST_SHA256` is empty
- Actions:
  - Notion → Update a page:
    - `PASS/FAIL = FAIL`
    - `FAIL_REASON = "PIN_SET_DIGEST_MISSING_FOR_PINNED_SET"`
    - Leave `LOCKED_AT` empty/unchanged
  - STOP scenario

Branch 4 — PIN SET TAMPERED (hard FAIL)

- Condition:
  - `ALL_PINS_PRESENT == true`
  - AND `PIN_SET_DIGEST_SHA256` is non-empty
  - AND `PIN_SET_DIGEST_SHA256 != sha256(SINTRAPRIME_PIN_SET_V1 wrapper over the 3 stored ids)`
- Actions:
  - Notion → Update a page:
    - `PASS/FAIL = FAIL`
    - `FAIL_REASON = "PIN_SET_TAMPERED"`
    - Leave `LOCKED_AT` empty/unchanged
  - STOP scenario

Branch 5 — OK TO PIN (continue normal Route 3)

- Condition:
  - `PIN_MODE == "heading_pair"` AND `ALL_PINS_EMPTY == true`
- Actions (normal Route 3):
  1) Generate → append the 3 blocks
  2) Read back block IDs returned by the append response
  3) On first successful pin (single Notion update; atomic commit), write ALL:
     - `PIN_MODE = "pinned_block_id"`
     - `PIN_MODE_LOCKED = true`
     - `PIN_TEMPLATES_BLOCK_ID = <id>`
     - `PIN_SELF_CHECK_BLOCK_ID = <id>`
     - `PIN_PROVENANCE_BLOCK_ID = <id>`
     - `PIN_SET_DIGEST_SHA256 = sha256( SINTRAPRIME_PIN_SET_V1(templates_id, selfcheck_id, provenance_id) )`
     - `PINNED_AT_ISO = now()` (optional)
     - `PIN_SET_VERSION = "v1"` (optional)
  4) Run readback digest (`run_blocks_sha256`)
  5) If PASS: set `PASS/FAIL=PASS`, clear `FAIL_REASON`, and set `LOCKED_AT = now()`

FAIL_REASON precedence (so debugging is instant):

1) `PIN_MODE_DOWNGRADE_BLOCKED`
2) `PIN_SET_NOT_LOCKED`
3) `PIN_MODE_INVALID`
4) `LOCKED_AT_MISSING_FOR_LOCKED_PIN_MODE`
5) `LOCK_TIMESTAMP_INVALID`
6) `PAGE_LAST_EDITED_TIME_INVALID`
7) `LOCKED_PAGE_EDITED_AFTER_LOCK`
8) `LOCKED_BLOCK_EDITED_AFTER_LOCK`
9) `PIN_MODE_CLAIMS_PINNED_BUT_NO_PINS`
10) `PIN_SET_PARTIAL_REFUSED`
11) `PIN_SET_DIGEST_MISSING_FOR_PINNED_SET`
12) `PIN_SET_TAMPERED`
13) `DIGEST_DRIFT_NOTION_EDITED_CONTENT`
14) `NOTION_READBACK_TIMEOUT_OR_RATE_LIMIT`
15) `NOTION_READBACK_FATAL_HTTP`
16) everything else…

Pinned path:

Pinned block read retry/timeout policy (deterministic):

- Shared policy across all 3 block GETs.
- `MAX_ATTEMPTS = 6`
- `BASE_SLEEP_SECONDS = 2`
- `CAP_SLEEP_SECONDS = 32`
- Backoff: `sleep = min(CAP_SLEEP_SECONDS, BASE_SLEEP_SECONDS * 2^(attempt-1))` (no jitter)
- `TOTAL_TIMEOUT_SECONDS = 140` (hard stop)
- Retry only on: `429`, `500`, `502`, `503`, `504`, transient network errors
- Never retry on: `400`, `401`, `403`, `404` (treat as fatal configuration/auth); avoid retrying `409`
- Hard rule: if any pinned read fails fatally or times out, stop and do **not** compute digests.

0) Page lock checks (fast fail before any hashing)

- If `PIN_MODE == pinned_block_id` and `PIN_MODE_LOCKED == true`:
  - If `LOCKED_AT` is empty → `FAIL_REASON = LOCKED_AT_MISSING_FOR_LOCKED_PIN_MODE`
  - If `LOCKED_AT` is not a valid ISO timestamp → `FAIL_REASON = LOCK_TIMESTAMP_INVALID`
  - (Optional but recommended) Fetch page metadata (Notion “Get a Page”) and compare:
    - If page `last_edited_time` missing/empty → `FAIL_REASON = PAGE_LAST_EDITED_TIME_INVALID`
    - If page `last_edited_time > LOCKED_AT` → `FAIL_REASON = LOCKED_PAGE_EDITED_AFTER_LOCK`

1) HTTP → Make a request (GET pinned block: Templates)

- `GET https://api.notion.com/v1/blocks/{{PIN_TEMPLATES_BLOCK_ID}}`
- Headers: `Authorization: Bearer {{NOTION_TOKEN}}`, `Notion-Version: 2022-06-28`, `Content-Type: application/json`
- Hard gates:
  - HTTP fail (after capped retries on 429/5xx) → `FAIL_REASON = NOTION_READBACK_TIMEOUT_OR_RATE_LIMIT`
  - Fatal HTTP (`400`/`401`/`403`/`404`) → `FAIL_REASON = NOTION_READBACK_FATAL_HTTP`
  - `type != code` → `FAIL_REASON = PIN_BLOCK_NOT_CODE`
  - `code.language` not in allowed set (or not expected) → `FAIL_REASON = PIN_BLOCK_LANGUAGE_DRIFT`
  - If `last_edited_time > LOCKED_AT` → `FAIL_REASON = LOCKED_BLOCK_EDITED_AFTER_LOCK`
  - Extract `TEMPLATES_TEXT = join(map(code.rich_text; plain_text); "")`; if empty → `FAIL_REASON = MISSING_TEMPLATES_TEXT`

2) HTTP → Make a request (GET pinned block: Self-check)

- Same as step 1 but using `PIN_SELF_CHECK_BLOCK_ID` → extract `SELF_CHECK_TEXT`.

3) HTTP → Make a request (GET pinned block: Provenance)

- Same as step 1 but using `PIN_PROVENANCE_BLOCK_ID` → extract `PROVENANCE_TEXT`.

4) Tools → Set variable `run_blocks_c14n` (canonical triple, v1)

Use the repo’s canonical wrapper (exact):

```
"SINTRAPRIME_RUN_BLOCKS_V1\n" &
"---TEMPLATES.json---\n" & TEMPLATES_TEXT & "\n" &
"---SELF_CHECK.json---\n" & SELF_CHECK_TEXT & "\n" &
"---PROVENANCE.json---\n" & PROVENANCE_TEXT & "\n"
```

5) Hash `run_blocks_c14n` → `run_blocks_sha256`

- If Make has SHA-256, use it.
- Otherwise use the Ops lane already documented (write to `Cases/{case_id}/Runs/{run_id}/run_blocks.c14n.txt`, then `sha256_file`).

5b) Micro-tripwire (recommended): store `run_blocks_bytes`

- Compute byte length of `run_blocks_c14n` as UTF-8 bytes → `run_blocks_bytes`.
- Store it alongside `run_blocks_sha256`.

6) Evidence digest (recommended): `readback_blocks_sha256`

Canonical lines (3 lines, fixed order), joined with `\n` and trailing `\n`:

- `TEMPLATES.json|{PIN_TEMPLATES_BLOCK_ID}|{bytes}|{text_sha256}`
- `SELF_CHECK.json|{PIN_SELF_CHECK_BLOCK_ID}|{bytes}|{text_sha256}`
- `PROVENANCE.json|{PIN_PROVENANCE_BLOCK_ID}|{bytes}|{text_sha256}`

Hash as SHA-256.

6b) Evidence ledger (optional but strong): `readback_blocks[]` + `readback_blocks_json_sha256`

Write into `PROVENANCE.json` (or a DB text field) a deterministic list:

`readback_blocks[]` entries (fixed order):

- `{ label: "TEMPLATES", block_id, block_last_edited_time, text_sha256 }`
- `{ label: "SELF_CHECK", block_id, block_last_edited_time, text_sha256 }`
- `{ label: "PROVENANCE", block_id, block_last_edited_time, text_sha256 }`

Then hash the canonical JSON for that array (keys sorted, indent=0, no trailing newline) → `readback_blocks_json_sha256`.

Note: if Make can’t hash per-block text, compute the line hashes via Ops (one file per text or an Ops helper), or store bytes-only evidence and rely on `run_blocks_sha256` as the primary drift tripwire.

7) Pin-set integrity check (optional but strong)

- Build the pin-set canonical string (repo-wide wrapper, v1):

```
SINTRAPRIME_PIN_SET_V1
templates_block_id={PIN_TEMPLATES_BLOCK_ID}
self_check_block_id={PIN_SELF_CHECK_BLOCK_ID}
provenance_block_id={PIN_PROVENANCE_BLOCK_ID}
```

- Hash → `PIN_SET_DIGEST_CALC`; mismatch with stored `PIN_SET_DIGEST_SHA256` → `FAIL_REASON = PIN_SET_TAMPERED`.

8) Compare digests

- If `run_blocks_sha256 != run_digest_sha256` → `FAIL_REASON = DIGEST_DRIFT_NOTION_EDITED_CONTENT`.

9) Notion → Update a Database Item

- PASS: set `PASS/FAIL = PASS`, clear/leave empty `FAIL_REASON`, write `run_blocks_sha256` (and `readback_blocks_sha256` if you compute it). Do not change `LOCKED_AT` if already set.
- FAIL: set `PASS/FAIL = FAIL`, set `FAIL_REASON` to the first failed rule, write digests if available; keep `LOCKED_AT` empty (or refuse to run pinned verification unless already locked).

#### Properties to store (first PASS only)

Store these as Notion database item properties (recommended) and optionally mirror into `PROVENANCE.json`:

- `PIN_TEMPLATES_BLOCK_ID` (text)
- `PIN_SELF_CHECK_BLOCK_ID` (text)
- `PIN_PROVENANCE_BLOCK_ID` (text)
- `PIN_MODE` (select): `heading_pair` | `pinned_block_id`
- `PINNED_AT` (date)
- `PIN_SET_DIGEST_SHA256` (text)
- `PIN_TEMPLATES_LAST_EDITED_TIME`, `PIN_SELF_CHECK_LAST_EDITED_TIME`, `PIN_PROVENANCE_LAST_EDITED_TIME` (text)
- `PIN_TEMPLATES_LANGUAGE`, `PIN_SELF_CHECK_LANGUAGE`, `PIN_PROVENANCE_LANGUAGE` (text)
- Optional: `PIN_SOURCE_RUN_DIGEST_SHA256` (text) — the `run_digest_sha256` that created the pins

Pin set digest (deterministic; repo-wide wrapper):

```
SINTRAPRIME_PIN_SET_V1
templates_block_id={PIN_TEMPLATES_BLOCK_ID}
self_check_block_id={PIN_SELF_CHECK_BLOCK_ID}
provenance_block_id={PIN_PROVENANCE_BLOCK_ID}
```

Hash those UTF-8 bytes as SHA-256 → `PIN_SET_DIGEST_SHA256`.

Hard rule: never update pin fields after `LOCKED_AT` is set. If pins are missing, duplicate the page and rerun.

#### Phase 1: first PASS run (pairing mode → pin IDs)

This is your current heading_2 → next code matcher run.

Steps (Make):

1) Append the three labeled blocks as usual.
2) Read back page blocks.
3) Locate the three *code blocks* that immediately follow these anchors:
  - `heading_2 == "TEMPLATES.json"`
  - `heading_2 == "SELF_CHECK.json"`
  - `heading_2 == "PROVENANCE.json"`
4) Capture the three code block IDs:
  - `templates_code_block_id`
  - `self_check_code_block_id`
  - `provenance_code_block_id`
5) Write pin properties only if:
  - `PASS/FAIL == PASS`
  - `LOCKED_AT` is empty
  - `PIN_MODE` is empty or `heading_pair`
6) Set:
  - `PIN_TEMPLATES_BLOCK_ID`, `PIN_SELF_CHECK_BLOCK_ID`, `PIN_PROVENANCE_BLOCK_ID`
  - `PIN_MODE = pinned_block_id`
  - `PINNED_AT = now()`
  - `PIN_SET_DIGEST_SHA256 = sha256(pin_set_canonical)`
  - Optional: `PIN_SOURCE_RUN_DIGEST_SHA256 = run_digest_sha256`
7) Set `LOCKED_AT` (your existing latch).

#### Phase 2: future runs (pinned_block_id mode)

No scanning. Fetch-by-id and compare.

Pre-check (recommended):

- If `PIN_MODE != pinned_block_id`: either fall back to pairing mode or FAIL (choose one policy and stick to it).
- Pinned-mode hardening: do not fall back in pinned mode. If `PIN_MODE == pinned_block_id`, it’s all-or-nothing.
- If any PIN_*_BLOCK_ID missing → FAIL `FAIL_REASON="PINS_MISSING"`.
- If `LOCKED_AT` is empty → FAIL `FAIL_REASON="NOT_LOCKED_CANNOT_TRUST_PINS"` (optional but recommended).
- If `PIN_MODE_LOCKED = true` and `PIN_MODE != pinned_block_id` → FAIL `FAIL_REASON="PIN_MODE_DOWNGRADE_BLOCKED"`.

Pin integrity check:

- Recompute `PIN_SET_DIGEST_SHA256` from the three stored IDs and compare.
- If mismatch → FAIL `FAIL_REASON="PIN_SET_TAMPERED"`.

Fetch the exact blocks:

- Notion API: `GET /v1/blocks/{block_id}` (3 calls)
- Hard gate: if any fetch fails (after capped retries on 429/5xx) → FAIL `FAIL_REASON="NOTION_READBACK_TIMEOUT_OR_RATE_LIMIT"`.
- Hard gate: if any fetched block is not `type == "code"` → FAIL `FAIL_REASON="PIN_BLOCK_NOT_CODE"`.
- Hard gate: if any `code.language` is not expected/allowed → FAIL `FAIL_REASON="PIN_BLOCK_LANGUAGE_DRIFT"`.
- Hard gate: if any `last_edited_time > LOCKED_AT` → FAIL `FAIL_REASON="LOCKED_BLOCK_EDITED_AFTER_LOCK"`.

Then:

1) Extract `code.rich_text[].plain_text` and join to literal strings.
2) Compute `run_blocks_sha256` from `SINTRAPRIME_RUN_BLOCKS_V1` canonical triple (post-write truth).
3) Compare to expected `run_digest_sha256`; mismatch → FAIL `FAIL_REASON="DIGEST_DRIFT_NOTION_EDITED_CONTENT"`.

Pinned evidence digest (`readback_blocks_sha256`) (3-entry fixed order):

- Canonical lines:

  1) `TEMPLATES.json|{PIN_TEMPLATES_BLOCK_ID}|{bytes}|{text_sha256}`
  2) `SELF_CHECK.json|{PIN_SELF_CHECK_BLOCK_ID}|{bytes}|{text_sha256}`
  3) `PROVENANCE.json|{PIN_PROVENANCE_BLOCK_ID}|{bytes}|{text_sha256}`

- Join with `\n` and add trailing `\n`, hash as SHA-256.

Deterministic FAIL_REASON ordering (first-hit wins):

Use the canonical precedence list defined earlier in this runbook (Route 3 “FAIL_REASON precedence”).
Do not maintain a second ordering here; if you need to add/remove tokens, update the single canonical list.

### Optional hardening: no-duplicate append guard

Before appending, list existing page blocks and check for a heading that equals `TEMPLATES.json`.

If found, append a new “Run #N” heading first (or skip appending) to prevent runaway history growth.

---

## 8) Make Scenario: Exhibit Packet Auto-Generate when Status = Received

Goal: once a case is marked Status = Received, automatically generate a Binder Export (cover + index + exhibits) so each case becomes a one-click “Exhibit Packet”, and then mark the case Packet Ready = ✅.

This scenario assumes you have (or will add) a single Ops endpoint that can run the binder build deterministically.

### Notion requirements

In your Cases database, ensure you have:

- Status (select) with a value Received
- Latest Run ID (text) — the execution_id you want to package
- Packet Ready (checkbox) — used as the loop-prevention latch

These already map cleanly to the repo’s Notion case store fields.

### Cases Module 1 — Notion: Watch Database Items (Cases)

Filter:

- Status equals Received
- Latest Run ID is not empty
- Packet Ready is unchecked

### Cases Module 2 — Tools: Set variables (Cases)

- case_id = Notion Case ID
- execution_id = Notion Latest Run ID
- notion_page_id = Notion page ID
- idempotency_key = exhibit_packet:{case_id}:{execution_id}

### Cases Module 3 — HTTP: Generate binder export (Ops server)

POST your Ops endpoint, either as a synchronous call (preferred for this lane) or as an async job.

Recommended internal implementation on the Ops side:

- Run the audit export for the execution:

  - /audit export {execution_id}

- Generate the binder (cover + index PDFs, plus exhibits) using:

  - scripts/make-court-binder.ts

Example command the Ops server would run:

- node --import tsx ./scripts/make-court-binder.ts {execution_id} --run-type page --target-id {notion_page_id}

### Cases Module 4 — Notion: Update Case page

On success:

- Packet Ready = ✅
- Notes / Artifact Index = set to the exported packet path or a URL, if you store one

On failure:

- Packet Ready stays unchecked
- Notes updated with error + retry hint

### Suggested output convention

Store binder outputs under the case folder to make the packet discoverable:

- Cases/{case_id}/Artifacts/Exhibit_Packets/COURT_PACKET_{execution_id}/BINDER/...

If you keep a public deliverable copy, have your Ops job copy the final Binder PDFs into:

- Cases/{case_id}/Public/Exhibits/{execution_id}/...
