import type { SpeechSink } from "./types.js";
import { consoleSink } from "./consoleSink.js";
import { webhookSink } from "./webhookSink.js";
import { osTtsSink } from "./osTtsSink.js";
import { elevenLabsSink, isElevenLabsConfigured } from "./elevenLabsSink.js";

function parseList(value: string | undefined): string[] {
  return String(value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function loadSpeechSinks(env: NodeJS.ProcessEnv = process.env): SpeechSink[] {
  const names = parseList(env.SPEECH_SINKS) || [];

  const all: Record<string, SpeechSink> = {
    console: consoleSink,
    webhook: webhookSink,
    "os-tts": osTtsSink,
    elevenlabs: elevenLabsSink,
  };

  // Some sinks require runtime configuration to be considered "available".
  // This is used by operator commands to deny selecting unavailable sinks.
  if (!isElevenLabsConfigured(env)) {
    delete all.elevenlabs;
  }

  // Tier gate: keep cloud speech explicitly opt-in.
  // Default is local (no ElevenLabs) even if ELEVENLABS_API_KEY is present.
  const tier = String(env.PRIME_SPEECH_TIER ?? "local").trim().toLowerCase();
  if (tier !== "elevenlabs") {
    delete all.elevenlabs;
  }

  // Default order (boring-reliable): ElevenLabs → OS TTS → console.
  // Note: ElevenLabs is filtered out below when not configured.
  const selected = (names.length ? names : ["elevenlabs", "os-tts", "console"])
    .map((n) => all[n])
    .filter((s): s is SpeechSink => Boolean(s));

  // Fail-safe: never return an empty sink list (avoid silent loss of stderr output).
  return selected.length ? selected : [consoleSink];
}
