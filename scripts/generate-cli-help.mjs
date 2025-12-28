import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function run(args) {
  const res = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    env: { ...process.env },
  });

  // commander prints help to stdout; errors go to stderr.
  const out = String(res.stdout ?? "");
  const err = String(res.stderr ?? "");

  if (res.status !== 0 && !out.trim()) {
    throw new Error(`Command failed: node ${args.join(" ")}\n${err}`);
  }

  return (out || err).trimEnd();
}

const mainPath = path.join(process.cwd(), "dist", "cli", "main.js");

const sections = [
  {
    title: "sintraprimer --help",
    cmd: [mainPath, "--help"],
  },
  {
    title: "sintraprimer workflow.run --help",
    cmd: [mainPath, "workflow.run", "--help"],
  },
  {
    title: "sintraprimer workflow.replay --help",
    cmd: [mainPath, "workflow.replay", "--help"],
  },
];

const parts = [];
parts.push("# CLI Help\n");
parts.push("This file is auto-generated from `--help` output.\n");
parts.push("Regenerate with: `node scripts/generate-cli-help.mjs`\n");

for (const s of sections) {
  parts.push(`## ${s.title}\n`);
  const output = run(s.cmd);
  parts.push("```text\n" + output + "\n```\n");
}

parts.push("Notes:\n");
parts.push("- `workflow.run` supports `.yaml` and `.json` specs.\n");
parts.push("- Use `--dotenv` and/or `--secrets` to inject template vars (e.g. `{{REPO_URL}}`).\n");

const outPath = path.join(process.cwd(), "docs", "cli-help.md");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, parts.join("\n"), "utf8");

process.stdout.write(`Wrote ${outPath}\n`);
