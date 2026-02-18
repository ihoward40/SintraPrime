// tools/check-agents.mjs
// Fails if runtime code references agent-like names that aren't registered in canonical.

import { spawnSync } from "node:child_process";
import fs from "node:fs";

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: false });
  if (r.error) {
    console.error(`\n[check:agents] FAIL: unable to spawn '${cmd}'.`);
    console.error(String(r.error?.message ?? r.error));
    process.exit(1);
  }
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function main() {
  const node = process.execPath;
  run(node, ["tools/scan-agents.mjs"]);
  run(node, ["tools/diff-agent-maps.mjs"]);

  const diff = JSON.parse(fs.readFileSync("audit/agent_map.diff.json", "utf8").replace(/^\uFEFF/, ""));
  const missing = diff.missing_in_canonical ?? [];

  if (missing.length > 0) {
    console.error("\n[check:agents] FAIL: runtime code references agents missing from canonical (scope:'code').\n");
    for (const name of missing) console.error(`  - ${name}`);
    console.error(
      "\nFix: add these to agent_map.json under a {id, scope:'code', status} entry (or in code_agents during transition).\n"
    );
    process.exit(1);
  }

  console.log("\n[check:agents] OK: canonical covers all runtime references.\n");
}

main();
