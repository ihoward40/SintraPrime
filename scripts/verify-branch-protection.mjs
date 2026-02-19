#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function fail(msg) {
  process.stderr.write(`verify-branch-protection: ${msg}\n`);
  process.exit(1);
}

function warn(msg) {
  process.stderr.write(`verify-branch-protection: warning: ${msg}\n`);
}

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    fail(`Invalid JSON: ${p}`);
  }
}

function uniqSorted(list) {
  return Array.from(new Set(list)).slice().sort();
}

function diff(a, b) {
  const bs = new Set(b);
  return a.filter((x) => !bs.has(x));
}

function parseArgs(argv) {
  const out = {
    repo: process.env.GITHUB_REPOSITORY || "",
    branch: "",
    expected: "receipts/required-contexts.master.json",
    token: process.env.BRANCH_PROTECTION_TOKEN || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "",
    allowMissingToken: false,
    apiBase: process.env.GITHUB_API_URL || "https://api.github.com",
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--repo") out.repo = argv[++i] || "";
    else if (a === "--branch") out.branch = argv[++i] || "";
    else if (a === "--expected") out.expected = argv[++i] || out.expected;
    else if (a === "--token") out.token = argv[++i] || "";
    else if (a === "--allow-missing-token") out.allowMissingToken = true;
    else if (a === "--api") out.apiBase = argv[++i] || out.apiBase;
    else fail(`Unknown arg: ${a}`);
  }

  return out;
}

function printHelp() {
  process.stdout.write(`Usage: node scripts/verify-branch-protection.mjs [options]\n\n`);
  process.stdout.write(`Compares GitHub branch protection required contexts vs a pinned file.\n\n`);
  process.stdout.write(`Options:\n`);
  process.stdout.write(`  --repo <owner/repo>        default: $GITHUB_REPOSITORY\n`);
  process.stdout.write(`  --branch <name>            default: from pinned file (or master)\n`);
  process.stdout.write(`  --expected <path>           default: receipts/required-contexts.master.json\n`);
  process.stdout.write(`  --token <token>             default: $BRANCH_PROTECTION_TOKEN || $GITHUB_TOKEN || $GH_TOKEN\n`);
  process.stdout.write(`  --allow-missing-token       exit 0 (warning) when token missing\n`);
  process.stdout.write(`  --api <baseUrl>             default: $GITHUB_API_URL or https://api.github.com\n`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  const repoRoot = process.cwd();
  const expectedPath = path.resolve(repoRoot, args.expected);
  if (!fs.existsSync(expectedPath)) {
    fail(`Missing expected file: ${path.relative(repoRoot, expectedPath)}`);
  }

  const expected = readJson(expectedPath);
  const expectedBranch = expected.branch || "master";
  const branch = args.branch || expectedBranch;
  const expectedContexts = uniqSorted(expected.required_contexts || []);
  const expectedStrict = Boolean(expected.strict);

  if (!args.repo) {
    fail("Missing --repo (or set GITHUB_REPOSITORY)");
  }

  if (!args.token) {
    const msg = "No token available to read branch protection (need Administration: Read)";
    if (args.allowMissingToken) {
      warn(msg);
      process.exit(0);
    }
    fail(msg);
  }

  const url = `${args.apiBase.replace(/\/$/, "")}/repos/${args.repo}/branches/${branch}/protection/required_status_checks`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${args.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "verify-branch-protection",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    fail(`GitHub API ${res.status} reading required_status_checks (${url})${body ? `\n${body}` : ""}`);
  }

  const data = await res.json();
  const actualStrict = Boolean(data.strict);
  const actualContexts = uniqSorted(data.contexts || []);

  const missing = diff(expectedContexts, actualContexts);
  const extra = diff(actualContexts, expectedContexts);

  if (expectedStrict !== actualStrict) {
    process.stderr.write(`strict mismatch: expected=${expectedStrict} actual=${actualStrict}\n`);
    process.exit(1);
  }

  if (missing.length || extra.length) {
    process.stderr.write(`branch protection drift detected for ${args.repo}@${branch}\n`);
    if (missing.length) process.stderr.write(`missing: ${missing.join(", ")}\n`);
    if (extra.length) process.stderr.write(`extra: ${extra.join(", ")}\n`);
    process.exit(1);
  }

  process.stdout.write(`OK: required contexts match pinned file (${path.relative(repoRoot, expectedPath)})\n`);
}

main().catch((e) => fail(e?.stack || String(e)));
