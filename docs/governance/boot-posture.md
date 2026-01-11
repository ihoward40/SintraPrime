# SintraPrime Boot Posture (Windows)

## Summary

When the host machine boots, SintraPrime runs in a hardened, read-only posture.
In this state, the system is intentionally incapable of autonomous action.

This posture is the default and persistent state.

---

## Boot Configuration

At system startup, the SintraPrime agent runs with the following constraints:

- Read-only mode enabled
- Network access disabled
- Automations disabled
- Append-only ledger enabled

No configuration at boot allows the system to transmit data, modify evidence, or execute tasks.

---

## Capabilities at Boot

The agent MAY:

- Observe filesystem state
- Verify hashes and manifests
- Read ledger entries
- Append non-destructive log or status entries

The agent MAY NOT:

- Execute automations
- Schedule tasks
- Send network traffic
- Modify or overwrite evidence
- Escalate its own permissions

---

## Persistence vs Authority

The agent is persistent (runs at boot), but not authoritative.

Persistence without authority is a deliberate design choice to ensure:
- Audit visibility without action
- State awareness without mutation
- Verifiability without autonomy

---

## Exit From Boot Posture

Exiting this posture requires:
- A human-initiated action
- A temporary, scoped authorization artifact
- Explicit execution
- Automatic reversion to boot posture

There is no background or scheduled transition out of this mode.

---

## Design Intent

This posture exists to ensure that SintraPrime is legible to auditors, courts,
and operators as a passive verifier unless explicitly and momentarily empowered.
