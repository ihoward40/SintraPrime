import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = process.cwd();
const candidateRoots = ["test", "tests"]
  .map((p) => path.join(repoRoot, p))
  .filter((p) => fs.existsSync(p) && fs.statSync(p).isDirectory());

function walk(dirPath) {
  const out = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dirPath, ent.name);
    if (ent.isDirectory()) {
      out.push(...walk(full));
      continue;
    }
    if (!ent.isFile()) continue;
    const name = ent.name;
    if (name.includes(".test.") || name.endsWith(".test.ts") || name.endsWith(".test.js") || name.endsWith(".test.mjs")) {
      out.push(full);
    }
  }
  return out;
}

const testFiles = candidateRoots.flatMap((r) => walk(r)).sort();

if (testFiles.length === 0) {
  console.log("No test files found under test/ or tests/.");
  process.exit(0);
}

const args = ["--import", "tsx", "--test", ...testFiles];
const res = spawnSync(process.execPath, args, { stdio: "inherit" });
process.exit(res.status ?? 1);
