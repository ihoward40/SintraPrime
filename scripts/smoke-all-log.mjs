import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const outPath = path.resolve(process.cwd(), ".smoke-all.log");
const out = fs.createWriteStream(outPath, { flags: "w" });

const child = spawn(process.execPath, ["scripts/smoke-vectors.js"], {
  stdio: ["ignore", "pipe", "pipe"],
  env: process.env,
  windowsHide: true,
});

child.stdout.on("data", (buf) => {
  process.stdout.write(buf);
  out.write(buf);
});

child.stderr.on("data", (buf) => {
  process.stderr.write(buf);
  out.write(buf);
});

child.on("error", (e) => {
  try {
    process.stderr.write(String((e && e.message) || e) + "\n");
  } catch {
    // ignore
  }

  out.end(() => {
    process.stdout.write(`\nSMOKE_LOG_WRITTEN=${outPath}\n`);
    process.exit(1);
  });
});

child.on("close", (code) => {
  out.end(() => {
    process.stdout.write(`\nSMOKE_LOG_WRITTEN=${outPath}\n`);
    process.exit(typeof code === "number" ? code : 1);
  });
});
