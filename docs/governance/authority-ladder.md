# SintraPrime Authority Ladder

This document defines how authority flows within SintraPrime.

Authority is hierarchical and unidirectional.
It cannot be escalated by software.

---

## Authority Levels

```

Human Operator
│
▼
SintraPrime Agent (Boot Mode)
│
▼
Temporary Authorization Artifact
│
▼
Single-Run Automation

```

---

## Level Definitions

### 1. Human Operator
- Sole decision authority
- Initiates all actions
- Creates temporary authorization artifacts
- Accountable for execution

---

### 2. SintraPrime Agent (Boot Mode)
- Enforces policy
- Validates authorization
- Maintains ledger
- Denies actions by default

The agent does not initiate actions.

---

### 3. Temporary Authorization Artifact
- File-based, explicit, human-created
- Scoped to a single automation
- Scoped to a single execution
- Time-bounded

The artifact grants permission; it does not execute code.

---

### 4. Automation (Single Run)
- Executes once
- Produces explicit output
- Exits immediately
- Cannot persist or re-trigger

---

## Invariants

- Authority flows downward only
- No automated process may grant itself authority
- No persistent permission exists
- All execution leaves an append-only record

---

## Interpretation Guidance

If a process appears to act without a human trigger, it is misconfigured.
Such behavior is treated as invalid by design.
