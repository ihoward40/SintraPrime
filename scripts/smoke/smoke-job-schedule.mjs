import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

function isRecord(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function readReceiptsDelta(receiptsPath, beforeSize) {
  if (!fs.existsSync(receiptsPath)) return [];
  const text = fs.readFileSync(receiptsPath, "utf8");
  const delta = beforeSize > 0 ? text.slice(beforeSize) : text;
  return delta
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertIsoDateTime(value, label) {
  assert(typeof value === "string" && value.trim(), `${label} missing or not a string`);
  const t = Date.parse(value);
  assert(Number.isFinite(t), `${label} is not parseable as date-time: ${value}`);
}

function isSha256Hex(v) {
  return typeof v === "string" && /^[a-fA-F0-9]{64}$/.test(v.trim());
}

function readJobsRegistryCount(registryPath) {
  if (!fs.existsSync(registryPath)) return 0;
  const parsed = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  return Array.isArray(parsed) ? parsed.length : 0;
}

function findJobScheduleReceipt(delta) {
  const receipts = delta.filter((r) => isRecord(r) && isRecord(r.command_intent) && r.command_intent.command === "job.schedule");
  return receipts.length ? receipts[receipts.length - 1] : null;
}

function runJobSchedule({ job, env }) {
  const command = `/job schedule ${JSON.stringify(job)}`;
  const entry = path.join(process.cwd(), "src", "cli", "run-command.ts");
  const res = spawnSync(process.execPath, ["--import", "tsx", entry, command], {
    env,
    encoding: "utf8",
    windowsHide: true,
  });

  if (res.error) throw res.error;
  return {
    exitCode: typeof res.status === "number" ? res.status : 0,
    stdout: String(res.stdout ?? "").trim(),
    stderr: String(res.stderr ?? "").trim(),
  };
}

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath);
}

