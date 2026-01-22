import fs from "node:fs";
import path from "node:path";

function parseEnvFile(text) {
  const out = {};
  for (const rawLine of String(text || "").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1);
    out[k] = v;
  }
  return out;
}

const repoRoot = process.cwd();
const envPath = path.resolve(repoRoot, "control", "secrets.env");
const env = fs.existsSync(envPath) ? parseEnvFile(fs.readFileSync(envPath, "utf8")) : {};

const apiKey = String(process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY || process.env.XI_API_KEY || env.ELEVENLABS_API_KEY || env.ELEVEN_API_KEY || "").trim();
if (!apiKey) {
  console.error("Missing ELEVENLABS_API_KEY (or ELEVEN_API_KEY/XI_API_KEY). Add it to control/secrets.env or your process env.");
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
for (const v of voices) {
  const id = String(v?.voice_id || "");
  const name = String(v?.name || "");
  const category = String(v?.category || "");
  console.log(`${id}\t${name}\t${category}`);
}
