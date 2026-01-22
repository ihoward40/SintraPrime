#!/usr/bin/env node
/**
 * speak.mjs
 *
 * Deterministic CLI for ElevenLabs TTS using a local pantheon config.
 *
 * Output contract:
 *  - default: exactly one line of JSON to stdout
 *  - --help/-h and --version are human-readable and exit 0
 */

import fs from "node:fs";
import path from "node:path";
import { getElevenLabsApiKey, elevenLabsTextToSpeech, writeAudioFile } from "./elevenlabs.mjs";
import { loadPantheonConfig, resolvePersona, getVoiceSpec } from "./voice-router.mjs";

const TOOL = "speak";
const VERSION = "0.1.0";

function usage() {
  return [
    `${TOOL} ${VERSION}`,
    "",
    "Usage:",
    "  node tools/voice/speak.mjs --text \"...\" [--persona isiah] [--out out.mp3]",
    "  node tools/voice/speak.mjs --text-file path.txt [--auto-persona] [--out out.mp3]",
    "",
    "Flags:",
    "  --persona <name>         Persona key (default: isiah)",
    "  --auto-persona           Choose persona based on text heuristics",
    "  --text <string>          Text to speak",
    "  --text-file <path>       Read text from file",
    "  --out <path>             Output path (default: artifacts/voice/out.mp3)",
    "  --config <path>          Pantheon config JSON (default: tools/voice/pantheon.voices.json)",
    "  --output-format <fmt>    Optional ElevenLabs output_format query param",
    "  --help, -h               Show help and exit 0",
    "  --version                Show version and exit 0",
    "",
    "Environment:",
    "  ELEVENLABS_API_KEY       Required",
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
    persona: "isiah",
    autoPersona: false,
    text: null,
    textFile: null,
    outPath: path.join(process.cwd(), "artifacts", "voice", "out.mp3"),
    configPath: null,
    outputFormat: null,
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

    if (a === "--persona" && argv[i + 1]) {
      out.persona = String(argv[++i]).trim();
      continue;
    }

    if (a === "--auto-persona") {
      out.autoPersona = true;
      continue;
    }

    if (a === "--text" && argv[i + 1]) {
      out.text = String(argv[++i]);
      continue;
    }

    if (a === "--text-file" && argv[i + 1]) {
      out.textFile = String(argv[++i]);
      continue;
    }

    if (a === "--out" && argv[i + 1]) {
      out.outPath = path.resolve(String(argv[++i]));
      continue;
    }

    if (a === "--config" && argv[i + 1]) {
      out.configPath = path.resolve(String(argv[++i]));
      continue;
    }

    if (a === "--output-format" && argv[i + 1]) {
      out.outputFormat = String(argv[++i]).trim();
      continue;
    }

    fail("Unknown argument", { arg: a });
  }

  if (!out.text && out.textFile) {
    const p = path.resolve(out.textFile);
    if (!fs.existsSync(p)) fail("Missing --text-file", { text_file: p });
    out.text = fs.readFileSync(p, "utf8");
  }

  if (!out.text || String(out.text).trim().length === 0) {
    fail("Missing text (use --text or --text-file)");
  }

  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const repoRoot = process.cwd();
  const cfgRes = loadPantheonConfig(repoRoot, args.configPath);
  if (!cfgRes.ok) fail(cfgRes.error, { config_path: cfgRes.configPath });

  const persona = resolvePersona({ persona: args.persona, text: args.text, autoPersona: args.autoPersona });
  const spec = getVoiceSpec(cfgRes.config, persona);
  if (!spec || !spec.voice_id) {
    fail("Unknown persona or missing voice_id", { persona, config_path: cfgRes.configPath });
  }

  const apiKey = getElevenLabsApiKey();
  if (!apiKey) fail("Missing ELEVENLABS_API_KEY");

  const { audio, bytes } = await elevenLabsTextToSpeech({
    apiKey,
    voiceId: spec.voice_id,
    text: args.text,
    modelId: spec.model_id,
    voiceSettings: spec.voice_settings,
    outputFormat: args.outputFormat,
  });

  writeAudioFile(args.outPath, audio);

  emit({
    ok: true,
    tool: TOOL,
    persona: spec.persona,
    label: spec.label,
    voice_id: spec.voice_id,
    model_id: spec.model_id,
    out: path.relative(repoRoot, args.outPath).split(path.sep).join("/"),
    bytes,
  });
}

main().catch((e) => fail("Unhandled error", { message: String(e?.message ?? e) }));
