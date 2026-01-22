# Operator Runbook (v1)

This runbook is the practical operating procedure for running the system without breaking the constitutional invariants.

## Litigation packet verification (court-proof)

Signing spec: [docs/litigation-manifest-signing.ed25519.v1.md](docs/litigation-manifest-signing.ed25519.v1.md) (design-only until implemented).

Two commands. Predictable reports. Deterministic grades.

- Verify (no writes):
	- `npm run -s litigation:verify -- <folder> --case "<NAME>" --min-grade A --report --git --json`
	- Optional headline mode: add `--print-policy` to print just the policy headline + clerk summary.
	- Report output: `runs/_verify_reports/<NAME>__<verificationIdShort>__<grade>__<exitReason>.md`
- Refit (clone-only, then verify clone):
	- `npm run -s litigation:refit -- <folder> --case "<NAME>" --refit-only-pdf --report --git`
	- Optional headline mode: add `--print-policy` to print just the policy headline + clerk summary.
	- Report output: `runs/_verify_reports/<NAME>__<verificationIdShort>__<grade>__<exitReason>.md`

Grade policy:

- `GRADE A` (Reproducible + Verifiable) is suitable for publish/filing pipelines.
- `GRADE B` (Verifiable but not Reproducible) is suitable for internal archive acceptance.
- `GRADE C` indicates failures and requires manual review.

Exit semantics (SOP note):

- If `exitReason = FAIL_ON_TRIGGERED`, the packet may still be valid by grade; it failed a strict publish policy (warnings escalated).
- For automation (Notion/Make/Slack/CI), prefer `policyDecision` in JSON/report over reverse-engineering from `exitReason`.

## Notion router (templates) — front door

- Notion Hands-Free Router Wiring v1: [notion/job-templates/notion-hands-free-router-wiring.v1.md](notion/job-templates/notion-hands-free-router-wiring.v1.md)
- Master Router Prompts v1: [notion/job-templates/notion-ai-master-router-prompts.v1.md](notion/job-templates/notion-ai-master-router-prompts.v1.md)

## Make (operator-safe) — canonical Hands-Free Router run (Module 1 → N)

This is the no-improvisation scenario for:

- First-time runs (`heading_pair` → write blocks → pin them)
- Pinned runs (`pinned_block_id` → 3× GET pinned blocks → hash + receipts)
- Lock immutability (page + pinned blocks)

Hard posture:

- Never set `LOCKED_AT` in the same breath as append.
- Always: write → readback by ID → hash → compare → only then lock.
- Once a page has one clean PASS: default to `pinned_block_id` forever; refuse downgrade.

### Global constants (Make Variables)

- `NOTION_TOKEN` (secret)
- `NOTION_VERSION = "2022-06-28"`
- `WRAP_RUN_BLOCKS_V1 = "SINTRAPRIME_RUN_BLOCKS_V1\n"`
- `WRAP_PIN_SET_V1 = "SINTRAPRIME_PIN_SET_V1\n"`

### Copy/paste: Notion HTTP headers + bodies

Notion is strict about payload shapes. These two requests are the usual failure points.

#### Required headers (both requests)

- `Authorization: Bearer {{NOTION_TOKEN}}`
- `Notion-Version: {{NOTION_VERSION}}` (recommended: `2022-06-28`)
- `Content-Type: application/json`

#### 1) Append blocks (heading_2 + code ×3)

- Method: `PATCH`
- URL: `https://api.notion.com/v1/blocks/{{page_id}}/children`

Body (parameterized):

```json
{
	"children": [
		{
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
					{ "type": "text", "text": { "content": "{{TEMPLATES_TEXT}}" } }
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
					{ "type": "text", "text": { "content": "{{SELF_CHECK_TEXT}}" } }
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
					{ "type": "text", "text": { "content": "{{PROVENANCE_TEXT}}" } }
				]
			}
		}
	]
}
```

Notes:

- Keep each code block as a single `rich_text` entry (one big string). It makes deterministic readback simpler.
- Keep `language: "json"` stable so language allowlists can be strict.

#### 2) Update page properties

- Method: `PATCH`
- URL: `https://api.notion.com/v1/pages/{{page_id}}`

