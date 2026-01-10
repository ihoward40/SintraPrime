import fs from "node:fs/promises";
import path from "node:path";

const WORKSPACE_ROOT = process.cwd();

const SCENARIO_INDEX_PATH = path.join(
  WORKSPACE_ROOT,
  "make-gmail-slack-automation",
  "docs",
  "scenario-index.md"
);

const SOURCES = [
  {
    label: "sintraprime make-scenario docs",
    dir: path.join(WORKSPACE_ROOT, "agent-mode-engine", "docs", "sintraprime"),
    include: (filePath) =>
      filePath.endsWith(".md") &&
      path.basename(filePath).startsWith("make-scenario__"),
  },
  {
    label: "make automation docs",
    dir: path.join(WORKSPACE_ROOT, "make-gmail-slack-automation", "docs"),
    include: (filePath) => filePath.endsWith(".md"),
  },
  {
    label: "make templates",
    dir: path.join(WORKSPACE_ROOT, "make-gmail-slack-automation", "templates"),
    include: (filePath) => filePath.endsWith(".json"),
  },
];

function die(code, message) {
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(code);
}

async function listFilesRecursive(dir) {
  const results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await listFilesRecursive(fullPath)));
    } else if (entry.isFile()) {
      results.push(fullPath);
    }
  }
  return results;
}

function normalizeScenarioName(value) {
  return String(value)
    .trim()
    .replace(/^\*\*|\*\*$/g, "")
    .replace(/^`|`$/g, "")
    .replace(/\\\|/g, "|")
    .replace(/\s+/g, " ");
}

function splitMarkdownRow(line) {
  // Split a markdown table row, treating \| as a literal pipe.
  // Returns array of cell strings (without surrounding pipes).
  const cells = [];
  let current = "";
  let i = 0;

  // Strip leading/trailing whitespace
  const s = line.trim();
  if (!s.startsWith("|")) return [];

  // Skip the first delimiter
  i = 1;

  for (; i < s.length; i++) {
    const ch = s[i];
    const prev = i > 0 ? s[i - 1] : "";

    if (ch === "|" && prev !== "\\") {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += ch;
  }

  // If line ends without a closing pipe, include remainder.
  if (current.length > 0) cells.push(current.trim());

  // Drop a trailing empty cell caused by ending pipe.
  if (cells.length > 0 && cells[cells.length - 1] === "") cells.pop();

  return cells;
}

function extractScenarioNamesFromMarkdown(content) {
  const names = [];

  const patterns = [
    /Make Scenario:\s*([^\r\n]+?)(?:\s*\(|\s*$)/gim,
    /Scenario name:\s*`([^`]+)`/gi,
    /##\s*Scenario Name\s*\r?\n\s*`([^`]+)`/gi,
    /###\s*Scenario name\s*\r?\n\s*`([^`]+)`/gi,
    /\*\*Name:\*\*\s*`([^`]+)`/gi,
    /Name:\s*\r?\n\s*-\s*`([^`]+)`/gi,
  ];

  for (const re of patterns) {
    let match;
    while ((match = re.exec(content)) !== null) {
      names.push(match[1]);
    }
  }

  const isLikelyScenarioName = (n) => {
    // Heuristic: scenario identifiers in this repo tend to be one of:
    // - Namespaced slugs: route/policy__x, seal/pdf__x, briefing/voice__x
    // - Piped names: Sintra | Gateway | Ingress v1
    // - ALLCAPS snake: VERIZON_GUARDIAN__PRIMARY_PIPELINE
    if (n.includes("|")) return true;
    if (n.includes("/")) return true;
    if (n.includes("__")) return true;
    if (/^[A-Z0-9_]{4,}$/.test(n)) return true;
    return false;
  };

  return names
    .map(normalizeScenarioName)
    .filter((n) => n.length > 0)
    .filter(isLikelyScenarioName)
    .filter((n) => {
      // Exclude webhook/module names and other non-scenario identifiers.
      if (/^Worker_/i.test(n)) return false;
      if (/^Sintra_Gateway_/i.test(n)) return false;
      if (/^https?:\/\//i.test(n)) return false;
      return true;
    });
}

function extractScenarioNamesFromTemplateJson(text) {
  const names = [];
  const re = /"template_name"\s*:\s*"([^"]+)"/gi;
  let match;
  while ((match = re.exec(text)) !== null) {
    names.push(match[1]);
  }
  return names.map(normalizeScenarioName).filter((n) => n.length > 0);
}

async function readText(filePath) {
  return await fs.readFile(filePath, "utf8");
}

async function parseScenarioIndex() {
  const text = await readText(SCENARIO_INDEX_PATH);
  const lines = text.split(/\r?\n/);

  const scenarioNames = [];
  let inTable = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!inTable) {
      if (trimmed.startsWith("| Scenario name ")) {
        inTable = true;
      }
      continue;
    }

    if (!trimmed.startsWith("|")) {
      // Table ended.
      if (scenarioNames.length > 0) break;
      continue;
    }

    // Skip header separator row
    if (/^\|\s*-{3,}\s*\|/.test(trimmed)) continue;

    const cells = splitMarkdownRow(trimmed);
    if (cells.length === 0) continue;

    const first = normalizeScenarioName(cells[0]);
    if (!first || first.toLowerCase() === "scenario name") continue;

    scenarioNames.push(first);
  }

  return scenarioNames;
}

