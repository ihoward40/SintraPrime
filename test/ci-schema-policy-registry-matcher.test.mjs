import test from "node:test";
import assert from "node:assert/strict";

import {
  EXEMPT_LIB_SCHEMA_DIR_PREFIXES,
  normalizeRepoPath,
  isGovernedActionSchemaPath,
  actionFromGovernedSchemaPath,
} from "../scripts/ci/schema-policy-registry-matcher.mjs";

test("schema-policy-registry matcher: exemptions are fixed", () => {
  assert.deepEqual(EXEMPT_LIB_SCHEMA_DIR_PREFIXES, ["schemas/_defs/", "schemas/common/", "schemas/meta/"]);
});

test("schema-policy-registry matcher: normalizes Windows paths", () => {
  assert.equal(
    normalizeRepoPath("schemas\\browser\\browser.l0.navigate.v1.json"),
    "schemas/browser/browser.l0.navigate.v1.json"
  );
});

test("schema-policy-registry matcher: governs schemas/**/<action>.vN.json", () => {
  assert.equal(isGovernedActionSchemaPath("schemas/browser/browser.l0.navigate.v1.json"), true);
  assert.equal(isGovernedActionSchemaPath("schemas/browser/browser.l0.navigate.v10.json"), true);
  assert.equal(isGovernedActionSchemaPath("schemas/docs/_not_governed.v1.json"), false);
  assert.equal(isGovernedActionSchemaPath("schemas/docs/foo.v.json"), false);
  assert.equal(isGovernedActionSchemaPath("schemas/docs/foo.v1.yaml"), false);
});

test("schema-policy-registry matcher: exempts library schema dirs", () => {
  assert.equal(isGovernedActionSchemaPath("schemas/_defs/thing.v1.json"), false);
  assert.equal(isGovernedActionSchemaPath("schemas/common/foo.v1.json"), false);
  assert.equal(isGovernedActionSchemaPath("schemas/meta/foo.v1.json"), false);
});

test("schema-policy-registry matcher: derives action from filename", () => {
  assert.equal(actionFromGovernedSchemaPath("schemas/browser/browser.l0.screenshot.v1.json"), "browser.l0.screenshot");
  assert.equal(actionFromGovernedSchemaPath("schemas/browser/foo_bar-1.v2.json"), "foo_bar-1");

  assert.throws(
    () => actionFromGovernedSchemaPath("schemas/_defs/browser.l0.screenshot.v1.json"),
    /Not a governed action schema path/
  );
});
