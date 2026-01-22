import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type Architecture = {
  arch_id: string;
  arch_name: string;
  arch_version: string;
  system_prompt?: { role: "system"; text: string };
};

export type ArchSelection = {
  archId: string;
  archVersion: string;
  systemPromptText: string;
};

export type ArchRefusal = {
  type: "REFUSE";
  code: "ARCH_UNKNOWN" | "ARCH_MISSING";
  message: string;
  details?: Record<string, unknown>;
};

export class ArchStrictError extends Error {
  refusal: ArchRefusal;
  constructor(refusal: ArchRefusal) {
    super(refusal.message);
    this.name = "ArchStrictError";
    this.refusal = refusal;
  }
}

function repoRoot(): string {
  // This file is at src/governance/arch.ts
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, "..", "..");
}

function architecturesDir(): string {
  return path.join(repoRoot(), "governance", "architectures");
}

export async function loadArchitecture(archId: string): Promise<Architecture | null> {
  const file = path.join(architecturesDir(), `${archId}.json`);
  try {
    const raw = await readFile(file, "utf8");
    return JSON.parse(raw) as Architecture;
  } catch {
    return null;
  }
}

export async function selectArchitecture(
  archIdRaw?: string,
  opts?: { strict?: boolean }
): Promise<ArchSelection> {
  const strict = Boolean(opts?.strict);
  const archId = (archIdRaw || "default").trim();

  if (!archId || archId === "default") {
    if (strict && (!archIdRaw || archIdRaw.trim() === "")) {
      throw new ArchStrictError({
        type: "REFUSE",
        code: "ARCH_MISSING",
        message: "Strict architecture mode enabled, but no --arch value was provided.",
        details: { strict, archIdRaw },
      });
    }
    return {
      archId: "default",
      archVersion: "0.0.0",
      systemPromptText: "",
    };
  }

  const arch = await loadArchitecture(archId);
  if (!arch) {
    if (strict) {
      throw new ArchStrictError({
        type: "REFUSE",
        code: "ARCH_UNKNOWN",
        message: `Unknown architecture id "${archId}" in strict mode.`,
        details: {
          strict,
          archId,
          expected_file: `${archId}.json`,
          architectures_dir: architecturesDir(),
        },
      });
    }
    // Non-strict fallback: no crash, just no arch prompt.
    return { archId, archVersion: "0.0.0", systemPromptText: "" };
  }

  if (!arch.system_prompt?.text) {
    if (strict) {
      throw new ArchStrictError({
        type: "REFUSE",
        code: "ARCH_UNKNOWN",
        message: `Architecture "${archId}" is missing system_prompt.text in strict mode.`,
        details: { strict, archId, arch_version: arch.arch_version },
      });
    }
    return { archId: arch.arch_id, archVersion: arch.arch_version, systemPromptText: "" };
  }

  return {
    archId: arch.arch_id,
    archVersion: arch.arch_version,
    systemPromptText: arch.system_prompt.text,
  };
}

export function parseArchFlag(argv: string[]): string | undefined {
  // Minimal dependency-free parsing:
  // supports: --arch synergy-7   OR   --arch=synergy-7
  for (let i = 0; i < argv.length; i++) {
    const a = String(argv[i] ?? "");
    if (a === "--arch") return argv[i + 1];
    if (a.startsWith("--arch=")) return a.slice("--arch=".length);
  }
  return undefined;
}

export function parseStrictArchFlag(argv: string[]): boolean {
  // supports: --strict-arch or --strict-arch=true
  for (let i = 0; i < argv.length; i++) {
    const a = String(argv[i] ?? "");
    if (a === "--strict-arch") return true;
    if (a.startsWith("--strict-arch=")) {
      const v = a.slice("--strict-arch=".length).trim().toLowerCase();
      return v === "true" || v === "1" || v === "yes";
    }
  }
  return false;
}