async function buildDeclaredScenarioMap() {
  /** @type {Map<string, Set<string>>} */
  const declared = new Map();

  for (const source of SOURCES) {
    let files;
    try {
      files = await listFilesRecursive(source.dir);
    } catch {
      // Source directory may not exist in some checkouts.
      continue;
    }

    const included = files.filter(source.include);

    for (const filePath of included) {
      const rel = path.relative(WORKSPACE_ROOT, filePath).replace(/\\/g, "/");
      const text = await readText(filePath);

      const extracted = filePath.endsWith(".json")
        ? extractScenarioNamesFromTemplateJson(text)
        : extractScenarioNamesFromMarkdown(text);

      for (const rawName of extracted) {
        const name = normalizeScenarioName(rawName);
        if (!declared.has(name)) declared.set(name, new Set());
        declared.get(name).add(rel);
      }
    }
  }

  return declared;
}

function formatSources(sourcesSet) {
  const sources = Array.from(sourcesSet);
  sources.sort();
  return sources.join(", ");
}

async function main() {
  const [declaredMap, indexNames] = await Promise.all([
    buildDeclaredScenarioMap(),
    parseScenarioIndex(),
  ]);

  const declaredNames = new Set(declaredMap.keys());
  const indexSet = new Set(indexNames);

  // Basic sanity
  if (indexNames.length === 0) {
    die(2, "SCENARIO_INDEX_MISMATCH: no scenarios parsed from scenario-index.md");
  }

  // Duplicates in index
  {
    const seen = new Set();
    const dups = [];
    for (const n of indexNames) {
      if (seen.has(n)) dups.push(n);
      seen.add(n);
    }
    if (dups.length > 0) {
      die(2, `SCENARIO_INDEX_DUPLICATE: ${dups.join(", ")}`);
    }
  }

  // Forward check: docs/templates -> scenario-index
  const forwardMissing = [];
  for (const name of declaredNames) {
    if (!indexSet.has(name)) {
      forwardMissing.push({ name, sources: declaredMap.get(name) });
    }
  }

  if (forwardMissing.length > 0) {
    const first = forwardMissing[0];
    die(
      2,
      `SCENARIO_INDEX_MISMATCH_FORWARD: ${formatSources(first.sources)} -> missing row: ${first.name}`
    );
  }

  // Reverse check: scenario-index -> docs/templates
  const reverseMissing = [];
  for (const name of indexSet) {
    if (!declaredNames.has(name)) {
      reverseMissing.push(name);
    }
  }

  if (reverseMissing.length > 0) {
    die(2, `SCENARIO_INDEX_MISMATCH_REVERSE: missing source for row: ${reverseMissing[0]}`);
  }

  // eslint-disable-next-line no-console
  console.log(
    `OK: scenario-index is bijective (index=${indexNames.length}, declared=${declaredNames.size})`
  );
}

await main();
