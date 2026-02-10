import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseCsv(raw: string | undefined): string[] {
  const v = String(raw ?? "").trim();
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function findLatestMp3(dir: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.toLowerCase().endsWith(".mp3"))
    .map((d) => path.join(dir, d.name));
  if (!entries.length) return null;

  let latest = entries[0];
  let latestMtime = fs.statSync(latest).mtimeMs;

  for (const p of entries.slice(1)) {
    const m = fs.statSync(p).mtimeMs;
    if (m > latestMtime) {
      latest = p;
      latestMtime = m;
    }
  }

  return latest;
}

function openOnWindows(filePath: string): boolean {
  if (process.platform !== "win32") return false;
  const escaped = filePath.replace(/'/g, "''");
  const ps = `Start-Process -FilePath '${escaped}'`;
  const res = spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], {
    stdio: "ignore",
    windowsHide: true,
  });
  return res.status === 0;
}

function isPlaceholder(v: string | undefined): boolean {
  const s = String(v ?? "").trim();
  if (!s) return true;
  return s.includes("YOUR_") || s.includes("_HERE") || s.includes("REPLACE_ME");
}

loadEnvLocal();

async function main(): Promise<void> {
  const sinks = parseCsv(process.env.SPEECH_SINKS);
  const hasEleven = sinks.includes("elevenlabs");
  const autoPlay = process.env.ELEVEN_AUTO_PLAY === "1";
  const outputDirRaw = process.env.ELEVEN_OUTPUT_DIR || "voice/dynamic";
  const outputDir = path.isAbsolute(outputDirRaw) ? outputDirRaw : path.resolve(outputDirRaw);

  process.stdout.write(`SPEECH_SINKS=${process.env.SPEECH_SINKS ?? ""}\n`);
  process.stdout.write(`ELEVEN_AUTO_PLAY=${process.env.ELEVEN_AUTO_PLAY ?? ""}\n`);
  process.stdout.write(`ELEVEN_OUTPUT_DIR=${outputDirRaw}\n`);

  if (!hasEleven) {
    process.stderr.write("ElevenLabs sink is not enabled. Set SPEECH_SINKS=console,elevenlabs\n");
    process.exit(2);
  }

  const apiKey = process.env.ELEVEN_API_KEY;
  if (!apiKey || isPlaceholder(apiKey)) {
    process.stderr.write("ELEVEN_API_KEY missing/placeholder. Sound check cannot generate new audio.\n");
    // We can still try to open an existing file.
  }

  let latest = findLatestMp3(outputDir);

  // If nothing exists yet and we have a key, generate one via the real pipeline.
  if (!latest && apiKey && !isPlaceholder(apiKey)) {
    const { speak } = await import("../src/speech/speak.js");
    speak({
      text: "Sound check. Audio is active.",
      category: "info",
      fingerprint: "sound-check",
      meta: { confidence: 1 },
    });
    await sleep(2500);
    latest = findLatestMp3(outputDir);
  }

  if (!latest) {
    process.stderr.write(`No MP3 found in ${outputDir}. Run: npm run diag:elevenlabs\n`);
    process.exit(3);
  }

  process.stdout.write(`Latest MP3: ${latest}\n`);

  if (process.platform === "win32") {
    if (!autoPlay) {
      process.stderr.write("Note: ELEVEN_AUTO_PLAY is not 1 (autoplay disabled). Opening the file anyway.\n");
    }
    const ok = openOnWindows(latest);
    if (!ok) {
      process.stderr.write("Failed to launch the default Windows audio player.\n");
      process.exit(4);
    }
    process.stdout.write("OK: Opened audio file in Windows default player.\n");
    return;
  }

  process.stdout.write("OK: Generated audio (non-Windows; not auto-opening).\n");
}

main().catch((error) => {
  process.stderr.write(`sound-check failed: ${String(error)}\n`);
  process.exit(1);
});
