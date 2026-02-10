import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function walk(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) results.push(...walk(full));
    else results.push(full);
  }
  return results;
}

function listTemplateMarkdownFiles() {
  const templatesDir = path.join(repoRoot, 'templates');
  if (!fs.existsSync(templatesDir)) return [];
  return walk(templatesDir)
    .filter((p) => p.toLowerCase().endsWith('.md'))
    .sort();
}

function lintFile(filePath) {
  const bytes = fs.readFileSync(filePath);
  if (bytes.includes(0)) return [`Contains NUL byte`];

  const text = bytes.toString('utf8');
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const issues = [];

  if (!normalized.endsWith('\n')) issues.push('Missing trailing newline at EOF');

  const lines = normalized.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes('\t')) issues.push(`Line ${i + 1}: Contains tab character`);
    if (/[ \f\v]+$/.test(line)) issues.push(`Line ${i + 1}: Trailing whitespace`);
  }
  return issues;
}

const files = listTemplateMarkdownFiles();
if (files.length === 0) {
  console.log('No template markdown files found.');
  process.exit(0);
}

let failed = 0;
for (const filePath of files) {
  const rel = path.relative(repoRoot, filePath).replace(/\\/g, '/');
  const issues = lintFile(filePath);
  if (issues.length > 0) {
    failed++;
    console.error(`\n${rel}`);
    for (const issue of issues) console.error(`- ${issue}`);
  }
}

if (failed > 0) {
  console.error(`\nMarkdown template lint failed (${failed} file(s)).`);
  process.exit(1);
}

console.log(`Markdown template lint OK (${files.length} file(s)).`);
