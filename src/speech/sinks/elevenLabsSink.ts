import type { SpeechPayload, SpeechSink } from "./types.js";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

// Global request queue to prevent concurrent API calls and avoid 429 errors
const requestQueue: Array<() => Promise<void>> = [];
let isProcessingQueue = false;

async function enqueueRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }
    });
    processQueue();
  });
}

async function processQueue() {
  if (isProcessingQueue || requestQueue.length === 0) return;
  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const nextRequest = requestQueue.shift();
    if (nextRequest) {
      try {
        await nextRequest();
      } catch (error) {
        // Continue processing queue even if one request fails
        debug(`Queue processing error: ${error}`);
      }
      // Add a small delay between requests to help with rate limiting
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  isProcessingQueue = false;
}

function debug(message: string) {
  if (process.env.SPEECH_DEBUG === "1") {
    process.stderr.write(`[ElevenLabsSink] ${message}\n`);
  }
}

// Map speech categories to character voices
function getCategoryVoiceId(category: string): string | undefined {
  const mapping: Record<string, string> = {
    system: process.env.ELEVEN_VOICE_ANDROID || "",
    warning: process.env.ELEVEN_VOICE_ORACLE || "",
    error: process.env.ELEVEN_VOICE_PROSECUTOR || "",
    critical: process.env.ELEVEN_VOICE_DRAGON || "",
    success: process.env.ELEVEN_VOICE_SAGE || "",
    info: process.env.ELEVEN_VOICE_NARRATOR || "",
    debug: process.env.ELEVEN_VOICE_WARRIOR || "",
    legal: process.env.ELEVEN_VOICE_JUDGE || "",
  };

  const voiceId = mapping[category.toLowerCase()];
  if (voiceId) return voiceId;

  // Fallback to default voice
  return process.env.ELEVEN_VOICE_DEFAULT || process.env.ELEVEN_VOICE_NARRATOR;
}

async function textToSpeech(text: string, voiceId: string): Promise<Buffer> {
  const apiKey = process.env.ELEVEN_API_KEY;
  if (!apiKey) {
    throw new Error("ELEVEN_API_KEY environment variable not set");
  }

  const requestBody = JSON.stringify({
    text,
    model_id: "eleven_multilingual_v2",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75,
    },
  });

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "api.elevenlabs.io",
        path: `/v1/text-to-speech/${voiceId}`,
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(requestBody),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];

        res.on("data", (chunk) => {
          chunks.push(chunk);
        });

        res.on("end", () => {
          const buffer = Buffer.concat(chunks);
          if (res.statusCode === 200) {
            resolve(buffer);
          } else {
            reject(
              new Error(
                `ElevenLabs API error: ${res.statusCode} ${buffer.toString()}`
              )
            );
          }
        });
      }
    );

    req.on("error", reject);
    req.write(requestBody);
    req.end();
  });
}

async function saveAudioFile(buffer: Buffer, outputPath: string): Promise<void> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(outputPath, buffer);
}

function playAudioOnWindows(audioPath: string): void {
  if (process.platform !== "win32") return;
  if (process.env.ELEVEN_AUTO_PLAY !== "1") return;

  try {
    const child = spawn(
      "powershell",
      [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        `Add-Type -AssemblyName presentationCore; $player = New-Object System.Windows.Media.MediaPlayer; $player.Open([Uri]::new('${audioPath.replace(/\\/g, "/")}', [UriKind]::Absolute)); $player.Play(); Start-Sleep -Seconds 5`,
      ],
      { stdio: "ignore", windowsHide: true }
    );
    child.unref();
  } catch (error) {
    debug(`Windows playback error: ${error}`);
  }
}

export const elevenLabsSink: SpeechSink = {
  name: "elevenlabs",
  async speak(payload: SpeechPayload) {
    // Fail-open: don't crash if API key not configured
    if (!process.env.ELEVEN_API_KEY) {
      debug("ELEVEN_API_KEY not configured, skipping");
      return;
    }

    const voiceId = getCategoryVoiceId(payload.category);
    if (!voiceId) {
      debug(`No voice ID configured for category: ${payload.category}`);
      return;
    }

    try {
      debug(
        `Generating audio for category: ${payload.category}, voice: ${voiceId}`
      );

      // Enqueue the request to avoid concurrent API calls
      await enqueueRequest(async () => {
        const audioBuffer = await textToSpeech(payload.text, voiceId);

        const outputDir = process.env.ELEVEN_OUTPUT_DIR || "voice/dynamic";
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `${payload.category}_${timestamp}.mp3`;
        const outputPath = path.join(outputDir, filename);

        await saveAudioFile(audioBuffer, outputPath);
        debug(`Saved audio to: ${outputPath}`);

        playAudioOnWindows(outputPath);
      });
    } catch (error) {
      // Fail-open: log error but don't crash
      debug(`Error generating speech: ${error}`);
    }
  },
};
