#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

function listMarkdownFiles(dirPath) {
  const out = [];
  const entries = fs.existsSync(dirPath) ? fs.readdirSync(dirPath, { withFileTypes: true }) : [];
  for (const ent of entries) {
    const full = path.join(dirPath, ent.name);
    if (ent.isDirectory()) {
      out.push(...listMarkdownFiles(full));
      continue;
    }
    if (!ent.isFile()) continue;
    if (ent.name.toLowerCase().endsWith(".md")) out.push(full);
  }
  return out;
}

function hasTrailingWhitespace(text) {
  const lines = text.split(/\n/);
  for (let i = 0; i < lines.length; i += 1) {
    if (/[\t ]+$/.test(lines[i])) return { line: i + 1 };
  }
  return null;
}

const root = process.cwd();
const templatesDir = path.join(root, "templates");

const files = listMarkdownFiles(templatesDir).sort((a, b) => a.localeCompare(b));

let ok = true;
if (!fs.existsSync(templatesDir)) {
  // No templates dir in some configurations.
  process.exit(0);
}

for (const filePath of files) {
  const rel = path.relative(root, filePath).replace(/\\/g, "/");
  const text = fs.readFileSync(filePath, "utf8");

  const trailing = hasTrailingWhitespace(text);
  if (trailing) {
    console.error(`[lint-md] ${rel}:${trailing.line} trailing whitespace`);
    ok = false;
  }

  // Guardrail against editor-specific link artifacts.
  if (/vscode:\/\//i.test(text) || /file:\/\//i.test(text)) {
    console.error(`[lint-md] ${rel} contains vscode:// or file:// link artifact`);
    ok = false;
  }
}

if (!ok) process.exit(1);
