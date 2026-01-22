import { spawnSync } from "node:child_process";

const node = process.execPath;

function runOnce() {
  const code = `
    import { selectExperts } from './src/turbosparse/select.ts';
    import { buildTurboSparseSystemPrompt } from './src/turbosparse/prompt.ts';

    const input = {
      text: '/slides render --format pptx --table grid pagination',
      modeId: 'slides',
      archId: 'synergy-7',
      maxExperts: 4,
    };

    const d = selectExperts(input);
    const p = buildTurboSparseSystemPrompt(d.experts);

    console.log(JSON.stringify({ decision: d, prompt: p }, null, 2));
  `;

  const res = spawnSync(node, ["--input-type=module", "--import", "tsx", "-e", code], {
    encoding: "utf8",
  });

  if (res.status !== 0) {
    console.error("TurboSparse determinism probe failed");
    console.error("stdout:", res.stdout);
    console.error("stderr:", res.stderr);
    process.exit(1);
  }

  return res.stdout.trim();
}

const a = runOnce();
const b = runOnce();

if (a !== b) {
  console.error("TurboSparse output is not deterministic");
  console.error("--- run 1 ---\n" + a);
  console.error("--- run 2 ---\n" + b);
  process.exit(1);
}

console.log("OK: turbosparse expert selection + prompt assembly are deterministic.");
