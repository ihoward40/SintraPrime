import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

// Pure determinism + ingestion fixture:
// - Creates a scratch run dir
// - Drops a tiny HTML export into stitch/import
// - Invokes the CLI (/ui stitch)
// - Asserts stitchpack.json exists
// - Asserts stitchpack.stable.json + stitchpack.stable.sha256 exist and match
const runDir = process.env.SINTRAPRIME_RUN_DIR || "runs/_ci_stitch_smoke";
fs.rmSync(runDir, { recursive: true, force: true });
fs.mkdirSync(path.join(runDir, "stitch", "import"), { recursive: true });

const html = "<!doctype html><html><body><h1>Stitch Export</h1></body></html>";
fs.writeFileSync(path.join(runDir, "stitch", "import", "index.html"), html);

const { spawnSync } = await import("node:child_process");
const r = spawnSync(
  process.execPath,
  ["--import", "tsx", "src/cli/run-command.ts", "--strict-stitch", "--stitch-render", `/ui stitch build a tiny page`],
  { env: { ...process.env, SINTRAPRIME_RUN_DIR: runDir }, stdio: "inherit" }
);

if (r.status !== 0) process.exit(r.status ?? 1);

const packPath = path.join(runDir, "stitch", "stitchpack.json");
if (!fs.existsSync(packPath)) {
  console.error("Missing stitchpack.json");
  process.exit(2);
}

const raw = fs.readFileSync(packPath, "utf8");
const obj = JSON.parse(raw);
if (!obj.import || !obj.import.found) {
  console.error("Expected import.found=true");
  process.exit(2);
}

const stableJsonPath = path.join(runDir, "stitch", "stitchpack.stable.json");
const stableShaPath = path.join(runDir, "stitch", "stitchpack.stable.sha256");
if (!fs.existsSync(stableJsonPath) || !fs.existsSync(stableShaPath)) {
  console.error("Missing stitchpack.stable.* artifacts");
  process.exit(2);
}

const stableText = fs.readFileSync(stableJsonPath, "utf8");
const expected = sha256(stableText);
const got = fs.readFileSync(stableShaPath, "utf8").trim();
if (expected !== got) {
  console.error("Stable sha256 mismatch", { expected, got });
  process.exit(2);
}

const pitchPath = path.join(runDir, "stitch", "pitch.md");
if (!fs.existsSync(pitchPath)) {
  console.error("Missing pitch.md");
  process.exit(2);
}

const deckDir = path.join(runDir, "stitch", "deck");
if (!fs.existsSync(deckDir)) {
  console.error("Missing stitch/deck output dir");
  process.exit(2);
}

const files = fs.readdirSync(deckDir).map((f) => f.toLowerCase());
const hasPptx = files.some((f) => f.endsWith(".pptx"));
const hasHtml = files.some((f) => f.endsWith(".html"));

let playwrightOk = false;
try {
  await import("playwright");
  playwrightOk = true;
} catch {
  playwrightOk = false;
}

const hasPdf = files.some((f) => f.endsWith(".pdf"));
if (!hasPptx || !hasHtml || (playwrightOk && !hasPdf)) {
  console.error("Deck outputs missing", { hasPptx, hasHtml, hasPdf, playwrightOk });
  process.exit(2);
}

console.log("STITCH_SMOKE_OK");
