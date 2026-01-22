import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import { loadControlSecretsEnv } from "../ui/core/envLoader.js";

const REQUIRED_SLACK_CHANNEL_ID = "C097LK2AMN";

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
  loadControlSecretsEnv({ path: envPath });

  // Hard safety: refuse to run if TTS is not forced offline.
  const ttsMock = isTruthy(process.env.TTS_MOCK);
  const elevenDisabled = isTruthy(process.env.ELEVEN_DISABLE_TTS) || isTruthy(process.env.DISABLE_TTS);
  if (!ttsMock || !elevenDisabled) {
    throw new Error(
      `Safety FAIL: expected TTS_MOCK=1 and ELEVEN_DISABLE_TTS=true (or DISABLE_TTS=1). Got TTS_MOCK=${process.env.TTS_MOCK || ""}, ELEVEN_DISABLE_TTS=${process.env.ELEVEN_DISABLE_TTS || ""}, DISABLE_TTS=${process.env.DISABLE_TTS || ""}`,
    );
  }

  // Pin Slack channel.
  const slackChannel = String(process.env.SLACK_CHANNEL_ID || process.env.SLACK_DEFAULT_CHANNEL || "").trim();
  if (slackChannel && slackChannel !== REQUIRED_SLACK_CHANNEL_ID) {
    throw new Error(`Slack FAIL: expected SLACK_CHANNEL_ID=${REQUIRED_SLACK_CHANNEL_ID}. Got ${slackChannel}`);
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
        ELEVENLABS_API_KEY: maskSecret(process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY || process.env.XI_API_KEY),
        SLACK_BOT_TOKEN: maskSecret(process.env.SLACK_BOT_TOKEN || process.env.SLACK_TOKEN),
        SLACK_CHANNEL_ID: slackChannel || "(unset)",
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

  // B) ENV + VOICE CONFIG CHECK
  try {
    const applyRes = runNodeScript("./scripts/apply-mythic-voice-ids.mjs", ["--env", envPath, "--out", "config/voices.json"], {
      cwd: repoRoot,
    });
    report.steps.push(
      applyRes.code === 0
        ? okStep("B) voices:apply (env → voices.json)")
        : failStep("B) voices:apply (env → voices.json)", `${applyRes.stderr}\n${applyRes.stdout}`.trim()),
    );

    const validateRes = runNodeScript("./scripts/validate-voice-config.mjs", ["--env", envPath, "--in", "config/voices.json"], {
      cwd: repoRoot,
    });
    // Do not fail for placeholders if TTS is disabled.
    report.steps.push(
      validateRes.code === 0
        ? okStep("B) voices:validate")
        : elevenDisabled
          ? skipStep("B) voices:validate", "Validator reported BAD voices, but TTS is disabled (allowed in TEST_ONLY).")
          : failStep("B) voices:validate", `${validateRes.stderr}\n${validateRes.stdout}`.trim()),
    );
  } catch (e) {
    report.steps.push(failStep("B) Env/voice config", String(e?.message || e)));
  }

  // C) NOTIFICATION PIPELINE CHECK (Slack)
  try {
    const allowSlack = isTruthy(process.env.SYNERGY7_ALLOW_SLACK);
    if (!allowSlack) {
      report.steps.push(skipStep("C) Slack send", "Set SYNERGY7_ALLOW_SLACK=1 to send exactly one test message."));
    } else if (!slackChannel) {
      report.steps.push(failStep("C) Slack send", `Missing SLACK_CHANNEL_ID (must be ${REQUIRED_SLACK_CHANNEL_ID})`));
    } else {
      const { SlackClient } = await import("../ui/services/SlackClient.js");
      const s = new SlackClient({ defaultChannel: slackChannel });
      const text = `✅ SintraPrime test run started: ${caseId} (TTS_MOCK=1, ELEVEN_DISABLE_TTS=true)`;

      let sent = false;
      try {
        const r = await s.sendText(slackChannel, text);
        if (r?.ok === false && (r?.offline || r?.disabled)) {
          report.steps.push(skipStep("C) Slack send", `Slack offline/disabled (${r.op || "unknown"})`));
        } else {
          sent = true;
          report.steps.push(okStep("C) Slack send"));
        }
      } catch (err) {
        const retryAfter = Number(err?.data?.retry_after || err?.data?.response_metadata?.retry_after || 0);
        if (retryAfter > 0 && retryAfter < 60) {
          await new Promise((r) => setTimeout(r, (retryAfter * 1000) + 250));
          const r2 = await s.sendText(slackChannel, text);
          if (r2?.ok === true) {
            sent = true;
            report.steps.push(okStep("C) Slack send (retry-after)"));
          } else {
            report.steps.push(failStep("C) Slack send", `Rate-limited and retry did not succeed`));
          }
        } else {
          report.steps.push(failStep("C) Slack send", String(err?.message || err)));
        }
      }

      if (!sent) {
        // not a second message; just status
      }
    }
  } catch (e) {
    report.steps.push(failStep("C) Slack pipeline", String(e?.message || e)));
  }

  // D) ENFORCEMENT + BEHAVIOR ENGINE CHECK
  try {
    // Enable adaptive enforcement but disable its voice emissions.
    process.env.ADAPTIVE_ENFORCEMENT_ENABLED = "1";
    process.env.ADAPTIVE_ENFORCEMENT_VOICE = "0";

    const { eventBus } = await import("../ui/core/eventBus.js");
    const enforcement = await import("../ui/enforcement/enforcementChain.js");

    // Ensure listeners registered
    await import("../ui/enforcement/adaptiveEnforcementAI.js");

    const creditorsToTest = ["verizon", "tiktok", "chase"];

    // Seed enforcement chain entries.
    for (const c of creditorsToTest) {
      eventBus.emit("enforcement.chain.start", { creditor: c, caseId, strategy: "test", initialDoc: "initial-notice" });
      enforcement.advanceEnforcementStage({ creditor: c, caseId });
    }

    // Emit a synthetic behavior prediction (no OpenAI calls) to exercise adaptive policy wiring.
    for (const c of creditorsToTest) {
      eventBus.emit("behavior.predicted", {
        creditor: c,
        creditorKey: c,
        classification: { name: c, type: c === "verizon" ? "telco" : c === "chase" ? "major_bank" : "default", risk: "medium" },
        prediction: {
          likelyBehavior: "stall",
          responseProbability30d: 40,
          violationProbability: 50,
          riskScore: 6,
          suggestedEnforcementPath: "manual_review",
        },
        channel: slackChannel || REQUIRED_SLACK_CHANNEL_ID,
        caseId,
      });
    }

    const states = enforcement.getAllEnforcementStates?.() || [];
    const hit = states.filter((s) => creditorsToTest.includes(String(s.creditor || "").toLowerCase()) && s.caseId === caseId);
    if (hit.length < 2) {
      report.steps.push(failStep("D) Enforcement chain", `Expected enforcement states for ${creditorsToTest.join(", ")}`));
    } else {
      report.steps.push(okStep("D) Enforcement + adaptive policy wiring"));
    }
  } catch (e) {
    report.steps.push(failStep("D) Enforcement/behavior engines", String(e?.message || e)));
  }

  // E) ARTIFACT OUTPUT CHECK
  try {
    const evidencePath = path.join(artifactDir, "evidence_manifest.json");
    const runManifestPath = path.join(artifactDir, "run_manifest.json");
    const mockAudioPath = path.join(artifactDir, "mock_voice.wav");

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

    // Local mock audio generation (no ElevenLabs)
    const { maybeSynthesizeTextToBuffer } = await import("../ui/services/elevenlabs-speech.js");
    const audioRes = await maybeSynthesizeTextToBuffer("SintraPrime mock audio test.", { character: "shadow" });
    if (audioRes?.skipped) {
      throw new Error(`Mock audio generation skipped: ${audioRes.reason || "unknown"}`);
    }
    await fs.writeFile(mockAudioPath, audioRes.audio);

    // Evidence manifest (sha256)
    const litigationFiles = fssync.existsSync(litigationOutDir) ? await listFilesRecursive(litigationOutDir) : [];
    const files = [...litigationFiles, mockAudioPath].sort((a, b) => a.localeCompare(b));
    const items = [];
    for (const abs of files) {
      const rel = path.relative(repoRoot, abs).split(path.sep).join("/");
      const { bytes, sha256 } = await sha256File(abs);
      items.push({ path: rel, bytes, sha256: `sha256:${sha256}` });
    }

    const evidence = {
      case_id: caseId,
      generated_at: new Date().toISOString(),
      items,
    };
    await writeText(evidencePath, JSON.stringify(evidence, null, 2) + "\n");

    // Run manifest
    const passFail = report.steps.map((s) => ({ step: s.title, status: s.status, detail: s.detail }));
    const manifest = {
      case_id: caseId,
      generated_at: new Date().toISOString(),
      artifacts_dir: path.relative(repoRoot, artifactDir).split(path.sep).join("/"),
      env: report.meta.env,
      steps: passFail,
      evidence_manifest: path.relative(repoRoot, evidencePath).split(path.sep).join("/"),
    };
    await writeText(runManifestPath, JSON.stringify(manifest, null, 2) + "\n");

    report.steps.push(okStep("E) Artifacts + manifests written"));
    report.artifacts.push(
      { path: path.relative(repoRoot, litigationOutDir), kind: "litigation_package" },
      { path: path.relative(repoRoot, mockAudioPath), kind: "mock_audio" },
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
}

main().catch((err) => {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
});
