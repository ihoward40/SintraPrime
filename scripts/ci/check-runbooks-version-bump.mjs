import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";

import { RUNBOOKS } from "../../socialos/ui/src/lib/runbooks.js";

const RUNBOOKS_PATH = "socialos/ui/src/lib/runbooks.js";

function isEnforced() {
  if (String(process.env.ENFORCE_RUNBOOK_VERSION_BUMP || "") === "1") return true;
  const ci = String(process.env.CI || "") === "1";
  const eventName = String(process.env.GITHUB_EVENT_NAME || "");
  return ci && (eventName === "pull_request" || eventName === "pull_request_target");
}

function sh(args, opts = {}) {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts });
}

function getEventBaseSha(event) {
  if (!event || typeof event !== "object") return null;

  // pull_request
  if (event.pull_request?.base?.sha) return String(event.pull_request.base.sha);

  // push
  if (event.before) return String(event.before);

  return null;
}

async function readGithubEvent() {
  const p = process.env.GITHUB_EVENT_PATH;
  if (!p) return null;
  try {
    const raw = await fs.readFile(p, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function versionFromText(text) {
  const m = String(text || "").match(/_meta\s*:\s*\{[^}]*version\s*:\s*"([^"]+)"/m);
  return m ? String(m[1]) : null;
}

function hasRunbooksChanged(baseSha) {
  try {
    const out = sh(["diff", "--name-only", `${baseSha}...HEAD`, "--", RUNBOOKS_PATH]).trim();
    return out.split(/\r?\n/).filter(Boolean).length > 0;
  } catch {
    // If git diff fails (e.g. shallow), treat as unknown (skip).
    return null;
  }
}

async function main() {
  const enforce = isEnforced();
  const currentVersion = RUNBOOKS?._meta?.version || null;

  const event = await readGithubEvent();
  const baseSha = process.env.RUNBOOKS_BASE_SHA || getEventBaseSha(event);

  if (!baseSha) {
    if (enforce) {
      // eslint-disable-next-line no-console
      console.error("runbooks version-bump check: failed (no base sha)");
      process.exit(1);
    } else {
      // eslint-disable-next-line no-console
      console.log("runbooks version-bump check: skipped (no base sha)");
      return;
    }
  }

  const changed = hasRunbooksChanged(baseSha);
  if (changed === false) {
    // eslint-disable-next-line no-console
    console.log("runbooks version-bump check: ok (runbooks unchanged)");
    return;
  }

  if (changed == null) {
    if (enforce) {
      // eslint-disable-next-line no-console
      console.error("runbooks version-bump check: failed (unable to diff)");
      process.exit(1);
    } else {
      // eslint-disable-next-line no-console
      console.log("runbooks version-bump check: skipped (unable to diff)");
      return;
    }
  }

  let baseText;
  try {
    baseText = sh(["show", `${baseSha}:${RUNBOOKS_PATH}`]);
  } catch {
    if (enforce) {
      // eslint-disable-next-line no-console
      console.error("runbooks version-bump check: failed (unable to read base file)");
      process.exit(1);
    } else {
      // eslint-disable-next-line no-console
      console.log("runbooks version-bump check: skipped (unable to read base file)");
      return;
    }
  }

  const baseVersion = versionFromText(baseText);

  if (!baseVersion || !currentVersion) {
    if (enforce) {
      // eslint-disable-next-line no-console
      console.error("runbooks version-bump check: failed (unable to read version)");
      process.exit(1);
    } else {
      // eslint-disable-next-line no-console
      console.log("runbooks version-bump check: skipped (unable to read version)");
      return;
    }
  }

  if (String(baseVersion) === String(currentVersion)) {
    // eslint-disable-next-line no-console
    console.error(`RUNBOOKS version not bumped: base=${baseVersion} current=${currentVersion}`);
    // eslint-disable-next-line no-console
    console.error("Fix: update RUNBOOKS._meta.version in socialos/ui/src/lib/runbooks.js");
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.log(`runbooks version-bump check ok (base=${baseVersion} current=${currentVersion})`);
}

await main();
