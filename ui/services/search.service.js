import fs from "node:fs/promises";
import path from "node:path";

function normalizeQuery(q) {
  const s = String(q || "").trim();
  if (!s) return null;
  return s;
}

async function isTextFile(absPath) {
  const ext = path.extname(absPath).toLowerCase();
  if (!ext) return false;
  return [
    ".md",
    ".txt",
    ".json",
    ".yaml",
    ".yml",
    ".js",
    ".mjs",
    ".cjs",
    ".ts",
    ".tsx",
    ".jsx",
    ".css",
    ".html",
  ].includes(ext);
}

async function* walk(absDir, { maxFiles = 2000 } = {}) {
  const stack = [absDir];
  let count = 0;

  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const ent of entries) {
      const abs = path.join(dir, ent.name);
      const rel = path.relative(process.cwd(), abs).split(path.sep).join("/");

      // Hard excludes
      if (
        rel.startsWith("node_modules/") ||
        rel.startsWith("dist/") ||
        rel.startsWith("artifacts/") ||
        rel.startsWith("exports/") ||
        rel.startsWith("runs/") ||
        rel.startsWith("logs/") ||
        rel.startsWith(".git/")
      ) {
        continue;
      }

      if (ent.isDirectory()) {
        stack.push(abs);
        continue;
      }

      if (!ent.isFile()) continue;
      if (!(await isTextFile(abs))) continue;

      yield { abs, rel };
      count++;
      if (count >= maxFiles) return;
    }
  }
}

function findLineMatches(content, queryLower, { maxLines = 3 } = {}) {
  const lines = content.split(/\r?\n/);
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.toLowerCase().includes(queryLower)) {
      out.push({ line: i + 1, text: line.slice(0, 200) });
      if (out.length >= maxLines) break;
    }
  }

  return out;
}

export async function searchWorkspace(query, { roots = ["docs", "src", "ui"], maxResults = 6 } = {}) {
  const q = normalizeQuery(query);
  if (!q) return { ok: false, error: "missing_query" };

  const queryLower = q.toLowerCase();
  const hits = [];

  for (const root of roots) {
    const absRoot = path.resolve(root);
    try {
      const st = await fs.stat(absRoot);
      if (!st.isDirectory()) continue;
    } catch {
      continue;
    }

    for await (const f of walk(absRoot)) {
      let content;
      try {
        content = await fs.readFile(f.abs, "utf8");
      } catch {
        continue;
      }

      if (!content.toLowerCase().includes(queryLower)) continue;

      const matches = findLineMatches(content, queryLower);
      hits.push({ file: f.rel, matches });
      if (hits.length >= maxResults) break;
    }

    if (hits.length >= maxResults) break;
  }

  return { ok: true, query: q, results: hits };
}
