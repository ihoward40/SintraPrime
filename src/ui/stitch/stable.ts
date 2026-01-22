import crypto from "node:crypto";
import path from "node:path";
import type { StitchPack, StitchAsset } from "./schema.js";

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

function normalizePathToRunRelative(p: string, runDirAbs: string): string {
  const raw = String(p ?? "");
  if (!raw) return raw;

  try {
    if (path.isAbsolute(raw)) {
      return toPosix(path.relative(runDirAbs, raw));
    }
  } catch {
    // ignore
  }

  // If already run-relative, just normalize separators.
  return toPosix(raw);
}

function stableAssetSort(a: StitchAsset, b: StitchAsset): number {
  const ap = String((a as any).path ?? "");
  const bp = String((b as any).path ?? "");
  if (ap !== bp) return ap.localeCompare(bp, "en");

  const ak = String((a as any).kind ?? "");
  const bk = String((b as any).kind ?? "");
  if (ak !== bk) return ak.localeCompare(bk, "en");

  const ah = String((a as any).sha256 ?? "");
  const bh = String((b as any).sha256 ?? "");
  return ah.localeCompare(bh, "en");
}

export function toStableStitchPack(pack: StitchPack, runDirAbs: string): Record<string, unknown> {
  const stableAssets: StitchAsset[] = [...(pack.import.assets ?? [])]
    .map((a) => ({
      ...a,
      path: normalizePathToRunRelative((a as any).path, runDirAbs),
    }))
    .sort(stableAssetSort);

  const stable = {
    version: pack.version,
    runId: pack.runId,
    backend: pack.backend,
    prompt: {
      text: pack.prompt?.text ?? "",
      constraints: pack.prompt?.constraints ?? undefined,
      platform: pack.prompt?.platform ?? "unknown",
    },
    import: {
      dir: normalizePathToRunRelative(pack.import.dir, runDirAbs),
      found: Boolean(pack.import.found),
      assets: stableAssets,
    },
    notes: Array.isArray(pack.notes) ? pack.notes : [],
  };

  return stable;
}

export function sha256Text(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex");
}
