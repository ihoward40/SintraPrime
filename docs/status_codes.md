# SocialOS status codes

Generated from:
- `EMITTED_STATUS_CODES` (backend contract)
- `RUNBOOKS` (UI runbook map)

- Runbook map version: **2026.01.18**
- Generated at: **2026-01-18T09:37:33.200Z**

| status_code | runbook | command |
|---|---|---|
| `RECEIPT_DRIFT` | [runbooks/receipt-drift.md](runbooks/receipt-drift.md) | `npm --prefix socialos/api run health:receipts` |
| `SCHEMA_FAIL` | [runbooks/schemas-fail.md](runbooks/schemas-fail.md) | `npm --prefix socialos/api run lint:schemas` |
| `WORKER_STALE` | [runbooks/worker-stale.md](runbooks/worker-stale.md) | `npm --prefix socialos/worker run dev` |
