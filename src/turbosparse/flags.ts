function parseBool(s: string): boolean | null {
  const v = String(s ?? "").trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes" || v === "y") return true;
  if (v === "false" || v === "0" || v === "no" || v === "n") return false;
  return null;
}

export function parseTurboSparseEnabled(argv: string[]): boolean {
  // Default: enabled.
  let enabled = true;

  for (let i = 0; i < argv.length; i += 1) {
    const a = String(argv[i] ?? "");

    if (a === "--no-turbosparse") return false;

    if (a === "--turbosparse") {
      const next = parseBool(String(argv[i + 1] ?? ""));
      if (next !== null) {
        enabled = next;
        i += 1;
      } else {
        enabled = true;
      }
      continue;
    }

    if (a.startsWith("--turbosparse=")) {
      const v = parseBool(a.slice("--turbosparse=".length));
      if (v !== null) enabled = v;
      continue;
    }
  }

  return enabled;
}

export function parseStrictTurboSparseFlag(argv: string[]): boolean {
  for (let i = 0; i < argv.length; i += 1) {
    const a = String(argv[i] ?? "");
    if (a === "--strict-turbosparse") {
      const next = parseBool(String(argv[i + 1] ?? ""));
      if (next !== null) return next;
      return true;
    }
    if (a.startsWith("--strict-turbosparse=")) {
      const v = parseBool(a.slice("--strict-turbosparse=".length));
      if (v !== null) return v;
      return true;
    }
  }
  return false;
}
