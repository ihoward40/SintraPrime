# EXHIBIT — USPS SERVICE EVIDENCE (APPEND‑ONLY RUNS)

Case ID: **PHASEX-0001**  
Tracking Number: **9414 7118 9956 2447 5315 14**

## Phase X integrity anchors

- Lock Commit: `ada828b2a4085ec084eb9900aff56d60042fa997`
- Frozen Commit: `6bc5743b847a26559c62396778a30b4251b010e3` (`tree_clean=true`)
- Phase X Root Hash (SHA-256): `34252399507137d80824a2d02ce83fe42a3318fb06b48d1546f04f202b083f7a`
- Bundle SHA-256: `8b94fb2456b4549ab8de76d0438e9853e889e65e7e7a441004c0fda3d35a1d2b`

---

## RUN‑0003 — Proof of mailing / receipt artifact (if recorded)

If you have a receipt scan or mailing receipt artifact already uploaded, record it as a separate append‑only run (RUN‑0003) and reference it here.

- Run ID: **RUN‑0003**
- Run Type: **USPS_PROOF_OF_MAILING_ARTIFACT**
- Artifact: **receipt scan / green card scan**
- Artifact URL: ______________________________
- Artifact SHA-256 (optional): ______________________________

---

## RUN‑0004 — USPS delivery confirmation

- Run ID: **RUN‑0004**
- Run Type: **USPS_TRACK_EVENT**
- Scenario: **MAIL_TRACK_CERTIFIED**
- Status: **DELIVERED**
- Date of Delivery (as shown by carrier): **June 30, 2022**
- Location (as shown by carrier): **NEWPORT BEACH, CA**
- Proof: **USPS Certified Mail Return Receipt (“green card”)**

Operational record files:
- Delivered run JSON: [governance/freeze/RUN-0004_DELIVERED.json](governance/freeze/RUN-0004_DELIVERED.json)
- Notion properties payload: [governance/freeze/RUN-0004_DELIVERED.notion.properties.json](governance/freeze/RUN-0004_DELIVERED.notion.properties.json)

Notes:
USPS proof shows date only; no time‑of‑day/timezone displayed. The record preserves that precision without implying a timestamp.
