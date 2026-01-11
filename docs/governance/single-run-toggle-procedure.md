# Single-Run Automation Toggle Procedure

This document describes the only supported method for temporarily enabling
an automation within SintraPrime.

---

## Baseline State

By default:
- Automations are disabled
- Network access is disabled
- Agent operates in read-only mode

No automation can execute in this state.

---

## Authorization Mechanism

A single automation may be enabled by creating a temporary authorization file.

Characteristics:

- Human-created
- Single automation name
- Single execution only
- Explicit expiration
- No network enablement

---

## Procedure

1. Create a temporary authorization file in the agent state directory.
2. Manually invoke the automation.
3. Allow the agent to validate the authorization.
4. Observe execution.
5. System automatically reverts to baseline state.

---

## Reversion

After execution:
- The authorization file is deleted
- The execution is recorded in the ledger
- Automations return to disabled state

No manual cleanup is required.

---

## Prohibited Patterns

The following are explicitly unsupported:

- Scheduled automations
- Background execution
- Reusable authorization
- Network-enabled execution
- Batch or looping behavior

---

## Rationale

This procedure ensures that authority is momentary, observable, and attributable.
Automation exists only within the window it is consciously invoked.
