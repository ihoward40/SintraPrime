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

function gradeLetterFromResult(r) {
  const g = String(r?.policyDecision?.grade || "").trim().toUpperCase();
  if (g === "A" || g === "B" || g === "C") return g;
  const full = String(r?.grade || "").trim().toUpperCase();
  if (full === "GRADE A") return "A";
  if (full === "GRADE B") return "B";
  if (full === "GRADE C") return "C";
  return "X";
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

function parseArgs(argv) {
  const out = {
    folder: null,
    caseName: null,
    reportDir: "runs/_verify_reports",
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

    // Wrapper always writes a report; treat `--report` as a boolean no-op (for CI ergonomics).
    if (a === "--report") {
      const next = i + 1 < argv.length ? String(argv[i + 1] || "") : "";
      if (next && !next.startsWith("--")) i += 1;
      continue;
    }

    out.passthrough.push(a);

    // forward flag value
    if (["--mode", "--min-exhibits", "--max-concurrency", "--min-grade", "--require-grade", "--fail-on", "--fail-on-policy"].includes(a)) {
      const { value, nextIndex } = takeValue(i);
      if (value != null) out.passthrough.push(String(value));
      i = nextIndex;
    }
  }

  return out;
}

async function main() {
  const repoRoot = process.cwd();
  const args = parseArgs(process.argv);

  if (!args.folder) {
    process.stderr.write("Usage: npm run litigation:verify -- <folder> [--case NAME] [--report-dir DIR] [verify flags...]\n");
    process.exit(2);
    return;
  }

  const folderAbs = path.resolve(repoRoot, args.folder);
  const folderRel = normalizePathForPrint(path.relative(repoRoot, folderAbs));
  const inferred = inferCaseFromFolderAbs(folderAbs);
  const defaultCase = slugify(inferred || path.basename(folderAbs));
  const slug = slugify(args.caseName || defaultCase);

  const scriptPath = path.join(repoRoot, "scripts", "verify-litigation-packet.mjs");

  const wantsJson = args.passthrough.includes("--json");
  const wantsPrintPolicy = args.passthrough.includes("--print-policy");

  // Step 1: run verifier in JSON mode to obtain stable-ish naming fields.
  const metaPassthrough = stripFlags(args.passthrough, new Set(["--json", "--quiet", "--print-policy"]));
  const metaArgs = [scriptPath, args.folder, "--json", "--quiet", ...metaPassthrough];

  let metaExit = 0;
  let meta;
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, metaArgs, { windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
    meta = JSON.parse(String(stdout || "{}"));
    if (stderr) process.stderr.write(String(stderr));
  } catch (e) {
    metaExit = typeof e?.code === "number" ? e.code : 1;
    const stdout = String(e?.stdout || "");
    const stderr = String(e?.stderr || "");
    if (stderr) process.stderr.write(stderr);
    try {
      meta = JSON.parse(stdout || "{}");
    } catch {
      throw e;
    }
  }

  const verificationId = String(meta?.verificationId || "").trim();
  const verificationIdShort = verificationId ? verificationId.slice(0, 16) : "noid";
  const gradeLetter = gradeLetterFromResult(meta);
  const exitReason = safeToken(meta?.exitReason, "UNKNOWN");

  const reportFile = `${slug}__${verificationIdShort}__${gradeLetter}__${exitReason}.md`;
  const reportAbs = path.resolve(repoRoot, args.reportDir, reportFile);
  await fs.mkdir(path.dirname(reportAbs), { recursive: true });

  // Step 2: generate the Markdown report.
  const reportPassthrough = stripFlags(args.passthrough, new Set(["--json", "--print-policy"]));
  const cmdArgs = [
    scriptPath,
    args.folder,
    "--report",
    normalizePathForPrint(path.relative(repoRoot, reportAbs)),
    ...(wantsPrintPolicy ? ["--print-policy"] : []),
    ...reportPassthrough,
  ];

  const child = await execFileAsync(process.execPath, cmdArgs, { windowsHide: true, maxBuffer: 10 * 1024 * 1024 }).catch((e) => {
    // preserve stdout/stderr and return code
    if (e?.stdout) process.stdout.write(String(e.stdout));
    if (e?.stderr) process.stderr.write(String(e.stderr));
    process.exitCode = metaExit || (typeof e?.code === "number" ? e.code : 1);
    return null;
  });

  if (child) {
    if (child.stdout) process.stdout.write(String(child.stdout));
    if (child.stderr) process.stderr.write(String(child.stderr));
    process.exitCode = metaExit;
  }

  if (wantsJson) {
    process.stdout.write(`${JSON.stringify(meta, null, 2)}\n`);
  }

  if (process.exitCode === 0) {
    process.stdout.write(`OK: Wrote report: ${normalizePathForPrint(path.relative(repoRoot, reportAbs))}\n`);
  } else {
    process.stdout.write(`OK: Report (for review): ${normalizePathForPrint(path.relative(repoRoot, reportAbs))}\n`);
  }
}

main().catch((err) => {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
});
