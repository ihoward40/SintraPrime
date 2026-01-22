export const RUNBOOKS = {
  _meta: { version: "2026.01.18" },

  DEFAULT: { url: "README.md", cmd: "" },

  WORKER_STALE: { url: "runbooks/worker-stale.md", cmd: "npm --prefix socialos/worker run dev" },
  SCHEMA_FAIL: { url: "runbooks/schemas-fail.md", cmd: "npm --prefix socialos/api run lint:schemas" },
  RECEIPT_DRIFT: { url: "runbooks/receipt-drift.md", cmd: "npm --prefix socialos/api run health:receipts" }
};
