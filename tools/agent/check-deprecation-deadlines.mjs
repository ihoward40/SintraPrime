#!/usr/bin/env node
/**
 * check-deprecation-deadlines.mjs
 *
 * Reads machine-parseable ```deprecation blocks from docs/INTERFACES.md and enforces
 * that crossed removal deadlines have a valid MAJOR bump plan.
 *
 * Output contract:
 *  - default: exactly one line of JSON to stdout (success/failure)
 *  - --help/-h and --version are human-readable and exit 0
 *
 * Flags:
 *  --fail-on-warn         Treat warnings as failures (exit 1)
 *  --now YYYY-MM-DD       Override "today" for deterministic runs
 *  --help, -h
 *  --version
 */

import fs from "node:fs";
import path from "node:path";
import { emitOneLineJSON } from "./emit-jsonl.mjs";
import { readAgentInterfaceVersions } from "./interface-doc-sync.mjs";
import { AGENT_INTERFACE, AGENT_INTERFACE_VERSION } from "./interface-version.mjs";

const TOOL = "check-deprecation-deadlines";
const TOOL_VERSION = "0.1.0";

function usage() {
  return [
    `${TOOL} ${TOOL_VERSION}`,
    "",
    "Usage:",
    "  node tools/agent/check-deprecation-deadlines.mjs [--fail-on-warn] [--now YYYY-MM-DD]",
    "",
    "Flags:",
    "  --fail-on-warn         Treat warnings as failures",
    "  --now YYYY-MM-DD       Override today's date (UTC) for deterministic runs",
    "  --help, -h             Show help and exit 0",
    "  --version              Show tool version and exit 0",
  ].join("\n");
}

function fail(error, extra = {}, code = 1) {
  emitOneLineJSON({ ok: false, tool: TOOL, error: String(error), ...extra });
  process.exit(code);
}

function parseArgs(argv) {
  const out = {
    failOnWarn: false,
    now: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === "--help" || a === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    }

    if (a === "--version") {
      process.stdout.write(`${TOOL} ${TOOL_VERSION}\n`);
      process.exit(0);
    }

    if (a === "--fail-on-warn") {
      out.failOnWarn = true;
      continue;
    }

    if (a === "--now" && argv[i + 1]) {
      out.now = String(argv[++i]).trim();
      continue;
    }

    fail("Unknown argument", { arg: a });
  }

  return out;
}

function isSemver(v) {
  return typeof v === "string" && /^[0-9]+\.[0-9]+\.[0-9]+$/.test(v);
}

function parseSemver(v) {
  const [M, m, p] = String(v)
    .split(".")
    .map((x) => Number(x));
  return { M, m, p };
}

function cmpSemver(a, b) {
  if (a.M !== b.M) return a.M - b.M;
  if (a.m !== b.m) return a.m - b.m;
  return a.p - b.p;
}

