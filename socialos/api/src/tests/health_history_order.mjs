import assert from "node:assert/strict";

import { sortHealthHistoryItems } from "../controllers/health_root_controller.mjs";

function iso(sec) {
  return new Date(Date.UTC(2026, 0, 1, 0, 0, sec)).toISOString();
}

const input = [
  { at: iso(10), ok: true },
  { at: iso(30), ok: true },
  { at: iso(20), ok: false },
  { at: "not-a-date", ok: true },
  { ok: true }
];

const out = sortHealthHistoryItems(input);

// Newest-first by valid ISO timestamps.
assert.equal(out[0].at, iso(30));
assert.equal(out[1].at, iso(20));
assert.equal(out[2].at, iso(10));

// Invalid/missing timestamps are sorted last.
assert.equal(out[out.length - 1].at ?? null, null);

console.log("ok: health history ordering");
