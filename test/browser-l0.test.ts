import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { chromium } from "playwright";

import { assertUrlSafeForL0 } from "../src/browser/l0/ssrfGuards.js";
import { writeArtifactRelative } from "../src/artifacts/writeBrowserEvidence.js";
import { browserL0DomExtract, browserL0Screenshot } from "../src/browserOperator/l0.js";
import { assertUrlAllowedByBrowserL0 } from "../src/browserOperator/l0.js";

async function canLaunchChromium(): Promise<boolean> {
  try {
    const b = await chromium.launch({ headless: true });
    await b.close();
    return true;
  } catch {
    return false;
  }
}

const CAN_RUN = await canLaunchChromium();

test("browser.l0 ssrfGuards: blocks localhost + http", () => {
  assert.throws(() => {
    assertUrlSafeForL0("http://localhost/", { allowedSchemes: ["https:"], allowedHosts: ["example.com"] });
  });
  assert.throws(() => {
    assertUrlSafeForL0("https://localhost/", { allowedSchemes: ["https:"], allowedHosts: ["localhost"] });
  });
});

test("browser.l0 runtime: deny-by-default when BROWSER_L0_ALLOWED_HOSTS is empty", () => {
  const prior = process.env.BROWSER_L0_ALLOWED_HOSTS;
  try {
    process.env.BROWSER_L0_ALLOWED_HOSTS = "";
    assert.throws(
      () => {
        assertUrlAllowedByBrowserL0("https://example.com/");
      },
      (err: any) => {
        return err && typeof err === "object" && (err as any).code === "HOST_NOT_ALLOWED";
      }
    );
  } finally {
    if (prior === undefined) delete process.env.BROWSER_L0_ALLOWED_HOSTS;
    else process.env.BROWSER_L0_ALLOWED_HOSTS = prior;
  }
});

test("browser.l0 writeArtifactRelative: returns sha256 + bytes", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sintraprime-evidence-"));
  const prior = process.cwd();
  try {
    process.chdir(tmp);
    const ref = writeArtifactRelative("runs/browser-l0/x/y/hello.txt", Buffer.from("hello", "utf8"), "text/plain");
    assert.equal(ref.kind, "artifact");
    assert.ok(ref.sha256.length === 64);
    assert.ok(ref.bytes > 0);
    assert.ok(fs.existsSync(path.join(tmp, ref.path)));
  } finally {
    process.chdir(prior);
  }
});

test(
  "browser.l0: data URL dom_extract + screenshot write evidence + rollup",
  { skip: !CAN_RUN },
  async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sintraprime-browserl0-"));
    const priorCwd = process.cwd();
    try {
      process.chdir(tmp);

      const url = "data:text/html,<html><head><title>Hello</title></head><body>World</body></html>";
      const dom = await browserL0DomExtract({
        execution_id: "exec_test",
        step_id: "s1",
        url,
        timeoutMs: 30_000,
        maxChars: 10_000,
      });
      assert.equal(dom.ok, true);
      const dr: any = dom.responseJson;
      assert.equal(dr.title, "Hello");
      assert.ok(Array.isArray(dr.evidence) && dr.evidence.length >= 3);
      assert.ok(typeof dr.evidence_rollup_sha256 === "string" && dr.evidence_rollup_sha256.length === 64);

      const shot = await browserL0Screenshot({
        execution_id: "exec_test",
        step_id: "s2",
        url,
        timeoutMs: 30_000,
        fullPage: true,
      });
      assert.equal(shot.ok, true);
      const sr: any = shot.responseJson;
      assert.ok(Array.isArray(sr.evidence) && sr.evidence.length >= 2);
      assert.ok(typeof sr.evidence_rollup_sha256 === "string" && sr.evidence_rollup_sha256.length === 64);

      for (const r of [dr, sr]) {
        for (const a of r.evidence) {
          assert.ok(typeof a.path === "string" && a.path.startsWith("runs/browser-l0/"));
          assert.ok(typeof a.sha256 === "string" && a.sha256.length === 64);
          assert.ok(typeof a.mime === "string" && a.mime.length > 0);
          assert.ok(typeof a.bytes === "number" && a.bytes > 0);
          assert.ok(fs.existsSync(path.join(tmp, a.path)));
        }
      }
    } finally {
      process.chdir(priorCwd);
    }
  }
);

test(
  "browser.l0: screenshot enforces BROWSER_L0_MAX_SCREENSHOT_BYTES",
  { skip: !CAN_RUN },
  async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "sintraprime-browserl0-cap-"));
    const priorCwd = process.cwd();
    const priorCap = process.env.BROWSER_L0_MAX_SCREENSHOT_BYTES;
    try {
      process.chdir(tmp);
      process.env.BROWSER_L0_MAX_SCREENSHOT_BYTES = "1";
      const url = "data:text/html,<html><head><title>Hello</title></head><body>World</body></html>";
      await assert.rejects(async () => {
        await browserL0Screenshot({
          execution_id: "exec_test",
          step_id: "cap1",
          url,
          timeoutMs: 30_000,
          fullPage: true,
        });
      });
    } finally {
      if (priorCap === undefined) delete process.env.BROWSER_L0_MAX_SCREENSHOT_BYTES;
      else process.env.BROWSER_L0_MAX_SCREENSHOT_BYTES = priorCap;
      process.chdir(priorCwd);
    }
  }
);
