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
    "one-shot-build.ts",
    "",
    "Required:",
    "  --case <CASE_ID>",
    "  --now  <ISO_UTC_TIMESTAMP>",
    "",
    "Optional:",
    "  --out <path>        (default: deliverables/v1.0)",
    "  --clean             (remove one-shot output subfolders before running)",
    "  --dry-run           (print resolved commands/paths; do not execute or write)",
    "",
    "Notes:",
    "  - Writes only under the output root (no dist/).",
    "  - Fails closed: mirror verification must PASS.",
  ].join("\n");
}

function rmrf(absPath: string) {
  if (!fs.existsSync(absPath)) return;
  fs.rmSync(absPath, { recursive: true, force: true });
}

function ensureDir(absDir: string) {
  fs.mkdirSync(absDir, { recursive: true });
}

function runNodeTsx(scriptRel: string, args: string[]) {
  const node = process.execPath;
  const allArgs = ["--import", "tsx", scriptRel, ...args];
  const cmd = ["node", ...allArgs].join(" ");
  console.log("\n> " + cmd);
  execFileSync(node, allArgs, { stdio: "inherit" });
}

function safeGitInfo(): { commit: string; dirty: boolean } | "unavailable" {
  try {
    const commit = execFileSync("git", ["rev-parse", "HEAD"], { stdio: ["ignore", "pipe", "ignore"] })
      .toString("utf8")
      .trim();
    if (!commit) return "unavailable";

    const porcelain = execFileSync("git", ["status", "--porcelain"], { stdio: ["ignore", "pipe", "ignore"] })
      .toString("utf8")
      .trim();
    return { commit, dirty: porcelain.length > 0 };
  } catch {
    return "unavailable";
  }
}

