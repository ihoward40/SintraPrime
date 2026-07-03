#!/usr/bin/env node
/**
 * readiness-score.mjs
 *
 * Computes and updates the litigation readiness score for a case repository.
 *
 * Usage:
 *   node scripts/case/readiness-score.mjs <CASE_ID> [--write]
 *
 * Options:
 *   --write   Write updated score back to LITIGATION-READINESS-SCORE.json
 *
 * Example:
 *   node scripts/case/readiness-score.mjs CASE-666234B709 --write
 *
 * Scoring Model: LitigationReadinessModel-v1
 *
 * Categories and weights:
 *   evidence        25% — document completeness and integrity
 *   timeline        15% — chronology completeness
 *   authentication  20% — cryptographic verification
 *   correspondence  15% — communication documentation
 *   preservation    15% — safeguards and locks
 *   missing_docs    10% — inverse score for missing items
 *
 * Grade thresholds:
 *   A: 90-100  Ready for immediate action
 *   B: 80-89   Substantially ready, minor gaps
 *   C: 70-79   Conditionally ready, review required
 *   D: 60-69   Significant gaps, not recommended
 *   F: 0-59    Not ready, substantial work required
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..", "..");

function usage() {
  process.stderr.write(
    "Usage: node scripts/case/readiness-score.mjs <CASE_ID> [--write]\n\n" +
    "Computes litigation readiness score from evidence repository state.\n" +
    "Use --write to persist the updated score to LITIGATION-READINESS-SCORE.json.\n"
  );
  process.exit(2);
}

function readJson(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function countSectionFiles(caseDir, section) {
  const dir = path.join(caseDir, section);
  if (!fs.existsSync(dir)) return 0;
  return fs
    .readdirSync(dir)
    .filter((f) => f !== "README.md" && f.endsWith(".md"))
    .length;
}

function countCustodyEntries(caseDir) {
  const p = path.join(caseDir, "audit", "CHAIN-OF-CUSTODY.jsonl");
  if (!fs.existsSync(p)) return 0;
  return fs.readFileSync(p, "utf8").split(/\r?\n/).filter(Boolean).length;
}

function gradeFromScore(score) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function readinessLevelFromScore(score) {
  if (score >= 90) return "READY — Proceed with external action (approval still required)";
  if (score >= 80) return "SUBSTANTIALLY READY — Minor gaps, human review recommended";
  if (score >= 70) return "CONDITIONALLY READY — Significant review required before action";
  if (score >= 60) return "NOT RECOMMENDED — Significant gaps present";
  return "NOT READY — Substantial evidence work required";
}

function computeScore(manifest, caseDir) {
  const items = manifest?.items ?? [];
  const sections = manifest?.sections ?? {};

  // --- Evidence score (0-100, weight 0.25) ---
  const intakeCount = countSectionFiles(caseDir, "01-intake");
  const creditCount = countSectionFiles(caseDir, "02-credit-reports");
  const origCreditorCount = countSectionFiles(caseDir, "03-original-creditor");
  const collectionCount = countSectionFiles(caseDir, "04-collection-agency");
  const coreEvidenceCount = countSectionFiles(caseDir, "06-evidence");

  const authenticatedItems = items.filter((i) => i.status === "AUTHENTICATED").length;
  const hashVerifiedItems = items.filter(
    (i) => i.sha256_hash && !i.sha256_hash.startsWith("PLACEHOLDER")
  ).length;

  let evidenceScore = 0;
  if (intakeCount > 0) evidenceScore += 10;
  if (creditCount >= 3) evidenceScore += 20;
  else if (creditCount >= 1) evidenceScore += 10;
  if (origCreditorCount >= 2) evidenceScore += 20;
  else if (origCreditorCount >= 1) evidenceScore += 10;
  if (collectionCount >= 1) evidenceScore += 10;
  if (coreEvidenceCount >= 1) evidenceScore += 20;
  if (authenticatedItems >= 3) evidenceScore += 20;
  else if (authenticatedItems >= 1) evidenceScore += 10;
  evidenceScore = Math.min(100, evidenceScore);

  // --- Timeline score (0-100, weight 0.15) ---
  const deadlineCount = countSectionFiles(caseDir, "11-deadlines");
  const deadlineReadme = fs.existsSync(path.join(caseDir, "11-deadlines", "README.md"))
    ? fs.readFileSync(path.join(caseDir, "11-deadlines", "README.md"), "utf8")
    : "";
  const hasConfirmedDeadline = deadlineReadme.includes("DL-001") && !deadlineReadme.includes("TBD — confirm");
  const hasResponseDeadline = hasConfirmedDeadline;

  let timelineScore = 0;
  if (intakeCount > 0) timelineScore += 10;
  if (hasConfirmedDeadline) timelineScore += 30;
  if (items.some((i) => i.section === "05-correspondence")) timelineScore += 25;
  if (deadlineCount > 0 || deadlineReadme.length > 100) timelineScore += 10;
  timelineScore = Math.min(100, timelineScore);

  // --- Authentication score (0-100, weight 0.20) ---
  const custodyEntries = countCustodyEntries(caseDir);
  let authScore = 0;
  if (custodyEntries >= 1) authScore += 15;
  if (hashVerifiedItems >= items.length && items.length > 0) authScore += 40;
  else if (hashVerifiedItems > 0) authScore += 20;
  if (custodyEntries >= 2) authScore += 10;
  if (authenticatedItems >= 1) authScore += 25;
  else if (hashVerifiedItems >= 1) authScore += 10;
  authScore = Math.min(100, authScore);

  // --- Correspondence score (0-100, weight 0.15) ---
  const corrCount = countSectionFiles(caseDir, "05-correspondence");
  const respCount = countSectionFiles(caseDir, "10-responses");
  const submittedCount = countSectionFiles(caseDir, "09-submitted");
  let corrScore = 0;
  if (corrCount >= 3) corrScore += 30;
  else if (corrCount >= 1) corrScore += 15;
  if (submittedCount >= 1) corrScore += 20;
  if (respCount >= 1) corrScore += 25;
  if (respCount >= 2) corrScore += 25;
  corrScore = Math.min(100, corrScore);

  // --- Preservation score (0-100, weight 0.15) ---
  let preservationScore = 0;
  if (custodyEntries >= 2) preservationScore += 20;
  else if (custodyEntries >= 1) preservationScore += 10;
  const allLocked = items.every((i) => i.external_action_locked === true);
  if (allLocked && items.length > 0) preservationScore += 20;
  else if (items.length === 0) preservationScore += 0;
  else preservationScore += 5;
  if (hashVerifiedItems === items.length && items.length > 0) preservationScore += 20;
  else if (hashVerifiedItems > 0) preservationScore += 10;
  // Governance constraints doc present
  if (fs.existsSync(path.join(caseDir, "GOVERNANCE-CONSTRAINTS.md"))) preservationScore += 20;
  // Audit receipt present
  if (fs.existsSync(path.join(caseDir, "audit", "AUDIT-RECEIPT.md"))) preservationScore += 20;
  preservationScore = Math.min(100, preservationScore);

  // --- Missing documents (0-100, weight 0.10) ---
  const missingItems = [];
  if (creditCount === 0) missingItems.push("Credit bureau reports (all three bureaus)");
  if (creditCount === 1) missingItems.push("Credit bureau reports (2 of 3 bureaus missing)");
  if (creditCount === 2) missingItems.push("Credit bureau report (1 of 3 bureaus missing)");
  if (origCreditorCount === 0) {
    missingItems.push("Original creditor account agreement");
    missingItems.push("Original creditor account statements");
  }
  if (collectionCount === 0) missingItems.push("Collection agency debt validation letter");
  if (items.filter((i) => i.section === "04-collection-agency").length === 0)
    missingItems.push("Proof of debt ownership/assignment");
  if (countSectionFiles(caseDir, "07-legal-research") === 0)
    missingItems.push("FDCPA/FCRA relevant statute excerpts");
  if (corrCount === 0) missingItems.push("Prior dispute correspondence");

  const penaltyPerMissing = 5;
  const missingScore = Math.max(0, 100 - missingItems.length * penaltyPerMissing);

  // --- Weighted overall ---
  const weights = {
    evidence: 0.25,
    timeline: 0.15,
    authentication: 0.20,
    correspondence: 0.15,
    preservation: 0.15,
    missing_documents: 0.10,
  };

  const weightedScore = Math.round(
    evidenceScore * weights.evidence +
    timelineScore * weights.timeline +
    authScore * weights.authentication +
    corrScore * weights.correspondence +
    preservationScore * weights.preservation +
    missingScore * weights.missing_documents
  );

  return {
    schema_version: "1.0.0",
    case_id: manifest.case_id,
    generated_at: new Date().toISOString(),
    scoring_model: "LitigationReadinessModel-v1",
    categories: {
      evidence: {
        label: "Evidence",
        description: "Completeness, authenticity, and integrity of evidentiary documents",
        score: evidenceScore,
        max_score: 100,
        weight: weights.evidence,
        notes: `${items.length} total items; ${authenticatedItems} authenticated; ${hashVerifiedItems} hash-verified.`,
        contributing_factors: [
          { factor: "Intake documents", points: intakeCount > 0 ? 10 : 0, max: 10 },
          { factor: "Credit reports (3 bureaus)", points: creditCount >= 3 ? 20 : creditCount >= 1 ? 10 : 0, max: 20 },
          { factor: "Original creditor documents", points: origCreditorCount >= 2 ? 20 : origCreditorCount >= 1 ? 10 : 0, max: 20 },
          { factor: "Collection agency records", points: collectionCount >= 1 ? 10 : 0, max: 10 },
          { factor: "Authenticated core evidence", points: coreEvidenceCount >= 1 ? 20 : 0, max: 20 },
          { factor: "Authenticated items", points: authenticatedItems >= 3 ? 20 : authenticatedItems >= 1 ? 10 : 0, max: 20 },
        ],
      },
      timeline: {
        label: "Timeline",
        description: "Completeness of the case chronology and key event documentation",
        score: timelineScore,
        max_score: 100,
        weight: weights.timeline,
        notes: `${hasConfirmedDeadline ? "Response deadline confirmed." : "Response deadline NOT confirmed — action required."}`,
        contributing_factors: [
          { factor: "Intake date recorded", points: intakeCount > 0 ? 10 : 0, max: 10 },
          { factor: "Response deadline confirmed", points: hasConfirmedDeadline ? 30 : 0, max: 30 },
          { factor: "Correspondence timeline", points: items.some((i) => i.section === "05-correspondence") ? 25 : 0, max: 25 },
          { factor: "Deadline registry populated", points: deadlineCount > 0 ? 10 : 0, max: 10 },
        ],
      },
      authentication: {
        label: "Authentication",
        description: "Cryptographic and procedural authentication of evidence items",
        score: authScore,
        max_score: 100,
        weight: weights.authentication,
        notes: `${custodyEntries} custody log entries; ${hashVerifiedItems}/${items.length} items hash-verified.`,
        contributing_factors: [
          { factor: "Chain-of-custody log active", points: custodyEntries >= 1 ? 15 : 0, max: 15 },
          { factor: "SHA-256 hashes verified", points: hashVerifiedItems >= items.length && items.length > 0 ? 40 : hashVerifiedItems > 0 ? 20 : 0, max: 40 },
          { factor: "Hash chain integrity entries", points: custodyEntries >= 2 ? 10 : 0, max: 10 },
          { factor: "Items authenticated", points: authenticatedItems >= 1 ? 25 : hashVerifiedItems >= 1 ? 10 : 0, max: 25 },
        ],
      },
      correspondence: {
        label: "Correspondence",
        description: "Completeness of documented communications with all parties",
        score: corrScore,
        max_score: 100,
        weight: weights.correspondence,
        notes: `${corrCount} correspondence items; ${submittedCount} submitted; ${respCount} responses received.`,
        contributing_factors: [
          { factor: "Incoming/outgoing correspondence", points: corrCount >= 3 ? 30 : corrCount >= 1 ? 15 : 0, max: 30 },
          { factor: "Submitted documents", points: submittedCount >= 1 ? 20 : 0, max: 20 },
          { factor: "Responses received", points: respCount >= 2 ? 50 : respCount >= 1 ? 25 : 0, max: 50 },
        ],
      },
      preservation: {
        label: "Preservation",
        description: "Evidence preservation measures and integrity safeguards",
        score: preservationScore,
        max_score: 100,
        weight: weights.preservation,
        notes: `Audit log: ${custodyEntries} entries. External locks: ${allLocked ? "all locked" : "some unlocked"}.`,
        contributing_factors: [
          { factor: "Append-only audit log established", points: custodyEntries >= 2 ? 20 : custodyEntries >= 1 ? 10 : 0, max: 20 },
          { factor: "External action locks enforced", points: allLocked && items.length > 0 ? 20 : 5, max: 20 },
          { factor: "Hash integrity monitoring", points: hashVerifiedItems === items.length && items.length > 0 ? 20 : hashVerifiedItems > 0 ? 10 : 0, max: 20 },
          { factor: "Governance constraints documented", points: fs.existsSync(path.join(caseDir, "GOVERNANCE-CONSTRAINTS.md")) ? 20 : 0, max: 20 },
          { factor: "Audit receipt maintained", points: fs.existsSync(path.join(caseDir, "audit", "AUDIT-RECEIPT.md")) ? 20 : 0, max: 20 },
        ],
      },
      missing_documents: {
        label: "Missing Documents",
        description: "Count of identified missing or outstanding documents (lower count = higher score)",
        count: missingItems.length,
        penalty_per_missing: penaltyPerMissing,
        score: missingScore,
        max_score: 100,
        weight: weights.missing_documents,
        notes: `${missingItems.length} missing document categories identified.`,
        missing_items: missingItems,
      },
    },
    overall: {
      weighted_score: weightedScore,
      max_score: 100,
      grade: gradeFromScore(weightedScore),
      readiness_level: readinessLevelFromScore(weightedScore),
      notes: `Score computed from ${items.length} evidence items across all sections.`,
    },
    scoring_formula: {
      description: "weighted_score = sum(category.score * category.weight) for all categories",
      weights,
      grade_thresholds: {
        A: "90-100 — Ready for immediate action (approval still required)",
        B: "80-89 — Substantially ready, minor gaps",
        C: "70-79 — Conditionally ready, review required",
        D: "60-69 — Significant gaps, not recommended for action",
        F: "0-59 — Not ready, substantial evidence work required",
      },
    },
    last_computed: new Date().toISOString(),
    next_review_trigger: "After each evidence import or status change",
  };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    process.stdout.write(
      "Usage: node scripts/case/readiness-score.mjs <CASE_ID> [--write]\n"
    );
    process.exit(0);
  }

  const caseId = argv[0] && !argv[0].startsWith("-") ? argv[0].trim() : "";
  if (!caseId) usage();

  const writeFlag = argv.includes("--write");

  const caseDir = path.join(REPO_ROOT, "cases", caseId);
  if (!fs.existsSync(caseDir)) {
    process.stderr.write(`Error: Case directory not found: ${caseDir}\n`);
    process.exit(1);
  }

  const manifest = readJson(path.join(caseDir, "EVIDENCE-MANIFEST.json"));
  if (!manifest) {
    process.stderr.write(`Error: EVIDENCE-MANIFEST.json not found in ${caseDir}\n`);
    process.exit(1);
  }

  const score = computeScore(manifest, caseDir);

  if (writeFlag) {
    const scorePath = path.join(caseDir, "LITIGATION-READINESS-SCORE.json");
    fs.writeFileSync(scorePath, JSON.stringify(score, null, 2) + "\n", "utf8");
    process.stderr.write(`Score written to: ${scorePath}\n`);
  }

  process.stdout.write(JSON.stringify(score, null, 2) + "\n");
}

main().catch((err) => {
  process.exitCode = 1;
  process.stderr.write(String(err?.stack || err?.message || err) + "\n");
});
