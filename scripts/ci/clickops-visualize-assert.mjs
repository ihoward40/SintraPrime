import fs from "node:fs";
import path from "node:path";

function mustExist(p, label) {
  if (!fs.existsSync(p)) throw new Error(`missing ${label}: ${p}`);
}

function statSize(p) {
  return fs.statSync(p).size;
}

function findVisualizeRuns(rootDir) {
  if (!fs.existsSync(rootDir)) return [];

  /** @type {{ dir: string; plan: string; dsl: string; screenshot: string; mtimeMs: number }[]} */
  const found = [];

  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const dir = path.join(rootDir, ent.name);
    const plan = path.join(dir, "visualize.plan.txt");
    const dsl = path.join(dir, "visualize.dsl.txt");
    const screenshot = path.join(dir, "visualize.initial.png");

    if (fs.existsSync(plan) && fs.existsSync(dsl)) {
      const st = fs.statSync(plan);
      found.push({ dir, plan, dsl, screenshot, mtimeMs: st.mtimeMs });
    }
  }

  found.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return found;
}

function main() {
  const runsDir = path.resolve(process.cwd(), "runs");
  const candidates = findVisualizeRuns(runsDir);
  if (!candidates.length) {
    throw new Error(`no visualize runs found under: ${runsDir}`);
  }

  const run = candidates[0];

  mustExist(run.plan, "visualize.plan.txt");
  mustExist(run.dsl, "visualize.dsl.txt");

  const planText = fs.readFileSync(run.plan, "utf8");
  if (!planText.includes("# ClickOps Visualize")) {
    throw new Error(`visualize.plan.txt does not look like a ClickOps visualize output: ${run.plan}`);
  }

  if (statSize(run.plan) < 40) throw new Error(`visualize.plan.txt too small: ${run.plan}`);
  if (statSize(run.dsl) < 20) throw new Error(`visualize.dsl.txt too small: ${run.dsl}`);

  // In CI we expect Playwright to be present; screenshot must exist.
  mustExist(run.screenshot, "visualize.initial.png");
  if (statSize(run.screenshot) < 1024) throw new Error(`visualize.initial.png too small: ${run.screenshot}`);

  process.stdout.write(`[clickops.visualize.smoke] PASS\n`);
  process.stdout.write(`[clickops.visualize.smoke] run_dir=${run.dir.replace(/\\/g, "/")}\n`);
}

try {
  main();
} catch (e) {
  process.stderr.write(String(e?.message ?? e) + "\n");
  process.exitCode = 2;
}
