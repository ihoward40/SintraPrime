import crypto from 'node:crypto';

// Usage:
//   node scripts/make-signature-example.mjs <secret> <jsonStringOrPath> [--json]
// Example:
//   node scripts/make-signature-example.mjs "secret" '{"type":"foo","payload":{"a":1}}'
//   node scripts/make-signature-example.mjs "secret" .\payload.json

const args = process.argv.slice(2);
const secret = args[0];
const input = args[1];
const jsonMode = args.includes('--json');

if (!secret || !input) {
  console.error('Usage: node scripts/make-signature-example.mjs <secret> <jsonStringOrPath> [--json]');
  process.exit(2);
}

let rawBody = input;
if (!input.trim().startsWith('{') && !input.trim().startsWith('[')) {
  const fs = await import('node:fs/promises');
  rawBody = await fs.readFile(input, 'utf8');
}

const timestamp = Math.floor(Date.now() / 1000).toString();
const base = `${timestamp}.${rawBody}`;
const sig = crypto.createHmac('sha256', secret).update(base).digest('hex');

if (jsonMode) {
  console.log(
    JSON.stringify(
      {
        headers: {
          'X-Sintra-Timestamp': timestamp,
          'X-Sintra-Signature': `sha256=${sig}`,
        },
        rawBody,
      },
      null,
      2,
    ),
  );
} else {
  console.log('X-Sintra-Timestamp:', timestamp);
  console.log('X-Sintra-Signature:', `sha256=${sig}`);
  console.log('Raw body:', rawBody);
}