Important: property keys below assume your DB uses the canonical repo names (`PASS/FAIL`, not `PASS_FAIL`). If your DB differs, rename the keys in the JSON.

2A) First pin commit (atomic)

```json
{
	"properties": {
		"PIN_MODE": { "select": { "name": "pinned_block_id" } },
		"PIN_MODE_LOCKED": { "checkbox": true },
		"PIN_TEMPLATES_BLOCK_ID": {
			"rich_text": [{ "type": "text", "text": { "content": "{{PIN_TEMPLATES_BLOCK_ID}}" } }]
		},
		"PIN_SELF_CHECK_BLOCK_ID": {
			"rich_text": [{ "type": "text", "text": { "content": "{{PIN_SELF_CHECK_BLOCK_ID}}" } }]
		},
		"PIN_PROVENANCE_BLOCK_ID": {
			"rich_text": [{ "type": "text", "text": { "content": "{{PIN_PROVENANCE_BLOCK_ID}}" } }]
		},
		"PIN_SET_DIGEST_SHA256": {
			"rich_text": [{ "type": "text", "text": { "content": "{{PIN_SET_DIGEST_SHA256}}" } }]
		},
		"run_digest_sha256": {
			"rich_text": [{ "type": "text", "text": { "content": "{{RUN_DIGEST_SHA256}}" } }]
		},
		"PASS/FAIL": { "select": { "name": "PASS" } },
		"FAIL_REASON": { "rich_text": [] }
	}
}
```

2B) Post-readback PASS (before lock)

```json
{
	"properties": {
		"run_blocks_sha256": {
			"rich_text": [{ "type": "text", "text": { "content": "{{RUN_BLOCKS_SHA256}}" } }]
		},
		"PASS/FAIL": { "select": { "name": "PASS" } },
		"FAIL_REASON": { "rich_text": [] }
	}
}
```

2C) Drift FAIL (critical: do not set `LOCKED_AT`)

```json
{
	"properties": {
		"PASS/FAIL": { "select": { "name": "FAIL" } },
		"FAIL_REASON": {
			"rich_text": [{ "type": "text", "text": { "content": "DIGEST_DRIFT_NOTION_EDITED_CONTENT" } }]
		},
		"run_blocks_sha256": {
			"rich_text": [{ "type": "text", "text": { "content": "{{RUN_BLOCKS_SHA256}}" } }]
		}
	}
}
```

2D) Final lock commit (only after drift check passes)

```json
{
	"properties": {
		"LOCKED_AT": { "date": { "start": "{{LOCKED_AT_ISO}}" } },
		"PIN_MODE_LOCKED": { "checkbox": true },
		"PASS/FAIL": { "select": { "name": "PASS" } },
		"FAIL_REASON": { "rich_text": [] }
	}
}
```

#### Extracting the 3 new code block IDs (robust)

After the append call (Module 10), Notion returns a `results[]` array of created blocks.

Robust rule: ignore headings; take the `id` of the three `type=="code"` blocks in creation order.

Pseudo-steps:

1) `created = {{10.body.results}}`
2) `codeBlocks = filter(created, block.type == "code")`
3) `pin_templates = codeBlocks[0].id`
4) `pin_self_check = codeBlocks[1].id`
5) `pin_provenance = codeBlocks[2].id`

If you can’t express `filter()` cleanly in Make, use an Iterator over `results[]` with a Router `type == code`, then store the first 3 `id`s in variables (in order).

#### Extracting code text from a pinned code block (exact Notion paths)

Given `block = {{HTTP.body}}` from `GET /v1/blocks/{block_id}`:

- Assert `block.type == "code"` (else `PIN_BLOCK_NOT_CODE`)
- Assert `block.code.language == "json"` (or your allowlist, else `PIN_BLOCK_LANGUAGE_DRIFT`)
- Extract text exactly:
	- `text = join(map(block.code.rich_text; plain_text); "")`

This must be **plain_text concatenation with no trimming**.

#### Heading-pair matcher (only for first-time runs; pinned mode eliminates this)

If you are not pinned yet and you must bind sections by structure:

1) `GET https://api.notion.com/v1/blocks/{{page_id}}/children?page_size=100` (paginate if needed)
2) Iterate `results[]` in order.
3) When you see a `heading_2`, compute:
	 - `H = join(map(results[i].heading_2.rich_text; plain_text); "")`