function writeJson(absPath: string, obj: any) {
  ensureDir(path.dirname(absPath));
  fs.writeFileSync(absPath, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function writeText(absPath: string, text: string) {
  ensureDir(path.dirname(absPath));
  fs.writeFileSync(absPath, text.replace(/\r?\n/g, "\n").trimEnd() + "\n", "utf8");
}

function formatNodeCommand(scriptRel: string, args: string[]) {
  const parts = ["node", "--import", "tsx", scriptRel, ...args];
  return parts.join(" ");
}

function main() {
  const argv = process.argv.slice(2);

  const caseArg = argValue(argv, "--case");
  const nowArg = argValue(argv, "--now");
  const dryRun = argv.includes("--dry-run");

  if (process.env.CI && !dryRun) {
    console.error("CI guardrail: only --dry-run is permitted under CI.");
    process.exit(2);
  }

  if (!caseArg || !nowArg) {
    console.error(usage());
    process.exit(2);
  }

  const caseId = String(caseArg).trim();
  if (!caseId) {
    console.error(usage());
    process.exit(2);
  }

  const nowIso = requireIso(nowArg, "--now");
  const outRel = argValue(argv, "--out") || path.join("deliverables", "v1.0");
  const doClean = argv.includes("--clean");

  const outAbs = path.resolve(process.cwd(), outRel);

  const outAnomalyAbs = path.join(outAbs, "anomaly");
  const outTrainingAbs = path.join(outAbs, "training");
  const outKitsAbs = path.join(outAbs, "public_verification_kits");
  const outMirrorAbs = path.join(outAbs, "mirror_site");

  const provenanceAbs = path.join(outAbs, "RUN_PROVENANCE.json");
  const clerkReadmeAbs = path.join(outAbs, "README_CLERK.txt");

  const cmdAnomaly = formatNodeCommand("scripts/anomaly/demo-irs-anomaly-detection.ts", [
    "--exports",
    path.join("intake", "irs", "_exports"),
    "--out",
    outAnomalyAbs,
    "--now",
    nowIso,
  ]);

  const cmdTraining = formatNodeCommand("scripts/training/build-clerk-audit-training-pack.ts", [
    "--case",
    caseId,
    "--bundle",
    path.join("bundles", caseId),
    "--out",
    outTrainingAbs,
    "--now",
    nowIso,
  ]);

  const cmdKit = formatNodeCommand("scripts/export-public-verification-kit.ts", [
    "--bundle",
    path.join("bundles", caseId),
    "--out",
    path.join(outKitsAbs, `Verification_Kit_${caseId}.zip`),
    "--now",
    nowIso,
  ]);

  const cmdMirror = formatNodeCommand("scripts/mirror/build-mirror-site.ts", [
    "--kits",
    outKitsAbs,
    "--out",
    outMirrorAbs,
    "--now",
    nowIso,
  ]);

  const cmdVerify = formatNodeCommand("scripts/mirror/verify-mirror-site.ts", ["--site", outMirrorAbs]);

  if (dryRun) {
    console.log("\nONE-SHOT BUILD (DRY RUN)");
    console.log("Locked --now (UTC): " + nowIso);
    console.log("Case: " + caseId);
    console.log("Output root: " + outAbs);
    console.log("Would write: " + provenanceAbs);
    console.log("Would write: " + clerkReadmeAbs);
    console.log("\nCommands:");
    console.log("> " + cmdAnomaly);
    console.log("> " + cmdTraining);
    console.log("> " + cmdKit);
    console.log("> " + cmdMirror);
    console.log("> " + cmdVerify);
    return;
  }

  if (doClean) {
    rmrf(outAnomalyAbs);
    rmrf(outTrainingAbs);
    rmrf(outKitsAbs);
    rmrf(outMirrorAbs);
  }

  ensureDir(outAbs);

  // Provenance must be emitted before any build step.
  const provenance = {
    case: caseId,
    now_utc: nowIso,
    git: safeGitInfo(),
    node: {
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    runner: "one-shot-build.ts",
    outputs_root: outRel.replace(/\\/g, "/"),
  };
  writeJson(provenanceAbs, provenance);

  // 1) anomaly detection
  runNodeTsx("scripts/anomaly/demo-irs-anomaly-detection.ts", [
    "--exports",
    path.join("intake", "irs", "_exports"),
    "--out",
    outAnomalyAbs,
    "--now",
    nowIso,
  ]);

  // 2) training pack
  runNodeTsx("scripts/training/build-clerk-audit-training-pack.ts", [
    "--case",
    caseId,
    "--bundle",
    path.join("bundles", caseId),
    "--out",
    outTrainingAbs,
    "--now",
    nowIso,
  ]);

  // 3) public verification kit
  runNodeTsx("scripts/export-public-verification-kit.ts", [
    "--bundle",
    path.join("bundles", caseId),
    "--out",
    path.join(outKitsAbs, `Verification_Kit_${caseId}.zip`),
    "--now",
    nowIso,
  ]);

  // 4) mirror site build
  runNodeTsx("scripts/mirror/build-mirror-site.ts", [
    "--kits",
    outKitsAbs,
    "--out",
    outMirrorAbs,
    "--now",
    nowIso,
  ]);

  // 5) offline verify (gate)
  runNodeTsx("scripts/mirror/verify-mirror-site.ts", ["--site", outMirrorAbs]);

  // Clerk readme must reflect the PASS gate result.
  const clerkReadme = [
    "CLERK README (READ-ONLY)",
    "",
    "What this package is:",
    "- A time-locked, self-verifying set of procedural artifacts for review.",
    "",
    "What this package does not do:",
    "- Does not file anything.",
    "- Does not make legal or factual claims about the case.",
    "",
    "Locked timestamp (UTC):",
    nowIso,
    "",
    "Verification performed:",
    "- Mirror feed signature verified (Ed25519).",
    "- Referenced blob SHA-256 verified.",
    "",
    "Where hashes/signatures live:",
    "- Mirror feed: mirror_site/feed/latest.json",
    "- Mirror signature: mirror_site/feed/latest.sig",
    "- Mirror public key: mirror_site/feed/PUBLIC_KEY.pem",
    "- Content-addressed blobs: mirror_site/blobs/",
    "- Training hashes: training/TRAINING_PACK_MANIFEST.json",
    "- Verification kit ZIP: public_verification_kits/Verification_Kit_" + caseId + ".zip",
    "",
    "Verification result:",
    "PASS",
  ].join("\n");
  writeText(clerkReadmeAbs, clerkReadme);

  console.log("\n✔ ONE-SHOT BUILD COMPLETE");
  console.log("✔ Timestamp locked: " + nowIso);
  console.log("✔ Output root: " + outAbs);
}

main();
