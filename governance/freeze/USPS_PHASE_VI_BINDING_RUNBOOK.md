# USPS Phase VI Binding Runbook (Post‑Freeze)

Date: 2026-01-10

This is a **runbook / plan** for binding USPS-certified mailing operations to the **already-authoritative Phase X lock**.

## Important constraint (why this is a runbook)

The Make.com templates, Notion schemas, and Slack governance artifacts are part of the **Phase X governed surface**.
They were frozen and attested by:

- Lock commit: `ada828b2a4085ec084eb9900aff56d60042fa997`
- Frozen source commit: `6bc5743b847a26559c62396778a30b4251b010e3`
- Root hash: `34252399507137d80824a2d02ce83fe42a3318fb06b48d1546f04f202b083f7a`

Therefore:

- Any change to Make templates under `make-gmail-slack-automation/templates/` or Notion schema artifacts under `notion/` would create scope drift and **fail Phase X verification**.
- We will not mutate those governed artifacts unless you explicitly choose to **supersede Phase X** with a new lifecycle version.

This runbook is written as **vNext instructions** so you can implement the binding later in a controlled way.

---

## Binding goal

When Phase VI USPS flows run:

1. Every Mailing record and Runs Ledger record can be traced to Phase X by recording:
   - `phaseX_lock_sha256` (SHA-256 of `governance/freeze/phaseX.lock.json`)
   - `phaseX_root_hash_sha256` (from the lock)
   - `phaseX_lock_commit` (the commit that introduced the lock)
   - `phaseX_frozen_source_commit` (the commit described by the lock)
2. Tracking updates are **state-change gated** (no periodic noise).
3. Runs Ledger stays **append-only**.
4. Slack receives **signal only** and remains loop-protected.

---

## vNext design (minimal, lint-compliant)

### A) Add Notion fields (schema change)

Add these columns:

**Mailings DB**
- `PhaseX Lock SHA256` (text)
- `PhaseX Root Hash SHA256` (text)

**Runs Ledger DB**
- `PhaseX Lock SHA256` (text)
- `PhaseX Root Hash SHA256` (text)
- `PhaseX Lock Commit` (text)
- `PhaseX Frozen Commit` (text)

Populate them once per row (constant values for this lifecycle).

### B) Make templates (scenario changes)

For all USPS-related templates (create tracking, label printing, track-certified):

- Introduce a constant variable in Make scenario settings:
  - `PHASEX_LOCK_SHA256`
  - `PHASEX_ROOT_HASH_SHA256`
  - `PHASEX_LOCK_COMMIT`
  - `PHASEX_FROZEN_COMMIT`

Then write those values into:
- Notion Mailing row updates (Mailings DB)
- Notion Runs Ledger row creation

### C) Keep state-change gating (already modeled)

The `MAIL_TRACK_CERTIFIED` template already uses a hash-delta gate:

- Compute `this_hash = sha256(...)`
- Filter: `prev_hash != this_hash`

That is the correct anti-noise behavior.

### D) Slack loop protection

Keep the existing metadata guidance (`slack_loop_protection`) and ensure the actual Make filter ignores bot/self where feasible.

---

## Implementation procedure (if/when you choose to supersede)

1) Create a new lifecycle version (recommended):
   - `Phase X v1.0.1` or `Phase X v2.0` depending on whether you consider this additive vs lifecycle-changing.

2) Apply schema changes in Notion.

3) Update Make templates to emit the Phase X references.

4) Re-run governance checks:
   - `npm run -s ci:make-guards`
   - `node scripts/phaseX-freeze.mjs` (new lock)
   - `node scripts/phaseX-freeze-verify.mjs`

5) Commit the new lock as the new authoritative marker.

---

## Current operational guidance (no code change)

If you need a present-day human procedure (without changing governed artifacts):

- When creating a certified mailing entry, paste the Phase X lock SHA-256 into an existing free-text field used for notes (if one exists in your Notion DB).
- When filing/printing, attach the Phase X affidavit and lock SHA sidecar alongside the mailing packet.

This is not as strong as machine-level binding, but it preserves the Phase X invariants.
