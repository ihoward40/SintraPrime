import fs from "node:fs";
import path from "node:path";

function loadEnvLocal(): void {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  try {
    const content = fs.readFileSync(envPath, "utf-8");
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const i = trimmed.indexOf("=");
      if (i === -1) return;
      const key = trimmed.slice(0, i).trim();
      const value = trimmed.slice(i + 1).trim();
      if (!key) return;

      // Only fill missing values; let the current process env win.
      const existing = process.env[key];
      if (existing != null && String(existing).trim() !== "") return;
      process.env[key] = value;
    });
  } catch {
    // fail-open
  }
}

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

loadEnvLocal();

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
      "Notes:",
      "  - Automatically loads .env.local from the repo root (if present)",
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

async function main(): Promise<void> {
  const { speak } = await import("../src/speech/speak.js");
  speak({ text, category });

  // Give async sinks a moment to run before exiting.
  setTimeout(() => {
    process.exit(0);
  }, 1500);
}

main().catch((error) => {
  process.stderr.write(`speak:test failed: ${String(error)}\n`);
  process.exit(1);
});
