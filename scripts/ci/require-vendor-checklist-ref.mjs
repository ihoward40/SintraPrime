import { execSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

function sh(cmd) {
  return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString("utf8");
}

const baseSha = process.env.GITHUB_BASE_SHA;
const headSha = process.env.GITHUB_HEAD_SHA;
const prBody = process.env.PR_BODY || "";

const argv = process.argv.slice(2);
const writeReqIdx = argv.indexOf("--write-required-hits");
const requiredHitsOutPath = writeReqIdx !== -1 ? argv[writeReqIdx + 1] : null;

function writeRequiredHitsFile(hits) {
  if (!requiredHitsOutPath) return;
  if (!requiredHitsOutPath || requiredHitsOutPath.startsWith("--")) {
    console.error("❌ --write-required-hits requires a file path argument.");
    process.exit(2);
  }

  try {
    const dir = path.dirname(requiredHitsOutPath);
    fs.mkdirSync(dir, { recursive: true });
    const required_hits = Array.from(new Set(hits)).map(String).sort();
    fs.writeFileSync(requiredHitsOutPath, JSON.stringify({ required_hits }, null, 2));
  } catch (e) {
    console.error(`❌ Failed writing required hits file: ${requiredHitsOutPath}`);
    console.error(String(e));
    process.exit(2);
  }
}

if (!baseSha || !headSha) {
  console.error("Missing GITHUB_BASE_SHA or GITHUB_HEAD_SHA.");
  process.exit(2);
}

const CHECKLIST_NEEDLE = "docs/VENDOR_ADAPTER_GENERATOR_CHECKLIST.md";

function hasDecisionAssertion(testBody, decision) {
  const d = String(decision).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Common styles:
  // expect(res.decision).toBe("DENY")
  // expect(policy.decision).toBe('ALLOW')
  const reToBe = new RegExp(String.raw`toBe\(\s*["']${d}["']\s*\)`, "m");

  // expect(res).toMatchObject({ decision: "DENY" })
  const reObj = new RegExp(String.raw`decision\s*:\s*["']${d}["']`, "m");

  // expect(res.decision).toEqual("DENY")
  const reToEqual = new RegExp(String.raw`toEqual\(\s*["']${d}["']\s*\)`, "m");

  // Structural assertions commonly used in this repo:
  // - DENY: res.allowed === false + res.denied.kind/code
  // - APPROVAL_REQUIRED: res.allowed === false + res.requireApproval === true + res.approval.code
  // - ALLOW: res.allowed === true
  const body = String(testBody);

  if (decision === "ALLOW") {
    const reAllowedTrue = /\ballowed\b[\s\S]{0,80}\btrue\b/m;
    return reToBe.test(body) || reObj.test(body) || reToEqual.test(body) || reAllowedTrue.test(body);
  }

  if (decision === "DENY") {
    const reDenied = /\bdenied\b/m;
    const rePolicyDeniedKind = /kind\s*:\s*["']PolicyDenied["']/m;
    return reToBe.test(body) || reObj.test(body) || reToEqual.test(body) || reDenied.test(body) || rePolicyDeniedKind.test(body);
  }

  if (decision === "APPROVAL_REQUIRED") {
    const reRequireApproval = /\brequireApproval\b[\s\S]{0,40}\btrue\b/m;
    const reApprovalRequiredKind = /kind\s*:\s*["']ApprovalRequired["']/m;
    return reToBe.test(body) || reObj.test(body) || reToEqual.test(body) || reRequireApproval.test(body) || reApprovalRequiredKind.test(body);
  }

  return reToBe.test(body) || reObj.test(body) || reToEqual.test(body);
}

function getPolicyTier(blockText) {
  const m = String(blockText).match(/\bPOLICY_TIER\s*:\s*([a-z0-9_]+)\b/i);
  return m ? String(m[1]).toLowerCase() : null;
}

function requiredDecisionsForAction({ policyTier, policyBlockHasRequireApproval }) {
  const tier = String(policyTier || "").toLowerCase();
  const req = new Set(["DENY"]);

  if (tier === "deny_only") {
    return [...req];
  }

  if (tier === "approval_only") {
    req.add("APPROVAL_REQUIRED");
    return [...req];
  }

  // Default: require ALLOW unless explicitly marked deny_only/approval_only.
  req.add("ALLOW");
  if (policyBlockHasRequireApproval) req.add("APPROVAL_REQUIRED");
  return [...req];
}

async function loadPolicyRegistry() {
  try {
    const url = new URL("../../src/policy/policyRegistry.ts", import.meta.url);
    const mod = await import(url.href);
    if (!mod?.POLICY_REGISTRY || !Array.isArray(mod.POLICY_REGISTRY)) {
      throw new Error("POLICY_REGISTRY export missing or not an array");
    }
    return mod.POLICY_REGISTRY;
  } catch (e) {
    console.error("❌ Failed importing src/policy/policyRegistry.ts.");
    console.error("This gate now requires TS import support. In CI, run it as:");
    console.error("  node --import tsx ./scripts/ci/require-vendor-checklist-ref.mjs");
    console.error(String(e));
    process.exit(2);
  }
}

// Use name-status to catch renames/copies too
const diffLines = sh(`git diff --name-status ${baseSha} ${headSha}`)
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean);

const changedPaths = [];
for (const line of diffLines) {
  // M file
  // A file
  // R100 old new
  // C100 old new
  const parts = line.split(/\s+/);
  const status = parts[0] || "";
  const p = status.startsWith("R") || status.startsWith("C") ? parts[2] : parts[1];
  if (p) changedPaths.push(p);
}

const isSchemaV1 = (p) =>
  p?.startsWith("schemas/") && /(\.v1(\.[a-z0-9_-]+)?\.json)$/i.test(p);

const isPolicyTest = (p) => {
  if (!p?.startsWith("test/")) return false;
  const base = path.posix.basename(p);
  return /^policy-.*\.test\.ts$/i.test(base);
};

const schemaChanges = changedPaths.filter(isSchemaV1);
if (schemaChanges.length === 0) {
  // STRICT mode: safe no-op when nothing changed.
  writeRequiredHitsFile([]);
  process.exit(0);
}

// Rule 1: PR body references checklist doc
const hasChecklistRef =
  prBody.includes(CHECKLIST_NEEDLE) || prBody.includes("VENDOR_ADAPTER_GENERATOR_CHECKLIST");

if (!hasChecklistRef) {
  console.error("❌ Vendor schema(s) changed, but PR body does not reference required checklist.");
  console.error("Schema files:");
  for (const p of schemaChanges) console.error(` - ${p}`);
  console.error("");
  console.error("Fix: add this line to the PR description/body:");
  console.error(` - ${CHECKLIST_NEEDLE}`);
  process.exit(1);
}

// Rule 2: at least one changed policy test
const policyTestChanges = changedPaths.filter(isPolicyTest);
if (policyTestChanges.length === 0) {
  console.error("❌ Vendor schema(s) changed, but no policy test file was added/changed.");
  console.error("Schema files:");
  for (const p of schemaChanges) console.error(` - ${p}`);
  console.error("");
  console.error("Required: add or modify at least one file matching:");
  console.error(" - test/policy-*.test.ts");
  process.exit(1);
}

// Load changed policy test bodies
const tests = [];
for (const testPath of policyTestChanges) {
  try {
    // repo is checked out at HEAD in CI; read from filesystem
    tests.push({ testPath, body: fs.readFileSync(testPath, "utf8") });
  } catch (e) {
    console.error(`❌ Failed reading changed policy test file: ${testPath}`);
    console.error(String(e));
    process.exit(1);
  }
}

// Determine action names from schema filenames
const actions = [...new Set(schemaChanges.map((p) => path.posix.basename(p).replace(/\.json$/i, "")))];

// Rule 2.5: schema file must self-identify its action (prevents rename drift)
const schemaMarkerMismatches = [];
for (const schemaPath of schemaChanges) {
  const action = path.posix.basename(schemaPath).replace(/\.json$/i, "");
  try {
    const raw = fs.readFileSync(schemaPath, "utf8");
    const parsed = JSON.parse(raw);
    const marker = typeof parsed?.schema === "string" ? String(parsed.schema) : "";
    if (!marker || marker !== action) {
      schemaMarkerMismatches.push({ schemaPath, action, marker: marker || "(missing)" });
    }
  } catch (e) {
    schemaMarkerMismatches.push({ schemaPath, action, marker: `(unreadable/json error: ${String(e)})` });
  }
}

if (schemaMarkerMismatches.length > 0) {
  console.error("❌ Vendor schema(s) changed, but internal schema marker does not match filename-derived action.");
  console.error("");
  for (const m of schemaMarkerMismatches) {
    console.error(` - ${m.schemaPath}`);
    console.error(`   expected: schema=\"${m.action}\"`);
    console.error(`   found:    schema=\"${m.marker}\"`);
  }
  console.error("");
  console.error("Fix: ensure each changed schemas/**/<action>.v1*.json contains top-level:");
  console.error('  "schema": "<action>"');
  process.exit(1);
}

// Read checkPolicy.ts once
const POLICY_REGISTRY = await loadPolicyRegistry();

function derivePolicyRequirementsForAction(action) {
  const matchingEntries = [];

  for (const e of POLICY_REGISTRY) {
    if (!e || typeof e !== "object") continue;

    if (e.kind === "action" && e.action === action) matchingEntries.push(e);
    if (e.kind === "prefix" && typeof e.prefix === "string" && action.startsWith(e.prefix)) matchingEntries.push(e);
  }

  if (matchingEntries.length === 0) return null;

  const denyCodes = new Set();
  const approvalCodes = new Set();
  let requiresAllow = false;

  for (const e of matchingEntries) {
    if (e?.allow) requiresAllow = true;
    for (const c of e?.denyCodes || []) denyCodes.add(String(c));
    for (const c of e?.approvalCodes || []) approvalCodes.add(String(c));
  }

  const requiredDecisions = new Set(["DENY"]);
  if (requiresAllow) requiredDecisions.add("ALLOW");
  if (approvalCodes.size > 0) requiredDecisions.add("APPROVAL_REQUIRED");

  const allCodes = new Set([...denyCodes, ...approvalCodes]);
  return {
    denyCodes: [...denyCodes],
    approvalCodes: [...approvalCodes],
    allCodes: [...allCodes],
    requiredDecisions: [...requiredDecisions],
  };
}

// Rule 3: For each action, there must be a changed policy test that mentions:
// - the action string
// - ALL policy codes used in that action's policy block
const failures = [];
const requiredHits = new Set();

for (const action of actions) {
  const derived = derivePolicyRequirementsForAction(action);
  if (!derived) {
    failures.push({
      action,
      reason: "No policy registry entry found for action (expected POLICY_REGISTRY to define this action and its codes).",
      missing: [],
    });
    continue;
  }

  const { denyCodes, approvalCodes, allCodes, requiredDecisions } = derived;
  if (allCodes.length === 0) {
    failures.push({
      action,
      reason:
        "Policy registry entry found but contains no policy codes (deny/approval arrays are empty).",
      missing: [],
    });
    continue;
  }

  // STRICT mode: build required hits (proved by real checkPolicy() execution).
  for (const c of denyCodes) requiredHits.add(`${action}\tDENY\t${c}`);
  for (const c of approvalCodes) requiredHits.add(`${action}\tAPPROVAL_REQUIRED\t${c}`);
  if (requiredDecisions.includes("ALLOW")) requiredHits.add(`${action}\tALLOW\tALLOW`);

  // Candidate test files must include the action string
  const candidates = tests.filter((t) => t.body.includes(action));
  if (candidates.length === 0) {
    failures.push({
      action,
      reason: "No changed policy test mentions the action string.",
      missing: [action, ...allCodes],
    });
    continue;
  }

  // At least one candidate must contain ALL codes AND the required decision assertions.
  let satisfied = false;
  let bestMissing = null;

  for (const cand of candidates) {
    const missingCodes = allCodes.filter((c) => !cand.body.includes(c));
    const missingDecisions = requiredDecisions.filter((d) => !hasDecisionAssertion(cand.body, d));

    const missing = [
      ...missingCodes.map((c) => `CODE:${c}`),
      ...missingDecisions.map((d) => `DECISION:${d}`),
    ];

    if (missing.length === 0) {
      satisfied = true;
      break;
    }
    if (!bestMissing || missing.length < bestMissing.length) bestMissing = missing;
  }

  if (!satisfied) {
    failures.push({
      action,
      reason:
        "Changed policy test(s) mention action but do not include all required codes AND decision assertions.",
      missing: bestMissing || [],
      candidates: candidates.map((c) => c.testPath),
    });
  }
}

if (failures.length > 0) {
  console.error("❌ Vendor schema governance failed (no-fake-tests mode).");
  console.error("");
  console.error("Schemas changed:");
  for (const p of schemaChanges) console.error(` - ${p}`);
  console.error("");
  console.error("Failures:");
  for (const f of failures) {
    console.error(`\n- Action: ${f.action}`);
    console.error(`  Reason: ${f.reason}`);
    if (f.candidates?.length) {
      console.error(`  Candidate test files:`);
      for (const p of f.candidates) console.error(`    - ${p}`);
    }
    if (f.missing?.length) {
      console.error(
        "  Missing strings (must appear in at least one changed policy test file that also mentions the action):"
      );
      for (const s of f.missing) console.error(`    - ${s}`);
    }
  }
  console.error("");
  console.error("Fix pattern (fastest):");
  console.error('  const ACTION = "integrations.webhook.ingest.v1";');
  console.error('  const CODES = ["CAPABILITY_MISSING", "WEBHOOK_INGEST_PAYLOAD_INVALID"];');
  console.error("  // reference ACTION + each code in assertions so they exist literally in-file");
  process.exit(1);
}

writeRequiredHitsFile(requiredHits);

process.exit(0);
