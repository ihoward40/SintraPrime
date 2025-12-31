import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function argValue(argv: string[], name: string): string | null {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  const v = argv[i + 1];
  if (!v || v.startsWith("--")) return null;
  return v;
}

function requireIso(s: string, label: string): string {
  const v = String(s ?? "").trim();
  if (!v) throw new Error(`${label} is required`);
  const t = Date.parse(v);
  if (!Number.isFinite(t)) throw new Error(`${label} must be an ISO date-time`);
  return new Date(t).toISOString();
}

function usage(): string {
  return [
    "one-shot-build-batch.ts",
    "",
    "Required:",
    "  --now <ISO_UTC_TIMESTAMP>",
    "  --cases <CASE1,CASE2,...>   OR   --cases-file <path>",
    "",
    "Optional:",
    "  --out-root <path>  (default: deliverables/v1.0/batch)",
    "  --clean            (pass through to per-case one-shot runner)",
    "  --dry-run          (pass through; prints per-case plan only)",
  ].join("\n");
}

function parseCasesList(s: string): string[] {
  const parts = String(s ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  const uniq = Array.from(new Set(parts));
  uniq.sort((a, b) => a.localeCompare(b));
  return uniq;
}

function readCasesFile(absPath: string): string[] {
  const lines = fs
    .readFileSync(absPath, "utf8")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  const uniq = Array.from(new Set(lines));
  uniq.sort((a, b) => a.localeCompare(b));
  return uniq;
}

function runOneShot(caseId: string, nowIso: string, outAbs: string, passthrough: string[]) {
  const node = process.execPath;
  const args = [
    "--import",
    "tsx",
    "scripts/one-shot-build.ts",
    "--case",
    caseId,
    "--now",
    nowIso,
    "--out",
    outAbs,
    ...passthrough,
  ];

  console.log("\n=== CASE: " + caseId + " ===");
  console.log("> node " + args.join(" "));
  execFileSync(node, args, { stdio: "inherit" });
}

function main() {
  const argv = process.argv.slice(2);

  const nowArg = argValue(argv, "--now");
  const casesArg = argValue(argv, "--cases");
  const casesFileArg = argValue(argv, "--cases-file");

  if (!nowArg || (!casesArg && !casesFileArg)) {
    console.error(usage());
    process.exit(2);
  }

  const nowIso = requireIso(nowArg, "--now");
  const outRootRel = argValue(argv, "--out-root") || path.join("deliverables", "v1.0", "batch");
  const outRootAbs = path.resolve(process.cwd(), outRootRel);

  let cases: string[] = [];
  if (casesArg) cases = parseCasesList(casesArg);
  if (!cases.length && casesFileArg) {
    const abs = path.resolve(process.cwd(), casesFileArg);
    cases = readCasesFile(abs);
  }

  if (!cases.length) {
    console.error("No cases provided.");
    console.error(usage());
    process.exit(2);
  }

  const passthrough: string[] = [];
  if (argv.includes("--clean")) passthrough.push("--clean");
  if (argv.includes("--dry-run")) passthrough.push("--dry-run");

  console.log("BATCH ONE-SHOT");
  console.log("Master --now (UTC): " + nowIso);
  console.log("Output root: " + outRootAbs);
  console.log("Cases: " + cases.join(", "));

  for (const caseId of cases) {
    const outAbs = path.join(outRootAbs, caseId);
    runOneShot(caseId, nowIso, outAbs, passthrough);
  }

  console.log("\n✔ BATCH COMPLETE");
  console.log("✔ Master timestamp locked: " + nowIso);
}

try {
  main();
} catch (e: any) {
  // eslint-disable-next-line no-console
  console.error(String(e?.message ?? e));
  process.exitCode = 2;
}
