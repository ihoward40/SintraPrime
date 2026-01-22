import fs from "node:fs";
import path from "node:path";

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const ROOT = process.cwd();

const REQUIRED_FILES = [
  "src/integrations/drive/ensurePath.ts",
  "src/integrations/drive/policy.ts",
  "src/integrations/drive/receipts.ts",
  "src/integrations/drive/capabilitiesRegistry.ts",
  "src/utils/fsLock.ts",
  "src/cli/driveOperator.ts",
  "src/cli/run-command.ts",
  "config/drives.json",
];

for (const f of REQUIRED_FILES) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs)) fail(`READBACK_FAIL: DRIVE_TOOLING_MISSING (${f})`);
}

// Guardrails: config defaults must require allowlist.
{
  const abs = path.join(ROOT, "config/drives.json");
  const json = JSON.parse(fs.readFileSync(abs, "utf8"));
  if (!json?.defaults || json.defaults.requireRootAllowlist !== true) {
    fail("READBACK_FAIL: DRIVE_TOOLING_GUARDRAILS_MISSING");
  }
}

// Guardrails: receipts must be hashed (look for sha256Hex usage).
{
  const abs = path.join(ROOT, "src/integrations/drive/receipts.ts");
  const text = fs.readFileSync(abs, "utf8");
  if (!text.includes("sha256Hex") && !text.includes("sha256")) {
    fail("READBACK_FAIL: DRIVE_TOOLING_GUARDRAILS_MISSING");
  }
}

// Guardrails: Make proxy network usage must live in adapters/ (no-direct-fetch allowlist).
{
  const abs = path.join(ROOT, "src/integrations/drive/providers/makeProxy.ts");
  const text = fs.readFileSync(abs, "utf8");
  if (text.includes("fetch(")) {
    fail("READBACK_FAIL: DRIVE_TOOLING_DIRECT_FETCH_FORBIDDEN");
  }
}

// Receipt governance: events.jsonl + drive_capabilities.json must be colocated in receipts dir
// and protected against concurrent writers.
{
  const receiptsAbs = path.join(ROOT, "src/integrations/drive/receipts.ts");
  const receiptsText = fs.readFileSync(receiptsAbs, "utf8");
  if (!receiptsText.includes('path.join(receiptsDir, "events.jsonl")')) {
    fail("READBACK_FAIL: DRIVE_TOOLING_EVENTS_PATH_NOT_IN_RECEIPTS_DIR");
  }
  if (!receiptsText.includes("withFileLockSync") || !receiptsText.includes(".lock")) {
    fail("READBACK_FAIL: DRIVE_TOOLING_EVENTS_LOCK_MISSING");
  }
  if (!receiptsText.includes("schema_version")) {
    fail("READBACK_FAIL: DRIVE_TOOLING_RECEIPT_SCHEMA_VERSION_MISSING");
  }

  const capsAbs = path.join(ROOT, "src/integrations/drive/capabilitiesRegistry.ts");
  const capsText = fs.readFileSync(capsAbs, "utf8");
  if (!capsText.includes('path.join(absReceiptsDir, "drive_capabilities.json")')) {
    fail("READBACK_FAIL: DRIVE_TOOLING_CAPS_PATH_NOT_IN_RECEIPTS_DIR");
  }
  if (!capsText.includes("renameSync") || !capsText.includes(".lock")) {
    fail("READBACK_FAIL: DRIVE_TOOLING_CAPS_ATOMIC_OR_LOCK_MISSING");
  }
  if (!capsText.includes("schemaVersion")) {
    fail("READBACK_FAIL: DRIVE_TOOLING_CAPS_SCHEMA_VERSION_MISSING");
  }
}

// Operator-tier commands must exist (keep troubleshooting one-screen).
{
  const abs = path.join(ROOT, "src/cli/run-command.ts");
  const text = fs.readFileSync(abs, "utf8");
  if (!text.includes("/drive receipts tail") || !text.includes("/drive status")) {
    fail("READBACK_FAIL: DRIVE_TOOLING_OPERATOR_COMMANDS_MISSING");
  }
}

// Operator-tier status contract: accepted args + healthReason must exist and health must be derived from reason.
{
  const abs = path.join(ROOT, "src/cli/driveOperator.ts");
  const text = fs.readFileSync(abs, "utf8");

  // Accepted args
  if (!text.includes("staleMinutesDefault") || !text.includes("staleMinutesByAuthType")) {
    fail("READBACK_FAIL: DRIVE_TOOLING_STATUS_ARGS_MISSING");
  }

  // Reasons must exist (dashboards/alerts depend on stability)
  for (const reason of ["AUTH_FAIL", "NO_SIGNALS", "NO_ENSUREPATH_YET", "STALE"]) {
    if (!text.includes(reason)) {
      fail("READBACK_FAIL: DRIVE_TOOLING_STATUS_HEALTHREASON_MISSING");
    }
  }

  // Health derived from reason (no hidden branching)
  if (!text.includes("HEALTH_BY_REASON") || !text.includes("health = HEALTH_BY_REASON")) {
    fail("READBACK_FAIL: DRIVE_TOOLING_STATUS_HEALTH_DERIVATION_MISSING");
  }

  // Default threshold stability (24h)
  if (!text.includes("24 * 60")) {
    fail("READBACK_FAIL: DRIVE_TOOLING_STATUS_DEFAULT_STALE_THRESHOLD_CHANGED");
  }
}

process.stdout.write("DRIVE_TOOLING_GUARD_OK\n");
