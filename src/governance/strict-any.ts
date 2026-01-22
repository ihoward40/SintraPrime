/**
 * Supports:
 *   --strict-any
 *   --strict-any=true|1|yes
 */
export function parseStrictAnyFlag(argv: string[]): boolean {
  for (let i = 0; i < argv.length; i++) {
    const a = String(argv[i] ?? "");
    if (a === "--strict-any") return true;
    if (a.startsWith("--strict-any=")) {
      const v = a.slice("--strict-any=".length).trim().toLowerCase();
      return v === "true" || v === "1" || v === "yes";
    }
  }
  return false;
}

export function stripStrictAnyFlag(argv: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = String(argv[i] ?? "");
    if (a === "--strict-any") continue;
    if (a.startsWith("--strict-any=")) continue;
    out.push(a);
  }
  return out;
}
