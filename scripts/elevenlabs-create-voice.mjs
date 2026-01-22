import fs from "node:fs/promises";
import path from "node:path";
import { loadControlSecretsEnv } from "../ui/core/envLoader.js";

// Load local secrets into process.env (no override). Do NOT print secrets.
loadControlSecretsEnv();

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

function usage(exitCode = 1) {
  console.log("Usage:");
  console.log("  node scripts/elevenlabs-create-voice.mjs --name <voice_name> --file <path_to_audio>");
  console.log("  node scripts/elevenlabs-create-voice.mjs --name <voice_name> --files <a.mp3,b.mp3,...>");
  console.log("  node scripts/elevenlabs-create-voice.mjs --name <voice_name> --file a.mp3 --file b.mp3  (repeatable)");
  console.log("Optional:");
  console.log("  --description <text>");
  console.log("  --labels <json_object>");
  process.exit(exitCode);
}

const name = getArg("--name");
const filePath = getArg("--file");
const filesCsv = getArg("--files");
const description = getArg("--description");
const labelsRaw = getArg("--labels");

function collectFiles() {
  const files = [];

  // Repeatable --file
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === "--file") {
      const v = process.argv[i + 1];
      if (v) files.push(v);
    }
  }

  // --files csv list
  if (filesCsv) {
    for (const f of String(filesCsv)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)) {
      files.push(f);
    }
  }

  // Back-compat single --file
  if (!files.length && filePath) files.push(filePath);

  // Deduplicate while preserving order
  const seen = new Set();
  return files.filter((f) => {
    const k = String(f);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const files = collectFiles();

if (!name || !files.length) usage(1);

const apiKey = String(process.env.ELEVENLABS_API_KEY || process.env.ELEVEN_API_KEY || process.env.XI_API_KEY || "").trim();
if (!apiKey) {
  console.error("Missing ELEVENLABS_API_KEY (or ELEVEN_API_KEY/XI_API_KEY). Set it in control/secrets.env or your environment.");
  process.exit(2);
}

const baseUrl = String(process.env.ELEVENLABS_BASE_URL || "https://api.elevenlabs.io").trim().replace(/\/$/, "");

let labels = null;
if (labelsRaw) {
  try {
    labels = JSON.parse(labelsRaw);
  } catch {
    console.error("Invalid --labels JSON. Example: --labels '{\"persona\":\"shadow\"}'");
    process.exit(2);
  }
}

async function main() {
  // Node's fetch + FormData are available in modern Node (>=18).
  const form = new FormData();
  form.append("name", name);
  if (description) form.append("description", String(description));
  if (labels && typeof labels === "object") form.append("labels", JSON.stringify(labels));

  // ElevenLabs expects one or more files.
  for (const f of files) {
    const abs = path.resolve(f);
    const buf = await fs.readFile(abs);
    const blob = new Blob([buf], { type: "audio/mpeg" });
    form.append("files", blob, path.basename(abs));
  }

  const resp = await fetch(`${baseUrl}/v1/voices/add`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      Accept: "application/json",
    },
    body: form,
  });

  const json = await resp.json().catch(() => null);
  if (!resp.ok) {
    const msg = json ? JSON.stringify(json).slice(0, 2000) : await resp.text().catch(() => "");
    throw new Error(`ElevenLabs create voice failed (HTTP ${resp.status}): ${msg}`);
  }

  const voiceId = json?.voice_id || json?.voiceId;
  if (!voiceId) {
    throw new Error(`ElevenLabs response missing voice_id: ${JSON.stringify(json).slice(0, 2000)}`);
  }

  console.log(JSON.stringify({ ok: true, voice_id: voiceId, name }, null, 2));
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
