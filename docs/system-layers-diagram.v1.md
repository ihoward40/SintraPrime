# System Layers Diagram (Outsider-Readable)

Purpose: show separation of concerns at a glance.

```
┌───────────────────────────────────────────────┐
│               GOVERNANCE LAYER                │
│                                               │
│  • Mode semantics (v1.0, v1.1…)                │
│  • Limb activation rules                      │
│  • Validation authority & Silent Halt         │
│  • Transparency reports (aggregate only)      │
│                                               │
│  Immutable • Citeable • Explicitly versioned  │
└───────────────────────────────────────────────┘
                    ▲
                    │ (declares limits only)
                    │
┌───────────────────────────────────────────────┐
│               EXECUTION LAYER                 │
│                                               │
│  • Plan generation                            │
│  • Approved step execution                    │
│  • Deterministic apply logic                  │
│                                               │
│  No autonomy • No hidden authority            │
└───────────────────────────────────────────────┘
                    ▲
                    │ (produces artifacts)
                    │
┌───────────────────────────────────────────────┐
│             OBSERVATION LAYER                 │
│                                               │
│  • Watch Mode (opt-in only)                   │
│  • UI recordings / screenshots                │
│  • Phase-gated, run-scoped                    │
│                                               │
│  Observational • Non-authoritative            │
└───────────────────────────────────────────────┘
                    ▲
                    │ (hashes artifacts)
                    │
┌───────────────────────────────────────────────┐
│            VERIFICATION LAYER                 │
│                                               │
│  • Append-only hash chain                     │
│  • Offline verifier (verify-run.js)           │
│  • CI gate on exit code only                  │
│                                               │
│  Mathematical integrity • No discretion       │
└───────────────────────────────────────────────┘

Key Invariants:
• No layer can silently expand its authority
• Observation does not imply approval
• Verification proves integrity, not intent
• Governance changes require explicit versioned release
```
