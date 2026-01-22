#!/usr/bin/env node
/*
  bundle-compose.mjs

  Purpose:
    Compose a deterministic bundle zip for a run directory.

  Contract:
    - Success: single-line JSON
    - Failure: single-line JSON
    - Only --help/-h and --version print human-readable output (exit 0)

  Notes:
    - Uses `yazl` if available.
    - Excludes the output zip itself from bundling.
*/

import crypto from "node:crypto";
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

function sha256FileHex(fileAbs) {
  const h = crypto.createHash("sha256");
  const buf = fs.readFileSync(fileAbs);
  h.update(buf);
  return h.digest("hex");
}

function stablePosixRel(rootAbs, fileAbs) {
  const rel = path.relative(rootAbs, fileAbs);
  return rel.split(path.sep).join("/");
}

function listFilesRec(dirAbs) {
  const out = [];
  const stack = [dirAbs];

  while (stack.length) {
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const e of entries) {
      const abs = path.join(cur, e.name);
      if (e.isDirectory()) stack.push(abs);
      else if (e.isFile()) out.push(abs);
    }
  }

  return out;
}

function ensureDir(dirAbs) {
  fs.mkdirSync(dirAbs, { recursive: true });
}

function helpText() {
  return (
    "Usage:\n" +
    "  node tools/bundle-compose/bundle-compose.mjs --run-id <RUN_ID> [--runs-root <path>]\n" +
    "  node tools/bundle-compose/bundle-compose.mjs --run-dir <path>\n" +
    "  node tools/bundle-compose/bundle-compose.mjs --help|-h\n" +
    "  node tools/bundle-compose/bundle-compose.mjs --version\n" +
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
    runId: null,
    runDir: null,
    runsRoot: "runs",
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

    if (a === "--run-id" && argv[i + 1]) {
      out.runId = String(argv[++i]).trim();
      continue;
    }
    if (a === "--run-dir" && argv[i + 1]) {
      out.runDir = String(argv[++i]).trim();
      continue;
    }
    if (a === "--runs-root" && argv[i + 1]) {
      out.runsRoot = String(argv[++i]).trim();
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

async function writeZipDeterministic({ zipAbs, runDirAbs, excludeRelPosix }) {
  let yazl;
  try {
    yazl = await import("yazl");
  } catch {
    return { ok: false, reason: "yazl_not_available" };
  }

  return await new Promise((resolve, reject) => {
    const ZipFile = yazl?.ZipFile;
    if (!ZipFile) {
      resolve({ ok: false, reason: "yazl_missing_ZipFile" });
      return;
    }

    const zip = new ZipFile();

    const files = listFilesRec(runDirAbs)
      .map((abs) => ({ abs, rel: stablePosixRel(runDirAbs, abs) }))
      .filter((x) => x.rel !== excludeRelPosix)
      .sort((a, b) => a.rel.localeCompare(b.rel));

    for (const f of files) zip.addFile(f.abs, f.rel);

    zip.end();

    ensureDir(path.dirname(zipAbs));
    const out = fs.createWriteStream(zipAbs);

    zip.outputStream
      .pipe(out)
      .on("close", () => resolve({ ok: true, files: files.length }))
      .on("error", (e) => reject(e));
  });
}

async function main() {
  const repoRootAbs = process.cwd();
  const toolVersion = readToolVersion(repoRootAbs);

  const args = parseArgs(process.argv.slice(2));

  if (args.version) {
    OUTPUT_JSON = false;
    process.stdout.write(`bundle-compose ${toolVersion}\n`);
    process.exit(0);
  }

  if (!args.runDir && !args.runId) die("Missing --run-dir or --run-id");
  if (args.runDir && args.runId) die("Provide only one of --run-dir or --run-id");

  const runDirAbs = args.runDir
    ? path.resolve(repoRootAbs, args.runDir)
    : path.join(path.resolve(repoRootAbs, args.runsRoot), args.runId);

  if (!fs.existsSync(runDirAbs) || !fs.statSync(runDirAbs).isDirectory()) {
    die(`Run directory not found: ${path.relative(repoRootAbs, runDirAbs)}`);
  }

  const runId = args.runId || path.basename(runDirAbs);
  const runDirRel = path.relative(repoRootAbs, runDirAbs).split(path.sep).join("/");

  const zipName = `${runId}__BUNDLE__v01.zip`;
  const zipRel = `07_publish/${zipName}`;
  const zipAbs = path.join(runDirAbs, "07_publish", zipName);

  const attempt = await writeZipDeterministic({ zipAbs, runDirAbs, excludeRelPosix: zipRel });

  if (!attempt.ok) {
    // Deterministic fallback list.
    const list = listFilesRec(runDirAbs)
      .map((abs) => stablePosixRel(runDirAbs, abs))
      .filter((rel) => rel !== zipRel)
      .sort((a, b) => a.localeCompare(b));

    ensureDir(path.join(runDirAbs, "07_publish"));
    const listAbs = path.join(runDirAbs, "07_publish", ".zip_list.txt");
    fs.writeFileSync(listAbs, list.join("\n") + "\n");

    printJsonLine({
      ok: true,
      kind: "BundleCompose",
      run_id: runId,
      run_dir: runDirRel,
      bundle: null,
      output: `${runDirRel}/07_publish/.zip_list.txt`,
      reason: attempt.reason,
      tool_version: toolVersion,
    });
    return;
  }

  const zipSha = sha256FileHex(zipAbs);
  fs.writeFileSync(path.join(runDirAbs, "07_publish", "bundle.sha256"), `sha256:${zipSha}\n`);
  fs.writeFileSync(
    path.join(runDirAbs, "07_publish", "distribution_log.md"),
    `# Distribution Log\n\n- Bundle: ${zipName}\n- SHA256: sha256:${zipSha}\n- Created (UTC): ${new Date().toISOString()}\n`,
  );

  printJsonLine({
    ok: true,
    kind: "BundleCompose",
    run_id: runId,
    run_dir: runDirRel,
    bundle: `${runDirRel}/${zipRel}`,
    bundle_sha256: `sha256:${zipSha}`,
    files: attempt.files,
    tool_version: toolVersion,
  });
}

main().catch((e) => {
  die(e instanceof Error ? e.message : String(e));
});
