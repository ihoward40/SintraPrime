# USPS Phase VI — Runs Ledger Templates (Post‑Freeze, Append‑Only)

Status: **post‑freeze operational material**.

This file provides copy/paste templates for Runs Ledger events and a print‑ready excerpt page.
It does **not** modify Phase X scope. Runs Ledger rows are **append‑only**.

## Phase X anchors (do not change)

- Lock commit: `ada828b2a4085ec084eb9900aff56d60042fa997`
- Frozen source commit (in lock): `6bc5743b847a26559c62396778a30b4251b010e3` (`tree_clean=true`)
- Phase X root hash (SHA‑256): `34252399507137d80824a2d02ce83fe42a3318fb06b48d1546f04f202b083f7a`
- Bundle SHA‑256: `8b94fb2456b4549ab8de76d0438e9853e889e65e7e7a441004c0fda3d35a1d2b`

---

## RUN‑0002A — First scan (append‑only correction)

Use this **only** if you previously recorded a dry‑run/mock scan (e.g., RUN‑0002).
Never edit prior runs—append this row.

Replace:
- `occurred_utc`
- `event_location`
- `event` (match USPS text as closely as possible)

```json
{
  "run_id": "RUN-0002A",
  "run_type": "USPS_TRACK_EVENT_CORRECTION",
  "scenario_id": "MAIL_TRACK_CERTIFIED",
  "case_id": "PHASEX-0001",
  "status": "IN_TRANSIT",
  "occurred_utc": "REPLACE_WITH_REAL_USPS_SCAN_TIMESTAMP_UTC",

  "phaseX": {
    "lock_commit_sha": "ada828b2a4085ec084eb9900aff56d60042fa997",
    "phaseX_root_hash_sha256": "34252399507137d80824a2d02ce83fe42a3318fb06b48d1546f04f202b083f7a",
    "bundle_sha256": "8b94fb2456b4549ab8de76d0438e9853e889e65e7e7a441004c0fda3d35a1d2b"
  },

  "tracking": {
    "tracking_number": "REPLACE_WITH_TRACKING_NUMBER",
    "event": "REPLACE_WITH_USPS_EVENT_TEXT",
    "event_location": "REPLACE_WITH_CITY_STATE",
    "carrier_status": "In Transit",
    "source": "USPS live tracking"
  },

  "guards": {
    "append_only": true,
    "slack_state_change_only": true,
    "dedupe_key": "REPLACE_WITH_TRACKING+STATE+TIMESTAMP"
  },

  "notes": "Append-only correction providing real scan timestamp for a prior dry-run. Prior run preserved for audit transparency."
}
```

---

## RUN‑0004 — Delivered (template)

Use when USPS shows Delivered. Replace:
- `occurred_utc`
- `event_location`
- `proof_of_delivery_url` (optional)

```json
{
  "run_id": "RUN-0004",
  "run_type": "USPS_TRACK_EVENT",
  "scenario_id": "MAIL_TRACK_CERTIFIED",
  "case_id": "PHASEX-0001",
  "status": "DELIVERED",
  "occurred_utc": "REPLACE_WITH_USPS_DELIVERY_TIMESTAMP_UTC",

  "phaseX": {
    "lock_commit_sha": "ada828b2a4085ec084eb9900aff56d60042fa997",
    "phaseX_root_hash_sha256": "34252399507137d80824a2d02ce83fe42a3318fb06b48d1546f04f202b083f7a",
    "bundle_sha256": "8b94fb2456b4549ab8de76d0438e9853e889e65e7e7a441004c0fda3d35a1d2b"
  },

  "tracking": {
    "tracking_number": "REPLACE_WITH_TRACKING_NUMBER",
    "event": "Delivered",
    "event_location": "REPLACE_WITH_CITY_STATE",
    "carrier_status": "Delivered",
    "proof_of_delivery_url": "OPTIONAL_POD_URL"
  },

  "guards": {
    "append_only": true,
    "slack_state_change_only": true,
    "dedupe_key": "REPLACE_WITH_TRACKING+DELIVERED"
  },

  "notes": "Final delivery confirmation. Closes USPS service chain for this mailing."
}
```

---

## Exhibit page — USPS Runs Ledger excerpt (print‑ready)

Suggested filename when exporting/printing: `Exhibit_USPS_Runs_Excerpt_RUN-0002A_RUN-0003.md`

Replace the bracketed values.

```text
EXHIBIT — USPS SERVICE EVIDENCE (APPEND-ONLY RUNS)

Case ID: [PHASEX-0001]
Tracking Number: [70123450000012345678]

PHASE X INTEGRITY ANCHORS
- Lock Commit: ada828b2a4085ec084eb9900aff56d60042fa997
- Frozen Commit: 6bc5743b847a26559c62396778a30b4251b010e3 (tree_clean = true)
- Phase X Root Hash (SHA-256): 34252399507137d80824a2d02ce83fe42a3318fb06b48d1546f04f202b083f7a
- Bundle SHA-256: 8b94fb2456b4549ab8de76d0438e9853e889e65e7e7a441004c0fda3d35a1d2b

----------------------------------------------------------------
RUN-0002A — USPS TRACK EVENT (REAL SCAN; APPEND-ONLY CORRECTION)
----------------------------------------------------------------
Run Type: USPS_TRACK_EVENT_CORRECTION
Scenario: MAIL_TRACK_CERTIFIED
Status: IN TRANSIT
Occurred (UTC): [YYYY-MM-DDTHH:MM:SSZ]
Event: [USPS event text]
Location: [City, ST]
Source: USPS live tracking

Note: This run appends a real scan timestamp to correct a prior mocked
 dry-run. The prior run remains preserved for audit transparency.

----------------------------------------------------------------
RUN-0003 — USPS PROOF OF MAILING (ARTIFACT ATTACHMENT)
----------------------------------------------------------------
Run Type: USPS_PROOF_OF_MAILING_ARTIFACT
Status: ARTIFACT_ATTACHED
Occurred (UTC): [YYYY-MM-DDTHH:MM:SSZ]

Artifact:
- Type: USPS receipt scan
- Filename: [filename]
- URL: [https://...]
- SHA-256: [sha256 if available]

Note: Artifact is referenced by URL and hash; the underlying file is not
 modified by this record.

----------------------------------------------------------------
END OF EXCERPT
----------------------------------------------------------------
```
