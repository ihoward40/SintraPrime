#!/usr/bin/env node
/**
 * bump-interface.mjs
 * Deterministically bumps the agent interface version and updates docs.
 *
 * Updates:
 *   - tools/agent/interface-version.mjs (AGENT_INTERFACE_VERSION)
 *   - docs/INTERFACES.md (Current version line)
 *   - CHANGELOG.md (optional, if present and --note provided)
 *
 * Output:
 *   - default: one-line JSON (success/failure) unless --help/--version
 *
 * Flags:
 *   --part patch|minor|major   (default: patch)
 *   --to X.Y.Z                (explicit target version)
 *   --note "text"             (optional changelog bullet)
 *   --dry-run                 (no writes; still reports changes)
 *   --json                    (force JSON one-liner; default on)
 *   --help, -h
 *   --version
 */

import fs from "node:fs";
import path from "node:path";
import { AGENT_INTERFACE } from "./interface-version.mjs";

const TOOL_VERSION = "0.1.0";

function usage() {
  return [
    `bump-interface ${TOOL_VERSION}`,
    "",
    "Usage:",
    "  node tools/agent/bump-interface.mjs [--part patch|minor|major] [--note \"...\"] [--dry-run]",
    "  node tools/agent/bump-interface.mjs --to X.Y.Z [--note \"...\"] [--dry-run]",
    "",
    "Flags:",
    "  --part patch|minor|major   Bump part (default: patch)",
    "  --to X.Y.Z                Set explicit version",
    "  --note \"text\"             Add a changelog bullet (if CHANGELOG.md exists)",
    "  --dry-run                 Do not write files",
    "  --json                    Emit one-line JSON (default behavior)",
    "  --help, -h                Show help and exit 0",
    "  --version                 Show tool version and exit 0",
  ].join("\n");
}

