#!/usr/bin/env node

import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const WORKSPACE_ROOT = process.cwd();

function toPosix(p) {
  return p.replace(/\\/g, '/');
}

function die(code, message) {
  // eslint-disable-next-line no-console
  console.error(message);
  process.exit(code);
}

async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const out = {
    tsa: null,
    data: path.join(WORKSPACE_ROOT, 'governance', 'freeze', 'phaseX.roothash.txt'),
    outDir: path.join(WORKSPACE_ROOT, 'governance', 'freeze', 'rfc3161'),
    submit: true
  };

  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--tsa') out.tsa = argv[++i] ?? null;
    else if (a === '--data') out.data = path.resolve(WORKSPACE_ROOT, argv[++i] ?? '');
    else if (a === '--out-dir') out.outDir = path.resolve(WORKSPACE_ROOT, argv[++i] ?? '');
    else if (a === '--no-submit') out.submit = false;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`Unknown arg: ${a}`);
  }

  return out;
}

function hasOpenSsl() {
  try {
    execFileSync('openssl', ['version'], { stdio: ['ignore', 'ignore', 'ignore'] });
    return true;
  } catch {
    return false;
  }
}

async function submitTsa({ tsaUrl, tsqPath, tsrPath }) {
  const body = await fs.readFile(tsqPath);

  const res = await fetch(tsaUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/timestamp-query',
      'Accept': 'application/timestamp-reply'
    },
    body
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`TSA HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(tsrPath, buf);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    process.stdout.write(
      [
        'Usage:',
        '  node scripts/phaseX-rfc3161.mjs --tsa <TSA_URL> [--data <file>] [--out-dir <dir>] [--no-submit]',
        '',
        'Notes:',
        '  - Requires OpenSSL on PATH to generate the .tsq query.',
        '  - By default, submits the query to the TSA and stores the .tsr response.',
        ''
      ].join('\n')
    );
    return;
  }

  if (!args.tsa) {
    die(2, '❌ RFC-3161 FAILED\nReason: missing --tsa <TSA_URL>');
  }

  if (!(await pathExists(args.data))) {
    die(2, `❌ RFC-3161 FAILED\nReason: missing data file: ${toPosix(path.relative(WORKSPACE_ROOT, args.data))}`);
  }

  if (!hasOpenSsl()) {
    die(
      2,
      [
        '❌ RFC-3161 FAILED',
        'Reason: OpenSSL not found on PATH',
        'Fix: install OpenSSL or run timestamping on a machine with OpenSSL available.',
        ''
      ].join('\n')
    );
  }

  await fs.mkdir(args.outDir, { recursive: true });

  const tsqPath = path.join(args.outDir, 'phaseX.tsq');
  const tsrPath = path.join(args.outDir, 'phaseX.tsr');

  // Generate timestamp query for the provided data.
  execFileSync('openssl', ['ts', '-query', '-data', args.data, '-sha256', '-cert', '-out', tsqPath], {
    stdio: ['ignore', 'ignore', 'ignore']
  });

  if (!args.submit) {
    process.stdout.write(
      [
        '✅ RFC-3161 QUERY GENERATED (not submitted)',
        `TSQ: ${toPosix(path.relative(WORKSPACE_ROOT, tsqPath))}`,
        'Next: submit to your TSA and store the .tsr response.'
      ].join('\n') + '\n'
    );
    return;
  }

  try {
    await submitTsa({ tsaUrl: args.tsa, tsqPath, tsrPath });
  } catch (e) {
    die(1, `❌ RFC-3161 FAILED\nReason: TSA submission failed\nDetail: ${e?.message ?? e}`);
  }

  // Best-effort text render (does not fully verify trust chain).
  try {
    const out = execFileSync('openssl', ['ts', '-reply', '-in', tsrPath, '-text'], {
      stdio: ['ignore', 'pipe', 'ignore']
    });
    await fs.writeFile(path.join(args.outDir, 'phaseX.tsr.txt'), String(out), 'utf8');
  } catch {
    // ignore
  }

  // Also store an easy-to-grep copy of the input data.
  const dataText = await fs.readFile(args.data, 'utf8');
  await fs.writeFile(path.join(args.outDir, 'input.txt'), dataText, 'utf8');

  // Sidecar sha256 of the tsr itself.
  try {
    const hash = await import('node:crypto');
    const h = hash.createHash('sha256');
    const fd = fssync.openSync(tsrPath, 'r');
    try {
      const buf = Buffer.allocUnsafe(1024 * 1024);
      while (true) {
        const bytesRead = fssync.readSync(fd, buf, 0, buf.length, null);
        if (bytesRead <= 0) break;
        h.update(buf.subarray(0, bytesRead));
      }
    } finally {
      fssync.closeSync(fd);
    }
    await fs.writeFile(path.join(args.outDir, 'phaseX.tsr.sha256'), `${h.digest('hex')}  phaseX.tsr\n`, 'utf8');
  } catch {
    // ignore
  }

  process.stdout.write(
    [
      '✅ RFC-3161 TIMESTAMP STORED',
      `TSR: ${toPosix(path.relative(WORKSPACE_ROOT, tsrPath))}`,
      `Out: ${toPosix(path.relative(WORKSPACE_ROOT, args.outDir))}`
    ].join('\n') + '\n'
  );
}

await main();
