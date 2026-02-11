import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const TARGET = path.resolve(ROOT, "src/policy/checkPolicy.ts");

// Optional emergency escape hatch for truly weird cases.
// Put this exact token on the same line as the literal to suppress:
//   // POLICY_CODE_LITERAL_OK
const SUPPRESS_TOKEN = "POLICY_CODE_LITERAL_OK";

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

// Strip comments so a code mentioned in a comment doesn’t trip the gate.
// (Cheap + good enough for this purpose.)
function stripComments(src) {
  // Remove block comments
  src = src.replace(/\/\*[\s\S]*?\*\//g, "");
  // Remove line comments (but keep line structure for line numbers by replacing with "")
  src = src.replace(/\/\/.*$/gm, "");
  return src;
}

function findAllMatches(src, re) {
  const out = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    out.push({ index: m.index, match: m[0], groups: m.slice(1) });
  }
  return out;
}

function indexToLineCol(src, index) {
  // 1-based line/col
  let line = 1;
  let col = 1;
  for (let i = 0; i < index; i++) {
    if (src.charCodeAt(i) === 10) {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  return { line, col };
}

function getLine(src, lineNum) {
  const lines = src.split("\n");
  return lines[lineNum - 1] ?? "";
}

function main() {
  if (!fs.existsSync(TARGET)) {
    console.error(`Missing file: ${TARGET}`);
    process.exit(2);
  }

  const raw = readText(TARGET);
  const src = stripComments(raw);

  // Match contexts where policy codes appear as *string literals*.
  // If you use constants (POLICY_CODES.X), you will NOT match these.
  const patterns = [
    // code: "FOO_BAR"
    {
      name: `code:"..." literal`,
      re: /\bcode\s*:\s*["'`]([A-Z][A-Z0-9_]+)["'`]/g,
      codeGroup: 1,
    },
    // denyBudget(step, "FOO_BAR", ...)
    {
      name: `denyBudget(...,"...") literal`,
      re: /\bdenyBudget\s*\(\s*[^,]+,\s*["'`]([A-Z][A-Z0-9_]+)["'`]/g,
      codeGroup: 1,
    },
    // deny("FOO_BAR") (if used)
    {
      name: `deny("...") literal`,
      re: /\bdeny\s*\(\s*["'`]([A-Z][A-Z0-9_]+)["'`]\s*[,\)]/g,
      codeGroup: 1,
    },
    // requireApproval("FOO_BAR") (if used)
    {
      name: `requireApproval("...") literal`,
      re: /\brequireApproval\s*\(\s*["'`]([A-Z][A-Z0-9_]+)["'`]\s*[,\)]/g,
      codeGroup: 1,
    },
  ];

  const hits = [];
  for (const p of patterns) {
    const ms = findAllMatches(src, p.re);
    for (const m of ms) {
      const code = m.groups[p.codeGroup - 1];
      const { line, col } = indexToLineCol(src, m.index);

      const rawLine = getLine(raw, line);
      if (rawLine.includes(SUPPRESS_TOKEN)) continue;

      hits.push({
        pattern: p.name,
        code,
        line,
        col,
        snippet: rawLine.trim(),
      });
    }
  }

  if (hits.length === 0) {
    console.log("OK: no policy code string literals found in checkPolicy.ts");
    return;
  }

  console.error(
    [
      `FAIL: checkPolicy.ts contains policy code STRING LITERALS.`,
      `Use POLICY_CODES / CODES_* constants instead.`,
      ``,
      ...hits.map(
        (h) =>
          `- ${path.relative(ROOT, TARGET)}:${h.line}:${h.col}  ${h.pattern}  "${h.code}"\n  ${h.snippet}`
      ),
      ``,
      `If you absolutely must allow a literal (rare), add // ${SUPPRESS_TOKEN} on that line.`,
    ].join("\n")
  );
  process.exit(1);
}

main();
