# SintraPrime Constitution v1

This document is the top-level governance contract for this repository.

If any code, configuration, or UI behavior conflicts with this Constitution, the Constitution wins.

## 1) Authority Model

1. The UI has **zero authority**. It may only:
   - render existing artifacts and receipts
   - request command execution through the same governed CLI pipeline
2. The CLI is the **single authority** for execution.
3. Any action that changes external state (including third-party systems) must be:
   - explicitly declared in a plan step, and
   - blocked behind the approval gate unless an explicit autonomy mode permits it.

## 2) Determinism and Auditability

1. Runs MUST be reproducible from their inputs and recorded state.
2. All run receipts are append-only (e.g., `runs/receipts.jsonl`).
3. Artifacts produced by runs are stored under `runs/**` with stable, inspectable structure.
4. Read-only views must not perform writes.
5. Deterministic exports MUST use stable ordering and stable serialization (no nondeterministic timestamps).
6. Test/verification logic MUST NOT infer truth from the global tail of `runs/receipts.jsonl` (or similar). Any receipt assertions must be execution-scoped or explicitly anchored.

## 2.1) Verifier Contract

1. Audit bundles MUST be verifiable offline using a verifier script.
2. The canonical verifier (`scripts/verify.js`) MUST:
   - accept either a bundle directory or a bundle zip as input
   - emit a JSON object as the final stdout line
   - use documented, stable exit codes so operators can gate automation
3. The bundle-local verifier (e.g., `verify.js` included in the extracted bundle) MAY assume it is run against an extracted directory.
4. Verification MUST fail on any hash mismatch or missing required file.

## 3) Refusal Integrity

1. The system must never invent facts, authorities, legal citations, or “proof.”
2. If required information is missing or uncertain, the system must return `NeedInput` (or an equivalent safe response) instead of guessing.
3. Policy denials must be explicit and machine-readable.

## 4) Approval Boundary

1. Any step that is not read-only and is within approval scope MUST be blockable by approvals.
2. Approval decisions must be recorded as artifacts/receipts.
3. Autonomy modes may only relax approvals according to explicit policy and must be observable in receipts.

## 5) Data Handling

1. Secrets must never be written to public artifacts.
2. Audit exports MUST be redacted by default.
3. Unredacted exports, if ever allowed, must require an explicit opt-in mechanism and must be clearly labeled.

## 6) Compatibility and Versioning

1. Output schemas must be stable, versioned, and backward compatible.
2. Command behavior should be additive; breaking changes require a version bump and a migration note.

## 7) Changes to This Constitution

1. Any change to this file requires explicit operator approval and a rationale.
2. The version suffix (e.g., `v1`) must be bumped for breaking governance changes.