4) If `H` is one of `TEMPLATES.json`, `SELF_CHECK.json`, `PROVENANCE.json`, then the next meaningful block must be a `code` block.

Refuse ambiguity:

- duplicate heading label before binding its code → `DUPLICATE_SECTION_HEADING`
- heading not followed by code (strict adjacency) → `MISSING_CODE_AFTER_HEADING`
- code block where no target heading is pending → ignore (or hard fail in strict mode)

---

### Retry / timeout policy (Make must be deterministic)

For the three pinned-block GETs (and the page GET if you use HTTP):

- Shared policy across all three reads.
- `MAX_ATTEMPTS = 6`
- `BASE_SLEEP_SECONDS = 2`
- `CAP_SLEEP_SECONDS = 32`
- Backoff: exponential, no jitter: `sleep = min(CAP_SLEEP_SECONDS, BASE_SLEEP_SECONDS * 2^(attempt-1))`
	- Sleep schedule (seconds): `2, 4, 8, 16, 32, 32`
- `TOTAL_TIMEOUT_SECONDS = 140` (hard stop; do not exceed)

Retry only on:

- `429`
- `500`, `502`, `503`, `504`
- transient network errors (timeouts, DNS, connection reset)

Never retry on:

- `400`, `401`, `403`, `404` (treat as configuration/auth error)
- `409` (unless you have confirmed it is transient for your integration)

Hard rule:

- If any of the 3 pinned reads fails fatally or times out, do **not** compute digests; fail the run.
- If retries are exhausted (or total timeout hit): hard fail `FAIL_REASON = NOTION_READBACK_TIMEOUT_OR_RATE_LIMIT`.
- If a fatal HTTP occurs (4xx): hard fail `FAIL_REASON = NOTION_READBACK_FATAL_HTTP`.

---

### Canonical wiring (single source of truth)

The only authoritative Module 0→90 wiring diagram for pinned mode lives in:

- (notion/job-templates/notion-hands-free-router-wiring.v1.md)
	- Section: **Canonical Make wiring: pinned-mode full run (Module 0 → 90)**

Do not restate the full module sequence anywhere else.

### Required FAIL_REASON tokens (do not rename)

These tokens are referenced by routers/CI/docs. The canonical precedence table lives in the wiring doc section above.

- `PIN_MODE_DOWNGRADE_BLOCKED`
- `PIN_SET_NOT_LOCKED`
- `PIN_MODE_INVALID`
- `PIN_MODE_CLAIMS_PINNED_BUT_NO_PINS`
- `PIN_SET_PARTIAL_REFUSED`
- `PIN_SET_PRESENT_BUT_MODE_NOT_PINNED`
- `PIN_SET_DIGEST_MISSING_FOR_PINNED_SET`
- `PIN_SET_TAMPERED`
- `LOCKED_AT_MISSING_FOR_LOCKED_PIN_MODE`
- `LOCK_TIMESTAMP_INVALID`
- `PAGE_LAST_EDITED_TIME_INVALID`
- `LOCKED_PAGE_EDITED_AFTER_LOCK`
- `LOCKED_BLOCK_EDITED_AFTER_LOCK`
- `NOTION_READBACK_TIMEOUT_OR_RATE_LIMIT`
- `NOTION_READBACK_FATAL_HTTP`
- `DIGEST_DRIFT_NOTION_EDITED_CONTENT`
- `PRECONDITION_FAILED`

### Preflight Stop Signs (summary only)

- If `PIN_MODE_LOCKED == true` and `PIN_MODE != pinned_block_id` → FAIL `PIN_MODE_DOWNGRADE_BLOCKED`.
- If any pins exist and `PIN_MODE_LOCKED != true` → FAIL `PIN_SET_NOT_LOCKED`.
- Refuse half-pin / missing pin-set digest / pin-set tamper before any writes.

### Notion properties (canonical names used in this repo)

If your database uses different names (e.g. `PASS_FAIL` instead of `PASS/FAIL`), map accordingly.

- `case_id`
- `operator_id`
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
- `readback_blocks_json_sha256` (Text)

---


