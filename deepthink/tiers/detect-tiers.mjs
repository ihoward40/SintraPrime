import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

function parseNow(argv) {
  const idx = argv.indexOf('--now');
  if (idx === -1) return null;
  const val = argv[idx + 1];
  if (!val) throw new Error('Missing value for --now');
  return val;
}

function tierValue(tierName) {
  // "Tier 2.5" -> 2.5
  const m = String(tierName).match(/Tier\s+([0-9]+(?:\.[0-9]+)?)/i);
  return m ? Number(m[1]) : Number.NaN;
}

function matchesPattern(fileName, pattern) {
  const p = String(pattern);
  if (p.startsWith('*.')) return fileName.endsWith(p.slice(1));
  if (p.startsWith('*')) return fileName.endsWith(p.slice(1));
  if (p.endsWith('*')) return fileName.startsWith(p.slice(0, -1));
  return fileName === p;
}

async function readJson(p) {
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw);
}

async function listFilesFlat(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  return entries.filter((e) => e.isFile()).map((e) => e.name).sort();
}

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function main() {
  const argv = process.argv.slice(2);
  const rootArg = argv.find((a) => !a.startsWith('-'));
  const nowOverride = parseNow(argv);

  const workspaceRoot = process.cwd();

  const defaultRoots = [
    path.join(workspaceRoot, 'public-verifier'),
    path.join(workspaceRoot, 'public_verifier_viewer'),
  ];

  const rootDir = rootArg
    ? path.resolve(workspaceRoot, rootArg)
    : (await (async () => {
        for (const r of defaultRoots) {
          try {
            await fs.access(r);
            return r;
          } catch {}
        }
        throw new Error('No default verifier root found (checked public-verifier/ and public_verifier_viewer/)');
      })());

  const tierMapPath = path.join(workspaceRoot, 'deepthink', 'tiers', 'tier-map.json');
  const tierMap = await readJson(tierMapPath);

  const files = await listFilesFlat(rootDir);

  /** @type {Record<string, boolean>} */
  const detected = {};

  /** @type {Record<string, string>} */
  const artifactMap = {};

  // Build tier ordering for per-file assignment.
  const tiers = Object.keys(tierMap).sort((a, b) => tierValue(a) - tierValue(b));

  // Determine which tiers are present.
  for (const tier of tiers) {
    const patterns = tierMap[tier] || [];
    detected[tier] = patterns.some((pat) => files.some((f) => matchesPattern(f, pat)));
  }

  // Map each file to the highest tier it matches.
  for (const file of files) {
    let bestTier = null;
    for (const tier of tiers) {
      const patterns = tierMap[tier] || [];
      if (patterns.some((pat) => matchesPattern(file, pat))) {
        bestTier = tier;
      }
    }
    if (bestTier) artifactMap[file] = bestTier;
  }

  const tiersPresent = tiers.filter((t) => detected[t]);

  await ensureDir(path.join(workspaceRoot, 'artifacts', 'deepthink'));
  await ensureDir(path.join(workspaceRoot, 'artifacts', 'exhibit_b'));

  const detectedOut = {
    root: path.relative(workspaceRoot, rootDir).replace(/\\/g, '/'),
    files,
    tiersPresent,
    detected,
    artifact_map: artifactMap,
    generated_at: nowOverride || new Date().toISOString(),
  };

  await fs.writeFile(
    path.join(workspaceRoot, 'artifacts', 'deepthink', 'detected_tiers.json'),
    JSON.stringify(detectedOut, null, 2),
    'utf8'
  );

  const tierDeclaration = {
    system: 'SintraPrime',
    generated_at: detectedOut.generated_at,
    tiers_present: tiersPresent,
    artifact_map: artifactMap,
    root: detectedOut.root,
  };

  await fs.writeFile(
    path.join(workspaceRoot, 'artifacts', 'exhibit_b', 'tier_declaration.json'),
    JSON.stringify(tierDeclaration, null, 2),
    'utf8'
  );

  console.log('Detected tiers:', tiersPresent.length ? tiersPresent.join(', ') : '(none)');
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
