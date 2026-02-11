# Vendor Adapter Generator Checklist (SintraPrime)

Goal: ship vendor adapters like a factory line:
- consistent action names + capabilities
- deterministic schemas
- policy is the spine (ALLOW / DENY / APPROVAL_REQUIRED)
- tests pin decision + code strings (no “adapter drift”)

This checklist is REQUIRED for any PR that adds new `schemas/**/*.v1*.json` actions.

---

## A) Naming + Tiering (non-negotiable)

### Capability name (agents/registry.json)
Format: `domain:vendor` (colon)
Examples:
- `integrations:webhook`
- `meetings:fireflies`
- `research:perplexity`
- `dev:serena`

### Action name (ExecutionPlan step.action)
Format: `domain.vendor.verb.v1` (dot + version)
Examples:
- `integrations.webhook.ingest.v1`
- `meetings.fireflies.ingest.v1`
- `research.perplexity.fetch.v1`

### Tier definitions (policy posture)
- **Tier 1 (Ingest/Capture, read-only):** ALLOW, no approvals, no outbound calls, artifacts-only outputs
- **Tier 2 (Propose-only):** `skills.learn.v1` only (write-only artifacts; no apply)
- **Tier 3 (Side effects / External calls):** APPROVAL_REQUIRED by default (budgeted), hard DENY lines stay DENY

---

## B) Files to add/change (per vendor)

### 1) Capability grant
File: `agents/registry.json`
- Add the capability string to the intended agents
- Default-safe: Tier 3 caps granted to nobody (or operator-only)

### 2) JSON Schema (required)
Location: `schemas/`
File name: `schemas/<domain>/<domain>.<vendor>.<verb>.v1.json`
Examples:
- `schemas/integrations/integrations.webhook.ingest.v1.json`
- `schemas/meetings/meetings.fireflies.ingest.v1.json`

Schema MUST:
- set `"additionalProperties": false` (unless there is a *very* explicit reason)
- include `"schema": "<action>.v1"` or equivalent version marker your repo uses
- include size/budget fields where relevant
- include explicit enum constraints for modes (e.g., screenshot mode)

### 3) Policy block (required)
File: `src/policy/checkPolicy.ts`
- Add an `if (action === "<action>") { ... }` block
- Use ONLY the repo helpers: `deny(...)` / `requireApproval(...)`
- Enforce:
  - capability present (else `CAPABILITY_MISSING`)
  - read_only + method constraints for Tier 1
  - deep-scan denial of outbound intent keys + secrets for ingest lanes
  - strict size limits / bounds
  - file path restrictions: under `runs/**`, no absolute, no `..`, no backslashes

### 4) Executor dispatch (required if it’s runnable)
File: `src/executor/executePlan.ts`
- Add action dispatch to call the adapter runner
- Tier 1 should write artifacts + hashes only
- Tier 3 should be behind approval gating already enforced by policy

### 5) Tests (required)
Location: `test/`
Add tests that pin:
- decision type (ALLOW / DENY / APPROVAL_REQUIRED)
- the exact deny/approval code strings

Minimum required tests per action:
1) **Missing capability => DENY CAPABILITY_MISSING**
2) **Happy path => ALLOW** (Tier 1) OR **APPROVAL_REQUIRED** (Tier 3)
3) **One hard guardrail => DENY** (pick the most important: secrets, outbound intent, budget, invalid mode, invalid path)

Decision coverage required in changed policy tests:
- Tier 1: **ALLOW** + **DENY**
- Mixed: **ALLOW** + **DENY** + **APPROVAL_REQUIRED**
- Approval-only Tier 3: **APPROVAL_REQUIRED** + **DENY** (and action added to `APPROVAL_ONLY_ACTIONS` in the CI script)

Recommended file naming:
- `test/policy-vendors.<vendor>.test.ts` (or extend existing vendor policy test file)

---

## C) Tier-specific guardrails

### Tier 1 (Ingest) MUST DENY:
- outbound intent keys anywhere in payload (even nested)
- secret-ish keys anywhere in payload
- any URL fetch fields unless the action is explicitly a fetcher
- payload > max bytes
- file paths not under `runs/**`

### Tier 3 (Side effects) MUST:
- return APPROVAL_REQUIRED always
- enforce budgets + caps
- keep hard DENY lines hard (e.g., path traversal, invalid ids, oversized text)

### Dev-only tools MUST:
- DENY unless `SINTRAPRIME_MODE=dev`
- never enabled in production runs

---

## D) PR Requirements (to prevent drift)

Any PR that adds `schemas/**/*.v1*.json` MUST:
- reference this doc in the PR body:
  - `docs/VENDOR_ADAPTER_GENERATOR_CHECKLIST.md`
- PR must include at least one changed `test/policy-*.test.ts` file whenever schemas are changed.
- For each changed schema action, at least one changed `test/policy-*.test.ts` must include the exact action string (schema filename without `.json`) and the literal deny/approval code string(s) used by that action's `checkPolicy.ts` block.

CI enforces this automatically.
