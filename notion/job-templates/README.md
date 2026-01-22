# Notion Router Job Templates

This folder stores **strict JSON** job template bundles intended for a Notion “router” (or Make/Zapier) to emit as job submissions.

## Placeholders

These templates intentionally include placeholder tokens that must be substituted by the router/executor:

- `__EVENTS_DIGEST_SHA256__` — SHA-256 of the canonicalized events input (stable scheduling key).
- `__SNAPSHOT_SHA256__` — SHA-256 of a referenced snapshot (when snapshot-addressed artifacts are used).
- `__MANIFEST_SHA256__` — SHA-256 of a referenced manifest (stable packaging/verifier key).
- `__DATE_ISO__` — `YYYY-MM-DD` (or a full ISO date string, depending on your runbook).

## Files

- [verizon-2025.router-templates.v1.json](verizon-2025.router-templates.v1.json): proposed end-to-end regulator parallel pipeline templates.

## Notion AI prompt bundle

- [notion-ai-master-router-prompts.v1.md](notion-ai-master-router-prompts.v1.md): master prompt + “extra mean” strict compiler prompt + button variants + glue config.

## Hands-free Notion wiring

- [notion-hands-free-router-wiring.v1.md](notion-hands-free-router-wiring.v1.md): one-button run container + database layout + optional Make/Zapier hardening.

Operator note: The canonical pinned-mode Make wiring (Module 0→90) lives only in `notion-hands-free-router-wiring.v1.md` under “Canonical Make wiring: pinned-mode full run (Module 0 → 90)”. Any other sequence is non-binding.

## Operator rules / guarantees / hands-free

**Policy (non-negotiable):** No `TEMPLATES.json` + `SELF_CHECK.json` + `PROVENANCE.json` **and** no `PASS/FAIL` = **no run** (do not cite it, do not escalate from it).

Make scenario gate (hard fail):

- If `PASS/FAIL != PASS` → do not enqueue any downstream job types.
- If any of the 3 code blocks are missing → set `PASS/FAIL = FAIL_MISSING_BLOCKS` and stop.

Downstream automations MUST filter on `PASS/FAIL == PASS` only.

- **RUN_VALID gate:** Downstream automations MUST filter on `RUN_VALID == ✅` (computed: PASS + all 3 code blocks present).
- **LOCKED_AT latch:** Any page with `LOCKED_AT` set is **append-only**; Make MUST NOT overwrite Templates/SELF_CHECK/PROVENANCE on locked runs.
- **Tamper-evident digest:** `PROVENANCE.json` MUST include `run_digest_sha256` = SHA-256(canonical Templates + SELF_CHECK + PROVENANCE). If missing → FAIL.
- **Notion drift tripwire:** Compute `run_blocks_sha256` by reading back the three Notion code blocks and hashing the returned strings. If `run_blocks_sha256 != run_digest_sha256` → set `PASS/FAIL = FAIL`, set `FAIL_REASON = DIGEST_DRIFT_NOTION_EDITED_CONTENT`, and leave `LOCKED_AT` empty.

- FAIL_REASON (debug-only): On FAIL, Make MUST write the first failing self-check rule into FAIL_REASON (short), then hard-stop all downstream actions.

## System Settings

- [system-settings.v1.json](system-settings.v1.json): canonical Notion “System Settings” JSON example (copy/paste; don’t freestyle).
