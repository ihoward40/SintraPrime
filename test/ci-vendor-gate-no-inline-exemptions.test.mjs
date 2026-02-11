import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const VENDOR_GATE = "scripts/ci/require-vendor-checklist-ref.mjs";

test("vendor gate: no inline schema exemption strings", () => {
  const body = fs.readFileSync(VENDOR_GATE, "utf8");

  // Contract: exemption list must live ONLY in vendor-gate-schema-matcher.mjs
  // (prevents drift back to ad-hoc inline path checks).
  const forbidden = ["schemas/_defs/", "schemas/common/", "schemas/meta/"];
  for (const needle of forbidden) {
    assert.ok(
      !body.includes(needle),
      `Anti-regression: ${VENDOR_GATE} must not mention ${needle} (use LIB_SCHEMA_DIR_PREFIXES in vendor-gate-schema-matcher.mjs)`
    );
  }

  // Sanity: ensure we still use the shared matcher helper.
  assert.match(body, /vendor-gate-schema-matcher\.mjs/, "Gate should import the matcher helper module");
});
