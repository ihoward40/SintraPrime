# Tier-6.0 Notion Read Adapter — Reference & Invariants

## Purpose
Tier-6.0 introduces live-account connectivity in a way that is provably safe:
observe first, never mutate. This tier exists to validate connectivity, routing,
policy enforcement, and audit artifacts without any possibility of side effects.

## Non-Negotiable Invariants (MUST HOLD)
### 1) Read-Only by Policy, Not Convention
All Notion adapter steps are treated as potentially dangerous by default.
Policy must deny any Notion step that violates:
- action prefix: only `notion.read.*`
- method: only `GET` or `HEAD`
- explicit flag: `read_only: true`

Violations are **PolicyDenied** (exit code 3), not ApprovalRequired.

### 2) Mock-First Development
All Notion behaviors must be implementable and verifiable against the local mock server.
No tier-6.0 work depends on external network access or live credentials.

### 3) Deterministic Artifacts for Every Live-Shaped Read
Every successful Notion read produces a deterministic work product:
`runs/notion/<execution_id>.<step_id>.json`

Artifact contents must include:
- execution_id, threadId
- adapter/action/step_id
- timestamps
- stable response keys (e.g., `id`, `properties`)
- full response payload (or explicitly documented redactions)

Artifact write failures fail the run (auditability is required).

### 4) Capability Routing is Verified
Plans should declare `required_capabilities` and the engine must validate they are
resolvable from `agents/registry.json`. Policy is stronger than capability.

### 5) “Two Vectors Only” Principle
Tier-6.0 is validated with two smoke vectors:
- one happy-path Notion read
- one denial proving writes cannot slip through

Redundancy is avoided until divergence demands extra vectors.

## Implementation Summary (Tier-6.0)
- capabilities: `notion.read.database`, `notion.read.page`
- mock endpoints: `GET /notion/database/:id`, `GET /notion/page/:id`
- planner recognition: `/notion db <id>`, `/notion page <id>`
- policy denies: non-read actions, non-GET/HEAD, missing read_only
- artifacts: `runs/notion/<execution_id>.<step_id>.json`
- vectors: `notion-read-database-mock`, `notion-write-denied`

## What Tier-6.0 Explicitly Does NOT Do
- No live credentials
- No real Notion API calls
- No writes of any kind
- No approval-gated writes (that is Tier-6.1+)
