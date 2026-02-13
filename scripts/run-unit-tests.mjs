import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function collectTestFiles(startDirAbs) {
  const results = [];
  const stack = [startDirAbs];

  while (stack.length) {
    const current = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const abs = path.join(current, entry.name);

      if (entry.isDirectory()) {
        stack.push(abs);
        continue;
      }

      if (!entry.isFile()) continue;

      if (entry.name.endsWith(".test.ts") || entry.name.endsWith(".test.js") || entry.name.endsWith(".test.mjs")) {
        results.push(abs);
      }
    }
  }

  return results;
}

const repoRoot = process.cwd();
const candidates = [path.join(repoRoot, "tests"), path.join(repoRoot, "test")];

const filesAbs = candidates.flatMap(collectTestFiles);
filesAbs.sort();

if (filesAbs.length === 0) {
  console.log("[unit] No unit test files found under tests/ or test/; nothing to run.");
  process.exit(0);
}

const filesRel = filesAbs.map((p) => path.relative(repoRoot, p));

const nodeArgs = ["--import", "tsx", "--test", ...filesRel];
const child = spawn(process.execPath, nodeArgs, {
  stdio: "inherit",
  env: process.env,
  windowsHide: true,
});

child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", () => process.exit(1));
