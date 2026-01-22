import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type ModeSpec = {
  mode_id: string;
  mode_name?: string;
  mode_version?: string;
  system_prompt?: { role: "system"; text: string };
};

export type ModeSelection = {
  modeIds: string[];
  modePrompts: string[];
};

export type ModeRefusal = {
  type: "REFUSE";
  code: "MODE_UNKNOWN" | "MODE_MISSING";
  message: string;
  details?: Record<string, unknown>;
};

export class ModeStrictError extends Error {
  refusal: ModeRefusal;
  constructor(refusal: ModeRefusal) {
    super(refusal.message);
    this.name = "ModeStrictError";
    this.refusal = refusal;
  }
}

function repoRoot(): string {
  // This file is at src/governance/mode.ts
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..");
}

function modesDir(): string {
  return path.join(repoRoot(), "governance", "modes");
}

async function loadModeSpec(modeId: string): Promise<ModeSpec | null> {
  const file = path.join(modesDir(), `${modeId}.json`);
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as ModeSpec;
  } catch {
    return null;
  }
}

/**
 * Parse --mode usage:
 *   --mode legal
 *   --mode=legal
 *   --mode legal,technical
 *   --mode=legal,technical
 */
export function parseModeFlag(argv: string[]): string[] | undefined {
  for (let i = 0; i < argv.length; i++) {
    const a = String(argv[i] ?? "");
    if (a === "--mode") {
      const v = String(argv[i + 1] ?? "");
      if (!v) return [];
      return v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (a.startsWith("--mode=")) {
      const v = a.slice("--mode=".length);
      return v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return undefined;
}

export function parseStrictModeFlag(argv: string[]): boolean {
  for (let i = 0; i < argv.length; i++) {
    const a = String(argv[i] ?? "");
    if (a === "--strict-mode") return true;
    if (a.startsWith("--strict-mode=")) {
      const v = a.slice("--strict-mode=".length).trim().toLowerCase();
      return v === "true" || v === "1" || v === "yes";
    }
  }
  return false;
}

export function stripModeFlags(argv: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = String(argv[i] ?? "");

    if (a === "--strict-mode") continue;
    if (a.startsWith("--strict-mode=")) continue;

    if (a === "--mode") {
      i += 1;
      continue;
    }
    if (a.startsWith("--mode=")) continue;

    out.push(a);
  }
  return out;
}

const ALLOWLIST_FALLBACK = new Set<string>([]);

export async function selectModes(
  modeIdsRaw: string[] | undefined,
  opts?: { strict?: boolean }
): Promise<ModeSelection> {
  const strict = Boolean(opts?.strict);

  if (modeIdsRaw === undefined) {
    if (strict) {
      throw new ModeStrictError({
        type: "REFUSE",
        code: "MODE_MISSING",
        message: "Strict mode enabled, but no --mode value was provided.",
        details: { strict },
      });
    }
    return { modeIds: [], modePrompts: [] };
  }

  const modeIds = modeIdsRaw.map((s) => s.trim()).filter(Boolean);
  if (strict && modeIds.length === 0) {
    throw new ModeStrictError({
      type: "REFUSE",
      code: "MODE_MISSING",
      message: "Strict mode enabled, but --mode was empty.",
      details: { strict, modeIdsRaw },
    });
  }

  const prompts: string[] = [];

  for (const modeId of modeIds) {
    if (ALLOWLIST_FALLBACK.has(modeId)) {
      if (strict) {
        throw new ModeStrictError({
          type: "REFUSE",
          code: "MODE_UNKNOWN",
          message: `Mode "${modeId}" is not file-defined (governance/modes/${modeId}.json) in strict mode.`,
          details: { strict, modeId, expected_file: `${modeId}.json`, modes_dir: modesDir() },
        });
      }
      continue;
    }

    const spec = await loadModeSpec(modeId);
    if (!spec) {
      if (strict) {
        throw new ModeStrictError({
          type: "REFUSE",
          code: "MODE_UNKNOWN",
          message: `Unknown mode "${modeId}" in strict mode.`,
          details: { strict, modeId, expected_file: `${modeId}.json`, modes_dir: modesDir() },
        });
      }
      continue;
    }

    const text = spec.system_prompt?.text?.trim();
    if (!text) {
      if (strict) {
        throw new ModeStrictError({
          type: "REFUSE",
          code: "MODE_UNKNOWN",
          message: `Mode "${modeId}" is missing system_prompt.text in strict mode.`,
          details: { strict, modeId, mode_version: spec.mode_version },
        });
      }
      continue;
    }

    prompts.push(text);
  }

  return { modeIds, modePrompts: prompts };
}
