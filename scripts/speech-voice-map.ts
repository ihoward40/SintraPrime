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
      const existing = process.env[key];
      if (existing != null && String(existing).trim() !== "") return;
      process.env[key] = value;
    });
  } catch {
    // fail-open
  }
}

function isPlaceholder(v: string | undefined): boolean {
  const s = String(v ?? "").trim();
  if (!s) return true;
  return s.includes("YOUR_") || s.includes("_HERE") || s.includes("REPLACE_ME");
}

function parseCsv(raw: string | undefined): string[] {
  const v = String(raw ?? "").trim();
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

loadEnvLocal();

const anchor = String(process.env.ELEVEN_VOICE_ANCHOR ?? "").trim();
const anchorCats = parseCsv(process.env.ELEVEN_ANCHOR_CATEGORIES);
const effectiveAnchorCats = anchor ? (anchorCats.length ? anchorCats : ["info"]) : [];

const rows: Array<{ category: string; envVar: string; value: string }> = [
  { category: "system", envVar: "ELEVEN_VOICE_ANDROID", value: process.env.ELEVEN_VOICE_ANDROID ?? "" },
  { category: "warning", envVar: "ELEVEN_VOICE_ORACLE", value: process.env.ELEVEN_VOICE_ORACLE ?? "" },
  { category: "error", envVar: "ELEVEN_VOICE_PROSECUTOR", value: process.env.ELEVEN_VOICE_PROSECUTOR ?? "" },
  { category: "critical", envVar: "ELEVEN_VOICE_DRAGON", value: process.env.ELEVEN_VOICE_DRAGON ?? "" },
  { category: "success", envVar: "ELEVEN_VOICE_SAGE", value: process.env.ELEVEN_VOICE_SAGE ?? "" },
  { category: "info", envVar: "ELEVEN_VOICE_NARRATOR", value: process.env.ELEVEN_VOICE_NARRATOR ?? "" },
  { category: "debug", envVar: "ELEVEN_VOICE_WARRIOR", value: process.env.ELEVEN_VOICE_WARRIOR ?? "" },
  { category: "legal", envVar: "ELEVEN_VOICE_JUDGE", value: process.env.ELEVEN_VOICE_JUDGE ?? "" },
  { category: "fallback", envVar: "ELEVEN_VOICE_DEFAULT", value: process.env.ELEVEN_VOICE_DEFAULT ?? "" },
];

function effectiveVoiceFor(category: string, base: string): { voice: string; source: string } {
  const cat = category.toLowerCase();
  if (anchor && effectiveAnchorCats.includes(cat)) {
    return { voice: anchor, source: "ELEVEN_VOICE_ANCHOR" };
  }
  if (base && !isPlaceholder(base)) return { voice: base, source: "category" };
  const fallback = String(process.env.ELEVEN_VOICE_DEFAULT ?? "").trim();
  if (fallback && !isPlaceholder(fallback)) return { voice: fallback, source: "ELEVEN_VOICE_DEFAULT" };
  const narrator = String(process.env.ELEVEN_VOICE_NARRATOR ?? "").trim();
  if (narrator && !isPlaceholder(narrator)) return { voice: narrator, source: "ELEVEN_VOICE_NARRATOR" };
  return { voice: "", source: "(missing)" };
}

process.stdout.write(`SPEECH_SINKS=${process.env.SPEECH_SINKS ?? ""}\n`);
process.stdout.write(`SPEECH_DEBUG=${process.env.SPEECH_DEBUG ?? ""}\n`);
process.stdout.write(`ELEVEN_AUTO_PLAY=${process.env.ELEVEN_AUTO_PLAY ?? ""}\n`);
process.stdout.write(`ELEVEN_OUTPUT_DIR=${process.env.ELEVEN_OUTPUT_DIR ?? "voice/dynamic"}\n`);
process.stdout.write(`ELEVEN_VOICE_ANCHOR=${anchor ? "(set)" : ""}\n`);
process.stdout.write(`ELEVEN_ANCHOR_CATEGORIES=${effectiveAnchorCats.join(",")}\n`);
process.stdout.write("\nVoice map:\n");

let missing = 0;
for (const r of rows) {
  const ok = !isPlaceholder(r.value);
  if (!ok) missing += 1;
  const eff = effectiveVoiceFor(r.category, r.value);
  const effOk = Boolean(eff.voice) && !isPlaceholder(eff.voice);
  process.stdout.write(
    `${r.category.padEnd(9)} ${r.envVar.padEnd(22)} ${ok ? r.value : "(missing)"}  =>  ${effOk ? eff.voice : "(missing)"} (${eff.source})\n`
  );
}

if (!process.env.ELEVEN_API_KEY || isPlaceholder(process.env.ELEVEN_API_KEY)) {
  process.stdout.write("\nELEVEN_API_KEY: (missing/placeholder)\n");
} else {
  process.stdout.write("\nELEVEN_API_KEY: (set)\n");
}

process.exit(missing ? 1 : 0);
