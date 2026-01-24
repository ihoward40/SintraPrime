#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";

function die(msg) {
  console.error(`\n[skills:revoke] ❌ ${msg}\n`);
  process.exit(1);
}
function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}
function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
}
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}
function nowIso() {
  return new Date().toISOString();
}
function runNode(scriptPath, args) {
  execFileSync(process.execPath, [scriptPath, ...args], { stdio: "inherit" });
}
function usage() {
  console.log(`
Usage:
  npm run skills:revoke -- --name <skill_name> --commit <sha> --reason "why" [--actor <name>] [--note "extra"]

Example:
  npm run skills:revoke -- --name stitch-skills --commit <FULL_SHA> --reason "Repo added postinstall script" --actor "Isiah"
`);
  process.exit(1);
}

const argv = process.argv.slice(2);
const get = (k) => {
  const i = argv.indexOf(k);
  return i >= 0 ? argv[i + 1] : null;
};

const name = get("--name");
const commit = get("--commit");
const reason = get("--reason");
const note = get("--note") || "";
const actor =
  get("--actor") ||
  process.env.SINTRA_ACTOR ||
  process.env.USER ||
  process.env.USERNAME ||
  "unknown";

if (!name || !commit || !reason) usage();
if (commit.length < 20) die("Commit SHA looks too short. Use the full pinned SHA.");

const root = process.cwd();
const lockPath = path.join(root, "skills.lock.json");
if (!fs.existsSync(lockPath)) die("skills.lock.json not found.");

const lock = readJson(lockPath);
lock.skills ||= [];

const entry = lock.skills.find((s) => s.name === name && s.commit === commit);
if (!entry) die(`Skill not found in skills.lock.json: ${name}@${commit}`);
if (!entry.evidence_dir) die(`Missing evidence_dir for ${name}@${commit}`);

const evidenceDir = path.join(root, entry.evidence_dir);
if (!fs.existsSync(evidenceDir)) die(`Evidence dir missing: ${entry.evidence_dir}`);

ensureDir(evidenceDir);

// Require at least scan baseline so revocations are tied to a scan receipt
const required = [
  "scan.report.json",
  "scan.report.sha256",
  "scan.report.md",
  "intake.receipt.json"
];
for (const f of required) {
  const p = path.join(evidenceDir, f);
  if (!fs.existsSync(p)) die(`Missing required artifact (intake/scan baseline): ${path.join(entry.evidence_dir, f)}`);
}

// Write revocation certs
const priorStatus = entry.status || "unknown";
const revokedAt = nowIso();

const certJson = {
  schema_version: "skills.revocation.v1",
  revoked_at: revokedAt,
  revoked_by: actor,
  skill: { name: entry.name, repo: entry.repo, commit: entry.commit },
  prior_status: priorStatus,
  reason,
  notes: note
};

const certMd = [
  "# Skill Revocation Certificate",
  "",
  `**Skill:** ${entry.name}`,
  `**Repo:** ${entry.repo}`,
  `**Commit:** ${entry.commit}`,
  `**Revoked by:** ${actor}`,
  `**Revoked at:** ${revokedAt}`,
  "",
  "## Reason",
  reason,
  "",
  "## Notes",
  note || "(none)",
  ""
].join("\n");

const mdPath = path.join(evidenceDir, "revocation.cert.md");
const jsonPath = path.join(evidenceDir, "revocation.cert.json");
const shaPath = path.join(evidenceDir, "revocation.cert.sha256");

fs.writeFileSync(mdPath, certMd, "utf8");
writeJson(jsonPath, certJson);

const mdBuf = fs.readFileSync(mdPath);
const jsonBuf = fs.readFileSync(jsonPath);
fs.writeFileSync(
  shaPath,
  `${sha256(mdBuf)}  revocation.cert.md\n${sha256(jsonBuf)}  revocation.cert.json\n`,
  "utf8"
);

// Update lock entry
entry.revoked = true;
entry.revoked_by = actor;
entry.revoked_at = revokedAt;
entry.revoked_on = revokedAt.slice(0, 10);
entry.revoked_reason = reason;
entry.revoked_notes = note;
entry.prior_status = priorStatus;
entry.status = "revoked";
entry.approved = false; // explicitly not trusted anymore

writeJson(lockPath, lock);

// Evidence log event (preferred)
const evidenceScript = path.join(root, "scripts", "skills-evidence.mjs");
if (fs.existsSync(evidenceScript)) {
  runNode(evidenceScript, [
    "--event", "revoke",
    "--name", entry.name,
    "--repo", entry.repo,
    "--commit", entry.commit,
    "--artifact_dir", entry.evidence_dir,
    "--actor", actor
  ]);
} else {
  // Fallback: append ndjson directly
  const evDir = path.join(root, "evidence");
  ensureDir(evDir);
  const logPath = path.join(evDir, "evidence-log.ndjson");
  const ev = {
    ts: revokedAt,
    event: "revoke",
    actor,
    name: entry.name,
    repo: entry.repo,
    commit: entry.commit,
    artifact_dir: entry.evidence_dir,
    reason
  };
  fs.appendFileSync(logPath, JSON.stringify(ev) + "\n", "utf8");
}

console.log("\n==================== SKILL REVOCATION RECEIPT ====================");
console.log(`Skill:    ${entry.name}`);
console.log(`Repo:     ${entry.repo}`);
console.log(`Commit:   ${entry.commit}`);
console.log(`Status:   revoked ⛔`);
console.log(`Actor:    ${actor}`);
console.log(`Reason:   ${reason}`);
console.log(`Evidence: ${entry.evidence_dir}`);
console.log("Artifacts:");
console.log(`  - ${path.join(entry.evidence_dir, "revocation.cert.md").replaceAll("\\", "/")}`);
console.log(`  - ${path.join(entry.evidence_dir, "revocation.cert.json").replaceAll("\\", "/")}`);
console.log(`  - ${path.join(entry.evidence_dir, "revocation.cert.sha256").replaceAll("\\", "/")}`);
console.log("===============================================================\n");