function isISODateYYYYMMDD(s) {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

function parseISODate(s) {
  if (!isISODateYYYYMMDD(s)) return null;
  const d = new Date(`${s}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  // Reject things like 2026-02-31 which Date will normalize.
  if (d.toISOString().slice(0, 10) !== s) return null;
  return d;
}

function daysBetweenUTC(startDate, endDate) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((endDate.getTime() - startDate.getTime()) / msPerDay);
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

function parseDeprecationBlocks(md) {
  const blocks = [];
  const re = /```deprecation\s*\n([\s\S]*?)\n```/g;
  let m;
  while ((m = re.exec(md))) {
    const raw = m[1];
    const lines = raw
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("#"));

    const obj = {};
    for (const line of lines) {
      const idx = line.indexOf(":");
      if (idx === -1) {
        obj.__parse_error = `Expected key: value line, got: ${line}`;
        continue;
      }
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim();
      if (!k) {
        obj.__parse_error = `Empty key in line: ${line}`;
        continue;
      }
      obj[k] = v;
    }

    blocks.push({
      raw,
      ...obj,
    });
  }
  return blocks;
}

function detectRunContext(repoRoot, cwd) {
  const rel = path.relative(repoRoot, cwd);
  const parts = rel.split(path.sep).filter(Boolean);
  for (let i = 0; i < parts.length - 1; i++) {
    if (parts[i] === "runs") {
      const runId = parts[i + 1];
      if (runId) {
        const runDir = path.join(repoRoot, ...parts.slice(0, i + 2));
        return { inRun: true, runId, runDir };
      }
    }
  }
  return { inRun: false, runId: null, runDir: null };
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeJSONFile(filePath, obj) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function toPosixRelPath(repoRoot, absPath) {
  const rel = path.relative(repoRoot, absPath);
  return rel.split(path.sep).join("/");
}

function findRepoRoot(startDir) {
  // Walk upward until we find a package.json AND the agent interface-version file.
  let cur = path.resolve(startDir);
  // Hard cap to avoid infinite loops.
  for (let i = 0; i < 30; i++) {
    const pkg = path.join(cur, "package.json");
    const iface = path.join(cur, "tools", "agent", "interface-version.mjs");
    if (fs.existsSync(pkg) && fs.existsSync(iface)) return cur;

    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return null;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const nowStr = args.now ?? todayUTC();
  const nowDate = parseISODate(nowStr);
  if (!nowDate) fail("--now must be YYYY-MM-DD", { now: args.now ?? null });

  const cwd = process.cwd();
  const repoRoot = findRepoRoot(cwd);
  if (!repoRoot) fail("Could not locate repo root", { cwd });

  const versions = readAgentInterfaceVersions(repoRoot);
  if (!versions.codeVersion) fail("Could not read code interface version", { codePath: versions.codePath });
  if (!versions.docsVersion) fail("Could not read docs interface version", { docsPath: versions.docsPath });
  if (!isSemver(versions.codeVersion)) fail("Code interface version is not SemVer X.Y.Z", { codeVersion: versions.codeVersion });

  const current = parseSemver(versions.codeVersion);

  const docsSrc = fs.readFileSync(versions.docsPath, "utf8");
  const blocks = parseDeprecationBlocks(docsSrc);

  const warnings = [];
  const errors = [];

  const rollupItems = [];
  const crossedKeys = new Set();
  const upcomingKeys = new Set();

  let nextRemoveBy = null; // { dateStr, dateObj, key }
  let nextRemoveIn = null; // { semverStr, semverObj, key }

  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const ref = { block_index: i, key: b.key ?? null };

    if (b.__parse_error) {
      errors.push({ ...ref, code: "PARSE_ERROR", message: b.__parse_error });
      rollupItems.push({
        key: b.key ?? null,
        deprecated_in: b.deprecated_in ?? null,
        remove_in: b.remove_in ?? null,
        remove_by: b.remove_by ?? null,
        plan: b.plan ?? null,
        status: "invalid",
      });
      continue;
    }

    if (!b.key) {
      errors.push({ ...ref, code: "MISSING_KEY", message: "deprecation block missing required 'key'" });
      rollupItems.push({
        key: null,
        deprecated_in: b.deprecated_in ?? null,
        remove_in: b.remove_in ?? null,
        remove_by: b.remove_by ?? null,
        plan: b.plan ?? null,
        status: "invalid",
      });
      continue;
    }

    if (b.deprecated_in && !isSemver(b.deprecated_in)) {
      errors.push({ ...ref, code: "BAD_DEPRECATED_IN", message: "deprecated_in must be SemVer X.Y.Z", deprecated_in: b.deprecated_in });
      rollupItems.push({
        key: b.key,
        deprecated_in: b.deprecated_in ?? null,
        remove_in: b.remove_in ?? null,
        remove_by: b.remove_by ?? null,
        plan: b.plan ?? null,
        status: "invalid",
      });
      continue;
    }

    const removeInStr = b.remove_in ?? null;
    const removeByStr = b.remove_by ?? null;

    let removeIn = null;
    if (removeInStr != null) {
      if (!isSemver(removeInStr)) {
        errors.push({ ...ref, code: "BAD_REMOVE_IN", message: "remove_in must be SemVer X.Y.Z", remove_in: removeInStr });
        rollupItems.push({
          key: b.key,
          deprecated_in: b.deprecated_in ?? null,
          remove_in: removeInStr,
          remove_by: b.remove_by ?? null,
          plan: b.plan ?? null,
          status: "invalid",
        });
        continue;
      }
      removeIn = parseSemver(removeInStr);
    }

    let removeBy = null;
    if (removeByStr != null) {
      removeBy = parseISODate(removeByStr);
      if (!removeBy) {
        errors.push({ ...ref, code: "BAD_REMOVE_BY", message: "remove_by must be YYYY-MM-DD", remove_by: removeByStr });
        rollupItems.push({
          key: b.key,
          deprecated_in: b.deprecated_in ?? null,
          remove_in: b.remove_in ?? null,
          remove_by: removeByStr,
          plan: b.plan ?? null,
          status: "invalid",
        });
        continue;
      }
    }

    if (!removeIn && !removeBy) {
      // Not enforceable yet; keep as a warning so the policy doesn't become decorative.
      warnings.push({ ...ref, code: "NO_DEADLINE", message: "deprecation block has no remove_in or remove_by; no deadline enforcement" });

      rollupItems.push({
        key: b.key,
        deprecated_in: b.deprecated_in ?? null,
        remove_in: null,
        remove_by: null,
        plan: b.plan ?? null,
        status: "no_deadline",
      });
      continue;
    }

    const plan = (b.plan ?? "").trim().toLowerCase();
    const planIssue = b.plan_issue ?? null;

    if (removeIn && removeIn.M <= current.M) {
      // Removals in the same (or past) major are breaking-in-place.
      errors.push({
        ...ref,
        code: "REMOVE_IN_NOT_FUTURE_MAJOR",
        message: "remove_in must be a future MAJOR relative to current interface_version",
        current: versions.codeVersion,
        remove_in: removeInStr,
      });

      rollupItems.push({
        key: b.key,
        deprecated_in: b.deprecated_in ?? null,
        remove_in: removeInStr,
        remove_by: removeByStr,
        plan: b.plan ?? null,
        status: "invalid",
      });
      continue;
    }

    const crossedByVersion = Boolean(removeIn && cmpSemver(current, removeIn) >= 0);
    const crossedByDate = Boolean(removeBy && nowDate.getTime() >= removeBy.getTime());
    const crossed = crossedByVersion || crossedByDate;

    if (removeBy) {
      if (!nextRemoveBy || removeBy.getTime() < nextRemoveBy.dateObj.getTime()) {
        nextRemoveBy = { dateStr: removeByStr, dateObj: removeBy, key: b.key };
      }
    }
    if (removeIn) {
      if (!nextRemoveIn || cmpSemver(removeIn, nextRemoveIn.semverObj) < 0) {
        nextRemoveIn = { semverStr: removeInStr, semverObj: removeIn, key: b.key };
      }
    }

    const itemBase = {
      key: b.key,
      deprecated_in: b.deprecated_in ?? null,
      remove_in: removeInStr,
      remove_by: removeByStr,
      plan: b.plan ?? null,
    };

    if (!crossed) {
      if (removeBy) upcomingKeys.add(b.key);
      if (removeIn) upcomingKeys.add(b.key);

      rollupItems.push({
        ...itemBase,
        status: "active",
        days_to_remove_by: removeBy ? daysBetweenUTC(nowDate, removeBy) : null,
      });
      continue;
    }

    crossedKeys.add(b.key);

    if (!crossed) continue;

    const hasValidMajorPlan =
      plan === "major" &&
      // If remove_in exists, enforce it's a future major; otherwise allow plan-by-date.
      (!removeIn || removeIn.M > current.M);

    if (hasValidMajorPlan) {
      warnings.push({
        ...ref,
        code: "CROSSED_WITH_MAJOR_PLAN",
        message: "Removal deadline crossed; major bump plan present (warning only by default)",
        crossed_by: crossedByVersion ? "version" : "date",
        remove_in: removeInStr,
        remove_by: removeByStr,
        plan_issue: planIssue,
      });

      rollupItems.push({
        ...itemBase,
        status: "crossed_warn",
        days_to_remove_by: removeBy ? daysBetweenUTC(nowDate, removeBy) : null,
      });
    } else {
      errors.push({
        ...ref,
        code: "CROSSED_NO_MAJOR_PLAN",
        message: "Removal deadline crossed with no valid major bump plan",
        crossed_by: crossedByVersion ? "version" : "date",
        remove_in: removeInStr,
        remove_by: removeByStr,
        plan: plan || null,
        plan_issue: planIssue,
      });

      rollupItems.push({
        ...itemBase,
        status: "crossed_error",
        days_to_remove_by: removeBy ? daysBetweenUTC(nowDate, removeBy) : null,
      });
    }
  }

  const warnCount = warnings.length;
  const errCount = errors.length;
  const ok = errCount === 0 && (!args.failOnWarn || warnCount === 0);

  const runCtx = detectRunContext(repoRoot, cwd);
  const rollupPrimaryAbs = runCtx.inRun
    ? path.join(runCtx.runDir, "04_audit", "checks", "deprecation_rollup.json")
    : path.join(repoRoot, "artifacts", "deprecation-rollup.json");

  // Stable CI/dashboard path: always write a copy here as well.
  const rollupArtifactsAbs = path.join(repoRoot, "artifacts", "deprecation-rollup.json");

  const rollup = {
    interface: AGENT_INTERFACE,
    interface_version: AGENT_INTERFACE_VERSION,
    generated_at_utc: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    now: nowStr,
    counts: {
      blocks: blocks.length,
      crossed: crossedKeys.size,
      upcoming: upcomingKeys.size,
      warnings: warnCount,
      errors: errCount,
    },
    items: rollupItems,
    next_deadline: nextRemoveBy
      ? { type: "remove_by", value: nextRemoveBy.dateStr, key: nextRemoveBy.key }
      : nextRemoveIn
        ? { type: "remove_in", value: nextRemoveIn.semverStr, key: nextRemoveIn.key }
        : null,
  };

  let rollupWritten = false;
  let rollupWriteError = null;
  let rollupArtifactsWritten = false;
  let rollupArtifactsError = null;

  try {
    writeJSONFile(rollupPrimaryAbs, rollup);
    rollupWritten = true;
  } catch (e) {
    rollupWriteError = String(e?.message ?? e);
  }

  try {
    // Avoid double-write if the primary is already the artifacts location.
    if (path.resolve(rollupArtifactsAbs) === path.resolve(rollupPrimaryAbs)) {
      rollupArtifactsWritten = rollupWritten;
      rollupArtifactsError = rollupWriteError;
    } else {
      writeJSONFile(rollupArtifactsAbs, rollup);
      rollupArtifactsWritten = true;
    }
  } catch (e) {
    rollupArtifactsError = String(e?.message ?? e);
  }

  emitOneLineJSON({
    ok,
    tool: TOOL,
    now: nowStr,
    fail_on_warn: args.failOnWarn,
    interface_version_current: versions.codeVersion,
    rollup_written: rollupWritten,
    rollup_path: toPosixRelPath(repoRoot, rollupPrimaryAbs),
    rollup_path_native: rollupPrimaryAbs,
    rollup_error: rollupWriteError,
    rollup_artifacts_written: rollupArtifactsWritten,
    rollup_artifacts_path: toPosixRelPath(repoRoot, rollupArtifactsAbs),
    rollup_artifacts_path_native: rollupArtifactsAbs,
    rollup_artifacts_error: rollupArtifactsError,
    counts: {
      deprecation_blocks: blocks.length,
      warnings: warnCount,
      errors: errCount,
    },
    deadlines: {
      next_remove_by: nextRemoveBy ? { value: nextRemoveBy.dateStr, key: nextRemoveBy.key } : null,
      next_remove_in: nextRemoveIn ? { value: nextRemoveIn.semverStr, key: nextRemoveIn.key } : null,
    },
    warnings,
    errors,
  });

  process.exit(ok ? 0 : 1);
}

try {
  main();
} catch (e) {
  fail("Unhandled error", { message: String(e?.message ?? e) });
}
