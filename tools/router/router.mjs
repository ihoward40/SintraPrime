#!/usr/bin/env node
/*
  router.mjs

  Purpose:
    Route a freeform request text to a playbook + recommended governance.

  Contract:
    - Success: single-line JSON
    - Failure: single-line JSON
    - Only --help/-h and --version print human-readable output (exit 0)

  Notes:
    - This is intentionally deterministic and conservative.
    - Operator may override governance/playbook upstream.
*/

import fs from "node:fs";
import path from "node:path";

let OUTPUT_JSON = true;

function readToolVersion(repoRootAbs) {
  try {
    const pkgPath = path.join(repoRootAbs, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (pkg && typeof pkg.version === "string" && pkg.version.trim()) return pkg.version.trim();
  } catch {
    // ignore
  }
  return "0.0.0";
}

function helpText() {
  return (
    "Usage:\n" +
    "  node tools/router/router.mjs --text <request>\n" +
    "  node tools/router/router.mjs --text <request> [--governance G1|G2|G3] [--playbook <name>]\n" +
    "  node tools/router/router.mjs --help|-h\n" +
    "  node tools/router/router.mjs --version\n" +
    "\nNotes:\n" +
    "  - Outputs exactly one JSON line on success/failure (except --help/--version).\n"
  );
}

function printJsonLine(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

function die(msg, extra) {
  if (OUTPUT_JSON) {
    printJsonLine({ ok: false, error: String(msg), ...(extra && typeof extra === "object" ? extra : null) });
  } else {
    process.stderr.write(`Error: ${msg}\n`);
  }
  process.exit(1);
}

function parseArgs(argv) {
  const out = {
    text: null,
    governance: null,
    playbook: null,
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === "--help" || a === "-h") {
      out.help = true;
      continue;
    }
    if (a === "--version") {
      out.version = true;
      continue;
    }
    if (a === "--text" && argv[i + 1]) {
      out.text = String(argv[++i]);
      continue;
    }
    if (a === "--governance" && argv[i + 1]) {
      out.governance = String(argv[++i]).trim().toUpperCase();
      continue;
    }
    if (a === "--playbook" && argv[i + 1]) {
      out.playbook = String(argv[++i]).trim();
      continue;
    }

    die(helpText());
  }

  if (out.help) {
    OUTPUT_JSON = false;
    process.stdout.write(helpText());
    process.exit(0);
  }

  return out;
}

function choosePlaybook(text) {
  const t = String(text || "").trim();
  const lower = t.toLowerCase();

  if (/\bfoia\b|freedom of information/.test(lower)) {
    return { playbook: "FOIA_REQUEST", governance: "G2", reason: "keyword:foia" };
  }

  if (/certified\s+case\s+file|case\s+file\s+request/.test(lower)) {
    return { playbook: "CERTIFIED_CASEFILE_LETTER", governance: "G2", reason: "keyword:casefile" };
  }

  if (/affidavit|declaration|court|evidence|binder/.test(lower)) {
    return { playbook: "COURT_SAFE_PACKET", governance: "G2", reason: "keyword:court" };
  }

  return { playbook: "GENERAL_WRITING", governance: "G1", reason: "default" };
}

async function main() {
  const repoRootAbs = process.cwd();
  const toolVersion = readToolVersion(repoRootAbs);

  const args = parseArgs(process.argv.slice(2));

  if (args.version) {
    OUTPUT_JSON = false;
    process.stdout.write(`router ${toolVersion}\n`);
    process.exit(0);
  }

  if (!args.text || !String(args.text).trim()) {
    die("Missing --text");
  }

  const base = choosePlaybook(args.text);

  const playbook = args.playbook || base.playbook;
  const governance = args.governance || base.governance;
  if (!/^G[123]$/.test(governance)) die("Invalid --governance (expected G1, G2, or G3)");

  const payload = {
    ok: true,
    kind: "AgentRoute",
    playbook,
    governance,
    tag: "AGENT",
    reason: args.playbook || args.governance ? "override" : base.reason,
    tool_version: toolVersion,
  };

  printJsonLine(payload);
}

main().catch((e) => {
  die(e instanceof Error ? e.message : String(e));
});
