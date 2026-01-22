import { spawnSync } from "node:child_process";

const r = spawnSync(process.execPath, ["--import", "tsx", "scripts/ci/cases-smoke.ts"], { stdio: "inherit" });
if (r.status !== 0) process.exit(r.status ?? 1);
