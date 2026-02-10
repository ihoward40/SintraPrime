#!/usr/bin/env node

import process from "node:process";
import { spawnSync } from "node:child_process";

// Keep behavior identical to `npm test`.
const res = spawnSync(process.execPath, ["--import", "tsx", "--test", "./test/*.test.ts"], {
  stdio: "inherit",
  env: process.env,
  windowsHide: true,
});

process.exit(res.status ?? 1);
