import fs from "node:fs";
import path from "node:path";
import { loadControlSecretsEnv } from "../ui/core/envLoader.js";

loadControlSecretsEnv();

function parseArgs(argv) {
  const out = { id: null };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--id" || a === "-i") {
      out.id = String(argv[i + 1] || "").trim();
      i++;
      continue;
    }
  }
  return out;
}

function parseEnvFile(text) {
  const out = {};
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim();
    if (!k) continue;
    out[k] = v;
  }
  return out;
}

const { id } = parseArgs(process.argv);
if (!id) {
  console.error("Usage: node scripts/elevenlabs-voice-lookup.mjs --id <voice_id>");
  process.exit(2);
}

const repoRoot = process.cwd();
const envPath = path.resolve(repoRoot, "control", "secrets.env");
const env = fs.existsSync(envPath) ? parseEnvFile(fs.readFileSync(envPath, "utf8")) : {};

const apiKey = String(
  process.env.ELEVENLABS_API_KEY ||
    process.env.ELEVEN_API_KEY ||
    process.env.XI_API_KEY ||
    env.ELEVENLABS_API_KEY ||
    env.ELEVEN_API_KEY ||
    "",
).trim();

if (!apiKey) {
  console.error("Missing ELEVENLABS_API_KEY (or ELEVEN_API_KEY/XI_API_KEY). Put it in control/secrets.env or process env.");
  process.exit(2);
}

const baseUrl = String(process.env.ELEVENLABS_BASE_URL || env.ELEVENLABS_BASE_URL || "https://api.elevenlabs.io").trim();
const url = new URL("/v1/voices", baseUrl);

const resp = await fetch(url, { headers: { "xi-api-key": apiKey } });
const json = await resp.json().catch(() => null);

if (!resp.ok) {
  console.error(`ElevenLabs HTTP ${resp.status}`);
  console.error(JSON.stringify(json || {}, null, 2));
  process.exit(1);
}

const voices = Array.isArray(json?.voices) ? json.voices : [];
const match = voices.find((v) => String(v?.voice_id || "").trim() === id);

if (!match) {
  console.log("NOT_FOUND\t" + id);
  process.exit(1);
}

console.log(
  [
    String(match.voice_id || ""),
    String(match.name || ""),
    String(match.category || ""),
    match?.labels ? JSON.stringify(match.labels) : "",
  ]
    .filter(Boolean)
    .join("\t"),
);
