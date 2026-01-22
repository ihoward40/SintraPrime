import fs from "node:fs/promises";
import path from "node:path";
import { uploadSlackFile, resolveChannelId } from "./slack.service.js";
import { pickVoiceForEventType, pickVoiceForText } from "./voice-router.js";

const DEFAULT_MODEL_ID = "eleven_multilingual_v2";
const DEFAULT_OUTPUT_FORMAT = "mp3_44100_128";

function getElevenApiKey() {
  return process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY || process.env.XI_API_KEY || null;
}

function getElevenModelId() {
  return process.env.ELEVEN_MODEL_ID || process.env.ELEVENLABS_MODEL_ID || DEFAULT_MODEL_ID;
}

function ttsDisabled() {
  const raw = String(
    process.env.DISABLE_TTS || process.env.ELEVEN_DISABLE_TTS || process.env.TTS_DISABLED || "",
  ).trim();
  return raw === "1" || raw.toLowerCase() === "true" || raw.toLowerCase() === "yes";
}

function ttsMockEnabled() {
  const raw = String(process.env.TTS_MOCK || process.env.ELEVEN_MOCK_TTS || process.env.ELEVENLABS_MOCK || "").trim();
  return raw === "1" || raw.toLowerCase() === "true" || raw.toLowerCase() === "yes";
}

function buildWavSilence({ durationMs = 900, sampleRate = 8000 } = {}) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const numSamples = Math.max(1, Math.floor((Number(durationMs) / 1000) * Number(sampleRate)));

  const dataSize = numSamples * numChannels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16); // PCM
  buffer.writeUInt16LE(1, 20); // audio format PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * bytesPerSample, 28); // byteRate
  buffer.writeUInt16LE(numChannels * bytesPerSample, 32); // blockAlign
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  // Data section is already zeroed (silence)

  return buffer;
}

function extFromOutputFormat(outputFormat) {
  const of = String(outputFormat || "").trim().toLowerCase();
  if (!of) return "mp3";
  if (of === "wav") return "wav";
  if (of.startsWith("mp3")) return "mp3";
  return "bin";
}

let cachedVoices = null;
let voiceNotFoundDisabledUntilMs = new Map();
let lastVoiceWarnAtMs = 0;

function nowMs() {
  return Date.now();
}

function looksLikePlaceholderVoiceId(v) {
  const s = String(v || "").trim();
  if (!s) return true;
  if (s.includes("ELEVEN_VOICE_ID_FOR_")) return true;
  if (s.includes("VOICE_ID_FOR_")) return true;
  if (s.startsWith("VOICE_ID_")) return true;
  if (s.startsWith("ELEVEN_VOICE_ID_")) return true;
  // ElevenLabs voice IDs are typically URL-safe alphanumerics.
  if (/[_\s]/.test(s)) return true;
  return false;
}

