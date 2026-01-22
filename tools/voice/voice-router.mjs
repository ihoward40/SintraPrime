import fs from "node:fs";
import path from "node:path";

export const DEFAULT_PERSONA = "isiah";

export function loadPantheonConfig(repoRoot = process.cwd(), configPath = null) {
  const p = configPath
    ? path.resolve(configPath)
    : path.join(repoRoot, "tools", "voice", "pantheon.voices.json");

  if (!fs.existsSync(p)) {
    return {
      ok: false,
      configPath: p,
      error: "Missing config file (create tools/voice/pantheon.voices.json from pantheon.voices.example.json)",
    };
  }

  let obj;
  try {
    obj = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    return { ok: false, configPath: p, error: `Invalid JSON: ${String(e?.message ?? e)}` };
  }

  if (!obj || typeof obj !== "object" || !obj.voices || typeof obj.voices !== "object") {
    return { ok: false, configPath: p, error: "Config must include { voices: { ... } }" };
  }

  return { ok: true, configPath: p, config: obj };
}

export function resolvePersona({ persona, text, autoPersona = false }) {
  const p = String(persona || "").trim().toLowerCase();
  if (!autoPersona) return p || DEFAULT_PERSONA;

  const t = String(text || "").toLowerCase();

  if (/(notice of dishonor|entered into the record|administrative record)/.test(t)) return "judge";
  if (/(ucc|article\s*9|perfect(?:ion)?|security interest)/.test(t)) return "scribe";
  if (/(tiktok|reel|shorts|hook:|subscribe)/.test(t)) return "scholar";
  if (/(deadline|due\s+date|within\s+\d+\s+days)/.test(t)) return "guardian";

  return p || DEFAULT_PERSONA;
}

export function getVoiceSpec(config, persona) {
  const voices = config?.voices || {};
  const spec = voices[persona] || voices[DEFAULT_PERSONA];
  if (!spec) return null;

  return {
    persona,
    label: spec.label || persona,
    voice_id: spec.voice_id,
    model_id: config.model_id || spec.model_id || "eleven_multilingual_v2",
    voice_settings: spec.voice_settings || null,
  };
}
