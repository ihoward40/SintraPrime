import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { chromium } from "playwright";

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      args[key] = next;
      i++;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function asInt(value, fallback) {
  if (value === undefined || value === null) return fallback;
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) ? n : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function humanMoveMouse(page, from, to, totalMs) {
  const steps = Math.max(8, Math.min(40, Math.floor(totalMs / 20)));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    await page.mouse.move(x, y);
    await sleep(Math.max(5, Math.floor(totalMs / steps)));
  }
}

async function humanClick(page, selector, opts) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: "visible", timeout: 30_000 });
  const box = await el.boundingBox();
  if (!box) throw new Error(`Cannot click: no bounding box for ${selector}`);

  const target = {
    x: box.x + box.width * 0.5,
    y: box.y + box.height * 0.5,
  };

  const start = {
    x: Math.max(1, target.x - 120),
    y: Math.max(1, target.y - 80),
  };

  await humanMoveMouse(page, start, target, opts.moveMs);
  await sleep(opts.pauseBeforeClickMs);
  await page.mouse.down();
  await sleep(opts.clickHoldMs);
  await page.mouse.up();
  await sleep(opts.pauseAfterClickMs);
}

async function humanType(page, selector, text, opts) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: "visible", timeout: 30_000 });
  await el.focus();
  await sleep(opts.pauseBeforeTypeMs);
  await page.keyboard.type(text, { delay: opts.keyDelayMs });
  await sleep(opts.pauseAfterTypeMs);
}

const args = parseArgs(process.argv);

if (args.help) {
  process.stdout.write(
    [
      "Visual browser demo (Playwright, headed)",
      "",
      "Usage:",
      "  node scripts/visual-browser-demo/demo.mjs [options]",
      "",
      "Options:",
      "  --mode <offline|duckduckgo>     Default: offline",
      "  --query <text>                 Default: 'Playwright visual browser demo'",
      "  --slowMo <ms>                  Default: 150",
      "  --videoDir <dir>               If set, records a .webm per page (Playwright recordVideo)",
      "  --harPath <path.har>           If set, records a HAR file (network + resources)",
      "  --outDir <dir>                 Default: artifacts/visual-demo",
      "  --keepOpen                     If set, does not close the browser",
      "",
    ].join("\n")
  );
  process.exit(0);
}

const mode = String(args.mode ?? "offline");
if (mode !== "offline" && mode !== "duckduckgo") {
  throw new Error("--mode must be 'offline' or 'duckduckgo'");
}

const query = String(args.query ?? "Playwright visual browser demo");
const slowMo = asInt(args.slowMo, 150);
const keepOpen = Boolean(args.keepOpen);

const outDir = path.resolve(String(args.outDir ?? path.join("artifacts", "visual-demo")));
fs.mkdirSync(outDir, { recursive: true });

const videoDir = args.videoDir ? path.resolve(String(args.videoDir)) : undefined;
if (videoDir) fs.mkdirSync(videoDir, { recursive: true });

const harPath = args.harPath ? path.resolve(String(args.harPath)) : undefined;

const browser = await chromium.launch({
  headless: false,
  slowMo,
});

const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: videoDir ? { dir: videoDir } : undefined,
  recordHar: harPath ? { path: harPath, content: "embed" } : undefined,
});

const page = await context.newPage();

const human = {
  moveMs: 420,
  pauseBeforeClickMs: 120,
  clickHoldMs: 40,
  pauseAfterClickMs: 160,
  pauseBeforeTypeMs: 160,
  keyDelayMs: 55,
  pauseAfterTypeMs: 220,
};

if (mode === "duckduckgo") {
  // Networked demo, intentionally obvious.
  await page.goto("https://duckduckgo.com", { waitUntil: "domcontentloaded" });
  await humanClick(page, 'input[name="q"]', human);
  await humanType(page, 'input[name="q"]', query, human);
  await sleep(250);
  await page.keyboard.press("Enter");
  await page.waitForTimeout(2500);
} else {
  // Offline demo: deterministic local page.
  const demoPagePath = path.resolve("scripts", "visual-browser-demo", "demo-page.html");
  const url = new URL("file://" + demoPagePath.replaceAll("\\\\", "/"));
  await page.goto(url.toString(), { waitUntil: "load" });
  await humanClick(page, '#q', human);
  await humanType(page, '#q', query, human);
  await humanClick(page, '#go', human);
  await page.waitForTimeout(1200);
}

await page.screenshot({
  path: path.join(outDir, `final.${mode}.png`),
  fullPage: true,
});

if (keepOpen) {
  process.stdout.write("Browser left open (use Ctrl+C to exit)\n");
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await sleep(1000);
  }
} else {
  await context.close();
  await browser.close();
}

process.stdout.write(`OK mode=${mode} outDir=${outDir}\n`);