function normalizePersonaKey(key) {
  return String(key || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeCharacterAlias(character) {
  const raw = String(character || "").trim().toLowerCase();
  if (!raw) return "isiah";

  // Support custom/legacy labels
  if (raw === "brick_city_oracle" || raw === "brick-city-oracle") return "oracle";
  if (raw === "dragon_due_process" || raw === "dragon-due-process" || raw === "due_process" || raw === "due-process") return "dragon";
  if (raw === "judge_invisible" || raw === "judge-invisible" || raw === "invisible_judge" || raw === "invisible-judge") return "judge";
  if (raw === "supreme_court_mode" || raw === "supreme-court-mode" || raw === "supreme court" || raw === "supreme") return "supreme";
  if (raw === "shadow_trustee" || raw === "shadow-trustee" || raw === "shadow trustee" || raw === "shadow") return "shadow";

  return raw;
}

function getEnvVoiceIdForPersona(personaKey) {
  const k = normalizePersonaKey(personaKey);
  if (!k) return null;

  const candidates = [
    `ELEVEN_${k}`,
    `ELEVEN_VOICE_${k}`,
    `ELEVEN_${k}_VOICE_ID`,
    `ELEVEN_${k}_VOICE`,
    `ELEVEN_VOICE_ID_FOR_${k}`,
    `ELEVEN_VOICE_ID_${k}`,
  ];

  // Extra compatibility aliases for requested naming
  if (k === "ORACLE") {
    candidates.push(
      "ELEVEN_BRICK_CITY_ORACLE_V2",
      "ELEVEN_BRICK_CITY_ORACLE_V2_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_BRICK_CITY_ORACLE_V2",
      "ELEVEN_BRICK_CITY_ORACLE_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_BRICK_CITY_ORACLE",
      "ELEVEN_VOICE_ID_BRICK_CITY_ORACLE",
      "ELEVEN_ORACLE_VOICE_ID",
    );
  }
  if (k === "DRAGON") {
    candidates.push(
      "ELEVEN_DRAGON_DUE_PROCESS_V2",
      "ELEVEN_DRAGON_DUE_PROCESS_V2_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_DRAGON_DUE_PROCESS_V2",
      "ELEVEN_DUE_PROCESS_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_DRAGON_DUE_PROCESS",
      "ELEVEN_VOICE_ID_DRAGON_DUE_PROCESS",
      "ELEVEN_DRAGON_DUE_PROCESS_VOICE_ID",
      "ELEVEN_DRAGON_VOICE_ID",
    );
  }
  if (k === "JUDGE") {
    candidates.push(
      "ELEVEN_JUDGE_INVISIBLE_V2",
      "ELEVEN_JUDGE_INVISIBLE_V2_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_JUDGE_INVISIBLE_V2",
      "ELEVEN_JUDGE_INVISIBLE_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_JUDGE_INVISIBLE",
      "ELEVEN_VOICE_ID_JUDGE_INVISIBLE",
      "ELEVEN_JUDGE_VOICE_ID",
    );
  }
  if (k === "SUPREME") {
    candidates.push(
      "ELEVEN_SUPREME_COURT_MODE_V2",
      "ELEVEN_SUPREME_COURT_MODE_V2_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_SUPREME_COURT_MODE_V2",
      "ELEVEN_SUPREME_COURT_MODE_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_SUPREME_COURT_MODE",
      "ELEVEN_VOICE_ID_SUPREME_COURT_MODE",
      "ELEVEN_SUPREME_VOICE_ID",
    );
  }

  if (k === "SHADOW") {
    candidates.push(
      "ELEVEN_SHADOW_TRUSTEE_HYBRID_ELITE",
      "ELEVEN_SHADOW_TRUSTEE_HYBRID_ELITE_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_SHADOW_TRUSTEE_HYBRID_ELITE",
      "ELEVEN_SHADOW_TRUSTEE_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_SHADOW_TRUSTEE",
      "ELEVEN_VOICE_ID_SHADOW_TRUSTEE",
      "ELEVEN_SHADOW_VOICE_ID",
    );
  }

  for (const name of candidates) {
    const v = String(process.env[name] || "").trim();
    if (v && !looksLikePlaceholderVoiceId(v)) return v;
  }

  return null;
}

function isExplicitlyDisabledVoiceId(v) {
  const s = String(v || "").trim();
  return s.toUpperCase() === "DISABLED";
}

function shouldSkipVoiceId(v) {
  const s = String(v || "").trim();
  if (!s) return true;
  if (isExplicitlyDisabledVoiceId(s)) return true;
  if (looksLikePlaceholderVoiceId(s)) return true;
  return false;
}

function warnVoiceConfigOnce(msg) {
  const now = nowMs();
  if (now - lastVoiceWarnAtMs < 5 * 60 * 1000) return;
  lastVoiceWarnAtMs = now;
  console.warn(`[Voice] ⚠️ ${msg}`);
}

async function loadVoicesConfig() {
  if (cachedVoices) return cachedVoices;

  const voicesPath = path.resolve(process.env.ELEVEN_VOICES_PATH || "config/voices.json");

  try {
    const raw = await fs.readFile(voicesPath, "utf8");
    const parsed = JSON.parse(raw);
    cachedVoices = parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    cachedVoices = {};
  }

  return cachedVoices;
}

export async function getVoiceId(character = "isiah") {
  const voices = await loadVoicesConfig();
  const key = normalizeCharacterAlias(character);

  // Env override support (lets ops fix voice IDs without touching files)
  const envVoice = getEnvVoiceIdForPersona(key);
  if (envVoice) return envVoice;

  if (voices && typeof voices === "object") {
    const direct = voices[key];
    if (typeof direct === "string" && direct.trim() && !looksLikePlaceholderVoiceId(direct)) return direct.trim();
    if (typeof direct === "string" && direct.trim() && looksLikePlaceholderVoiceId(direct)) {
      warnVoiceConfigOnce(
        `Invalid voice ID configured for '${key}'. Update config/voices.json with real ElevenLabs voice IDs (no placeholders).`,
      );
    }

    const fallback = voices.isiah;
    if (typeof fallback === "string" && fallback.trim() && !looksLikePlaceholderVoiceId(fallback)) return fallback.trim();

    const first = Object.values(voices).find((v) => typeof v === "string" && v.trim());
    if (typeof first === "string" && first.trim() && !looksLikePlaceholderVoiceId(first)) return first.trim();
  }

  return null;
}

export async function synthesizeTextToBuffer(
  text,
  { character = "isiah", modelId = getElevenModelId(), outputFormat = DEFAULT_OUTPUT_FORMAT, timeoutMs = 120_000 } = {},
) {
  if (ttsDisabled()) {
    throw new Error("TTS disabled (DISABLE_TTS=1)");
  }

  if (ttsMockEnabled()) {
    const wav = buildWavSilence({ durationMs: 900, sampleRate: 8000 });
    return {
      audio: wav,
      bytes: wav.byteLength,
      voiceId: `mock-${String(character || "").trim() || "voice"}`,
      modelId: "mock",
      outputFormat: "wav",
    };
  }

  const apiKey = getElevenApiKey();
  if (!apiKey) {
    throw new Error("Missing ELEVENLABS_API_KEY (or ELEVEN_API_KEY / XI_API_KEY). Set it in your .env.");
  }

  const voiceId = await getVoiceId(character);
  if (!voiceId || isExplicitlyDisabledVoiceId(voiceId)) {
    throw new Error(
      `No voice ID configured for character \"${String(character)}\". Create config/voices.json (or set ELEVEN_VOICES_PATH).`,
    );
  }

  const disabledUntil = voiceNotFoundDisabledUntilMs.get(voiceId) || 0;
  if (nowMs() < disabledUntil) {
    throw new Error(`Voice temporarily disabled (prior voice_not_found). Update config/voices.json and retry later.`);
  }

  const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`);
  if (outputFormat) url.searchParams.set("output_format", String(outputFormat));

  const payload = {
    text: String(text ?? ""),
    model_id: modelId,
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
    },
  };

  if (!payload.text.trim()) throw new Error("Missing text");

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const buf = Buffer.from(await resp.arrayBuffer());

    if (!resp.ok) {
      const msg = buf.toString("utf8").slice(0, 2000);

      // If the configured voice ID is invalid, avoid hammering ElevenLabs.
      if (resp.status === 404 && msg.toLowerCase().includes("voice_not_found")) {
        voiceNotFoundDisabledUntilMs.set(voiceId, nowMs() + 30 * 60 * 1000);
        warnVoiceConfigOnce(
          `ElevenLabs voice_not_found for voiceId=${voiceId}. Disabling this voice for 30m to prevent spam; set real voice IDs in config/voices.json.`,
        );
      }
      throw new Error(`ElevenLabs HTTP ${resp.status}: ${msg}`);
    }

    return {
      audio: buf,
      bytes: buf.byteLength,
      voiceId,
      modelId,
      outputFormat,
    };
  } finally {
    clearTimeout(t);
  }
}

/**
 * Best-effort TTS: returns { skipped: true, ... } instead of throwing for common config issues.
 * This prevents 404 voice_not_found loops when placeholder/missing voices are configured.
 */
export async function maybeSynthesizeTextToBuffer(
  text,
  { character = "isiah", modelId = getElevenModelId(), outputFormat = DEFAULT_OUTPUT_FORMAT, timeoutMs = 120_000 } = {},
) {
  if (ttsMockEnabled()) {
    const wav = buildWavSilence({ durationMs: 900, sampleRate: 8000 });
    return {
      audio: wav,
      bytes: wav.byteLength,
      voiceId: `mock-${String(character || "").trim() || "voice"}`,
      modelId: "mock",
      outputFormat: "wav",
    };
  }

  if (ttsDisabled()) {
    return { skipped: true, reason: "tts_disabled", character: String(character || "") };
  }

  const apiKey = getElevenApiKey();
  if (!apiKey) {
    return { skipped: true, reason: "missing_api_key", character: String(character || "") };
  }

  const voiceId = await getVoiceId(character);
  if (shouldSkipVoiceId(voiceId)) {
    return { skipped: true, reason: "voice_missing_or_disabled", character: String(character || "") };
  }

  const disabledUntil = voiceNotFoundDisabledUntilMs.get(voiceId) || 0;
  if (nowMs() < disabledUntil) {
    return { skipped: true, reason: "voice_temporarily_disabled", character: String(character || ""), voiceId };
  }

  try {
    return await synthesizeTextToBuffer(text, { character, modelId, outputFormat, timeoutMs });
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.includes("voice_not_found") || msg.startsWith("ElevenLabs HTTP 404")) {
      return { skipped: true, reason: "voice_not_found", character: String(character || ""), voiceId };
    }
    throw e;
  }
}

function sanitizeFilenameBase(name) {
  const base = String(name || "").trim() || `audio-${Date.now()}`;
  return base
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function withExt(baseName, ext) {
  const b = String(baseName || "").trim();
  const e = String(ext || "").trim().toLowerCase();
  if (!e) return b;
  const stripped = b.replace(/\.(mp3|wav)$/i, "");
  return stripped.toLowerCase().endsWith(`.${e}`) ? stripped : `${stripped}.${e}`;
}

export async function synthesizeToFile(text, { character = "isiah", filename, subdir = "case-briefings" } = {}) {
  const result = await maybeSynthesizeTextToBuffer(text, { character });
  if (result?.skipped) {
    return { skipped: true, reason: result.reason, character: String(character || "") };
  }

  const { audio, bytes, voiceId, modelId, outputFormat } = result;

  const baseOutputDir = path.resolve(process.env.ELEVEN_OUTPUT_DIR || "artifacts/voice/router");
  const targetDir = path.join(baseOutputDir, String(subdir || "").trim() || "misc");
  await fs.mkdir(targetDir, { recursive: true });

  const ext = extFromOutputFormat(result?.outputFormat);
  const baseName = sanitizeFilenameBase(filename || `${character}-${Date.now()}`);
  const fileName = withExt(baseName, ext);
  const absPath = path.join(targetDir, fileName);
  await fs.writeFile(absPath, audio);

  const rel = path.relative(process.cwd(), absPath).split(path.sep).join("/");

  return {
    skipped: false,
    filePath: absPath,
    relativePath: rel,
    bytes,
    voiceId,
    modelId,
    outputFormat,
  };
}

export async function synthesizeToFileWithOutputDir(
  text,
  { character = "isiah", filename, subdir = "case-briefings", outputDir } = {},
) {
  const result = await maybeSynthesizeTextToBuffer(text, { character });
  if (result?.skipped) {
    return { skipped: true, reason: result.reason, character: String(character || "") };
  }

  const { audio, bytes, voiceId, modelId, outputFormat } = result;

  const baseOutputDir = path.resolve(String(outputDir || "").trim() || process.env.ELEVEN_OUTPUT_DIR || "artifacts/voice/router");
  const targetDir = path.join(baseOutputDir, String(subdir || "").trim() || "misc");
  await fs.mkdir(targetDir, { recursive: true });

  const ext = extFromOutputFormat(result?.outputFormat);
  const baseName = sanitizeFilenameBase(filename || `${character}-${Date.now()}`);
  const fileName = withExt(baseName, ext);
  const absPath = path.join(targetDir, fileName);
  await fs.writeFile(absPath, audio);

  const rel = path.relative(process.cwd(), absPath).split(path.sep).join("/");

  return {
    skipped: false,
    filePath: absPath,
    relativePath: rel,
    bytes,
    voiceId,
    modelId,
    outputFormat,
  };
}

/**
 * High-level: synthesize an MP3 and upload to Slack.
 * Accepts either channel ID (C...) or channel name (#name), if channels:read is granted.
 */
export async function synthesizeAndSendToSlack({
  text,
  slackChannel,
  character,
  eventType,
  filename,
  subdir = "briefings",
  title,
  initial_comment,
  thread_ts,
  outputDir,
} = {}) {
  if (ttsDisabled()) {
    return { ok: false, disabled: true, skipped: true, reason: "tts_disabled" };
  }
  const t = String(text ?? "");
  if (!t.trim()) throw new Error("Missing text");
  const ch = String(slackChannel ?? "").trim();
  if (!ch) throw new Error("Missing slackChannel");

  const requestedVoice = String(character || "").trim();
  const voice = requestedVoice || pickVoiceForEventType(eventType, t);

  // Failover safety: try a small fallback chain for common misconfig/404 cases.
  // Keeps systems from crashing or spamming if one persona's voice ID is missing/invalid.
  const fallbacks = ["shadow", "oracle", "judge"].filter((v) => v !== voice);
  const attempts = [voice, ...fallbacks];

  let out = null;
  for (const v of attempts) {
    out = outputDir
      ? await synthesizeToFileWithOutputDir(t, { character: v, filename, subdir, outputDir })
      : await synthesizeToFile(t, { character: v, filename, subdir });
    if (!out?.skipped) {
      out.voice = v;
      break;
    }
  }

  if (out?.skipped) {
    return { ok: false, skipped: true, reason: out.reason || "voice_missing_or_disabled", voice };
  }

  const channel_id = await resolveChannelId(ch);
  const upload = await uploadSlackFile({
    channel_id,
    filePath: out.filePath,
    title: title ? String(title) : "SintraPrime Voice Briefing",
    initial_comment: initial_comment ? String(initial_comment) : `Mythic voice: *${out.voice || voice}*`,
    thread_ts,
  });

  return {
    voice: out.voice || voice,
    filePath: out.relativePath,
    bytes: out.bytes,
    channel_id,
    upload,
  };
}
