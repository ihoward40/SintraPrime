import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const RUN_DIR = process.env.SINTRAPRIME_RUN_DIR || "runs/_ci_slides_smoke";
// NOTE: run-command.ts reconstructs a single command string from argv; absolute paths with
// spaces get split unless quoted. Use a stable relative path instead.
const fixture = "scripts/ci/fixtures/slides-fixture.md";

rmSync(RUN_DIR, { recursive: true, force: true });

const cmd = process.env.SINTRAPRIME_CLI_CMD || "node";
const baseArgs = (process.env.SINTRAPRIME_CLI_ARGS
  ? process.env.SINTRAPRIME_CLI_ARGS.split(" ")
  : ["--import", "tsx", "src/cli/run-command.ts"]
).filter(Boolean);

const res = spawnSync(
  cmd,
  [
    ...baseArgs,
    "--strict-any",
    "--arch",
    "synergy-7",
    "--mode",
    "technical",
    "/slides",
    "--title",
    "CI Slides Smoke",
    "--brand",
    "vault-guardian.black-gold",
    "--format",
    "html,pptx",
    "--in",
    fixture,
  ],
  {
    encoding: "utf8",
    env: { ...process.env, SINTRAPRIME_RUN_DIR: RUN_DIR },
  }
);

if (res.status !== 0) {
  console.error("slides-smoke failed:", res.status);
  console.error("stdout:", res.stdout);
  console.error("stderr:", res.stderr);
  process.exit(1);
}

const deckPath = path.resolve(RUN_DIR, "slides", "deck.json");
if (!existsSync(deckPath)) {
  console.error("Missing deck.json:", deckPath);
  process.exit(1);
}

const deck = JSON.parse(readFileSync(deckPath, "utf8"));
const kinds = new Set(deck.cards.map((c) => c.kind));

if (!kinds.has("code")) {
  console.error("Expected a code card, got kinds:", [...kinds]);
  process.exit(1);
}
if (!kinds.has("table")) {
  console.error("Expected a table card, got kinds:", [...kinds]);
  process.exit(1);
}

const split = deck.cards.some((c) => typeof c.title === "string" && /\(\d+\/\d+\)$/.test(c.title));
if (!split) {
  console.error("Expected split bullet cards (title like (1/2)), none found.");
  process.exit(1);
}

const sections = deck.cards.filter((c) => c.kind === "section");
if (sections.length < 1) {
  console.error("Expected at least one section divider card, none found.");
  process.exit(1);
}

const agenda = deck.cards.some((c) => c.kind === "agenda");
if (!agenda) {
  console.error("Expected Agenda slide (auto-generated), none found.");
  process.exit(1);
}

const pptxPath = path.resolve(RUN_DIR, "slides", "deck.pptx");
const htmlPath = path.resolve(RUN_DIR, "slides", "deck.html");
for (const p of [pptxPath, htmlPath]) {
  if (!existsSync(p)) {
    console.error("Missing output file:", p);
    process.exit(1);
  }
}

console.log("OK: slides smoke passed (agenda + split + code + table + section).");
