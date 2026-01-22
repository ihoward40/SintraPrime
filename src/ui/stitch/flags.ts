function parseBool(s: string): boolean | null {
  const v = String(s ?? "").trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "y") return true;
  if (v === "false" || v === "0" || v === "no" || v === "n") return false;
  return null;
}

export function parseStrictStitchFlag(argv: string[]): boolean {
  for (let i = 0; i < argv.length; i += 1) {
    const a = String(argv[i] ?? "");
    if (a === "--strict-stitch") {
      const next = parseBool(String(argv[i + 1] ?? ""));
      if (next !== null) return next;
      return true;
    }
    if (a.startsWith("--strict-stitch=")) {
      const v = parseBool(a.slice("--strict-stitch=".length));
      if (v !== null) return v;
      return true;
    }
  }
  return false;
}

export function parseStitchImportDirFlag(argv: string[]): string | null {
  for (let i = 0; i < argv.length; i += 1) {
    const a = String(argv[i] ?? "");

    if (a === "--stitch-import") {
      const next = String(argv[i + 1] ?? "").trim();
      if (next) return next;
      continue;
    }

    if (a.startsWith("--stitch-import=")) {
      const v = a.slice("--stitch-import=".length).trim();
      if (v) return v;
      continue;
    }
  }

  return null;
}

export function parseStitchBackendFlag(argv: string[]): string | null {
  for (let i = 0; i < argv.length; i += 1) {
    const a = String(argv[i] ?? "");

    if (a === "--stitch-backend") {
      const next = String(argv[i + 1] ?? "").trim();
      if (next) return next;
      continue;
    }

    if (a.startsWith("--stitch-backend=")) {
      const v = a.slice("--stitch-backend=".length).trim();
      if (v) return v;
      continue;
    }
  }

  return null;
}

export function parseStitchRenderFlag(argv: string[]): boolean {
  for (let i = 0; i < argv.length; i += 1) {
    const a = String(argv[i] ?? "");

    if (a === "--no-stitch-render") return false;

    if (a === "--stitch-render") {
      const next = parseBool(String(argv[i + 1] ?? ""));
      if (next !== null) return next;
      return true;
    }

    if (a.startsWith("--stitch-render=")) {
      const v = parseBool(a.slice("--stitch-render=".length));
      if (v !== null) return v;
      return true;
    }
  }
  return false;
}
