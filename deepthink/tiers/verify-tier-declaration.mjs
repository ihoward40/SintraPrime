import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

function tierValue(tierName) {
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

function stable(obj) {
  // minimal stable stringification for comparison
  if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(stable).join(',')}]`;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stable(obj[k])}`).join(',')}}`;
}

async function main() {
  const argv = process.argv.slice(2);
  const rootArg = argv.find((a) => !a.startsWith('-'));

  const workspaceRoot = process.cwd();
  const rootDir = rootArg
    ? path.resolve(workspaceRoot, rootArg)
    : path.join(workspaceRoot, 'public-verifier');

  const tierMap = await readJson(path.join(workspaceRoot, 'deepthink', 'tiers', 'tier-map.json'));
  const files = await listFilesFlat(rootDir);

  const tiers = Object.keys(tierMap).sort((a, b) => tierValue(a) - tierValue(b));

  /** @type {Record<string, boolean>} */
  const detected = {};
  /** @type {Record<string, string>} */
  const artifactMap = {};

  for (const tier of tiers) {
    const patterns = tierMap[tier] || [];
    detected[tier] = patterns.some((pat) => files.some((f) => matchesPattern(f, pat)));
  }

  for (const file of files) {
    let bestTier = null;
    for (const tier of tiers) {
      const patterns = tierMap[tier] || [];
      if (patterns.some((pat) => matchesPattern(file, pat))) bestTier = tier;
    }
    if (bestTier) artifactMap[file] = bestTier;
  }

  const expected = {
    system: 'SintraPrime',
    tiers_present: tiers.filter((t) => detected[t]),
    artifact_map: artifactMap,
    root: path.relative(workspaceRoot, rootDir).replace(/\\/g, '/'),
  };

  const declPath = path.join(workspaceRoot, 'artifacts', 'exhibit_b', 'tier_declaration.json');
  const actual = await readJson(declPath);

  // Compare only the derived fields; allow generated_at to vary.
  const actualComparable = {
    system: actual.system,
    tiers_present: actual.tiers_present,
    artifact_map: actual.artifact_map,
    root: actual.root,
  };

  if (stable(expected) !== stable(actualComparable)) {
    console.error('[VERIFY_TIER_DECLARATION] FAIL: tier_declaration.json does not match derived tier detection');
    console.error('Expected:', JSON.stringify(expected, null, 2));
    console.error('Actual:', JSON.stringify(actualComparable, null, 2));
    process.exit(1);
  }

  console.log('[VERIFY_TIER_DECLARATION] OK');
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
