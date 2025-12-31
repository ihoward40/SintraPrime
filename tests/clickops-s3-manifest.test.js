import assert from "node:assert/strict";
import { test } from "node:test";

import {
  computeManifestS3Key,
  publishManifestToS3,
  resolvePublishManifestS3Target,
} from "../dist/clickops/publishManifestS3.js";

test("computeManifestS3Key is deterministic and derived from RUN_ID", () => {
  const run_id = "RUN_2025-12-31T23-59-59Z-abc123";

  const k1 = computeManifestS3Key({ run_id, prefix: "clickops" });
  const k2 = computeManifestS3Key({ run_id, prefix: "clickops" });

  assert.equal(k1, k2);
  assert.ok(k1.includes("RUN_2025-12-31T23-59-59Z-abc123"));
  assert.ok(k1.endsWith("/MANIFEST.json"));
});

test("resolvePublishManifestS3Target builds deterministic key + URLs", () => {
  const run_id = "RUN_2025-12-31T23-59-59Z-abc123";

  const t = resolvePublishManifestS3Target({
    publish_manifest_s3: "s3://my-bucket/some/prefix",
    env_bucket: null,
    env_prefix: null,
    run_id,
  });

  assert.ok(t);
  assert.equal(t.bucket, "my-bucket");
  assert.equal(t.prefix, "some/prefix");
  assert.equal(t.key, `some/prefix/${run_id}/MANIFEST.json`);
  assert.equal(t.s3_uri, `s3://my-bucket/${t.key}`);
  assert.ok(t.https_url.startsWith("https://my-bucket.s3.amazonaws.com/"));
});

test("publishManifestToS3 uses provided stub client (no network)", async () => {
  const run_id = "RUN_2025-12-31T23-59-59Z-abc123";
  const target = resolvePublishManifestS3Target({
    publish_manifest_s3: "s3://my-bucket/p",
    env_bucket: null,
    env_prefix: null,
    run_id,
  });
  assert.ok(target);

  /** @type {{ calls: any[] }} */
  const state = { calls: [] };

  const res = await publishManifestToS3({
    target,
    manifest_json: Buffer.from("{}\n", "utf8"),
    s3: {
      async putObject(params) {
        state.calls.push(params);
      },
    },
  });

  assert.deepEqual(res, { ok: true, https_url: target.https_url, s3_uri: target.s3_uri });
  assert.equal(state.calls.length, 1);
  assert.equal(state.calls[0].bucket, "my-bucket");
  assert.equal(state.calls[0].key, `p/${run_id}/MANIFEST.json`);
});
