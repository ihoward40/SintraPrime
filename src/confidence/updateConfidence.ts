import fs from "node:fs";
import path from "node:path";

export type ConfidenceSignal = "POLICY_DENIAL" | "ROLLBACK" | "THROTTLE";

export type ConfidenceArtifact = {
  kind: "ConfidenceArtifact";
  fingerprint: string;
  confidence: number;
  updated_at: string;
  signals: Array<{
    at: string;
    signal: ConfidenceSignal;
    delta: number;
    confidence_before: number;
    confidence_after: number;
  }>;
};

function fixedNowIso(): string {
  const fixed = process.env.SMOKE_FIXED_NOW_ISO;
  if (typeof fixed === "string" && fixed.trim()) return fixed;
  return new Date().toISOString();
}

function ensureDir(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeFilePart(input: string): string {
  const s = String(input ?? "");
  const cleaned = s.replace(/[\\/<>:\"|?*\x00-\x1F]/g, "_");
  return cleaned.slice(0, 120);
}

function confidenceDir() {
  return path.join(process.cwd(), "runs", "confidence");
}

function confidencePath(fingerprint: string) {
  return path.join(confidenceDir(), `${safeFilePart(fingerprint)}.json`);
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function deltaForSignal(signal: ConfidenceSignal): number {
  if (signal === "POLICY_DENIAL") return -0.2;
  if (signal === "ROLLBACK") return -0.4;
  if (signal === "THROTTLE") return -0.1;
  return 0;
}

function readJsonSafe(filePath: string): any | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

export function readConfidence(fingerprint: string): ConfidenceArtifact {
  const file = confidencePath(fingerprint);
  const raw = readJsonSafe(file);
  const parsed = raw && typeof raw === "object" ? raw : null;

  // Tier-16 thresholds are defined at 0.6/0.4/0.2 with deltas in tenths.
  // Normalize to 2dp to avoid floating drift (e.g. 0.4000000000000001).
  const confidence = round2(clamp01(typeof parsed?.confidence === "number" ? parsed.confidence : 1));
  const updated_at = typeof parsed?.updated_at === "string" ? String(parsed.updated_at) : fixedNowIso();
  const signals = Array.isArray(parsed?.signals) ? parsed.signals : [];

  return {
    kind: "ConfidenceArtifact",
    fingerprint,
    confidence,
    updated_at,
    signals: signals
      .filter((s: any) => s && typeof s === "object")
      .map((s: any) => ({
        at: typeof s.at === "string" ? s.at : "",
        signal: typeof s.signal === "string" ? (s.signal as ConfidenceSignal) : ("POLICY_DENIAL" as ConfidenceSignal),
        delta: typeof s.delta === "number" ? s.delta : 0,
        confidence_before: typeof s.confidence_before === "number" ? s.confidence_before : 0,
        confidence_after: typeof s.confidence_after === "number" ? s.confidence_after : 0,
      })),
  };
}

export function updateConfidence(input: { fingerprint: string; signal: ConfidenceSignal }): ConfidenceArtifact {
  const now = fixedNowIso();
  const current = readConfidence(input.fingerprint);

  const delta = deltaForSignal(input.signal);
  const before = round2(clamp01(current.confidence));
  const after = round2(clamp01(Math.min(before, before + delta)));

  const next: ConfidenceArtifact = {
    ...current,
    confidence: after,
    updated_at: now,
    signals: [
      ...current.signals,
      {
        at: now,
        signal: input.signal,
        delta,
        confidence_before: before,
        confidence_after: after,
      },
    ],
  };

  const dir = confidenceDir();
  ensureDir(dir);
  fs.writeFileSync(confidencePath(input.fingerprint), JSON.stringify(next, null, 2) + "\n", "utf8");

  return next;
}
