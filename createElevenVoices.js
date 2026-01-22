import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return null;
  return process.argv[idx + 1] || null;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function usage(exitCode = 1) {
  console.log("Usage:");
  console.log("  node createElevenVoices.js --sample <a.mp3> [--prefix SINTRAPRIME]");
  console.log("  node createElevenVoices.js --samples <a.mp3,b.mp3,...> [--prefix SINTRAPRIME]");
  console.log("Options:");
  console.log("  --write-env <path>   Write env_patch.txt contents to the given file (appends) (default: off)");
  console.log("  --out <dir>          Output dir for env_patch.txt (default: .)");
  console.log("Examples:");
  console.log('  node createElevenVoices.js --sample "./myvoice.mp3"');
  console.log('  node createElevenVoices.js --samples "a.mp3,b.mp3" --prefix IKE');
  process.exit(exitCode);
}

const sample = getArg("--sample");
const samples = getArg("--samples");
const prefix = (getArg("--prefix") || "SINTRAPRIME").trim();
const outDir = path.resolve(getArg("--out") || ".");
const writeEnvPath = getArg("--write-env");

if (!sample && !samples) usage(1);

function runNode(args) {
  return new Promise((resolve, reject) => {
    const p = spawn(process.execPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    p.stdout.on("data", (d) => (out += d.toString("utf8")));
    p.stderr.on("data", (d) => (err += d.toString("utf8")));
    p.on("close", (code) => {
      if (code !== 0) return reject(new Error(err.trim() || out.trim() || `failed (${code})`));
      resolve(out);
    });
  });
}

async function main() {
  const args = ["scripts/elevenlabs-create-mythic-pack.mjs", "--prefix", prefix];
  if (samples) args.push("--samples", samples);
  else args.push("--sample", sample);

  const output = await runNode(args);

  await fs.mkdir(outDir, { recursive: true });
  const patchPath = path.join(outDir, "env_patch.txt");
  await fs.writeFile(patchPath, output, "utf8");

  console.log(`Wrote ${path.relative(process.cwd(), patchPath)}`);

  if (writeEnvPath) {
    const target = path.resolve(writeEnvPath);
    await fs.appendFile(target, `\n\n# Mythic Voice Pack (generated)\n${output}\n`, "utf8");
    console.log(`Appended to ${path.relative(process.cwd(), target)}`);
  }

  if (hasFlag("--print")) {
    console.log(output);
  }
}

main().catch((err) => {
  console.error(String(err?.message || err));
  process.exit(1);
});
