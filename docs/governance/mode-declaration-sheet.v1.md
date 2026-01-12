# Mode Declaration Sheet (v1)

This document is a **run precondition**. A run is not authorized unless this sheet is completed and the run receipts/artifacts reference it.

## Purpose
- Declare the system’s operating **mode** (read-only vs execution) for a specific window.
- Declare which **limbs** (capability families) are active.
- Make the run’s authorization legible to a reviewer.

## Definitions
- **Mode**: A top-level posture that constrains what the system may do.
- **Limb**: A named capability family that can be activated/deactivated (e.g., Notion read, Notion write).

## Allowed modes (pick one)
- `READ_ONLY`: No external state changes. Reads may be allowed.
- `SINGLE_RUN_APPROVED`: One approved execution, scoped to an explicit plan; returns to `READ_ONLY` immediately after.
- `FROZEN`: Execution disabled (deny all), but logging/receipt generation may occur.

## Declaration
- Date (UTC): `<YYYY-MM-DD>`
- Window start (UTC): `<YYYY-MM-DDTHH:MM:SSZ>`
- Window end (UTC): `<YYYY-MM-DDTHH:MM:SSZ>`
- Operator (human): `<name>`
- Operator contact: `<email>`
- Workspace / repo: `<repo name>`
- Commit (git): `<commit sha>`
- Execution intent: `<short description>`

### Selected mode
- Mode: `<READ_ONLY | SINGLE_RUN_APPROVED | FROZEN>`

### Limb activation (explicit)
Mark each limb as **ACTIVE** or **INACTIVE** for this window.

- Notion read (`notion.read.*`): `<ACTIVE|INACTIVE>`
- Notion live read (`notion.live.read`): `<ACTIVE|INACTIVE>`
- Notion write (`notion.write.*`): `<ACTIVE|INACTIVE>`
- Notion live write (`notion.live.write`): `<ACTIVE|INACTIVE>`
- Webhook calls (generic outbound): `<ACTIVE|INACTIVE>`
- Local filesystem writes (artifacts/receipts): `<ACTIVE|INACTIVE>`

### Scope constraints (required)
- Target domains / domain_id (if any): `<value or NONE>`
- Max runs allowed in window: `<integer>`
- Data sources allowed: `<list>`
- Data sinks allowed: `<list>`

### Approval binding (required for SINGLE_RUN_APPROVED)
If mode is `SINGLE_RUN_APPROVED`, attach or reference:
- Planned command: `<exact CLI command or DSL>`
- Plan hash (if applicable): `<value>`
- Approval artifact path(s): `<runs/...>`
- Approver identity: `<name/title>`
- Approval timestamp (UTC): `<...>`

### API key limitation (operator declaration)
I declare that any API keys/tokens used with this system are:
- restricted to the minimum scopes required for the declared active limbs,
- not used for UI automation, credential bypass, or access escalation,
- used only via declared adapters/endpoints, and
- subject to receipt logging and post-run review.

Operator signature: `<name>`
Signature date (UTC): `<YYYY-MM-DD>`
