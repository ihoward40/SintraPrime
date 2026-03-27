PR sequence (PR-by-PR) for runtime context & retrieval features

PR 1 — Context budget + receipts (feature/runtime-context-budget-pr1)
- Add types for WorkerTask, WorkerResult, ContextMode, RetrievalJob
- Add src/runtime/context/:
  - types.ts (shared types)
  - budgetManager.ts (stub + env-driven thresholds)
  - contextModeSelector.ts (conservative selector using env thresholds)
  - summarizer.ts (interface + noop impl)
  - memoryPressure.ts (reads env thresholds, exposes check)
- Hook points:
  - src/cli/run-command.ts: call contextModeSelector before executing a run and annotate run metadata
  - src/policy/checkPolicy.ts: expose hook to enforce context budget decisions (no-op by default)
  - src/audit/receiptLedger.ts: add receipt fields (context_mode, memory_policy_threshold_mb, context_tokens_estimate)
- Unit tests for contextModeSelector and budgetManager
- Keep approval hook as an injectable interface (no approval wiring)
- Acceptance: selector returns one of ContextMode values, receipts include context_mode, all tests pass

PR 2 — Retrieval ingest queue
- Add src/runtime/retrieval/ingestQueue.ts, hotColdRouter.ts, indexRefiner.ts (stubs)
- Implement provisional indexing API (in-memory) and metrics hooks
- Tests for ingest queue enqueue/dequeue and provisional searchable flag

PR 3 — Worker registry + task board
- Add src/runtime/workers/orchestrator.ts, workerRunner.ts, workerRegistry.ts, taskBoard.ts
- Implement minimal worker registry JSON loader and task lifecycle (queued -> running -> completed)
- Emit worker receipts and persist tasks (in-memory / file-backed)
- Tests for task lifecycle transitions

PR 4 — Command center UI
- Add src/webapp/pages/command-center/* UI pages (stubs)
- Wire minimal API endpoints to surface tasks, approvals, receipts
- Tests: basic render smoke tests (if web infra exists)

PR 5 — Retrieval refinement + compression policy
- Implement background index refinement jobs, compressionPolicy.ts
- Add metrics for retrieval quality and time-to-refine
- Tests for refinement scheduling and compression policy decisions

PR 6 — Advanced concurrency + alerts
- Add concurrency controls, stuck-task detection, memory pressure alerts
- Integrate telemetry alerting (email/pager) hooks
- Tests for concurrency limits and alert triggering

Notes
- Each PR must be small, reversible, and have a brief developer note describing the intended behavior and rollback plan.
- Keep policy checks fail-closed where they prevent unsafe actions. For PR1 we will be conservative and only log/downgrade rather than block.

Environment variables introduced (PR1):
- SINTRA_CONTEXT_MAX_TOKENS (number)
- SINTRA_CONTEXT_SUMMARY_TRIGGER (number)
- SINTRA_CONTEXT_COMPRESS_TRIGGER (number)
- SINTRA_MEMORY_PRESSURE_MB (number)


Known PR1 limits
- No deep approval wiring yet: approvals remain an injectable hook. PR1 does not write to runs/approvals/<execution_id>.json or perform approval flows.
- Placeholder execution handle: runCommand returns a placeholder run handle; PR1 does not implement the execution engine.
- Conservative env-based selector only: selection is driven by SINTRA_* env vars and simple token estimates (1 token ≈ 4 chars). No advanced heuristics, compression models, or retrieval augmentation are implemented in PR1.
- Jest suite added but not executed in this environment: unit tests and jest.config.js are present. The smoke runner validates core logic; full Jest runs require installing dev dependencies in CI/local.
- Tests in src/**/__tests__ are scaffolding only and are NOT currently enforced by repo CI. They are included to aid review and future wiring; do not assume they run in CI until adapted to the repo test infra.

---- End of checklist
