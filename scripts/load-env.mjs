// Minimal .env/.env.local loader with zero dependencies.
//
// Usage:
//   node scripts/load-env.mjs <script> [-- <args...>]
// Example:
//   node scripts/load-env.mjs test-elevenlabs-complete.mjs
//   node scripts/load-env.mjs test-elevenlabs-complete.mjs -- --someFlag
//
// Behavior:
// - Loads .env (if present), then .env.local (if present)
// - Does NOT override variables already set in the environment
// - Spawns a child Node process to run the target script with merged env

import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';

function parseDotenv(text) {
  /** @type {Record<string, string>} */
  const out = {};

  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    // Support optional leading "export "
    const noExport = line.startsWith('export ') ? line.slice('export '.length).trim() : line;

    const eq = noExport.indexOf('=');
    if (eq <= 0) continue;

    const key = noExport.slice(0, eq).trim();
    let value = noExport.slice(eq + 1).trim();

    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }

    if (key) out[key] = value;
  }

  return out;
}

async function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return {};
  const text = await readFile(filePath, 'utf8');
  return parseDotenv(text);
}

function usage() {
  process.stderr.write(
    [
      'Usage: node scripts/load-env.mjs <script> [-- <args...>]',
      'Loads .env then .env.local (if present), then runs <script>.',
      'Does not override vars already set in the shell.',
    ].join('\n') + '\n'
  );
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.length || args[0] === '-h' || args[0] === '--help') {
    usage();
    process.exit(args.length ? 0 : 2);
  }

  const sep = args.indexOf('--');
  const scriptArg = sep === -1 ? args[0] : args[0];
  const scriptArgs = sep === -1 ? args.slice(1) : args.slice(sep + 1);

  const cwd = process.cwd();
  const envPath = path.join(cwd, '.env');
  const envLocalPath = path.join(cwd, '.env.local');

  const envFromDotenv = await loadEnvFile(envPath);
  const envFromDotenvLocal = await loadEnvFile(envLocalPath);

  const merged = { ...envFromDotenv, ...envFromDotenvLocal };

  /** @type {NodeJS.ProcessEnv} */
  const childEnv = { ...process.env };
  for (const [k, v] of Object.entries(merged)) {
    if (childEnv[k] === undefined) childEnv[k] = v;
  }

  const scriptPath = path.isAbsolute(scriptArg) ? scriptArg : path.join(cwd, scriptArg);
  if (!existsSync(scriptPath)) {
    process.stderr.write(`ERROR: script not found: ${scriptArg}\n`);
    process.exit(2);
  }

  const child = spawn(process.execPath, [scriptPath, ...scriptArgs], {
    stdio: 'inherit',
    env: childEnv,
  });

  child.on('exit', (code) => process.exit(code ?? 1));
}

main().catch((err) => {
  process.stderr.write(`ERROR: ${String(err?.message ?? err)}\n`);
  process.exit(1);
});
