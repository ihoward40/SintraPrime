#!/usr/bin/env node
/**
 * voice-webhook-server.mjs
 * Minimal webhook server for Make.com (or any HTTP client) to request narration.
 *
 * POST /voice
 * {
 *   "text": "...",
 *   "persona": "isiah" | "scribe" | ...,
 *   "auto_persona": true|false,
 *   "out": "artifacts/voice/webhook/out.mp3" (optional)
 * }
 *
 * Responds with one-line JSON.
 *
 * Note: This server does not auto-upload to Slack by default. Pair it with
 * tools/voice/slack-upload.mjs as a separate step if desired.
 */

import express from "express";
import path from "node:path";
import { getElevenLabsApiKey, elevenLabsTextToSpeech, writeAudioFile } from "../tools/voice/elevenlabs.mjs";
import { loadPantheonConfig, resolvePersona, getVoiceSpec } from "../tools/voice/voice-router.mjs";

const TOOL = "voice-webhook-server";
const VERSION = "0.1.0";

function usage() {
  return [
    `${TOOL} ${VERSION}`,
    "",
    "Usage:",
    "  node scripts/voice-webhook-server.mjs",
    "",
    "Environment:",
    "  VOICE_WEBHOOK_PORT   Port to listen on (default: 8789)",
    "  ELEVENLABS_API_KEY   Required for synthesis",
  ].join("\n");
}

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  process.stdout.write(`${usage()}\n`);
  process.exit(0);
}

if (process.argv.includes("--version")) {
  process.stdout.write(`${TOOL} ${VERSION}\n`);
  process.exit(0);
}

const app = express();
app.use(express.json({ limit: "2mb" }));

function oneLine(res, obj, status = 200) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.send(`${JSON.stringify(obj)}\n`);
}

app.post("/voice", async (req, res) => {
  try {
    const apiKey = getElevenLabsApiKey();
    if (!apiKey) return oneLine(res, { ok: false, error: "Missing ELEVENLABS_API_KEY" }, 500);

    const text = String(req.body?.text ?? "");
    if (text.trim().length === 0) return oneLine(res, { ok: false, error: "Missing text" }, 400);

    const cfgRes = loadPantheonConfig(process.cwd(), null);
    if (!cfgRes.ok) return oneLine(res, { ok: false, error: cfgRes.error, config_path: cfgRes.configPath }, 500);

    const persona = resolvePersona({
      persona: req.body?.persona ?? "isiah",
      text,
      autoPersona: Boolean(req.body?.auto_persona),
    });
    const spec = getVoiceSpec(cfgRes.config, persona);
    if (!spec || !spec.voice_id) return oneLine(res, { ok: false, error: "Unknown persona or missing voice_id", persona }, 400);

    const outRel = String(req.body?.out ?? "artifacts/voice/webhook/out.mp3");
    const outAbs = path.resolve(outRel);

    const { audio, bytes } = await elevenLabsTextToSpeech({
      apiKey,
      voiceId: spec.voice_id,
      text,
      modelId: spec.model_id,
      voiceSettings: spec.voice_settings,
    });
    writeAudioFile(outAbs, audio);

    return oneLine(res, {
      ok: true,
      persona: spec.persona,
      voice_id: spec.voice_id,
      out: path.relative(process.cwd(), outAbs).split(path.sep).join("/"),
      bytes,
    });
  } catch (e) {
    return oneLine(res, { ok: false, error: "Unhandled error", message: String(e?.message ?? e) }, 500);
  }
});

const port = Number(process.env.VOICE_WEBHOOK_PORT || 8789);
app.listen(port, () => {
  // Intentionally quiet: server logs are not part of the agent JSON discipline.
});
