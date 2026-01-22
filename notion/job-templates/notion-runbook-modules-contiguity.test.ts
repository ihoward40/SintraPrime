import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Ensures module numbering in the canonical Make wiring runbook is contiguous and ordered.
//
// We intentionally scan only `### Module N` headings. Any other module-like sections must
// not use that exact heading prefix.

const runbookPath = path.resolve(
  process.cwd(),
  'notion',
  'job-templates',
  'notion-hands-free-router-wiring.v1.md'
);

const text = fs.readFileSync(runbookPath, 'utf8');

const expectedStart = Number.parseInt(process.env.EXPECT_MODULE_START ?? '0', 10);
const expectedMax = Number.parseInt(process.env.EXPECT_MODULE_MAX ?? '90', 10);

assert.ok(
  Number.isFinite(expectedStart) && Number.isFinite(expectedMax),
  'EXPECT_MODULE_START / EXPECT_MODULE_MAX must be valid integers'
);
assert.ok(expectedMax >= expectedStart, 'EXPECT_MODULE_MAX must be >= EXPECT_MODULE_START');

const re = /^###\s+Module\s+(\d+)\b/gm;
const found: number[] = [];
let m: RegExpExecArray | null;
while ((m = re.exec(text))) found.push(Number(m[1]));

assert.ok(found.length > 0, `No module headings found in ${runbookPath}`);

// Must start where we expect.
assert.equal(
  found[0],
  expectedStart,
  `First module must be ${expectedStart}, got ${found[0]}`
);

// Must be contiguous + ordered.
for (let i = 0; i < found.length; i++) {
  const expected = expectedStart + i;
  assert.equal(
    found[i],
    expected,
    `Module numbering not contiguous at index ${i}: expected ${expected}, got ${found[i]}`
  );
}

// Must end where we expect.
assert.equal(
  found[found.length - 1],
  expectedMax,
  `Last module must be ${expectedMax}, got ${found[found.length - 1]}`
);
