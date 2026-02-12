import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

function sha256Hex(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function walkDir(rootDir, relDir = '.') {
  const absDir = path.join(rootDir, relDir);
  const entries = fs.readdirSync(absDir, { withFileTypes: true });

  /** @type {string[]} */
  const files = [];

  for (const ent of entries) {
    const relPath = path.join(relDir, ent.name);
    const absPath = path.join(rootDir, relPath);

    if (ent.isDirectory()) {
      // Ignore common non-source dirs.
      const base = ent.name;
      if (base === 'node_modules' || base === '.git' || base === 'dist' || base === 'runs' || base === 'tmp') {
        continue;
      }
      files.push(...walkDir(rootDir, relPath));
      continue;
    }

    if (!ent.isFile()) continue;

    const ext = path.extname(ent.name).toLowerCase();
    if (!['.json', '.md', '.yaml', '.yml', '.txt'].includes(ext)) continue;

    files.push(relPath);
  }

  return files;
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const outIndex = args.indexOf('--out');
  const outPath = outIndex !== -1 ? args[outIndex + 1] : null;
  return { outPath };
}

const repoRoot = path.resolve(process.cwd());
const { outPath } = parseArgs(process.argv);

const automationsDir = path.join(repoRoot, 'automations');
if (!fs.existsSync(automationsDir) || !fs.statSync(automationsDir).isDirectory()) {
  console.error('automations/ directory not found');
  process.exit(1);
}

const files = walkDir(repoRoot, 'automations').sort((a, b) => a.localeCompare(b));

const fileEntries = files.map((relPath) => {
  const absPath = path.join(repoRoot, relPath);
  const bytes = fs.readFileSync(absPath);
  return {
    path: relPath.replace(/\\/g, '/'),
    byte_length: bytes.length,
    sha256: sha256Hex(bytes),
  };
});

const manifestBytes = Buffer.from(
  fileEntries.map((e) => `${e.sha256}  ${e.path}\n`).join(''),
  'utf-8'
);

const snapshot = {
  kind: 'automations.schema_snapshot.v1',
  created_at: new Date().toISOString(),
  root: 'automations',
  total_files: fileEntries.length,
  manifest_sha256: sha256Hex(manifestBytes),
  files: fileEntries,
};

const out = outPath
  ? path.resolve(repoRoot, outPath)
  : path.join(repoRoot, 'scripts', 'schema-snapshots', 'automations.schema-snapshot.json');

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(snapshot, null, 2) + '\n', 'utf-8');

console.log(`Wrote schema snapshot: ${path.relative(repoRoot, out).replace(/\\/g, '/')}`);
console.log(`Files: ${snapshot.total_files}`);
console.log(`Manifest SHA-256: ${snapshot.manifest_sha256}`);
