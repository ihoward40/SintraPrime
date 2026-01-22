import fs from "node:fs/promises";
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

function normalizePersonaKey(key) {
  return String(key || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function resolveEnvVoice(persona) {
  const k = normalizePersonaKey(persona);
  if (!k) return null;

  const names = [
    `ELEVEN_${k}`,
    `ELEVEN_VOICE_${k}`,
    `ELEVEN_${k}_VOICE_ID`,
    `ELEVEN_${k}_VOICE`,
    `ELEVEN_VOICE_ID_FOR_${k}`,
    `ELEVEN_VOICE_ID_${k}`,
  ];

  if (k === "ORACLE") {
    names.push(
      "ELEVEN_VOICE_ID_FOR_BRICK_CITY_ORACLE_V2",
      "ELEVEN_BRICK_CITY_ORACLE_V2",
      "ELEVEN_BRICK_CITY_ORACLE_V2_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_BRICK_CITY_ORACLE",
      "ELEVEN_BRICK_CITY_ORACLE_VOICE_ID",
      "ELEVEN_ORACLE_VOICE_ID",
    );
  }
  if (k === "DRAGON") {
    names.push(
      "ELEVEN_VOICE_ID_FOR_DRAGON_DUE_PROCESS_V2",
      "ELEVEN_DRAGON_DUE_PROCESS_V2",
      "ELEVEN_DRAGON_DUE_PROCESS_V2_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_DRAGON_DUE_PROCESS",
      "ELEVEN_DRAGON_DUE_PROCESS_VOICE_ID",
      "ELEVEN_DUE_PROCESS_VOICE_ID",
      "ELEVEN_DRAGON_VOICE_ID",
    );
  }
  if (k === "JUDGE") {
    names.push(
      "ELEVEN_VOICE_ID_FOR_JUDGE_INVISIBLE_V2",
      "ELEVEN_JUDGE_INVISIBLE_V2",
      "ELEVEN_JUDGE_INVISIBLE_V2_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_JUDGE_INVISIBLE",
      "ELEVEN_JUDGE_INVISIBLE_VOICE_ID",
      "ELEVEN_JUDGE_VOICE_ID",
    );
  }
  if (k === "SUPREME") {
    names.push(
      "ELEVEN_VOICE_ID_FOR_SUPREME_COURT_MODE_V2",
      "ELEVEN_SUPREME_COURT_MODE_V2",
      "ELEVEN_SUPREME_COURT_MODE_V2_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_SUPREME_COURT_MODE",
      "ELEVEN_SUPREME_COURT_MODE_VOICE_ID",
      "ELEVEN_SUPREME_VOICE_ID",
    );
  }
  if (k === "SHADOW") {
    names.push(
      "ELEVEN_VOICE_ID_FOR_SHADOW_TRUSTEE_HYBRID_ELITE",
      "ELEVEN_SHADOW_TRUSTEE_HYBRID_ELITE",
      "ELEVEN_SHADOW_TRUSTEE_HYBRID_ELITE_VOICE_ID",
      "ELEVEN_VOICE_ID_FOR_SHADOW_TRUSTEE",
      "ELEVEN_SHADOW_TRUSTEE_VOICE_ID",
      "ELEVEN_SHADOW_VOICE_ID",
    );
  }

  for (const n of names) {
    const v = String(process.env[n] || "").trim();
    if (!v) continue;
    if (v.toUpperCase() === "DISABLED") return null;
    if (!looksPlaceholder(v)) return v;
  }
  return null;
}

function maskId(v) {
  const s = String(v || "");
  if (s.length <= 8) return "***";
  return `${s.slice(0, 3)}…${s.slice(-4)}`;
}

async function main() {
  const voicesPath = path.resolve(args.out || process.env.ELEVEN_VOICES_PATH || "config/voices.json");
  let fileVoices = {};

  try {
    const raw = await fs.readFile(voicesPath, "utf8");
    fileVoices = JSON.parse(raw);
  } catch {
    fileVoices = {};
  }

  const updates = {};
  for (const p of ["shadow", "oracle", "dragon", "judge", "supreme"]) {
    const id = resolveEnvVoice(p);
    if (id) updates[p] = id;
  }

  const changed = [];
  for (const [k, v] of Object.entries(updates)) {
    const prev = String(fileVoices?.[k] || "").trim();
    if (prev !== v) {
      fileVoices[k] = v;
      changed.push({ persona: k, prev: prev ? maskId(prev) : "(missing)", next: maskId(v) });
    }
  }

  if (!changed.length) {
    console.log("No updates applied. (No valid env voice IDs found.)");
    console.log("Tip: set env vars in control/secrets.env, then rerun scripts/validate-voice-config.mjs.");
    process.exit(0);
  }

  const backupPath = `${voicesPath}.bak.${Date.now()}`;
  try {
    await fs.copyFile(voicesPath, backupPath);
  } catch {
    // ignore (file may not exist)
  }

  const out = JSON.stringify(fileVoices, null, 2) + "\n";
  await fs.writeFile(voicesPath, out, "utf8");

  console.log(`Updated ${path.relative(process.cwd(), voicesPath)} (backup: ${path.basename(backupPath)})`);
  for (const c of changed) {
    console.log(`- ${c.persona}: ${c.prev} -> ${c.next}`);
  }
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
