import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";

async function loadEnvFileNoOverride(absPath) {
  const raw = await fs.readFile(absPath, "utf8");
  const lines = raw.split(/\r?\n/);

  for (const lineRaw of lines) {
    let line = String(lineRaw ?? "").trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice("export ".length).trim();

    const eq = line.indexOf("=");
    if (eq <= 0) continue;

    const key = line.slice(0, eq).trim();
    if (!key) continue;
    if (Object.prototype.hasOwnProperty.call(process.env, key)) continue;

    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
      (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
    ) {
      value = value.slice(1, -1);
    }
    value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t");

    process.env[key] = value;
  }
}

function parseArgs(argv) {
  const out = {};
  const args = Array.isArray(argv) ? argv.slice(2) : [];
  for (let i = 0; i < args.length; i++) {
    const a = String(args[i] || "");
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = args[i + 1];
    if (next != null && !String(next).startsWith("--")) {
      out[key] = String(next);
      i++;
    } else {
      out[key] = "true";
    }
  }
  return out;
}

function isTruthy(v) {
  const s = String(v ?? "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes";
}

function maskSecret(value) {
  const s = String(value ?? "");
  if (!s) return "(missing)";
  if (s.length <= 8) return "***";
  return `${s.slice(0, 3)}…${s.slice(-4)}`;
}

function okStep(title) {
  return { title, status: "PASS", detail: "" };
}

function failStep(title, detail) {
  return { title, status: "FAIL", detail: String(detail || "") };
}

function skipStep(title, detail) {
  return { title, status: "SKIP", detail: String(detail || "") };
}

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function sha256File(absPath) {
  const b = await fs.readFile(absPath);
  return { bytes: b.byteLength, sha256: sha256Hex(b) };
}

async function writeText(absPath, text) {
  await fs.mkdir(path.dirname(absPath), { recursive: true });
  await fs.writeFile(absPath, text, "utf8");
}

function runNodeScript(relScriptPath, args, { cwd }) {
  const res = spawnSync(process.execPath, [relScriptPath, ...(args || [])], {
    cwd,
    stdio: "pipe",
    encoding: "utf8",
    env: process.env,
  });
  return {
    code: res.status ?? 0,
    stdout: String(res.stdout || ""),
    stderr: String(res.stderr || ""),
  };
}

async function listFilesRecursive(absDir) {
  const out = [];
  const entries = await fs.readdir(absDir, { withFileTypes: true });
  for (const ent of entries) {
    const abs = path.join(absDir, ent.name);
    if (ent.isDirectory()) out.push(...(await listFilesRecursive(abs)));
    else if (ent.isFile()) out.push(abs);
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const repoRoot = process.cwd();

  const envPath = String(
    args.env || process.env.SINTRAPRIME_ENV_PATH || process.env.SINTRAPRIME_DOTENV_PATH || "C:\\SintraPrime\\.env",
  ).trim();

  // Load env file (no override) so the test can be run from any cwd.
  await loadEnvFileNoOverride(envPath);

  // Hard safety: refuse to run if TTS is not forced offline.
  const ttsMock = isTruthy(process.env.TTS_MOCK);
  const elevenDisabled = isTruthy(process.env.ELEVEN_DISABLE_TTS) || isTruthy(process.env.DISABLE_TTS);
  if (!ttsMock || !elevenDisabled) {
    throw new Error(
      `Safety FAIL: expected TTS_MOCK=1 and ELEVEN_DISABLE_TTS=true (or DISABLE_TTS=1). Got TTS_MOCK=${process.env.TTS_MOCK || ""}, ELEVEN_DISABLE_TTS=${process.env.ELEVEN_DISABLE_TTS || ""}, DISABLE_TTS=${process.env.DISABLE_TTS || ""}`,
    );
  }

  const caseId = String(args.caseId || "VZN-2025-TEST-L3");
  const creditor = String(args.creditor || "verizon");

  const artifactDir = path.resolve(repoRoot, "artifacts", caseId);
  await fs.mkdir(artifactDir, { recursive: true });

  const report = {
    meta: {
      name: "SYNERGY-7 FULL STACK INTEGRATION TEST",
      caseId,
      creditor,
      ranAt: new Date().toISOString(),
      repoRoot,
      env: {
        SINTRAPRIME_ENV_PATH: envPath,
        TTS_MOCK: String(process.env.TTS_MOCK || ""),
        ELEVEN_DISABLE_TTS: String(process.env.ELEVEN_DISABLE_TTS || ""),
        DISABLE_TTS: String(process.env.DISABLE_TTS || ""),
        LITIGATION_GENERATED_AT: String(process.env.LITIGATION_GENERATED_AT || ""),
      },
    },
    steps: [],
    artifacts: [],
  };

  // A) BOOT CHECK
  try {
    const mod = await import("../src/templates/litigation/index.js");
    const tpl = mod?.default || mod?.litigationTemplates || mod?.LitigationTemplates;
    if (!tpl) {
      report.steps.push(failStep("A) Litigation template import", "No usable export (default/litigationTemplates/LitigationTemplates)"));
    } else {
      report.steps.push(okStep("A) Litigation template import"));
    }

    // Generate a draft string to prove it works.
    const draftObj = mod.buildLitigationTemplate
      ? mod.buildLitigationTemplate({
          caseId,
          creditor,
          facts: "Test facts: billing dispute and payment allocation issues.",
          violations: ["billing error handling failures", "failure to acknowledge disputes"],
          persona: "paralegal",
        })
      : null;

    if (!draftObj?.draft) {
      report.steps.push(failStep("A) Litigation draft generation", "buildLitigationTemplate() missing or returned no draft"));
    } else {
      report.steps.push(okStep("A) Litigation draft generation"));
    }
  } catch (e) {
    report.steps.push(failStep("A) Boot/import", String(e?.message || e)));
  }

  // E) ARTIFACT OUTPUT CHECK
  try {
    const evidencePath = path.join(artifactDir, "evidence_manifest.json");
    const runManifestPath = path.join(artifactDir, "run_manifest.json");

    // Litigation package (boot-safe: stubs if templates missing)
    const litigationOutDir = path.join(artifactDir, "litigation");
    const { buildLitigationPackage } = await import("../src/litigation/index.js");
    const venue = String(args.venue || "NJ-SUPERIOR");
    const courtDivision = String(args.courtDivision || "special civil");
    const matterType = String(args.matterType || "EMERGENCY");

    const litRes = await buildLitigationPackage(
      {
        case_id: caseId,
        creditor,
        venue,
        court_division: courtDivision,
        matter_type: matterType,
        vars: {
          plaintiff_name: "(plaintiff pending)",
          defendant_name: "(defendant pending)",
          facts: "Test facts: billing dispute and payment allocation issues.",
          relief_requested: "Declaratory relief and record correction.",
          notice_body: "This is a test notice generated by SYNERGY-7.",
          motion_relief_requested: "Order compelling production and correction.",
          motion_grounds: "Test-only grounds; replace with jurisdiction-specific grounds.",
          amount_in_controversy: "(pending)",
          jurisdiction_and_venue: "(pending)",
        },
        fields: {
          PLAINTIFF_NAME: "(plaintiff pending)",
          DEFENDANT_NAME: "(defendant pending)",
          COUNTY: "Essex",
          STATE: "New Jersey",
          CASE_SUMMARY: "SYNERGY-7 selftest: validate template selection + binder packet outputs.",
          RELIEF_REQUESTED: "Declaratory relief and record correction.",
        },
      },
      litigationOutDir,
    );

    // Binder assertions
    const binderManifestPath = path.join(litigationOutDir, "BINDER_PACKET_MANIFEST.json");
    const binderPdfPath = path.join(litigationOutDir, "BINDER_PACKET.pdf");
    if (!fssync.existsSync(binderManifestPath)) {
      throw new Error("Missing BINDER_PACKET_MANIFEST.json");
    }
    const binderManifest = JSON.parse(await fs.readFile(binderManifestPath, "utf8"));
    const exhibitCount = Array.isArray(binderManifest?.exhibits) ? binderManifest.exhibits.length : 0;
    if (exhibitCount < 7) {
      throw new Error(`Expected >= 7 exhibits in manifest, got ${exhibitCount}`);
    }
    if (!fssync.existsSync(binderPdfPath)) {
      throw new Error("Missing BINDER_PACKET.pdf");
    }

    // Evidence manifest (sha256)
    const litigationFiles = fssync.existsSync(litigationOutDir) ? await listFilesRecursive(litigationOutDir) : [];
    const files = [...litigationFiles].sort((a, b) => a.localeCompare(b));
    const items = [];
    for (const abs of files) {
      const rel = path.relative(repoRoot, abs).split(path.sep).join("/");
      const { bytes, sha256 } = await sha256File(abs);
      items.push({ path: rel, bytes, sha256: `sha256:${sha256}` });
    }

    const evidence = {
      case_id: caseId,
      generated_at: String(process.env.LITIGATION_GENERATED_AT || new Date().toISOString()),
      items,
    };
    await writeText(evidencePath, JSON.stringify(evidence, null, 2) + "\n");

    // Run manifest
    const passFail = report.steps.map((s) => ({ step: s.title, status: s.status, detail: s.detail }));
    const manifest = {
      case_id: caseId,
      generated_at: String(process.env.LITIGATION_GENERATED_AT || new Date().toISOString()),
      artifacts_dir: path.relative(repoRoot, artifactDir).split(path.sep).join("/"),
      env: report.meta.env,
      steps: passFail,
      evidence_manifest: path.relative(repoRoot, evidencePath).split(path.sep).join("/"),
    };
    await writeText(runManifestPath, JSON.stringify(manifest, null, 2) + "\n");

    report.steps.push(okStep("E) Artifacts + manifests written"));
    report.artifacts.push(
      { path: path.relative(repoRoot, litigationOutDir), kind: "litigation_package" },
      { path: path.relative(repoRoot, evidencePath), kind: "evidence_manifest" },
      { path: path.relative(repoRoot, runManifestPath), kind: "run_manifest" },
    );
  } catch (e) {
    report.steps.push(failStep("E) Artifacts", String(e?.message || e)));
  }

  // FINAL SUMMARY
  const lines = [];
  lines.push("SYNERGY-7 Selftest Summary");
  for (const s of report.steps) {
    lines.push(`- ${s.status}: ${s.title}${s.detail ? ` — ${s.detail}` : ""}`);
  }
  lines.push(`- Artifacts: ${path.relative(repoRoot, artifactDir).split(path.sep).join("/")}`);

  const finalText = lines.join("\n") + "\n";
  await writeText(path.join(artifactDir, "summary.txt"), finalText);

  process.stdout.write(finalText);

  if (report.steps.some((s) => s.status === "FAIL")) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
});
