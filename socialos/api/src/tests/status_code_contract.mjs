import { statusFromSnapshot } from "../services/health_snapshot.mjs";
import { pathToFileURL } from "node:url";

export function getEmittedStatusCodes() {
  const base = {
    ok: null,
    receipts: { ok: null, mismatch: 0 },
    schemas: { last_lint_ok: null },
    worker: { stale: null, best_time_last_run: "2026-01-01T00:00:00.000Z" }
  };

  const cases = [
    {
      name: "SCHEMA_FAIL",
      snapshot: { ...base, schemas: { last_lint_ok: false } }
    },
    {
      name: "RECEIPT_DRIFT",
      snapshot: { ...base, receipts: { ok: false, mismatch: 1 } }
    },
    {
      name: "WORKER_STALE",
      snapshot: { ...base, worker: { stale: true, best_time_last_run: "2026-01-01T00:00:00.000Z" } }
    }
  ];

  const out = new Set();
  for (const c of cases) {
    const status = statusFromSnapshot(c.snapshot);
    const got = status?.status_code ? String(status.status_code) : "";
    if (got !== c.name) {
      throw new Error(`status_code contract failed for ${c.name}: got ${got || "<empty>"}`);
    }
    if (got) out.add(got);
  }
  return Array.from(out).sort((a, b) => a.localeCompare(b));
}

export const EMITTED_STATUS_CODES = getEmittedStatusCodes();

// If invoked directly, print codes for debugging.
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  // eslint-disable-next-line no-console
  console.log(JSON.stringify({ ok: true, emitted_status_codes: EMITTED_STATUS_CODES }, null, 2));
}