function emit(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

function fail(msg, extra = {}, code = 1) {
  emit({ ok: false, tool: "bump-interface", error: String(msg), ...extra });
  process.exit(code);
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

function cmp(a, b) {
  if (a.M !== b.M) return a.M - b.M;
  if (a.m !== b.m) return a.m - b.m;
  return a.p - b.p;
}

function bump(v, which) {
  const s = parseSemver(v);
  if (which === "major") return `${s.M + 1}.0.0`;
  if (which === "minor") return `${s.M}.${s.m + 1}.0`;
  if (which === "patch") return `${s.M}.${s.m}.${s.p + 1}`;
  fail("Unknown --part (use patch|minor|major)", { got: which });
}

function parseArgs(argv) {
  const out = {
    json: true,
    dryRun: false,
    part: "patch",
    to: null,
    note: null,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === "--help" || a === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    }

    if (a === "--version") {
      process.stdout.write(`bump-interface ${TOOL_VERSION}\n`);
      process.exit(0);
    }

    if (a === "--json") {
      out.json = true;
      continue;
    }

    if (a === "--dry-run") {
      out.dryRun = true;
      continue;
    }

    if (a === "--part" && argv[i + 1]) {
      out.part = String(argv[++i]).trim().toLowerCase();
      continue;
    }

    if (a === "--to" && argv[i + 1]) {
      out.to = String(argv[++i]).trim();
      continue;
    }

    if (a === "--note" && argv[i + 1]) {
      out.note = String(argv[++i]);
      continue;
    }

    fail("Unknown/invalid args", { usage: "node tools/agent/bump-interface.mjs --help", arg: a }, 2);
  }

  return out;
}

function updateInterfacesDoc(docSrc, next) {
  // Matches both:
  // - **Current version:** `1.0.0`
  // - Current version: `1.0.0`
  const re = /(Current version[^`\n]*`)([0-9]+\.[0-9]+\.[0-9]+)(`)/;
  if (!re.test(docSrc)) {
    fail("Could not find Current version line in docs/INTERFACES.md (expected backticked SemVer)", {
      hint: "Ensure INTERFACES.md includes a line like: - **Current version:** `1.0.0`",
    });
  }
  return docSrc.replace(re, `$1${next}$3`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const repoRoot = process.cwd();
  const interfaceFile = path.join(repoRoot, "tools", "agent", "interface-version.mjs");
  const interfacesDoc = path.join(repoRoot, "docs", "INTERFACES.md");
  const changelogFile = path.join(repoRoot, "CHANGELOG.md");

  if (!fs.existsSync(interfaceFile)) {
    fail("Missing interface-version.mjs", { expected: interfaceFile });
  }
  if (!fs.existsSync(interfacesDoc)) {
    fail("Missing docs/INTERFACES.md", { expected: interfacesDoc });
  }

  const interfaceSrc = fs.readFileSync(interfaceFile, "utf8");
  const m = interfaceSrc.match(/export\s+const\s+AGENT_INTERFACE_VERSION\s*=\s*"([^"]+)";/);
  if (!m) {
    fail("Could not find AGENT_INTERFACE_VERSION in interface-version.mjs");
  }

  const current = m[1];
  if (!isSemver(current)) {
    fail("Current interface version is not SemVer X.Y.Z", { current });
  }

  let next;
  if (args.to) {
    if (!isSemver(args.to)) fail("--to must be SemVer X.Y.Z", { to: args.to });
    next = args.to;
  } else {
    if (!['patch','minor','major'].includes(args.part)) {
      fail("--part must be patch|minor|major", { part: args.part });
    }
    next = bump(current, args.part);
  }

  const curS = parseSemver(current);
  const nextS = parseSemver(next);
  if (cmp(nextS, curS) <= 0) {
    fail("Refusing non-increasing version bump", { current, next });
  }

  const updatedInterfaceSrc = interfaceSrc.replace(
    /export\s+const\s+AGENT_INTERFACE_VERSION\s*=\s*"[^"]+";/,
    `export const AGENT_INTERFACE_VERSION = "${next}";`
  );

  const docSrc = fs.readFileSync(interfacesDoc, "utf8");
  const docUpdated = updateInterfacesDoc(docSrc, next);

  let changelogUpdated = null;
  let changelogTouched = false;
  if (args.note && fs.existsSync(changelogFile)) {
    const ch = fs.readFileSync(changelogFile, "utf8");

    if (/^##\s+Unreleased\s*$/m.test(ch)) {
      changelogUpdated = ch.replace(/^##\s+Unreleased\s*$/m, (hdr) => `${hdr}\n\n- ${args.note} (${AGENT_INTERFACE} → ${next})`);
    } else {
      changelogUpdated = `## Unreleased\n\n- ${args.note} (${AGENT_INTERFACE} → ${next})\n\n${ch}`;
    }

    changelogTouched = true;
  }

  const changes = [
    { file: "tools/agent/interface-version.mjs", from: current, to: next },
    { file: "docs/INTERFACES.md", from: current, to: next },
  ];

  if (args.note) {
    changes.push({
      file: "CHANGELOG.md",
      action: fs.existsSync(changelogFile) ? "append under Unreleased" : "skipped (CHANGELOG.md not found)",
    });
  }

  if (!args.dryRun) {
    fs.writeFileSync(interfaceFile, updatedInterfaceSrc, "utf8");
    fs.writeFileSync(interfacesDoc, docUpdated, "utf8");
    if (changelogTouched && changelogUpdated) {
      fs.writeFileSync(changelogFile, changelogUpdated, "utf8");
    }
  }

  emit({
    ok: true,
    tool: "bump-interface",
    interface: AGENT_INTERFACE,
    previous_version: current,
    next_version: next,
    dry_run: args.dryRun,
    changes,
    changelog_note: args.note || null,
    changelog_updated: changelogTouched,
  });
}

try {
  main();
} catch (e) {
  fail(e instanceof Error ? e.message : String(e));
}
