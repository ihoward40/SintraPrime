import fs from "node:fs/promises";
import path from "node:path";

const repoRoot = path.resolve(process.cwd());
const srcDir = path.join(repoRoot, "src", "litigation");
const outDir = path.join(repoRoot, "dist", "litigation");

async function copyDirRecursive(from, to) {
  await fs.mkdir(to, { recursive: true });
  const entries = await fs.readdir(from, { withFileTypes: true });
  for (const ent of entries) {
    const srcPath = path.join(from, ent.name);
    const dstPath = path.join(to, ent.name);
    if (ent.isDirectory()) {
      await copyDirRecursive(srcPath, dstPath);
      continue;
    }

    // Copy only runtime-relevant assets.
    const lower = ent.name.toLowerCase();
    const isJs = lower.endsWith(".js") || lower.endsWith(".mjs");
    const isTemplate = lower.endsWith(".md") || lower.endsWith(".txt");
    const isJson = lower.endsWith(".json");

    if (!isJs && !isTemplate && !isJson) continue;
    await fs.copyFile(srcPath, dstPath);
  }
}

async function main() {
  try {
    await fs.access(srcDir);
  } catch {
    // No litigation folder; nothing to copy.
    return;
  }
  await copyDirRecursive(srcDir, outDir);
}

main().catch((err) => {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
});
