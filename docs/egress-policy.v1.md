# Egress Policy (Operator) — v1

This document explains the **egress “physics lock”**: outbound bytes cannot leave the system unless the executor enforces (a) domain allowlisting and (b) approval-by-hash for the current deterministic bundle.

## Key invariant

- All external network egress that matters must flow through the executor’s guarded plan steps.
- If the system emits `EGRESS_REFUSED`, the send did not happen.

## When a step requires an egress guard

The executor classifies external HTTP steps and decides whether a step **requires** an `egress_guard`.

Guard is required when:

- Method is not `GET`/`HEAD` (always guarded)
- A `GET`/`HEAD` is part of an egress chain (after any guarded external request in the plan)
- A `GET`/`HEAD` includes auth-ish headers (`Authorization`, `Cookie`, or `X-CSRF*`)
- A `GET`/`HEAD` “looks send-ish” by name/action (e.g., upload/submit/dispatch/send/portal/mail/file)

Guard is not required when:

- The URL is not external HTTP(S)
- It is a public-looking external `GET`/`HEAD` with no auth-ish headers, not send-ish, and not in an egress chain

The decision reason strings are stable (examples: `non_get_non_head`, `auth_headers_get`, `sendish_get`, `egress_chain_get`, `public_get`).

## Domain allowlist

If a step requires a guard and targets an external domain, the hostname must be allowlisted.

Env vars:

- `EGRESS_ALLOWED_DOMAINS` — comma-separated exact hostnames (e.g., `api.somevendor.com,files.somevendor.com`)
- `EGRESS_ALLOWED_DOMAINS_REGEX` — comma-separated regex patterns (e.g., `(^|\\.)example\\.com$`)

Notes:

- Hostnames are normalized: lowercase, trailing dots removed, punycode-normalized.
- Localhost (`localhost`, `127.0.0.1`) and Notion (`api.notion.com`) are treated specially and are not subject to external-domain allowlisting.

### Copy/paste env vars

```powershell
$env:EGRESS_ALLOWED_DOMAINS="api.somevendor.com,files.somevendor.com"
$env:EGRESS_ALLOWED_DOMAINS_REGEX="(^|\\.)example\\.com$"
$env:APPROVAL_MAX_AGE_DAYS="30"

# CI-only escape hatch for the no-network preload (avoid using unless you truly need it)
$env:CI_ALLOW_NETWORK="1"
```

## Approval-by-hash (true send boundary)

For guarded **send steps** (methods other than `GET`/`HEAD`), the executor re-reads the Notion page at send time and enforces that the current deterministic bundle hash is approved.

Relevant Notion properties (exact names):

- `Approval Status` (select)
- `Approved Bundle Hash` (rich text)
- `Approved At` (date)
- `Stage` (select)

The current bundle hash is computed from the on-disk artifact index for the case + stage/kind.

Freshness:

- `APPROVAL_MAX_AGE_DAYS` controls staleness refusal for approvals (default: 30 days).

## Overrides (painful-but-possible)

Overrides exist for exceptional cases but are intentionally strict and auditable.

Override requires *both*:

1) The plan step declares override metadata in `egress_guard`:
   - `override_reason`
   - `override_by`

2) The Notion page has matching override fields set:
   - `Approval Override Reason`
   - `Approval Override By`
   - `Approval Override Stage`
   - `Approval Override Bundle Hash`
   - `Approval Override Until` (optional)

Override constraints:

- Override must be stage-specific (`Approval Override Stage` must equal the required stage)
- Override must be hash-specific (`Approval Override Bundle Hash` must equal the current computed bundle hash)
- If `Approval Override Until` is set, it must not be expired

If override fields are set in Notion but the step didn’t declare override metadata (or vice versa), the executor refuses.

## What to check when you see `EGRESS_REFUSED`

Where it appears:

- Case event log: `cases/<case_id>/case.events.jsonl` contains an `EGRESS_REFUSED` event with a refusal code and diagnostics.
- Run receipt/log: the step run log includes `egress_policy_snapshot` for guarded external steps (decision reason, host, allowlist match, approval status/hash/current hash, freshness mode).

### CLI helper (instant snapshot)

If you have an `execution_id`, you can print the most recent persisted snapshot from `runs/receipts.jsonl`:

```bash
node --import tsx ./src/cli/run-command.ts "/egress snapshot <execution_id>"
```

Alias:

```bash
node --import tsx ./src/cli/run-command.ts "/policy snapshot <execution_id>"
```

Fields printed include:

- `decision_reason`
- `allowlist_match`
- `approved_hash` vs `current_hash`
- `approval_freshness_mode`

Optional (when snapshot is missing):

```bash
node --import tsx ./src/cli/run-command.ts "/policy snapshot --case-id <CASE_ID> --include-refusals"
```

Common refusal families:

- Missing or invalid guard:
  - `EGRESS_GUARD_MISSING`
  - `EGRESS_STAGE_MISSING`

- Domain not allowlisted:
  - `EGRESS_DOMAIN_NOT_ALLOWED`

- Cannot verify approval:
  - `EGRESS_NOTION_READ_FAILED`
  - `EGRESS_APPROVAL_STALE`
  - Approved hash mismatch / missing (surfaced as refusal at send time)

- Override mismatch:
  - `EGRESS_OVERRIDE_*` (step/notion missing, stage mismatch, hash mismatch, expired)

## Operator playbook (minimal, safe)

1) Confirm the step should be guarded (check `decision_reason` in `egress_policy_snapshot`).
2) If domain refused, add the host to `EGRESS_ALLOWED_DOMAINS` (prefer exact) or `EGRESS_ALLOWED_DOMAINS_REGEX` (only if you need a pattern).
3) If approval refused, verify the Notion page has the correct `Approved Bundle Hash` for the current on-disk bundle.
4) If drift/mismatch: regenerate artifacts deterministically, re-index, then re-approve the *new* bundle hash.
5) Only use overrides when absolutely necessary; ensure both step metadata and Notion override fields match stage+hash.

## Non-goals

- This doc does not create authority or loosen enforcement; it only describes the runtime policy.