function restoreFile(filePath, content) {
  if (content === null) return;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

const fixturesPath = path.join(process.cwd(), "tmp", "smoke-fixtures", "job.schedule.v1.json");
const fixtures = readJson(fixturesPath);

const receiptsPath = path.join(process.cwd(), "runs", "receipts.jsonl");
fs.mkdirSync(path.dirname(receiptsPath), { recursive: true });

const jobsRegistryPath = path.join(process.cwd(), "jobs", "registry.json");
const jobsRegistryBackup = backupFile(jobsRegistryPath);

// Start with a clean registry for deterministic smoke.
try {
  fs.mkdirSync(path.dirname(jobsRegistryPath), { recursive: true });
  fs.writeFileSync(jobsRegistryPath, "[]\n", "utf8");
} catch {
  // ignore
}

const baseEnv = {
  ...process.env,
  // Keep smoke deterministic + offline.
  AUTONOMY_MODE: "OFF",
  THREAD_ID: process.env.THREAD_ID || "smoke_job_schedule_001",
  NOTION_RUNS_WEBHOOK: "",
  PERSIST_LOCAL_RECEIPTS: "1",
};

const cases = [
  {
    name: "job.schedule (no connectors/external)",
    fixture: fixtures.no_connectors_external,
    expectExit: 0,
    expect: {
      gate_required: "R0",
      gate_result: "NOT_REQUIRED",
      touches_connectors: false,
      touches_external_apis: false,
    },
  },
  {
    name: "job.schedule (touches connectors/external => R2)",
    fixture: fixtures.touches_connectors_external,
    expectExit: 4,
    expect: {
      gate_required: "R2",
      gate_result: "PENDING",
      touches_connectors: true,
      touches_external_apis: true,
      status: "awaiting_approval",
    },
  },
];

const results = [];
let failed = 0;

try {
  for (const c of cases) {
    const startedAt = Date.now();
    try {
      assert(isRecord(c.fixture), `[${c.name}] fixture missing/invalid`);
      assert(String(c.fixture.command) === "job.schedule", `[${c.name}] fixture.command must be job.schedule`);
      const job = c.fixture?.args?.job;
      assert(isRecord(job), `[${c.name}] fixture.args.job must be an object`);

      const beforeRegistry = readJobsRegistryCount(jobsRegistryPath);
      const beforeSize1 = fs.existsSync(receiptsPath) ? fs.statSync(receiptsPath).size : 0;
      const exec1 = runJobSchedule({ job, env: baseEnv });

      assert(
        exec1.exitCode === c.expectExit,
        `[${c.name}] unexpected exitCode=${exec1.exitCode}; stdout=${exec1.stdout.slice(0, 240)}; stderr=${exec1.stderr.slice(0, 240)}`
      );

      const delta1 = readReceiptsDelta(receiptsPath, beforeSize1);
      const receipt1 = findJobScheduleReceipt(delta1);
      assert(receipt1, `[${c.name}] no job.schedule receipt appended`);

      assert(typeof receipt1.job_id === "string" && receipt1.job_id.trim(), `[${c.name}] receipt.job_id missing/invalid`);
      assert(isSha256Hex(receipt1.job_identity_sha256), `[${c.name}] receipt.job_identity_sha256 missing/invalid`);
      assertIsoDateTime(receipt1.next_run_at, `[${c.name}] receipt.next_run_at`);
      assert(isRecord(receipt1.policy_resolution), `[${c.name}] receipt.policy_resolution missing or not object`);

      assert(receipt1.policy_resolution.gate_required === c.expect.gate_required, `[${c.name}] gate_required mismatch`);
      assert(receipt1.policy_resolution.gate_result === c.expect.gate_result, `[${c.name}] gate_result mismatch`);
      assert(receipt1.policy_resolution.touches_connectors === c.expect.touches_connectors, `[${c.name}] touches_connectors mismatch`);
      assert(
        receipt1.policy_resolution.touches_external_apis === c.expect.touches_external_apis,
        `[${c.name}] touches_external_apis mismatch`
      );
      if (c.expect.status) {
        assert(receipt1.status === c.expect.status, `[${c.name}] receipt.status mismatch`);
      }

      const afterRegistry1 = readJobsRegistryCount(jobsRegistryPath);

      // For the allowed (R0) case, schedule twice and assert idempotent registry behavior.
      if (c.expectExit === 0) {
        assert(afterRegistry1 === beforeRegistry + 1, `[${c.name}] jobs registry count did not increase by 1`);
        assert(receipt1.registry_action === "created" || receipt1.registry_action === "replaced", `[${c.name}] registry_action missing/invalid`);

        const beforeSize2 = fs.existsSync(receiptsPath) ? fs.statSync(receiptsPath).size : 0;
        const exec2 = runJobSchedule({ job, env: baseEnv });
        assert(exec2.exitCode === 0, `[${c.name}] second schedule exitCode=${exec2.exitCode}`);
        const delta2 = readReceiptsDelta(receiptsPath, beforeSize2);
        const receipt2 = findJobScheduleReceipt(delta2);
        assert(receipt2, `[${c.name}] second run did not append job.schedule receipt`);
        assert(receipt2.job_id === receipt1.job_id, `[${c.name}] idempotent job_id mismatch`);
        assert(receipt2.registry_action === "noop_exists", `[${c.name}] second run registry_action is not noop_exists`);
        const afterRegistry2 = readJobsRegistryCount(jobsRegistryPath);
        assert(afterRegistry2 === afterRegistry1, `[${c.name}] jobs registry count changed on second schedule`);
      } else {
        assert(afterRegistry1 === beforeRegistry, `[${c.name}] jobs registry should not change when not allowed`);
      }

      results.push({ name: c.name, ok: true, ms: Date.now() - startedAt, job_id: receipt1.job_id });
    } catch (err) {
      failed += 1;
      results.push({ name: c.name, ok: false, ms: Date.now() - startedAt, error: String(err?.message ?? err) });
    }
  }
} finally {
  // Keep the working tree clean: restore tracked job registry if scheduling wrote to it.
  try {
    restoreFile(jobsRegistryPath, jobsRegistryBackup);
  } catch {
    // ignore
  }
}

process.stdout.write(
  JSON.stringify(
    {
      ok: failed === 0,
      failed,
      total: results.length,
      results,
    },
    null,
    2
  )
);

process.exit(failed === 0 ? 0 : 1);
