import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();

async function readJson(p) {
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw);
}

function runNode(args) {
  const res = spawnSync(process.execPath, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: false,
  });
  if (res.error) throw res.error;
  return res.status ?? 1;
}

async function main() {
  const configPath = path.join(ROOT, 'make', 'lint', 'ci-blueprints.json');
  const cfg = await readJson(configPath);

  if (!cfg?.runs || !Array.isArray(cfg.runs)) {
    console.error('[ci:make-blueprints] Invalid config: make/lint/ci-blueprints.json');
    process.exit(2);
  }

  const validator = path.join(ROOT, 'make', 'lint', 'validate-blueprint.mjs');

  let hadFail = false;
  for (const item of cfg.runs) {
    const blueprint = String(item.blueprint || '');
    const profile = String(item.profile || '');
    const out = String(item.out || '');
    if (!blueprint || !profile || !out) {
      console.error('[ci:make-blueprints] Missing blueprint/profile/out in config entry');
      hadFail = true;
      continue;
    }

    const code = runNode([validator, blueprint, profile, out]);
    if (code !== 0) hadFail = true;
  }

  process.exit(hadFail ? 1 : 0);
}

main().catch((err) => {
  console.error(String(err?.stack || err));
  process.exit(1);
});
