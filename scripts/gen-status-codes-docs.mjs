import fs from "node:fs/promises";
import path from "node:path";

import { RUNBOOKS } from "../socialos/ui/src/lib/runbooks.js";
import { EMITTED_STATUS_CODES } from "../socialos/api/src/tests/status_code_contract.mjs";

function escPipes(s) {
  return String(s || "").replaceAll("|", "\\|");
}

function mdLink(text, href) {
  const t = escPipes(text);
  const h = String(href || "");
  if (!h) return t;
  return `[${t}](${h})`;
}

function render() {
  const rbVersion = RUNBOOKS?._meta?.version || "unknown";
  const now = new Date().toISOString();

  const lines = [];
  lines.push("# SocialOS status codes");
  lines.push("");
  lines.push("Generated from:");
  lines.push("- `EMITTED_STATUS_CODES` (backend contract)");
  lines.push("- `RUNBOOKS` (UI runbook map)");
  lines.push("");
  lines.push(`- Runbook map version: **${rbVersion}**`);
  lines.push(`- Generated at: **${now}**`);
  lines.push("");
  lines.push("| status_code | runbook | command |");
  lines.push("|---|---|---|");

  for (const code of EMITTED_STATUS_CODES) {
    const rb = RUNBOOKS[code] || RUNBOOKS.DEFAULT;
    const url = rb?.url || "";
    const cmd = rb?.cmd || "";

    const runbookCell = url ? mdLink(url, url) : "";
    const cmdCell = cmd ? `\`${escPipes(cmd)}\`` : "";

    lines.push(`| \`${escPipes(code)}\` | ${runbookCell} | ${cmdCell} |`);
  }

  lines.push("");
  return lines.join("\n");
}

async function main() {
  const outPath = path.resolve("docs/status_codes.md");
  const content = render();
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, content, "utf8");
  // eslint-disable-next-line no-console
  console.log(`wrote ${outPath}`);
}

await main();
