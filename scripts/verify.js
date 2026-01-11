import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function usage(msg) {
  const lines = [
    msg ? `Error: ${msg}` : null,
    "Usage:",
    "  node scripts/verify.js <bundle.zip|bundle_dir> [--strict] [--json] [--expect <expect.json>]",
    "",
    "Exit codes:",
    "  0  verified ok",
    "  2  usage / bad args",
    "  3  verification failed",
    "  4  expect mismatch",
    "  1  internal error",
  ].filter(Boolean);
  process.stderr.write(lines.join("\n") + "\n");
}

function sha256Bytes(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return sha256Bytes(buf);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function stableJsonStringify(value) {
  const stable = (v) => {
    if (v === null || v === undefined) return v;
    if (Array.isArray(v)) return v.map(stable);
    if (typeof v !== "object") return v;
    const keys = Object.keys(v).sort();
    const out = {};
    for (const k of keys) out[k] = stable(v[k]);
    return out;
  };
  return JSON.stringify(stable(value), null, 2) + "\n";
}

function toPosixRel(p) {
  return String(p).replace(/\\/g, "/");
}

function deepSubsetMatch(actual, expected) {
  if (expected === null || expected === undefined) return true;
  if (typeof expected !== "object") return actual === expected;
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return false;
    if (expected.length > actual.length) return false;
    for (let i = 0; i < expected.length; i += 1) {
      if (!deepSubsetMatch(actual[i], expected[i])) return false;
    }
    return true;
  }
  if (!actual || typeof actual !== "object") return false;
  for (const [k, v] of Object.entries(expected)) {
    if (!(k in actual)) return false;
    if (!deepSubsetMatch(actual[k], v)) return false;
  }
  return true;
}

function listFilesRecursive(dirAbs) {
  const out = [];
  const walk = (abs, relPrefix) => {
    const entries = fs.readdirSync(abs, { withFileTypes: true });
    for (const ent of entries) {
      const childAbs = path.join(abs, ent.name);
      const childRel = relPrefix ? `${relPrefix}/${ent.name}` : ent.name;
      if (ent.isDirectory()) {
        walk(childAbs, childRel);
      } else if (ent.isFile()) {
        out.push(childRel);
      }
    }
  };
  walk(dirAbs, "");
  return out
    .map(toPosixRel)
    .sort((a, b) => a.localeCompare(b));
}

function ensureDir(dirAbs) {
  fs.mkdirSync(dirAbs, { recursive: true });
}

async function extractZipToDir(zipAbs, outDirAbs) {
  let yauzl;
  try {
    yauzl = require("yauzl");
  } catch {
    throw new Error("Missing dependency 'yauzl'. Run: npm i yauzl");
  }

  const outRoot = path.resolve(outDirAbs);
  ensureDir(outRoot);

  await new Promise((resolve, reject) => {
    yauzl.open(zipAbs, { lazyEntries: true }, (err, zip) => {
      if (err || !zip) {
        reject(err || new Error("Failed to open zip"));
        return;
      }

      const fail = (e) => {
        try {
          zip.close();
        } catch {
          // ignore
        }
        reject(e);
      };

      zip.on("error", fail);
      zip.readEntry();

      zip.on("entry", (entry) => {
        const fileName = String(entry.fileName || "");
        const isDir = /\/$/.test(fileName);

        const destAbs = path.resolve(outRoot, fileName);
        // ZipSlip guard
        if (!(destAbs === outRoot || destAbs.startsWith(outRoot + path.sep))) {
          fail(new Error(`Zip entry escapes output dir: ${fileName}`));
          return;
        }

        if (isDir) {
          ensureDir(destAbs);
          zip.readEntry();
          return;
        }

        ensureDir(path.dirname(destAbs));
        zip.openReadStream(entry, (streamErr, readStream) => {
          if (streamErr || !readStream) {
            fail(streamErr || new Error(`Failed to read zip entry: ${fileName}`));
            return;
          }

          const w = fs.createWriteStream(destAbs);
          readStream.on("error", fail);
          w.on("error", fail);
          w.on("close", () => zip.readEntry());
          readStream.pipe(w);
        });
      });

      zip.on("end", resolve);
    });
  });
}

