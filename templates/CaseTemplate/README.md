# CaseTemplate — Canonical Case Architecture

This directory defines the **reusable `CaseTemplate` abstraction** extracted from CASE-666234B709.

Any new case can be instantiated by copying the `TEMPLATE.yaml` and associated schema files, then populating the placeholders. The architecture is case-type-agnostic and supports any litigation or recovery matter.

---

## Purpose

Provide a canonical, reproducible case structure so that:
- Every case uses the same ledger separation and confidence model.
- Evidence dependency gaps are always machine-readable.
- Packet versioning is always immutable.
- Authority tracking is always integrated.
- Readiness scoring is always derivable from the same source fields.

---

## Architecture

```
CaseTemplate/
├── README.md                              ← This file
├── TEMPLATE.yaml                          ← Instantiation manifest with all placeholders
└── schema/
    ├── evidence-registry.schema.yaml      ← Evidence registry schema
    ├── fact-ledger.schema.yaml            ← Fact ledger schema
    ├── legal-analysis-ledger.schema.yaml  ← Legal analysis ledger schema
    ├── authority-ledger.schema.yaml       ← Authority ledger schema
    ├── evidence-dependency-graph.schema.yaml ← Dependency graph schema
    └── case-packet.schema.yaml            ← Case packet schema
```

---

## Instantiation Instructions

1. Create a new directory: `cases/{CASE-ID}/`
2. Copy `TEMPLATE.yaml` → `cases/{CASE-ID}/TEMPLATE.yaml` as a reference
3. Create each ledger file by following the corresponding schema in `schema/`
4. Open the first packet: `cases/{CASE-ID}/packets/case_packet_v001.yaml`
5. Register in the case index (if one exists)

---

## Governance Constraints

- Evidence registry is **append-only**. Records are never overwritten.
- Fact ledger and legal analysis ledger are **strictly separated** — no legal conclusions in the fact ledger.
- Packets are **immutable**. Regeneration emits a new versioned file.
- All external actions remain **approval-gated** regardless of case contents.
- Confidence levels (`High` / `Moderate` / `Low`) are required on all fact and legal analysis entries.

---

## Reference Implementation

**CASE-666234B709** (Halsted / LVNV / Resurgent) is the canonical reference implementation.  
See `cases/CASE-666234B709/` for all populated examples.
