# Governed OS Spine (Repo-Native) — v1

This document maps the existing SintraPrime codebase “spine” (policy → approvals → execution → receipts/artifacts) to a Manus-class governed OS framing.

Goal: build *on what already exists* (no parallel architecture), and identify the smallest enforceable next steps.

## What exists today (authoritative entrypoints)

### Command entrypoint / orchestration
- **Primary CLI:** `npm run dev` → `tsx src/cli/run-command.ts`
- Responsibilities already present in the CLI layer:
  - Normalize/parse the incoming command.
  - Invoke planner/validator agents.
  - Run policy gating (deny vs. require approval vs. allow).
  - Capture prestates for approval-scoped writes (Notion live writes).
  - Persist run artifacts and export bundles.

Key file:
- `src/cli/run-command.ts`

### Policy
- **Policy engine:** `src/policy/checkPolicy.ts`
- Provides:
  - Budget caps (max steps, per-step timeout caps).
  - Autonomy mode restrictions.
  - A typed result surface: allow, deny (with code/reason), or require approval (with a preview).

Key functions/types:
- `checkPolicyWithMeta(...)`
- `checkPlanPolicy(...)`
- `PolicyResult`, `ApprovalRequired`, `PolicyDenied`

### Approvals (the “point of no return” gate)
- **Approval state persistence:** `src/approval/approvalState.ts`
- Storage location:
  - `runs/approvals/<execution_id>.json`

The CLI writes approval state when policy requires approval (including a batch form when multiple approvable steps exist).

Key types/ops:
- `ApprovalState`
- `writeApprovalState(...)`
- `readApprovalState(...)`

### Agent registry (capabilities)
- **Registry file:** `agents/registry.json`
- This is a simple mapping of agent `name`, `version`, and `capabilities`.

This already matches the “capability spine” concept: capabilities exist as first-class strings and are resolved to a provider.

### Skills governance (pinned deps + evidence)
- **Lock file:** `skills.lock.json` (referenced by scripts)
- **Existing scripts:**
  - `scripts/skills-status.mjs` (status view + warns if EXPERIMENTAL skills referenced outside `sandbox/`)
  - `scripts/skills-check-revoked.mjs` (hard gate: fails if revoked skill references are found)
  - `scripts/skills-revoke-one.mjs` (revocation + certificates + evidence logging)

These scripts are wired as npm scripts:
- `npm run skills:status`
- `npm run skills:check`
- `npm run skills:revoke -- --name ... --commit ... --reason ...`

Important observation:
- Skills checks are currently **repo-level governance** (scan/CI), not a runtime guard inside `src/**`. There are no imports/references to `skills.lock.json` in product code today.

### Receipts / audit trail
Two “receipt-like” primitives exist:
1) **Receipt ledger class** in `src/audit/receiptLedger.ts`
   - A local, append-only receipt store with optional hash chaining.
   - Not currently referenced by the CLI entrypoint.
2) **Run persistence + artifacts** in the CLI pipeline
   - `src/cli/run-command.ts` already persists execution state and writes multiple audit artifacts (including prestate and export bundles).

This implies the repo already has an operational audit trail, but the “ReceiptLedger” class is not the unified canonical ledger yet.

## Mapping to a Manus-class governed OS

This repo already implements the core “governed OS” loop:

1) **Intent intake** (a command)
2) **Plan generation** (planner agent)
3) **Policy evaluation** (deny / approve-required / allow)
4) **Approval persistence** (durable pause + deterministic resume)
5) **Execution** (executor)
6) **Artifacts/exports** (audit bundle)

The missing pieces (relative to a “skills registry + policy/approval spine + receipts” vision) are mostly **unification** and **enforcement surfaces**, not new architecture.

### What “Skills” mean in this repo (today)
- “Skills” are pinned, evidence-backed external dependencies represented in `skills.lock.json`.
- Enforcement is implemented via scripts that:
  - Warn on experimental usage outside `sandbox/`.
  - Fail hard if revoked references exist.

This is already aligned with the governed OS idea of revocation + supply-chain controls.

### What “Capabilities” mean in this repo (today)
- `agents/registry.json` is effectively a capability provider registry.
- `run-command.ts` loads registry and resolves capabilities before execution.

## Concrete v1 next steps (smallest safe changes)

### 1) Declare the canonical audit ledger
Pick one “source of truth” for audit events:
- Option A: declare run artifacts + exports as canonical (and treat `ReceiptLedger` as legacy / optional)
- Option B: integrate `ReceiptLedger` into the existing run persistence flow and make it canonical

Recommendation for v1: **Option A** (documentation + small glue later). It is the smallest change and avoids destabilizing the execution pipeline.

### 2) Add a policy-mode “Skill Gate” (optional, but enforceable)
If you want runtime enforcement (not just CI):
- Implement a small library function that reuses the logic of `scripts/skills-check-revoked.mjs` (patterns + scan) or a narrower runtime check.
- Call it from `checkPolicyWithMeta(...)` or at the start of `run-command.ts`.

Keep it minimal:
- Fail only on **revoked** (hard) references.
- Keep **experimental outside sandbox** as warning-only (match current script behavior) unless explicitly upgraded.

### 3) Surface the “approval-required” contract as a stable JSON schema
The approval file written under `runs/approvals/` is already a contract boundary.
- Add a schema (or zod) for `ApprovalState` and validate on read/write.
- This makes approvals court-safe and reduces drift.

### 4) Tighten the CI entrypoints required by AGENTS.md
Repo contract requires:
- `npm run -s ci:lint-md:templates`
- `npm run -s ci:validate-json:selected`

If these scripts exist as node entrypoints already, wire them into `package.json` so the checks are trivially repeatable.

## Non-goals (v1)
- No new UI.
- No new “engine” layer.
- No breaking changes to the existing `run-command` orchestration.

## Quick pointers (where to read)
- CLI + orchestration: `src/cli/run-command.ts`
- Policy: `src/policy/checkPolicy.ts`
- Approvals persistence: `src/approval/approvalState.ts`
- Agent capability registry: `agents/registry.json`
- Skills governance scripts: `scripts/skills-status.mjs`, `scripts/skills-check-revoked.mjs`, `scripts/skills-revoke-one.mjs`
- Receipt ledger (currently standalone): `src/audit/receiptLedger.ts`
