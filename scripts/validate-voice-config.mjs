import fs from "node:fs";
import path from "node:path";
import { loadControlSecretsEnv } from "../ui/core/envLoader.js";

function parseArgs(argv) {
  const out = {};
  const args = Array.isArray(argv) ? argv.slice(2) : [];
  for (let i = 0; i < args.length; i++) {
    const a = String(args[i] || "");
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = args[i + 1];
    if (next != null && !String(next).startsWith("--")) {
      out[key] = String(next);
      i++;
    } else {
      out[key] = "true";
    }
  }
  return out;
}

const args = parseArgs(process.argv);

// Load local secrets into process.env (no override) so env overrides can be validated.
if (args.env) {
  loadControlSecretsEnv({ path: args.env });
} else {
  loadControlSecretsEnv();
}

function looksPlaceholder(v) {
  const s = String(v || "").trim();
  if (!s) return true;
  if (s.includes("ELEVEN_VOICE_ID_FOR_")) return true;
  if (s.includes("VOICE_ID_FOR_")) return true;
  if (s.startsWith("VOICE_ID_")) return true;
  if (s.startsWith("ELEVEN_VOICE_ID_")) return true;
  if (/[_\s]/.test(s)) return true;
  return false;
}

function envVoice(persona) {
  const k = String(persona || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const names = [
    `ELEVEN_${k}`,
    `ELEVEN_VOICE_${k}`,
    `ELEVEN_${k}_VOICE_ID`,
    `ELEVEN_${k}_VOICE`,
    `ELEVEN_VOICE_ID_FOR_${k}`,
    `ELEVEN_VOICE_ID_${k}`,
  ];

  if (k === "ORACLE") names.push("ELEVEN_BRICK_CITY_ORACLE_VOICE_ID", "ELEVEN_ORACLE_VOICE_ID");
  if (k === "ORACLE") names.push("ELEVEN_VOICE_ID_FOR_BRICK_CITY_ORACLE", "ELEVEN_VOICE_ID_BRICK_CITY_ORACLE");
  if (k === "ORACLE") names.push("ELEVEN_BRICK_CITY_ORACLE_V2", "ELEVEN_BRICK_CITY_ORACLE_V2_VOICE_ID", "ELEVEN_VOICE_ID_FOR_BRICK_CITY_ORACLE_V2");
  if (k === "DRAGON")
    names.push(
      "ELEVEN_DRAGON_DUE_PROCESS_V2",
      "ELEVEN_DRAGON_DUE_PROCESS_V2_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_DRAGON_DUE_PROCESS_V2",
      "ELEVEN_DUE_PROCESS_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_DRAGON_DUE_PROCESS",
      "ELEVEN_VOICE_ID_DRAGON_DUE_PROCESS",
      "ELEVEN_DRAGON_DUE_PROCESS_VOICE_ID",
      "ELEVEN_DRAGON_VOICE_ID",
    );
  if (k === "JUDGE")
    names.push(
      "ELEVEN_JUDGE_INVISIBLE_V2",
      "ELEVEN_JUDGE_INVISIBLE_V2_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_JUDGE_INVISIBLE_V2",
      "ELEVEN_JUDGE_INVISIBLE_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_JUDGE_INVISIBLE",
      "ELEVEN_VOICE_ID_JUDGE_INVISIBLE",
      "ELEVEN_JUDGE_VOICE_ID",
    );
  if (k === "SUPREME")
    names.push(
      "ELEVEN_SUPREME_COURT_MODE_V2",
      "ELEVEN_SUPREME_COURT_MODE_V2_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_SUPREME_COURT_MODE_V2",
      "ELEVEN_SUPREME_COURT_MODE_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_SUPREME_COURT_MODE",
      "ELEVEN_VOICE_ID_SUPREME_COURT_MODE",
      "ELEVEN_SUPREME_VOICE_ID",
    );
  if (k === "SHADOW")
    names.push(
      "ELEVEN_SHADOW_TRUSTEE_HYBRID_ELITE",
      "ELEVEN_SHADOW_TRUSTEE_HYBRID_ELITE_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_SHADOW_TRUSTEE_HYBRID_ELITE",
      "ELEVEN_SHADOW_TRUSTEE_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_SHADOW_TRUSTEE",
      "ELEVEN_VOICE_ID_SHADOW_TRUSTEE",
      "ELEVEN_SHADOW_VOICE_ID",
    );
  for (const n of names) {
    const v = String(process.env[n] || "").trim();
    if (v) return { name: n, value: v };
  }
  return null;
}

const voicesPath = path.resolve(args.in || process.env.ELEVEN_VOICES_PATH || "config/voices.json");
console.log("Voice config:", voicesPath);

let fileVoices = {};
try {
  const raw = fs.readFileSync(voicesPath, "utf8");
  fileVoices = JSON.parse(raw);
} catch {
  fileVoices = {};
}

const personas = ["isiah", "oracle", "guardian", "scribe", "scholar", "judge", "trickster", "dragon", "angel", "supreme", "shadow"];
for (const p of personas) {
  const fromEnv = envVoice(p);
  const fromFile = String(fileVoices?.[p] || "").trim();
  const chosen = fromEnv?.value ? fromEnv.value : fromFile;
  const src = fromEnv?.value ? `env:${fromEnv.name}` : fromFile ? "file" : "missing";
  const ok = chosen && !looksPlaceholder(chosen);
  console.log(`- ${p}: ${ok ? "OK" : "BAD"} (${src})${chosen ? ` len=${chosen.length}` : ""}`);
}

if (!String(process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY || process.env.XI_API_KEY || "").trim()) {
  console.log("⚠️ Missing ELEVENLABS_API_KEY (or ELEVEN_API_KEY/XI_API_KEY)");
}
