import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

function die(msg) {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

function runNode(relScriptPath, args, { cwd, env }) {
  const res = spawnSync(process.execPath, [relScriptPath, ...(args || [])], {
    cwd,
    env: env || process.env,
    stdio: "pipe",
    encoding: "utf8",
  });

  return {
    code: res.status ?? 0,
    stdout: String(res.stdout || ""),
    stderr: String(res.stderr || ""),
  };
}

async function sha256File(absPath) {
  const buf = await fs.readFile(absPath);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function ensureEmptyDir(absDir) {
  await fs.rm(absDir, { recursive: true, force: true });
  await fs.mkdir(absDir, { recursive: true });
}

async function fileExists(absPath) {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const repoRoot = process.cwd();

  const verifierRel = "scripts/verify-litigation-packet.mjs";
  const verifierAbs = path.resolve(repoRoot, verifierRel);
  if (!fssync.existsSync(verifierAbs)) {
    die([
      "Determinism gate preflight FAIL: litigation verifier missing.",
      `Expected: ${verifierRel}`,
      "Fix: restore scripts/verify-litigation-packet.mjs (guardrail dependency) and re-run.",
      "",
    ].join("\n"));
  }

  const caseId = String(process.env.CI_LITIGATION_CASE_ID || "CI-DETERMINISM-GUARDRAIL").trim();
  const fixedGeneratedAt = String(process.env.CI_LITIGATION_GENERATED_AT || "2000-01-01T00:00:00.000Z").trim();
  const exhibitToCheck = String(process.env.CI_LITIGATION_EXHIBIT || "L1-C").trim();

  const runBase = path.resolve(repoRoot, "runs", `_ci_litigation_determinism_${caseId}`);
  const envPath = path.join(runBase, "synergy7.env");

  const artifactsDir = path.resolve(repoRoot, "artifacts", caseId);
  const litigationDir = path.join(artifactsDir, "litigation");

  const run1Dir = path.join(runBase, "run1");
  const run2Dir = path.join(runBase, "run2");

  await ensureEmptyDir(runBase);

  // Minimal env: must force TTS offline, and freeze binder timestamps.
  const envText = [
    "# CI-generated env for Synergy7 selftest",
    "TTS_MOCK=1",
    "ELEVEN_DISABLE_TTS=true",
    "DISABLE_TTS=1",
    // Freeze binder determinism (cover/index/manifest timestamps)
    `LITIGATION_GENERATED_AT=${fixedGeneratedAt}`,
    // Make accidental egress harder even if code paths change.
    "ELEVENLABS_API_KEY=DISABLED",
    "SLACK_BOT_TOKEN=DISABLED",
    "OPENAI_API_KEY=DISABLED",
    "\n",
  ].join("\n");

  await fs.writeFile(envPath, envText, "utf8");

  // Start from clean artifacts.
  await fs.rm(artifactsDir, { recursive: true, force: true });

  const env = {
    ...process.env,
    CI: "1",
    NODE_OPTIONS: process.env.NODE_OPTIONS || "--unhandled-rejections=strict",
  };

  // 1) Selftest run #1
  {
    const r = runNode("./scripts/synergy7-selftest.mjs", ["--env", envPath, "--caseId", caseId], { cwd: repoRoot, env });
    if (r.code !== 0) {
      die(`Synergy7 selftest run1 failed (code=${r.code})\n${r.stderr}\n${r.stdout}`.trim());
    }
    if (!(await fileExists(litigationDir))) {
      die(`Synergy7 selftest run1 did not produce litigation folder: ${litigationDir}`);
    }
    await ensureEmptyDir(run1Dir);
    await fs.cp(litigationDir, run1Dir, { recursive: true });
  }

  // 2) Selftest run #2 (overwrites artifacts/<caseId>)
  {
    const r = runNode("./scripts/synergy7-selftest.mjs", ["--env", envPath, "--caseId", caseId], { cwd: repoRoot, env });
    if (r.code !== 0) {
      die(`Synergy7 selftest run2 failed (code=${r.code})\n${r.stderr}\n${r.stdout}`.trim());
    }
    if (!(await fileExists(litigationDir))) {
      die(`Synergy7 selftest run2 did not produce litigation folder: ${litigationDir}`);
    }
    await ensureEmptyDir(run2Dir);
    await fs.cp(litigationDir, run2Dir, { recursive: true });
  }

  // 3) Verify exhibit order stability using the verifier JSON output.
  function readVerifierExhibitOrder(folder) {
    const res = runNode("./scripts/verify-litigation-packet.mjs", [folder, "--json", "--quiet"], { cwd: repoRoot, env });
    // The verifier uses non-zero exit codes for policy outcomes (e.g., WARNINGS=2).
    // For this guardrail we only require that it emits valid JSON.
    let j;
    try {
      j = JSON.parse(res.stdout);
    } catch {
      die(`Verifier did not emit valid JSON for ${folder} (code=${res.code})\n${res.stderr}\n${res.stdout}`.trim());
    }
    const order = Array.isArray(j?.exhibits) ? j.exhibits.map((e) => e.exhibit) : [];
    return { json: j, order };
  }

  const v1 = readVerifierExhibitOrder(run1Dir);
  const v2 = readVerifierExhibitOrder(run2Dir);

  const order1 = v1.order.join(" ");
  const order2 = v2.order.join(" ");
  if (order1 !== order2) {
    die(`Exhibit order mismatch\nrun1=${order1}\nrun2=${order2}`);
  }

  // 4) Assert binder manifest SHA-256 identical across runs.
  const manifestRel = "BINDER_PACKET_MANIFEST.json";
  const manifest1 = path.join(run1Dir, manifestRel);
  const manifest2 = path.join(run2Dir, manifestRel);
  if (!fssync.existsSync(manifest1) || !fssync.existsSync(manifest2)) {
    die(`Missing binder manifest in one or both runs (${manifestRel})`);
  }

  const h1 = await sha256File(manifest1);
  const h2 = await sha256File(manifest2);
  if (h1 !== h2) {
    die(`Binder manifest hash drift\nsha256(run1)=${h1}\nsha256(run2)=${h2}`);
  }

  // 5) Spot-check one exhibit hash matches its manifest entry (run2).
  const man = JSON.parse(await fs.readFile(manifest2, "utf8"));
  const exhibits = Array.isArray(man?.exhibits) ? man.exhibits : [];

  let entry = exhibits.find((e) => String(e?.exhibit || "").trim() === exhibitToCheck);
  if (!entry && exhibits.length > 0) entry = exhibits[0];
  if (!entry) {
    die(`No exhibits found in binder manifest (${manifest2})`);
  }

  const code = String(entry.exhibit || "");
  const artifactFile = String(entry.artifactFile || "");
  const expected = String(entry.sha256 || "").replace(/^sha256:/i, "").toLowerCase();
  if (!code || !artifactFile || !expected) {
    die(`Exhibit entry missing required fields (exhibit/artifactFile/sha256) for ${JSON.stringify(entry)}`);
  }

  const absFile = path.join(run2Dir, artifactFile);
  if (!fssync.existsSync(absFile)) {
    die(`Exhibit file missing on disk: ${absFile}`);
  }

  const actual = (await sha256File(absFile)).toLowerCase();
  if (actual !== expected) {
    die(`Exhibit hash mismatch (${code})\nfile=${artifactFile}\nexpected=${expected}\nactual=${actual}`);
  }

  // OK
  process.stdout.write(
    [
      "CI Litigation Determinism Guardrail: PASS",
      `caseId=${caseId}`,
      `fixedGeneratedAt=${fixedGeneratedAt}`,
      `order=${order1}`,
      `manifestSha256=${h1}`,
      `spotcheck=${code} (${artifactFile}) MATCH`,
      "",
    ].join("\n"),
  );
}

main().catch((err) => {
  die(String(err?.stack || err?.message || err));
});
