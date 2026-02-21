#!/usr/bin/env node

import process from "node:process";

const TYPE_PREFIX = {
  branch_protection_snapshot: "bp",
  pr_world_checks: "pr",
  required_contexts_pin: "rc",
};

function usage(exitCode = 0) {
  const msg = `Usage: node scripts/receipt-id.mjs --type <type> --sha <sha> [--branch <name> | --pr <number>] [--at <ISO-8601>] [--json]\n\n` +
    `Types:\n` +
    `  branch_protection_snapshot\n` +
    `  pr_world_checks\n` +
    `  required_contexts_pin\n\n` +
    `Examples:\n` +
    `  node scripts/receipt-id.mjs --type branch_protection_snapshot --branch master --sha b47d17875ae08926bbd8eaea9e456979fa27c454\n` +
    `  node scripts/receipt-id.mjs --type pr_world_checks --pr 84 --sha 23ff79f8edc20b0f4ee8d9fc401717e542fb1fb6\n` +
    `  node scripts/receipt-id.mjs --type required_contexts_pin --branch master --sha b47d17875ae08926bbd8eaea9e456979fa27c454\n`;

  (exitCode === 0 ? process.stdout : process.stderr).write(msg);
  process.exit(exitCode);
}

function getArg(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  const v = process.argv[i + 1];
  if (!v || v.startsWith("--")) return null;
  return v;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function toUtcCompact(dt) {
  const pad = (n) => String(n).padStart(2, "0");
  const y = dt.getUTCFullYear();
  const m = pad(dt.getUTCMonth() + 1);
  const d = pad(dt.getUTCDate());
  const hh = pad(dt.getUTCHours());
  const mm = pad(dt.getUTCMinutes());
  const ss = pad(dt.getUTCSeconds());
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

function sanitizeScope(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeSha(sha) {
  const s = String(sha || "").trim();
  const hex = s.match(/^[0-9a-fA-F]{7,40}$/)?.[0];
  return hex ? hex.toLowerCase() : null;
}

function main() {
  if (hasFlag("--help") || hasFlag("-h")) usage(0);

  const type = getArg("--type");
  const shaIn = getArg("--sha");
  const branch = getArg("--branch");
  const pr = getArg("--pr");
  const at = getArg("--at");
  const asJson = hasFlag("--json");

  if (!type || !TYPE_PREFIX[type]) {
    process.stderr.write(`ERROR: --type must be one of: ${Object.keys(TYPE_PREFIX).join(", ")}\n`);
    usage(2);
  }

  const sha = normalizeSha(shaIn);
  if (!sha) {
    process.stderr.write("ERROR: --sha must be a hex git SHA (7..40 chars)\n");
    usage(2);
  }

  const prefix = TYPE_PREFIX[type];
  let scope;

  if (type === "pr_world_checks") {
    const prNum = String(pr || "").replace(/^pr-?/i, "");
    if (!/^\d+$/.test(prNum)) {
      process.stderr.write("ERROR: --pr <number> is required for pr_world_checks\n");
      usage(2);
    }
    scope = prNum;
  } else {
    if (!branch) {
      process.stderr.write("ERROR: --branch <name> is required for this type\n");
      usage(2);
    }
    scope = sanitizeScope(branch);
    if (!scope) {
      process.stderr.write("ERROR: --branch produced empty scope after sanitization\n");
      usage(2);
    }
  }

  const dt = at ? new Date(at) : new Date();
  if (Number.isNaN(dt.getTime())) {
    process.stderr.write("ERROR: --at must be a valid ISO-8601 timestamp\n");
    usage(2);
  }

  const ts = toUtcCompact(dt);
  const sha8 = sha.slice(0, 8);
  const receipt_id = `${prefix}-${scope}-${ts}-${sha8}`;

  if (!asJson) {
    process.stdout.write(`${receipt_id}\n`);
    return;
  }

  const payload = {
    receipt_id,
    type,
    scope,
    captured_at: dt.toISOString(),
    sha,
    sha_short: sha8,
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main();
