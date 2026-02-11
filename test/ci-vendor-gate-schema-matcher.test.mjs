// test/ci-vendor-gate-schema-matcher.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  isGovernedActionSchemaPath,
  actionFromGovernedSchemaPath,
} from "../scripts/ci/vendor-gate-schema-matcher.mjs";

test("matches schemas/**/<action>.vN.json, exempts library folders", () => {
  // governed action schemas
  assert.equal(
    isGovernedActionSchemaPath("schemas/integrations/integrations.webhook.ingest.v1.json"),
    true
  );
  assert.equal(
    isGovernedActionSchemaPath("schemas/competitive/competitive.brief.v2.json"),
    true
  );

  // windows separators still match
  assert.equal(
    isGovernedActionSchemaPath("schemas\\meetings\\meetings.fireflies.ingest.v12.json"),
    true
  );

  // library folders are exempt (should NOT trigger governance)
  assert.equal(isGovernedActionSchemaPath("schemas/_defs/shared.v1.json"), false);
  assert.equal(isGovernedActionSchemaPath("schemas/common/shared.v9.json"), false);
  assert.equal(isGovernedActionSchemaPath("schemas/meta/manifest.v1.json"), false);

  // non-versioned schemas do not trigger
  assert.equal(isGovernedActionSchemaPath("schemas/integrations/foo.json"), false);

  // lookalikes do not trigger
  assert.equal(isGovernedActionSchemaPath("schemas/integrations/foo.v1.schema.json"), false);
});

test("derives action from schema filename (basename without .json)", () => {
  assert.equal(
    actionFromGovernedSchemaPath("schemas/integrations/integrations.webhook.ingest.v1.json"),
    "integrations.webhook.ingest.v1"
  );
  assert.equal(
    actionFromGovernedSchemaPath("schemas\\competitive\\competitive.brief.v2.json"),
    "competitive.brief.v2"
  );
});

test("throws on non-governed paths (fail-closed)", () => {
  assert.throws(
    () => actionFromGovernedSchemaPath("schemas/_defs/shared.v1.json"),
    /Not a governed action schema path/i
  );
  assert.throws(
    () => actionFromGovernedSchemaPath("schemas/integrations/foo.json"),
    /Not a governed action schema path/i
  );
});
