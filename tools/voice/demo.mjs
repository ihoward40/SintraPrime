#!/usr/bin/env node
/**
 * demo.mjs
 *
 * Generates a demo pack: one MP3 per persona.
 * Requires tools/voice/pantheon.voices.json and ELEVENLABS_API_KEY.
 * Output contract: one-line JSON (help/version are human-readable).
 */

import path from "node:path";
import { loadPantheonConfig } from "./voice-router.mjs";
import { getElevenLabsApiKey, elevenLabsTextToSpeech, writeAudioFile } from "./elevenlabs.mjs";

const TOOL = "voice-demo";
const VERSION = "0.1.0";

function usage() {
  return [
    `${TOOL} ${VERSION}`,
    "",
    "Usage:",
    "  node tools/voice/demo.mjs [--out-dir artifacts/voice/demo]",
    "",
    "Flags:",
    "  --out-dir <path>   Output directory (default: artifacts/voice/demo)",
    "  --help, -h         Show help and exit 0",
    "  --version          Show version and exit 0",
  ].join("\n");
}

function emit(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

function fail(msg, extra = {}, code = 1) {
  emit({ ok: false, tool: TOOL, error: String(msg), ...extra });
  process.exit(code);
}

function parseArgs(argv) {
  const out = {
    outDir: path.join(process.cwd(), "artifacts", "voice", "demo"),
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];

    if (a === "--help" || a === "-h") {
      process.stdout.write(`${usage()}\n`);
      process.exit(0);
    }

    if (a === "--version") {
      process.stdout.write(`${TOOL} ${VERSION}\n`);
      process.exit(0);
    }

    if (a === "--out-dir" && argv[i + 1]) {
      out.outDir = path.resolve(String(argv[++i]));
      continue;
    }

    fail("Unknown argument", { arg: a });
  }

  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const apiKey = getElevenLabsApiKey();
  if (!apiKey) fail("Missing ELEVENLABS_API_KEY");

  const cfgRes = loadPantheonConfig(process.cwd(), null);
  if (!cfgRes.ok) fail(cfgRes.error, { config_path: cfgRes.configPath });

  const voices = cfgRes.config.voices;
  const demoLines = {
    isiah: "This is Prime Voice: the system moves with precision.",
    oracle: "From the bricks to the stars—everything leaves a trail.",
    guardian: "I stand before the vault. Nothing dishonorable passes these gates.",
    scribe: "Under Article 9, perfection is not optional; it is required.",
    scholar: "Quick breakdown: the system only interrupts on real risk.",
    judge: "Silence is entered into the record. Next.",
    trickster: "Audit time. Let's see what this clown invoice is trying today.",
    dragon: "By due process and clean records, the remedy is established.",
    angel: "Breathe. Calm clarity. Remedy follows disciplined action.",
  };

  const results = [];

  for (const [persona, spec] of Object.entries(voices)) {
    const voiceId = spec?.voice_id;
    if (!voiceId) {
      results.push({ persona, ok: false, error: "missing voice_id" });
      continue;
    }

    const text = demoLines[persona] || demoLines.isiah;
    const modelId = cfgRes.config.model_id || spec.model_id || "eleven_multilingual_v2";
    const voiceSettings = spec.voice_settings || null;

    try {
      const { audio, bytes } = await elevenLabsTextToSpeech({ apiKey, voiceId, text, modelId, voiceSettings });
      const outPath = path.join(args.outDir, `${persona}.mp3`);
      writeAudioFile(outPath, audio);
      results.push({ persona, ok: true, out: outPath, bytes });
    } catch (e) {
      results.push({ persona, ok: false, error: String(e?.message ?? e) });
    }
  }

  const ok = results.every((r) => r.ok);
  emit({
    ok,
    tool: TOOL,
    out_dir: args.outDir,
    results: results.map((r) => ({
      ...r,
      out: r.out ? path.relative(process.cwd(), r.out).split(path.sep).join("/") : null,
    })),
  });

  process.exit(ok ? 0 : 1);
}

main().catch((e) => fail("Unhandled error", { message: String(e?.message ?? e) }));
