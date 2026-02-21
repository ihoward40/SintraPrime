---
sidebar_position: 5
title: Shell Adapter
description: Governed command execution with sandboxing, allowlists, and audit trails.
---

# Shell Adapter

The Shell adapter provides governed access to local system command execution. It implements strict security controls including command allowlists, sandboxing, output capture, and full audit logging.

## Security Model

The Shell adapter follows a **whitelist-first** approach:

```json title="config/shell-policy.json"
{
  "allowlist": ["echo", "cat", "ls", "grep", "find", "npm", "node", "git"],
  "blocklist": ["rm -rf", "dd", "mkfs", "shutdown", "reboot"],
  "max_execution_time": 30000,
  "max_output_size": "10MB",
  "sandbox": true
}
```

## Operations

| Operation | Description |
|:---|:---|
| `exec` | Execute a single command |
| `script` | Execute a multi-line script |
| `capture` | Execute and capture output for evidence |

## Usage

```typescript
const result = await shellAdapter.execute({
  type: 'exec',
  params: {
    command: 'npm run report:weekly',
    cwd: '/app',
    timeout: 30000,
  },
  governance: { mode: 'SINGLE_RUN_APPROVED', receipt_required: true },
});
```

## Governance

- Only allowlisted commands can execute
- All command output is captured in receipts
- Execution time is limited and monitored
- SentinelGuard monitors all shell operations

:::danger Security Warning
Shell command execution is inherently risky. Always maintain a restrictive allowlist and review shell receipts regularly. The blocklist is a secondary defense — the allowlist is the primary control.
:::

## Next Steps

- [Browser Operator](./browser) — Web automation
- [Adapters Overview](./overview) — All available adapters
