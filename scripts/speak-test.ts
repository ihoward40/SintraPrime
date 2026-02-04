import { speak } from "../src/speech/speak.js";

function getArgValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  if (!v || v.startsWith("--")) return "";
  return v;
}

function getArgOrEnv(flag: string, envKey: string, fallback?: string): string | undefined {
  const v = getArgValue(flag);
  if (v !== undefined) return v;
  const e = process.env[envKey];
  if (e != null && String(e).trim() !== "") return String(e);
  return fallback;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

const text = getArgOrEnv("--text", "SPEAK_TEXT", "Testing speech output.") ?? "";
const category = getArgOrEnv("--category", "SPEAK_CATEGORY", "info") ?? "info";
const sinks = getArgOrEnv("--sinks", "SPEECH_SINKS");

if (sinks) process.env.SPEECH_SINKS = sinks;
if (hasFlag("--autoplay")) process.env.ELEVEN_AUTO_PLAY = "1";
if (hasFlag("--debug")) process.env.SPEECH_DEBUG = "1";

if (hasFlag("--help")) {
  process.stdout.write(
    [
      "Usage:",
      "  npm run speak:test -- --text \"hello\" --category info --sinks console,elevenlabs --autoplay",
      "",
      "Flags:",
      "  --text       Text to speak (default: 'Testing speech output.')",
      "  --category   Speech category (default: info)",
      "  --sinks      Override SPEECH_SINKS for this run",
      "  --autoplay   Sets ELEVEN_AUTO_PLAY=1",
      "  --debug      Sets SPEECH_DEBUG=1",
      "",
      "Env:",
      "  ELEVEN_API_KEY must be set for ElevenLabs.",
    ].join("\n") + "\n"
  );
  process.exit(0);
}

speak({ text, category });

// Give async sinks a moment to run before exiting.
setTimeout(() => {
  process.exit(0);
}, 1500);
