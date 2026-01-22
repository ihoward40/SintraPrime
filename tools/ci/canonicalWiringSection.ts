import fs from "node:fs";
import crypto from "node:crypto";

export type CanonicalWiringSection = {
  runbookPath: string;
  section: string;
  sha256: string;
  version: string; // "vN"
};

export function normalizeHeaderRegexFromEnv(rawEnv: string): RegExp {
  // GitHub Actions YAML commonly stores backslashes doubled (e.g. "\\s").
  const normalized = rawEnv.replace(/\\\\/g, "\\");
  return new RegExp(normalized, "m");
}

export function extractCanonicalWiringSection(args: {
  runbookPath: string;
  headerRe: RegExp;
}): CanonicalWiringSection {
  const raw = fs.readFileSync(args.runbookPath, "utf8");
  const md = raw.replace(/\r\n/g, "\n");

  // Require header appears exactly once.
  const headerReGlobal = new RegExp(args.headerRe.source, args.headerRe.flags.includes("i") ? "gmi" : "gm");
  const matches = Array.from(md.matchAll(headerReGlobal));
  if (matches.length !== 1) {
    throw new Error(
      `[canonical-wiring] Canonical header must match exactly once in ${args.runbookPath}. Found ${matches.length}.`
    );
  }

  const m = matches[0];
  const headerIndex = m.index;
  if (headerIndex == null || headerIndex < 0) {
    throw new Error("[canonical-wiring] Internal: missing header match index.");
  }

  // Determine header line end.
  const headerLineEnd = md.indexOf("\n", headerIndex);
  const nextLineStart = headerLineEnd === -1 ? md.length : headerLineEnd + 1;
  if (nextLineStart >= md.length) {
    throw new Error(
      `[canonical-wiring] Missing WIRING_VERSION line immediately after canonical header in ${args.runbookPath}.`
    );
  }

  const nextLineEnd = md.indexOf("\n", nextLineStart);
  const nextLine = (nextLineEnd === -1 ? md.slice(nextLineStart) : md.slice(nextLineStart, nextLineEnd)).trimEnd();

  // Strict: next line must be exactly "WIRING_VERSION: vN".
  const verMatch = nextLine.match(/^WIRING_VERSION: v([1-9][0-9]*)$/);
  if (!verMatch) {
    throw new Error(
      `[canonical-wiring] Canonical header must be followed immediately by an exact version line:\n` +
        `Expected: WIRING_VERSION: vN (N>=1)\n` +
        `Found:    ${JSON.stringify(nextLine)}\n` +
        `Runbook:  ${args.runbookPath}`
    );
  }

  const version = `v${verMatch[1]}`;

  // Strict: only one WIRING_VERSION line in the entire file (prevents appendix tricks).
  const versionLines = Array.from(md.matchAll(/^WIRING_VERSION\s*:/gm));
  if (versionLines.length !== 1) {
    throw new Error(
      `[canonical-wiring] Exactly one WIRING_VERSION line is allowed in ${args.runbookPath}. Found ${versionLines.length}.`
    );
  }

  // Section bounds: from header line start -> before next H2 or EOF.
  const afterHeaderIndex = headerIndex + m[0].length;
  const rest = md.slice(afterHeaderIndex);
  const nextH2Rel = rest.search(/\n##\s+/);
  const section =
    nextH2Rel === -1
      ? md.slice(headerIndex)
      : md.slice(headerIndex, afterHeaderIndex + nextH2Rel + 1);

  const sha256 = crypto.createHash("sha256").update(section, "utf8").digest("hex");

  return {
    runbookPath: args.runbookPath,
    section,
    sha256,
    version,
  };
}
