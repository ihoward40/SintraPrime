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

function getArgValue(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  if (i === -1) return undefined;
  const v = process.argv[i + 1];
  if (!v || v.startsWith("--")) return "";
  return v;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function parseIntArg(flag: string, fallback: number): number {
  const raw = getArgValue(flag);
  if (raw == null || raw === "") return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type Line = {
  category: string;
  text: string;
  severity?: "urgent" | "warning";
};

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function presetLines(preset: string): Line[] {
  const p = preset.trim().toLowerCase();
  if (p === "quick") {
    return [
      { category: "info", text: "I'm here. Running quick voice check." },
      { category: "system", text: "System online. Standing by." },
      { category: "warning", text: "Warning: conditions deteriorating.", severity: "warning" },
      { category: "critical", text: "Immediate alert. Containment required.", severity: "urgent" },
      { category: "legal", text: "Objection sustained. Compliance required." },
    ];
  }

  if (p === "courtroom") {
    return [
      { category: "info", text: "Court is in session. I'm with you." },
      { category: "legal", text: "Objection. Leading the witness." },
      { category: "legal", text: "Objection sustained. Rephrase." },
      { category: "warning", text: "Caution: the record is drifting.", severity: "warning" },
      { category: "error", text: "We have an error. The chain of custody is incomplete.", severity: "urgent" },
      { category: "critical", text: "Immediate action required. Freeze changes and preserve artifacts.", severity: "urgent" },
      { category: "success", text: "Ruling entered. Compliance confirmed." },
      { category: "info", text: "Proceed. I will narrate the next step." },
    ];
  }

  if (p === "warroom") {
    return [
      { category: "info", text: "War room online. I'm at your side." },
      { category: "system", text: "Telemetry locked. Channels open." },
      { category: "debug", text: "Trace: verifying sinks, budgets, and gates." },
      { category: "warning", text: "Caution: anomalies detected.", severity: "warning" },
      { category: "critical", text: "Immediate alert. Containment required.", severity: "urgent" },
      { category: "error", text: "Evidence indicates a fault in the pipeline.", severity: "urgent" },
      { category: "success", text: "Stabilization achieved. Standing down." },
      { category: "info", text: "All systems nominal. Stay with me." },
    ];
  }

  if (p === "soothe") {
    return [
      { category: "info", text: "Breathe. I'm here with you." },
      { category: "info", text: "You're safe. I'm watching the system." },
      { category: "system", text: "System steady. No action required." },
      { category: "success", text: "You're doing great. Progress confirmed." },
      { category: "info", text: "One step at a time. We'll finish this." },
    ];
  }

  if (p === "oracle") {
    return [
      { category: "info", text: "Listen. I will translate the signals." },
      { category: "warning", text: "A warning: the next move has consequences.", severity: "warning" },
      { category: "warning", text: "Caution. Verify before you commit.", severity: "warning" },
      { category: "system", text: "System check: integrity holds." },
      { category: "info", text: "Proceed only with certainty." },
    ];
  }

  if (p === "riff") {
    const openers = [
      "I'm here. Let's make this feel real.",
      "I'm in the room. You and me—focused.",
      "I'm with you. Clear head. Clean execution.",
    ];
    const closers = [
      "All set. I'm still here.",
      "Done. Quiet confidence.",
      "Complete. Standing by.",
    ];
    return [
      { category: "info", text: pick(openers) },
      { category: "system", text: "System online. Standing by." },
      { category: "warning", text: "Caution: verify invariants.", severity: "warning" },
      { category: "debug", text: "Trace: compiling intent to action." },
      { category: "legal", text: "Objection sustained. Keep it admissible." },
      { category: "critical", text: "Immediate alert. Containment required.", severity: "urgent" },
      { category: "success", text: "Success confirmed. You're clear to proceed." },
      { category: "info", text: pick(closers) },
    ];
  }

  // Default: cinematic
  return [
    { category: "info", text: "I'm here with you. Cinematic check starting now." },
    { category: "system", text: "System online. Standing by." },
    { category: "warning", text: "Warning: conditions deteriorating.", severity: "warning" },
    { category: "critical", text: "Immediate alert. Containment required.", severity: "urgent" },
    { category: "legal", text: "Objection sustained. Compliance required." },
    { category: "error", text: "We have an error. Evidence indicates a fault in the pipeline.", severity: "urgent" },
    { category: "success", text: "Success confirmed. You're clear to proceed." },
    { category: "debug", text: "Debug trace: subsystem check complete." },
    { category: "info", text: "All systems nominal. I'm here with you." },
    { category: "info", text: "If you need it, I'll speak immediately." },
  ];
}

loadEnvLocal();

const sinks = getArgValue("--sinks");
if (sinks) process.env.SPEECH_SINKS = sinks;
if (hasFlag("--autoplay")) process.env.ELEVEN_AUTO_PLAY = "1";
if (hasFlag("--debug")) process.env.SPEECH_DEBUG = "1";

const preset = (getArgValue("--preset") || "cinematic").trim() || "cinematic";
const delayMs = parseIntArg("--delay", 900);
const tailMs = parseIntArg("--tail", 2000);
const fingerprintBase = (getArgValue("--fingerprint") || "cinematic").trim() || "cinematic";

if (hasFlag("--help")) {
  process.stdout.write(
    [
      "Usage:",
      "  npm run speak:cinematic -- --preset cinematic --autoplay --debug",
      "",
      "Options:",
      "  --preset      cinematic|quick|courtroom|warroom|soothe|oracle|riff (default: cinematic)",
      "  --delay       ms between lines (default: 900)",
      "  --tail        ms to wait after last line (default: 2000)",
      "  --sinks       override SPEECH_SINKS for this run",
      "  --fingerprint base fingerprint (default: cinematic)",
      "  --autoplay    sets ELEVEN_AUTO_PLAY=1",
      "  --debug       sets SPEECH_DEBUG=1",
      "",
      "Notes:",
      "  - Auto-loads .env.local from repo root (if present)",
    ].join("\n") + "\n"
  );
  process.exit(0);
}

async function main(): Promise<void> {
  // Import after env is set (some modules snapshot env at import time)
  const { speak } = await import("../src/speech/speak.js");

  const lines = presetLines(preset);

  for (const line of lines) {
    process.stdout.write(`${line.category.toUpperCase()}: ${line.text}\n`);
    speak({
      text: line.text,
      category: line.category,
      fingerprint: `${fingerprintBase}:${line.category}`,
      meta: line.severity ? { severity: line.severity, confidence: 1 } : { confidence: 1 },
    });
    await sleep(delayMs);
  }

  await sleep(tailMs);
}

main().catch((error) => {
  process.stderr.write(`speak:cinematic failed: ${String(error)}\n`);
  process.exit(1);
});
