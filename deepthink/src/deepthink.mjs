import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

function die(msg) {
  process.stderr.write(`Error: ${msg}\n`);
  process.exit(1);
}

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function stableStringify(value) {
  const seen = new WeakSet();

  function sortKeys(v) {
    if (v === null || typeof v !== "object") return v;
    if (seen.has(v)) die("Non-deterministic input: circular reference detected.");
    seen.add(v);

    if (Array.isArray(v)) return v.map(sortKeys);

    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = sortKeys(v[k]);
    return out;
  }

  return JSON.stringify(sortKeys(value), null, 2) + "\n";
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    die(`Invalid JSON: ${filePath}`);
  }
}

function assertBasicShape(req) {
  if (!req || typeof req !== "object") die("Request must be a JSON object.");
  if (typeof req.analysis_id !== "string") die("Missing analysis_id (string).");
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$/.test(req.analysis_id)) {
    die("analysis_id must match ^[A-Za-z0-9][A-Za-z0-9._-]{2,79}$");
  }
  if (typeof req.purpose !== "string" || req.purpose.trim().length < 5) {
    die("purpose must be a string (min length 5).");
  }
  if (!req.inputs || typeof req.inputs !== "object") die("inputs must be an object.");
  if (!Array.isArray(req.inputs.claims) || req.inputs.claims.length < 1) {
    die("inputs.claims must be a non-empty array of strings.");
  }
  if (!Array.isArray(req.inputs.artifacts)) {
    die("inputs.artifacts must be an array (may be empty).");
  }
}

function ensureWithinRunsDir(root, target) {
  const rel = path.relative(root, target);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    die(`Refusing to write outside runs/: ${target}`);
  }
}

function writeFileWithSha256(filePath, contentUtf8) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contentUtf8, "utf8");
  const h = sha256Hex(Buffer.from(contentUtf8, "utf8"));
  fs.writeFileSync(filePath + ".sha256", `${h}  ${path.basename(filePath)}\n`, "ascii");
  return h;
}

function buildManifest(entries) {
  return {
    version: "manifest.v1",
    files: entries
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((e) => ({ name: e.name, sha256: e.sha256 })),
  };
}

export function runDeepthink({ requestPath, outSubdir, repoRoot }) {
  const requestAbs = path.resolve(repoRoot, requestPath);

  const runsRoot = path.resolve(repoRoot, "runs");

  const req = readJson(requestAbs);
  assertBasicShape(req);

  const runFolderName = outSubdir ? outSubdir : `DEEPTHINK_${req.analysis_id}`;
  const runDir = path.resolve(runsRoot, runFolderName);

  ensureWithinRunsDir(runsRoot, runDir);
  if (fs.existsSync(runDir)) {
    const entries = fs.readdirSync(runDir);
    if (entries.length > 0) {
      die(
        `Refusing to overwrite existing run folder (must be append-only evidence): ${path.relative(
          repoRoot,
          runDir,
        )}`,
      );
    }
  }
  fs.mkdirSync(runDir, { recursive: true });

  const normalizedRequest = stableStringify(req);
  const reqFile = path.join(runDir, "request.json");
  const reqHash = writeFileWithSha256(reqFile, normalizedRequest);

  const maxFindings =
    req.options && typeof req.options.max_findings === "number" ? req.options.max_findings : 80;

  const output = {
    version: "deepthink.output.v1",
    analysis_id: req.analysis_id,
    purpose: req.purpose,
    inputs_summary: {
      claims_count: req.inputs.claims.length,
      artifacts_count: req.inputs.artifacts.length,
      questions_count: Array.isArray(req.inputs.questions) ? req.inputs.questions.length : 0,
    },
    findings: req.inputs.claims.slice(0, maxFindings).map((c, idx) => ({
      id: `F-${String(idx + 1).padStart(3, "0")}`,
      claim: c,
      status: "UNASSESSED",
      notes: "Stub output. Replace with real analysis logic; keep determinism rules.",
    })),
    determinism: {
      mode: "strict",
      request_normalized_sha256: reqHash,
      created_utc: req.created_utc || null,
    },
  };

  const outFile = path.join(runDir, "output.json");
  const outHash = writeFileWithSha256(outFile, stableStringify(output));

  const manifestObj = buildManifest([
    { name: "request.json", sha256: reqHash },
    { name: "output.json", sha256: outHash },
  ]);

  const manifestFile = path.join(runDir, "manifest.json");
  const manifestHash = writeFileWithSha256(manifestFile, stableStringify(manifestObj));

  return {
    runDir,
    reqHash,
    outHash,
    manifestHash,
  };
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.length < 1) {
    die("Usage: node deepthink.mjs <request.json> [--out <runs_subdir>]");
  }

  const requestPath = argv[0];

  let outSubdir = null;
  for (let i = 1; i < argv.length; i++) {
    if (argv[i] === "--out" && argv[i + 1]) {
      outSubdir = argv[i + 1];
      i++;
    } else {
      die(`Unknown arg: ${argv[i]}`);
    }
  }

  const repoRoot = process.cwd();

  const { runDir, reqHash, outHash, manifestHash } = runDeepthink({ requestPath, outSubdir, repoRoot });

  process.stdout.write("DeepThink run created\n");
  process.stdout.write(`dir: ${path.relative(repoRoot, runDir)}\n`);
  process.stdout.write(`request.json sha256: ${reqHash}\n`);
  process.stdout.write(`output.json sha256: ${outHash}\n`);
  process.stdout.write(`manifest.json sha256: ${manifestHash}\n`);
}

const thisFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(thisFile)) {
  main();
}
