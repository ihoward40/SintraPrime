# How to Read the Mode Transparency Report (v1)

## What the report is
A reviewer-facing summary of how the system was operated during a fixed period, with emphasis on:
- whether execution was constrained to approved single-runs,
- whether write capabilities were activated only when authorized, and
- whether receipts/artifacts are sufficient to reconstruct what happened.

## Key terms
- **Run**: One invocation of the engine that produces a receipt.
- **Mode**: The top-level posture (e.g., `READ_ONLY`, `SINGLE_RUN_APPROVED`).
- **Limb**: A named capability family that may be activated/deactivated.
- **Evidence links**: Workspace-relative artifact paths (e.g., under `runs/`).

## What to verify quickly
- A Mode Declaration Sheet exists for each execution window that included writes.
- The Mode Transition Ledger has an entry for mode changes and limb changes.
- Receipts for write runs show approval gating and identify the steps executed.
- Any incidents include enough detail to reproduce/inspect the underlying artifacts.

## What the report does NOT do
- It does not substitute for reviewing the underlying receipts/artifacts.
- It does not expand permissions or authorize new execution.
