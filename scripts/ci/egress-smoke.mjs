import { spawnSync } from "node:child_process";

const r = spawnSync(
	process.execPath,
	["--import", "./scripts/ci/no-network-preload.mjs", "--import", "tsx", "scripts/ci/egress-smoke.ts"],
	{ stdio: "inherit" }
);
if (r.status !== 0) process.exit(r.status ?? 1);
