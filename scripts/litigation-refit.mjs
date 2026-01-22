import path from "node:path";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function normalizePathForPrint(p) {
  return String(p || "").split(path.sep).join("/");
}

function inferCaseFromFolderAbs(folderAbs) {
  const norm = normalizePathForPrint(folderAbs);
  const parts = norm.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => String(p).toLowerCase() === "artifacts");
  if (idx >= 0 && parts[idx + 1] && String(parts[idx + 2] || "").toLowerCase() === "litigation") {
    return String(parts[idx + 1]);
  }
  return null;
}

function slugify(s) {
  const raw = String(s || "").trim() || "litigation";
  const replaced = raw
    .replace(/^[a-zA-Z]:/g, "")
    .replace(/[\\/]+/g, "__")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
  return replaced.slice(0, 120) || "litigation";
}

function safeToken(s, fallback) {
  const raw = String(s || "").trim();
  if (!raw) return fallback;
  const cleaned = raw
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
  return cleaned.slice(0, 64) || fallback;
}

function gradeLetterFromDecision(d) {
  const g = String(d?.grade || "").trim().toUpperCase();
  if (g === "A" || g === "B" || g === "C") return g;
  return "X";
}

function parseArgs(argv) {
  const out = {
    folder: null,
    caseName: null,
    reportDir: "runs/_verify_reports",
    outDir: null,
    passthrough: [],
  };

  const takeValue = (i) => (i + 1 < argv.length ? { value: argv[i + 1], nextIndex: i + 1 } : { value: null, nextIndex: i });

  for (let i = 2; i < argv.length; i += 1) {
    const a = String(argv[i] || "");
    if (!out.folder && !a.startsWith("--")) {
      out.folder = a;
      continue;
    }
    if (a === "--case") {
      const { value, nextIndex } = takeValue(i);
      out.caseName = value ? String(value) : null;
      i = nextIndex;
      continue;
    }
    if (a === "--report-dir") {
      const { value, nextIndex } = takeValue(i);
      out.reportDir = value ? String(value) : out.reportDir;
      i = nextIndex;
      continue;
    }
    if (a === "--out") {
      const { value, nextIndex } = takeValue(i);
      out.outDir = value ? String(value) : null;
      i = nextIndex;
      continue;
    }

    // Wrapper always writes a report; treat `--report` as a boolean no-op.
    if (a === "--report") {
      const next = i + 1 < argv.length ? String(argv[i + 1] || "") : "";
      if (next && !next.startsWith("--")) i += 1;
      continue;
    }

    out.passthrough.push(a);

    // forward flag value
    if ([
      "--mode",
      "--min-exhibits",
      "--max-concurrency",
      "--reason",
      "--ticket",
      "--min-grade",
      "--require-grade",
      "--fail-on",
      "--fail-on-policy",
    ].includes(a)) {
      const { value, nextIndex } = takeValue(i);
      if (value != null) out.passthrough.push(String(value));
      i = nextIndex;
    }
  }

  return out;
}

function stripFlags(argv, dropSet) {
  const out = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = String(argv[i] || "");
    if (dropSet.has(a)) continue;
    out.push(a);
  }
  return out;
}

function stripAutoFixFlags(argv) {
  const drop = new Set(["--auto-fix", "--apply", "--json", "--quiet", "--out"]);
  const out = [];
  for (let i = 0; i < argv.length; i += 1) {
    const a = String(argv[i] || "");
    if (drop.has(a)) {
      if (a === "--out") i += 1; // skip value
      continue;
    }
    out.push(a);
  }
  return out;
}

async function main() {
  const repoRoot = process.cwd();
  const args = parseArgs(process.argv);

  if (!args.folder) {
    process.stderr.write("Usage: npm run litigation:refit -- <folder> [--out DIR] [--case NAME] [--report-dir DIR] [refit flags...]\n");
    process.exit(2);
    return;
  }

  const folderAbs = path.resolve(repoRoot, args.folder);
  const folderRel = normalizePathForPrint(path.relative(repoRoot, folderAbs));
  const inferred = inferCaseFromFolderAbs(folderAbs);
  const defaultCase = slugify(inferred || path.basename(folderAbs));
  const slug = slugify(args.caseName || defaultCase);

  const verifyScript = path.join(repoRoot, "scripts", "verify-litigation-packet.mjs");

  const wantsJson = args.passthrough.includes("--json");

  // Internal apply step should be quiet/JSON only; don't emit policy headlines here.
  const applyPassthrough = stripFlags(args.passthrough, new Set(["--json", "--quiet", "--print-policy"]));

  // Step 1: apply refit (clone-only) and capture outDir from JSON.
  const applyArgs = [
    verifyScript,
    args.folder,
    "--auto-fix",
    "--apply",
    "--json",
    "--quiet",
    ...(args.outDir ? ["--out", args.outDir] : []),
    ...applyPassthrough,
  ];

  let applyJson;
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, applyArgs, { windowsHide: true, maxBuffer: 20 * 1024 * 1024 });
    if (stderr) process.stderr.write(String(stderr));
    applyJson = JSON.parse(String(stdout || "{}"));
  } catch (e) {
    const stdout = String(e?.stdout || "");
    const stderr = String(e?.stderr || "");
    if (stderr) process.stderr.write(stderr);

    // The verifier intentionally uses non-zero exit codes for warnings/failures.
    // In --json mode we still want to parse stdout to find the refit output folder.
    try {
      applyJson = JSON.parse(stdout || "{}");
      process.exitCode = typeof e?.code === "number" ? e.code : 1;
    } catch {
      process.exitCode = typeof e?.code === "number" ? e.code : 1;
      return;
    }
  }

  if (wantsJson) {
    process.stdout.write(`${JSON.stringify(applyJson, null, 2)}\n`);
  }

  const outDir = String(applyJson?.outDir || "").trim();
  if (!outDir) {
    process.stderr.write("FAIL: Refit did not produce an output folder.\n");
    process.exit(1);
    return;
  }

  const afterId = String(applyJson?.after?.verificationId || "").trim();
  const verificationIdShort = afterId ? afterId.slice(0, 16) : "noid";
  const decision = applyJson?.policyDecision || {};
  const gradeLetter = gradeLetterFromDecision(decision);
  const exitReason = safeToken(decision?.exitReason, "UNKNOWN");
  const reportAbs = path.resolve(repoRoot, args.reportDir, `${slug}__${verificationIdShort}__${gradeLetter}__${exitReason}.md`);
  await fs.mkdir(path.dirname(reportAbs), { recursive: true });

  // Step 2: generate a report for the repaired clone.
  const verifyArgs = [
    verifyScript,
    outDir,
    "--report",
    normalizePathForPrint(path.relative(repoRoot, reportAbs)),
    "--quiet",
    ...stripAutoFixFlags(args.passthrough),
  ];

  const r = await execFileAsync(process.execPath, verifyArgs, { windowsHide: true, maxBuffer: 20 * 1024 * 1024 }).catch((e) => {
    if (e?.stdout) process.stdout.write(String(e.stdout));
    if (e?.stderr) process.stderr.write(String(e.stderr));
    process.exitCode = typeof e?.code === "number" ? e.code : 1;
    return null;
  });

  if (r) {
    if (r.stdout) process.stdout.write(String(r.stdout));
    if (r.stderr) process.stderr.write(String(r.stderr));
    process.exitCode = 0;
  }

  process.stdout.write(`OK: Refit output: ${outDir}\n`);
  process.stdout.write(`OK: Report: ${normalizePathForPrint(path.relative(repoRoot, reportAbs))}\n`);
}

main().catch((err) => {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
});
