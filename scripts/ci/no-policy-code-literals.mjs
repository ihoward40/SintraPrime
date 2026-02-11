import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

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
  src = src.replace(/\/\*[\s\S]*?\*\//g, "");
  src = src.replace(/\/\/.*$/gm, "");
  return src;
}

function indexToLineCol(src, index) {
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

function walkFilesAbs(rootAbs) {
  const out = [];
  const stack = [rootAbs];

  while (stack.length) {
    const cur = stack.pop();
    const entries = fs.readdirSync(cur, { withFileTypes: true });
    for (const e of entries) {
      const abs = path.join(cur, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === ".git" || e.name === "dist") continue;
        stack.push(abs);
        continue;
      }
      if (e.isFile()) out.push(abs);
    }
  }

  return out;
}

function toRepoPathPosix(repoRootAbs, fileAbs) {
  const rel = path.relative(repoRootAbs, fileAbs);
  return rel.split(path.sep).join("/");
}

function loadPolicyCodesAllowlist() {
  const allow = new Set();

  // Canonical source of truth for code strings is src/policy/policyRegistry.ts (CODES_* bundles + POLICY_CODES bundle map).
  const policyRegistryPathAbs = path.join(ROOT, "src", "policy", "policyRegistry.ts");
  if (!fs.existsSync(policyRegistryPathAbs)) {
    console.error(`❌ Missing ${toRepoPathPosix(ROOT, policyRegistryPathAbs)} (cannot derive POLICY_CODES allowlist)`);
    process.exit(2);
  }

  {
    const raw = readText(policyRegistryPathAbs);
    const src = stripComments(raw);

    // Collect all code-like string literal values used for CODES_*.
    // Fail-closed: only include ALLCAPS/underscore tokens.
    const codeLitRe = /["'`]([A-Z][A-Z0-9_]+)["'`]/g;
    let m;
    while ((m = codeLitRe.exec(src)) !== null) {
      const code = m[1];
      if (code && /_/.test(code)) allow.add(code);
    }
  }

  // Also include any explain-table codes (if present) as a secondary source.
  const policyCodesPathAbs = path.join(ROOT, "src", "policy", "policyCodes.ts");
  if (fs.existsSync(policyCodesPathAbs)) {
    const raw = readText(policyCodesPathAbs);
    const src = stripComments(raw);

    const keyRe = /^\s*([A-Z][A-Z0-9_]+)\s*:\s*\{/gm;
    let m;
    while ((m = keyRe.exec(src)) !== null) {
      const code = m[1];
      if (code && /_/.test(code)) allow.add(code);
    }
  }

  if (allow.size === 0) {
    console.error("❌ Derived 0 allowed policy codes; refusing to run (fail-closed)");
    process.exit(2);
  }

  return allow;
}

function main() {
  const allow = loadPolicyCodesAllowlist();

  const scanRoots = [path.join(ROOT, "src", "policy"), path.join(ROOT, "test")].filter((p) => fs.existsSync(p));
  if (scanRoots.length === 0) {
    console.log("OK: no src/policy/** or test/** directories present");
    return;
  }

  // Match contexts where policy codes appear as *string literals*.
  // We intentionally avoid banning arbitrary ALLCAPS strings (env vars, HTTP methods) by only matching
  // common policy-code usage patterns.
  const patterns = [
    { name: `code:"..." literal`, re: /\bcode\s*:\s*["'`]([A-Z][A-Z0-9_]+)["'`]/g },
    { name: `related_codes:["..."] literal`, re: /\brelated_codes\s*:\s*\[[^\]]*["'`]([A-Z][A-Z0-9_]+)["'`]/g },
    { name: `denyBudget(...,"...") literal`, re: /\bdenyBudget\s*\(\s*[^,]+,\s*["'`]([A-Z][A-Z0-9_]+)["'`]/g },
    { name: `deny("...") literal`, re: /\bdeny\s*\(\s*["'`]([A-Z][A-Z0-9_]+)["'`]\s*[,\)]/g },
    { name: `requireApproval("...") literal`, re: /\brequireApproval\s*\(\s*["'`]([A-Z][A-Z0-9_]+)["'`]\s*[,\)]/g },
  ];

  const hits = [];
  for (const rootAbs of scanRoots) {
    const files = walkFilesAbs(rootAbs)
      .filter((p) => /\.(ts|tsx|js|mjs|cjs)$/.test(p))
      .filter((p) => !p.endsWith(".d.ts"));

    for (const fileAbs of files) {
      const raw = readText(fileAbs);
      const src = stripComments(raw);
      const fileRel = toRepoPathPosix(ROOT, fileAbs);

      for (const p of patterns) {
        const re = new RegExp(p.re.source, p.re.flags);
        let m;
        while ((m = re.exec(src)) !== null) {
          const code = m[1];
          if (!code) continue;
          if (!/_/.test(code)) continue;

          const { line, col } = indexToLineCol(src, m.index);
          const rawLine = getLine(raw, line);
          if (rawLine.includes(SUPPRESS_TOKEN)) continue;

          if (!allow.has(code)) {
            hits.push({ fileRel, line, col, code, pattern: p.name, snippet: rawLine.trim() });
          }
        }
      }
    }
  }

  if (hits.length === 0) {
    console.log("OK: no unknown policy code string literals found");
    return;
  }

  hits.sort((a, b) =>
    a.fileRel === b.fileRel ? a.line - b.line : a.fileRel.localeCompare(b.fileRel)
  );

  console.error(
    [
      "FAIL: Found UNKNOWN policy code string literals.",
      "Policy codes must be defined in src/policy/policyRegistry.ts (CODES_* / POLICY_CODES) and referenced via constants.",
      "",
      ...hits.map(
        (h) =>
          `- ${h.fileRel}:${h.line}:${h.col}  ${h.pattern}  \"${h.code}\"\n  ${h.snippet}`
      ),
      "",
      `If you absolutely must allow a literal (rare), add // ${SUPPRESS_TOKEN} on that line.`,
    ].join("\n")
  );
  process.exit(1);
}

main();
