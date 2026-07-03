# Evidence-First Litigation Workflow

**Status:** Active — Reference Implementation  
**Governance:** External actions remain approval-gated. Documentation freeze respected.  
**Reference Case:** CASE-666234B709 (Halsted / LVNV / Resurgent)  
**Canonical vocabulary:** preserved from existing SintraPrime governance framework  
**Track A:** unaffected

---

## Purpose

This directory defines the evidence-first litigation workflow used by SintraPrime's Recovery Case Board. All documents here are governance/process artifacts only — they do not constitute legal advice and do not predict litigation outcomes.

---

## Artifact Index

| Artifact | Description |
|----------|-------------|
| [evidence-first-workflow.v1.md](./evidence-first-workflow.v1.md) | Master evidence-first workflow, intake steps, packet generation |
| [litigation-readiness-metrics.v1.md](./litigation-readiness-metrics.v1.md) | Split readiness metrics: Repository Completeness + Evidentiary Strength |
| [claim-ledger-model.v1.md](./claim-ledger-model.v1.md) | Facts vs claims mapping with support status |
| [evidence-request-register.v1.md](./evidence-request-register.v1.md) | Outstanding evidence request tracking |
| [document-versioning-policy.v1.md](./document-versioning-policy.v1.md) | No-overwrite drafted-document version preservation |
| [CASE-666234B709/README.md](./CASE-666234B709/README.md) | Reference implementation — Halsted / LVNV / Resurgent |

## Schema Index

| Schema | Description |
|--------|-------------|
| [Evidence_Item.schema.json](../../notion/schemas/Evidence_Item.schema.json) | Extended evidence provenance/metadata |
| [Claim_Ledger.schema.json](../../notion/schemas/Claim_Ledger.schema.json) | Claim ledger with support status |
| [Evidence_Request.schema.json](../../notion/schemas/Evidence_Request.schema.json) | Evidence request register |
| [Document_Version.schema.json](../../notion/schemas/Document_Version.schema.json) | Versioned drafted-document manifest |
| [Litigation_Readiness.schema.json](../../notion/schemas/Litigation_Readiness.schema.json) | Repository Completeness + Evidentiary Strength |

---

## Governance Constraints

- All external actions (send, file, submit, serve, mail, contact) require explicit human approval before execution.
- Documentation freeze is enforced: no scope expansion beyond what is defined here.
- Canonical governance vocabulary is preserved and referenced from existing SintraPrime governance artifacts.
- Track A constitutional critical path (CONST-002 → CONST-003 → CONST-004 → Cross Validation → Tier 1 Ratification) is unaffected by this workflow.

---

## Rollout

CASE-666234B709 is designated as the **reference implementation** for this workflow. Once validated, this workflow is to be applied to subsequent cases in priority order.

See [CASE-666234B709/README.md](./CASE-666234B709/README.md) for implementation status.
