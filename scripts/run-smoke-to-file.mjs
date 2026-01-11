import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawn } from "node:child_process";

function parseArgs(argv) {
  const out = { outPath: ".smoke.log", forward: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--out") {
      const v = argv[i + 1];
      if (!v) throw new Error("Usage: node scripts/run-smoke-to-file.mjs --out <path> [-- <smoke args...>]");
      out.outPath = v;
      i += 1;
      continue;
    }
    if (a === "--") {
      out.forward = argv.slice(i + 1);
      break;
    }
    // Back-compat: allow passing smoke args without an explicit `--`
    out.forward.push(a);
  }
  return out;
}

const { outPath, forward } = parseArgs(process.argv.slice(2));
const smokeScript = path.join(process.cwd(), "scripts", "smoke-vectors.js");

const outFile = path.resolve(outPath);
fs.mkdirSync(path.dirname(outFile), { recursive: true });

const stream = fs.createWriteStream(outFile, { encoding: "utf8" });
stream.write(`# smoke-vectors output\n# argv: ${JSON.stringify(forward)}\n\n`);

const child = spawn(process.execPath, [smokeScript, ...forward], {
  env: process.env,
  stdio: ["ignore", "pipe", "pipe"],
  windowsHide: true,
});

child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk) => stream.write(chunk));
child.stderr.on("data", (chunk) => stream.write(chunk));

child.on("error", (err) => {
  stream.write(`\n\n[wrapper error] ${String(err?.message || err)}\n`);
});

child.on("close", (code) => {
  stream.write(`\n\nEXIT=${typeof code === "number" ? code : 1}\n`);
  stream.end(() => {
    process.exit(typeof code === "number" ? code : 1);
  });
});
