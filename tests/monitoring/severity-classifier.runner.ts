/**
 * Simple test runner for severity classifier
 * Tests key scenarios to ensure classification logic works correctly
 */

import { classifyRun } from "../../src/monitoring/severity-classifier.js";
import type { RunRecord, PolicyConfig } from "../../src/monitoring/types.js";
import { JobType, RunStatus, SeverityLevel, MisconfigLikelihood } from "../../src/monitoring/types.js";
import fs from "node:fs";
import path from "node:path";

// Load policy
const policyPath = path.join(process.cwd(), "config", "sintraprime-policy.json");
const policy: PolicyConfig = JSON.parse(fs.readFileSync(policyPath, "utf-8"));

// Test helper
function runTest(
  name: string,
  runRecord: RunRecord,
  baseline: number,
  expectedSeverity: SeverityLevel,
  expectedMisconfig: MisconfigLikelihood
) {
  console.log(`\nTest: ${name}`);
  const classification = classifyRun(runRecord, baseline, policy);

  const severityMatch = classification.severity === expectedSeverity;
  const misconfigMatch = classification.misconfigLikelihood === expectedMisconfig;

  console.log(
    `  Expected Severity: ${expectedSeverity}, Got: ${classification.severity} ${severityMatch ? "✓" : "✗"}`
  );
  console.log(
    `  Expected Misconfig: ${expectedMisconfig}, Got: ${classification.misconfigLikelihood} ${misconfigMatch ? "✓" : "✗"}`
  );
  console.log(`  Variance: ${classification.varianceMultiplier.toFixed(2)}×`);
  console.log(`  Risk Flags: ${classification.riskFlags.join(", ") || "None"}`);

  if (!severityMatch || !misconfigMatch) {
    console.error(`  FAILED`);
    return false;
  }

  console.log(`  PASSED`);
  return true;
}

// Load fixtures
const fixturesDir = path.join(process.cwd(), "tests", "monitoring", "fixtures");

console.log("=== Severity Classifier Tests ===\n");

let passed = 0;
let failed = 0;

// Test 1: High credit spike with retry loop -> SEV1
try {
  const fixture = JSON.parse(
    fs.readFileSync(path.join(fixturesDir, "high-credit-spike.json"), "utf-8")
  ) as RunRecord;
  if (runTest("High credit spike (retry loop)", fixture, 320, SeverityLevel.SEV1, MisconfigLikelihood.High)) {
    passed++;
  } else {
    failed++;
  }
} catch (err) {
  console.error(`Test failed: ${err}`);
  failed++;
}

// Test 2: Legit backfill -> SEV3 or SEV4 (depending on variance)
try {
  const fixture = JSON.parse(
    fs.readFileSync(path.join(fixturesDir, "legit-backfill.json"), "utf-8")
  ) as RunRecord;
  // Legit flags should reduce misconfig likelihood
  if (runTest("Legit batch job", fixture, 400, SeverityLevel.SEV1, MisconfigLikelihood.Low)) {
    passed++;
  } else {
    failed++;
  }
} catch (err) {
  console.error(`Test failed: ${err}`);
  failed++;
}

// Test 3: PII exposure -> SEV0
try {
  const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, "pii-exposure.json"), "utf-8")) as RunRecord;
  if (runTest("PII exposure (critical)", fixture, 200, SeverityLevel.SEV0, MisconfigLikelihood.High)) {
    passed++;
  } else {
    failed++;
  }
} catch (err) {
  console.error(`Test failed: ${err}`);
  failed++;
}

// Test 4: Normal run -> SEV4
try {
  const fixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, "normal-run.json"), "utf-8")) as RunRecord;
  if (runTest("Normal operation", fixture, 150, SeverityLevel.SEV4, MisconfigLikelihood.Low)) {
    passed++;
  } else {
    failed++;
  }
} catch (err) {
  console.error(`Test failed: ${err}`);
  failed++;
}

// Test 5: Retry loop misconfig -> SEV1
try {
  const fixture = JSON.parse(
    fs.readFileSync(path.join(fixturesDir, "retry-loop-misconfig.json"), "utf-8")
  ) as RunRecord;
  if (runTest("Retry loop misconfig", fixture, 200, SeverityLevel.SEV1, MisconfigLikelihood.High)) {
    passed++;
  } else {
    failed++;
  }
} catch (err) {
  console.error(`Test failed: ${err}`);
  failed++;
}

// Summary
console.log(`\n=== Test Summary ===`);
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