### Make module-by-module wiring

Use the wiring doc’s canonical Module 0→90 section (linked above) for the exact module sequence.

## Smoke modes (don’t guess)

- Dev loop (CI-aligned, deterministic): `npm run -s smoke:local`
- Integration gauntlet (writes `.smoke-all.log`): `npm run -s smoke:all:log`
- One-off local command via mock harness: `npm run -s smoke:local:cmd -- "<COMMAND>"`

Notes:

- `smoke:all` is expected to fail locally unless integration preconditions are met (webhooks, reachable deps, prior receipts).
- `.smoke-all.log` is the source of truth for long runs on Windows.

## Common failures (start here)

### Egress / Sends Refused (`EGRESS_REFUSED`)

See: [`docs/egress-policy.v1.md`](./docs/egress-policy.v1.md)

Meaning: Approval-by-hash + allowlist + freshness checks blocked an outbound request.

First steps:

- If you have an `execution_id`, run: `npm run -s policy:snapshot -- --execution <execution_id> --include-refusals`.
- Check `decision_reason` in the refusal event / `egress_policy_snapshot`.
- Check Notion approval fields (`Approval Status`, `Approved Bundle Hash`, `Approved At`) and override fields if used.
- Check `EGRESS_ALLOWED_DOMAINS` / `EGRESS_ALLOWED_DOMAINS_REGEX`.
- Check drift: current artifact index / bundle hash vs approved hash.

## Roles (O1 / O2 / O3)

### O1 — Viewer

- May run the Operator UI (read-only views of `runs/**`).
- May verify exported audit bundles.
- Must not run live commands.
- Must not possess secrets.

### O2 — Read Operator

- May run **read-only live adapters** (e.g. Notion live read).
- May export audit bundles for executions.
- Has a scoped Notion token.
- Must not approve writes.

### O3 — Approver (explicitly delegated)

- May run `/approve <execution_id>`.
- Must be trained on policy denial vs approval-required behavior.
- Must maintain an audit trail of approvals.

## Golden rules (never break)

- Do not edit artifacts in `runs/**`.
- If something fails: re-run with a clean terminal environment; do not hot-patch evidence.
- Any external write must pass the approval gate; no bypasses.
- Every execution must produce a receipt and at least one artifact (“no silent work”).
- Treat `docs/CONSTITUTION.v1.md` as supreme.

## Safe terminal hygiene

Use a fresh terminal for live runs. Do not carry CI/smoke variables into live sessions.

For live runs, do **not** set:

- `SMOKE_VECTORS_USE_REMOTE`
- smoke-runner vars (anything you only use for smoke harness)

## Live Notion read (O2)

### Required env

Set only what you need (never commit these):

```powershell
$env:WEBHOOK_SECRET="..."                 # if validator/planner require a secret
$env:NOTION_TOKEN="secret_..."            # real Notion integration token (scoped)
$env:NOTION_API_BASE="https://api.notion.com"
$env:NOTION_API_VERSION="2022-06-28"
$env:NOTION_REDACT_KEYS="title,name,email,phone,address"
$env:AUTONOMY_MODE="OFF"
```

### Run commands

Database snapshot:

```bash
node --import tsx ./src/cli/run-command.ts "/notion live db <DATABASE_ID>"
```

Single page snapshot:

```bash
node --import tsx ./src/cli/run-command.ts "/notion live page <PAGE_ID>"
```

### If the command returns `ApprovalRequired`

Stop. You are not in a read-only posture. Do not proceed without O3 review.

## Export audit bundle (O2)

After you have an `execution_id` from the receipt/output:

```bash
node --import tsx ./src/cli/run-command.ts "/audit export <execution_id>"
```

## Court packet (O2)

Generate a clerk-ready folder packet from the execution:

```bash
node --import tsx ./scripts/make-court-packet.ts <execution_id> --run-type <db|page> --target-id <NOTION_ID>
```

This copies governance docs, receipt + hash, audit bundle zip + verify.js, and the redacted artifacts for that execution.

## Verifying an audit bundle (O1+)

If you have `audit_bundle_<execution_id>.zip`:

- Unzip it.
- In the unzipped folder, run:

```bash
node verify.js
```

A passing verification exits 0.
