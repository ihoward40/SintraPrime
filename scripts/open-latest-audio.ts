import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

function findLatestMp3(dir: string): string | null {
  if (!fs.existsSync(dir)) return null;
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.toLowerCase().endsWith(".mp3"))
    .map((d) => path.join(dir, d.name));
  if (!entries.length) return null;

  let latest = entries[0];
  let latestMtime = fs.statSync(latest).mtimeMs;

  for (const p of entries.slice(1)) {
    const m = fs.statSync(p).mtimeMs;
    if (m > latestMtime) {
      latest = p;
      latestMtime = m;
    }
  }

  return latest;
}

const outputDir = process.env.ELEVEN_OUTPUT_DIR || "voice/dynamic";
const dir = path.isAbsolute(outputDir) ? outputDir : path.resolve(outputDir);
const latest = findLatestMp3(dir);

if (!latest) {
  process.stderr.write(`No mp3 files found in: ${dir}\n`);
  process.exit(2);
}

process.stdout.write(`${latest}\n`);

if (process.platform === "win32") {
  const escaped = latest.replace(/'/g, "''");
  const ps = `Start-Process -FilePath '${escaped}'`;
  spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], {
    stdio: "ignore",
    windowsHide: true,
  });
}
