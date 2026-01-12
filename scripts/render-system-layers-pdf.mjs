#!/usr/bin/env node
/**
 * Render the system layers diagram (ASCII) to a print-ready PDF (Letter, portrait).
 * Outputs:
 *   releases/diagrams/system-layers/v1.0.0/system-layers.pdf
 *   releases/diagrams/system-layers/v1.0.0/system-layers.pdf.sha256
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function extractFirstFencedBlock(markdown) {
  const m = markdown.match(/```[\s\S]*?\n([\s\S]*?)\n```/);
  if (!m) return null;
  return m[1];
}

const repoRoot = process.cwd();
const srcPath = path.join(repoRoot, "docs", "system-layers-diagram.v1.md");
const outDir = path.join(repoRoot, "releases", "diagrams", "system-layers", "v1.0.0");
const outPdf = path.join(outDir, "system-layers.pdf");
const outSha = path.join(outDir, "system-layers.pdf.sha256");

if (!fs.existsSync(srcPath)) {
  process.stderr.write(`Missing source: ${srcPath}\n`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const md = fs.readFileSync(srcPath, "utf8");
const diagram = extractFirstFencedBlock(md);
if (!diagram) {
  process.stderr.write("No fenced code block found in docs/system-layers-diagram.v1.md\n");
  process.exit(1);
}

const escaped = diagram
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>System Layers Diagram</title>
  <style>
    @page {
      size: Letter portrait;
      margin: 0.6in;
    }

    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #000;
    }

    body {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 11.5pt;
      line-height: 1.15;
    }

    .title {
      font-size: 12.5pt;
      font-weight: 600;
      margin: 0 0 10px 0;
    }

    pre {
      margin: 0;
      white-space: pre;
    }

    .foot {
      margin-top: 10px;
      font-size: 9.5pt;
      color: #111;
    }

    .foot .k {
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="title">System Layers (Neutral)</div>
  <pre>${escaped}</pre>
</body>
</html>`;

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });

  await page.pdf({
    path: outPdf,
    format: "Letter",
    printBackground: false,
    margin: { top: "0.6in", right: "0.6in", bottom: "0.6in", left: "0.6in" },
    preferCSSPageSize: true,
  });
} finally {
  await browser.close();
}

const pdfBuf = fs.readFileSync(outPdf);
const hash = sha256Hex(pdfBuf);
fs.writeFileSync(outSha, `${hash}  system-layers.pdf\n`, "utf8");

process.stdout.write(`Wrote ${path.relative(repoRoot, outPdf)}\n`);
process.stdout.write(`Wrote ${path.relative(repoRoot, outSha)}\n`);
process.stdout.write(`sha256=${hash}\n`);
