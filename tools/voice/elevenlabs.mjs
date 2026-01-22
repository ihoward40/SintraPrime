import fs from "node:fs";
import path from "node:path";

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function getElevenLabsApiKey() {
  return process.env.ELEVENLABS_API_KEY || process.env.XI_API_KEY || null;
}

export function getDefaultElevenLabsBaseUrl() {
  return process.env.ELEVENLABS_BASE_URL || "https://api.elevenlabs.io";
}

export async function elevenLabsTextToSpeech({
  apiKey,
  baseUrl = getDefaultElevenLabsBaseUrl(),
  voiceId,
  text,
  modelId = "eleven_multilingual_v2",
  voiceSettings = null,
  outputFormat = null,
  timeoutMs = 120_000,
}) {
  if (!apiKey) throw new Error("Missing ELEVENLABS_API_KEY");
  if (!voiceId) throw new Error("Missing voiceId");
  if (typeof text !== "string" || text.trim().length === 0) throw new Error("Missing text");

  const url = new URL(`/v1/text-to-speech/${encodeURIComponent(voiceId)}`, baseUrl);
  if (outputFormat) url.searchParams.set("output_format", String(outputFormat));

  const body = {
    text,
    model_id: modelId,
  };
  if (voiceSettings && typeof voiceSettings === "object") {
    body.voice_settings = voiceSettings;
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const buf = Buffer.from(await res.arrayBuffer());

    if (!res.ok) {
      const msg = buf.toString("utf8").slice(0, 2000);
      throw new Error(`ElevenLabs HTTP ${res.status}: ${msg}`);
    }

    return { audio: buf, bytes: buf.byteLength };
  } finally {
    clearTimeout(t);
  }
}

export function writeAudioFile(outPath, audioBuf) {
  ensureDir(path.dirname(outPath));
  fs.writeFileSync(outPath, audioBuf);
}