function verifyBundleDir(bundleDirAbs, opts) {
  const root = path.resolve(bundleDirAbs);
  const manifestPath = path.join(root, "manifest.json");
  const hashesPath = path.join(root, "hashes.json");
  const roothashPath = path.join(root, "roothash.txt");

  const result = {
    kind: "AuditBundleVerification",
    ok: false,
    input_kind: "dir",
    bundle_root: toPosixRel(root),
    schema_version: null,
    manifest: null,
    roothash_file: null,
    roothash_computed: null,
    roothash_ok: null,
    files_expected: 0,
    files_checked: 0,
    missing: [],
    mismatched: [],
    extra: [],
    errors: [],
  };

  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    result.errors.push(`Not a directory: ${bundleDirAbs}`);
    return result;
  }
  if (!fs.existsSync(manifestPath)) {
    result.errors.push("Missing manifest.json");
    return result;
  }
  if (!fs.existsSync(hashesPath)) {
    result.errors.push("Missing hashes.json");
    return result;
  }

  let manifest;
  let hashes;
  try {
    manifest = readJson(manifestPath);
    result.manifest = manifest;
    result.schema_version = typeof manifest?.schema_version === "string" ? manifest.schema_version : null;
  } catch (e) {
    result.errors.push(`Failed to parse manifest.json: ${String(e)}`);
    return result;
  }
  try {
    hashes = readJson(hashesPath);
  } catch (e) {
    result.errors.push(`Failed to parse hashes.json: ${String(e)}`);
    return result;
  }

  if (!hashes || typeof hashes !== "object" || Array.isArray(hashes)) {
    result.errors.push("hashes.json must be an object mapping relPath -> sha256:HEX");
    return result;
  }

  const expectedFiles = Object.keys(hashes).sort((a, b) => a.localeCompare(b));
  result.files_expected = expectedFiles.length;

  for (const rel of expectedFiles) {
    const expected = String(hashes[rel] ?? "");
    const abs = path.join(root, rel.replace(/\//g, path.sep));
    if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
      result.missing.push(rel);
      continue;
    }

    const m = expected.match(/^sha256:([0-9a-fA-F]{64})$/);
    if (!m) {
      result.errors.push(`Invalid hash format for ${rel}: ${expected}`);
      continue;
    }
    const expectedHex = m[1].toLowerCase();
    const gotHex = sha256File(abs).toLowerCase();
    result.files_checked += 1;
    if (gotHex !== expectedHex) {
      result.mismatched.push({ rel, expected: `sha256:${expectedHex}`, got: `sha256:${gotHex}` });
    }
  }

  if (opts?.strict) {
    const present = new Set(listFilesRecursive(root));
    // hashes.json is intentionally excluded from hashes
    const allowExtra = new Set(["hashes.json", "roothash.txt"]);
    for (const rel of expectedFiles) present.delete(rel);
    for (const rel of allowExtra) present.delete(rel);
    const extra = Array.from(present).sort((a, b) => a.localeCompare(b));
    if (extra.length) result.extra = extra;
  }

  // roothash.txt is an optional single-line anchor; if present, verify it matches
  // sha256(stableJsonStringify({ manifest, hashes })).
  if (fs.existsSync(roothashPath) && fs.statSync(roothashPath).isFile()) {
    try {
      const file = String(fs.readFileSync(roothashPath, "utf8") || "").trim();
      result.roothash_file = file || null;
      const computed = sha256Bytes(Buffer.from(stableJsonStringify({ manifest, hashes }), "utf8"));
      result.roothash_computed = computed;
      result.roothash_ok = file ? file.toLowerCase() === computed.toLowerCase() : false;
      if (file && result.roothash_ok === false) {
        result.errors.push("roothash.txt mismatch");
      }
    } catch (e) {
      result.errors.push(`Failed to verify roothash.txt: ${String(e)}`);
    }
  }

  result.ok =
    result.errors.length === 0 &&
    result.missing.length === 0 &&
    result.mismatched.length === 0 &&
    (!opts?.strict || result.extra.length === 0);

  return result;
}

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set();
  const values = {};

  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === "--json" || a === "--strict") {
      flags.add(a);
      continue;
    }
    if (a === "--expect") {
      const v = args[i + 1];
      if (!v) {
        usage("--expect requires a file path");
        process.exit(2);
      }
      values.expect = v;
      i += 1;
      continue;
    }
    if (a.startsWith("--")) {
      usage(`Unknown flag: ${a}`);
      process.exit(2);
    }
    if (!values.input) {
      values.input = a;
      continue;
    }
    usage(`Unexpected arg: ${a}`);
    process.exit(2);
  }

  const input = String(values.input || "").trim();
  if (!input) {
    usage("Missing <bundle.zip|bundle_dir>");
    process.exit(2);
  }

  const wantJsonOnly = flags.has("--json");
  const strict = flags.has("--strict");
  const expectPath = values.expect ? String(values.expect) : null;

  const inputAbs = path.resolve(process.cwd(), input);
  let tmpDir = null;
  let bundleDirAbs = inputAbs;
  let inputKind = "dir";

  try {
    const st = fs.existsSync(inputAbs) ? fs.statSync(inputAbs) : null;
    const lower = String(inputAbs).toLowerCase();
    // Support collision-suffixed zips like ".../audit_exec_001.zip_2" (still treated as zip inputs).
    const isZipLike = lower.endsWith(".zip") || /\.zip[_-]\d+$/.test(lower);
    if (st && st.isDirectory()) {
      inputKind = "dir";
      bundleDirAbs = inputAbs;
    } else if (st && st.isFile() && isZipLike) {
      inputKind = "zip";
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "audit-verify-"));
      await extractZipToDir(inputAbs, tmpDir);
      bundleDirAbs = tmpDir;
    } else {
      usage("Input must be an existing directory or a .zip file");
      process.exit(2);
    }

    const verification = verifyBundleDir(bundleDirAbs, { strict });
    verification.input_kind = inputKind;
    verification.input = toPosixRel(inputAbs);

    if (expectPath) {
      const expectAbs = path.resolve(process.cwd(), expectPath);
      let expected;
      try {
        expected = readJson(expectAbs);
      } catch (e) {
        verification.ok = false;
        verification.errors.push(`Failed to read --expect JSON: ${String(e)}`);
      }

      if (expected !== undefined && !deepSubsetMatch(verification.manifest, expected)) {
        verification.ok = false;
        verification.errors.push("EXPECT_MISMATCH");
        verification.expect = { path: toPosixRel(expectAbs), matched: false };
      } else if (expected !== undefined) {
        verification.expect = { path: toPosixRel(expectAbs), matched: true };
      }
    }

    if (!wantJsonOnly) {
      const status = verification.ok ? "OK" : "FAIL";
      process.stderr.write(`[${status}] audit bundle verify\n`);
      if (verification.schema_version) process.stderr.write(`  schema_version: ${verification.schema_version}\n`);
      process.stderr.write(`  files_checked: ${verification.files_checked}/${verification.files_expected}\n`);
      if (verification.missing.length) process.stderr.write(`  missing: ${verification.missing.length}\n`);
      if (verification.mismatched.length) process.stderr.write(`  mismatched: ${verification.mismatched.length}\n`);
      if (strict && verification.extra.length) process.stderr.write(`  extra: ${verification.extra.length}\n`);
      if (verification.errors.length) process.stderr.write(`  errors: ${verification.errors.join("; ")}\n`);
    }

    // JSON must be the last line on stdout.
    process.stdout.write(JSON.stringify(verification, null, 0) + "\n");

    if (expectPath && verification.errors.includes("EXPECT_MISMATCH")) process.exit(4);
    process.exit(verification.ok ? 0 : 3);
  } finally {
    if (tmpDir) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  }
}

main().catch((e) => {
  process.stderr.write(`Internal error: ${String(e?.stack || e)}\n`);
  // JSON last line even on internal errors.
  process.stdout.write(
    JSON.stringify(
      {
        kind: "AuditBundleVerification",
        ok: false,
        input_kind: null,
        input: null,
        bundle_root: null,
        schema_version: null,
        manifest: null,
        files_expected: 0,
        files_checked: 0,
        missing: [],
        mismatched: [],
        extra: [],
        errors: [String(e?.message || e)],
      },
      null,
      0
    ) + "\n"
  );
  process.exit(1);
});
