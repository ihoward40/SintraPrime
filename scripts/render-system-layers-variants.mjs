#!/usr/bin/env node
/**
 * Render additional system layers diagram artifacts:
 * - Vector SVG sibling + SHA-256
 * - Court+Landscape PDF variant + SHA-256
 *
 * Inputs:
 * - docs/system-layers-diagram.v1.md (first fenced code block)
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function writeShaSidecar(targetPathAbs, sidecarPathAbs) {
  const buf = fs.readFileSync(targetPathAbs);
  const hash = sha256Hex(buf);
  fs.writeFileSync(sidecarPathAbs, `${hash}  ${path.basename(targetPathAbs)}\n`, "utf8");
  return hash;
}

function extractFirstFencedBlock(markdown) {
  const m = markdown.match(/```[\s\S]*?\n([\s\S]*?)\n```/);
  if (!m) return null;
  return m[1];
}

function escapeXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildSvg(diagramText) {
  const lines = diagramText.replace(/\r\n/g, "\n").split("\n");
  const maxLen = lines.reduce((m, l) => Math.max(m, l.length), 0);

  const fontSize = 14;
  const lineHeight = 18;
  const margin = 20;

  // Conservative char width heuristic for monospace.
  const charWidth = 8.4;

  const width = Math.ceil(margin * 2 + maxLen * charWidth);
  const height = Math.ceil(margin * 2 + lines.length * lineHeight);

  const textNodes = lines
    .map((line, idx) => {
      const x = margin;
      const y = margin + fontSize + idx * lineHeight;
      return `<text x="${x}" y="${y}">${escapeXml(line)}</text>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="System layers diagram">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
  <g fill="#000000" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" font-size="${fontSize}">
${textNodes}
  </g>
</svg>
`;
}

async function renderCourtLandscapePdf(diagramText, outPdfAbs) {
  const escaped = diagramText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>System Layers Diagram (Court, Landscape)</title>
  <style>
    @page {
      size: Letter landscape;
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
      font-size: 11pt;
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

    .footer {
      margin-top: 10px;
      font-size: 9pt;
      color: #111;
    }

    .footer b {
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="title">System Layers (Court Context)</div>
  <pre>${escaped}</pre>
  <div class="footer">
    <b>Notes (Neutral):</b> Observation artifacts are optional and non-authoritative; verification proves integrity, not intent; governance semantics are versioned and may change only by explicit release.
  </div>
</body>
</html>`;

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.pdf({
      path: outPdfAbs,
      format: "Letter",
      landscape: true,
      printBackground: false,
      margin: { top: "0.6in", right: "0.6in", bottom: "0.6in", left: "0.6in" },
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
}

async function main() {
  const repoRoot = process.cwd();
  const srcPath = path.join(repoRoot, "docs", "system-layers-diagram.v1.md");

  const svgOut = path.join(repoRoot, "releases", "diagrams", "system-layers", "v1.0.0", "system-layers.svg");
  const svgSha = path.join(repoRoot, "releases", "diagrams", "system-layers", "v1.0.0", "system-layers.svg.sha256");

  const courtPdfOut = path.join(
    repoRoot,
    "releases",
    "diagrams",
    "system-layers-court-landscape",
    "v1.0.0",
    "system-layers.court.landscape.pdf",
  );
  const courtPdfSha = path.join(
    repoRoot,
    "releases",
    "diagrams",
    "system-layers-court-landscape",
    "v1.0.0",
    "system-layers.court.landscape.pdf.sha256",
  );

  if (!fs.existsSync(srcPath)) {
    process.stderr.write(`Missing source: ${srcPath}\n`);
    process.exit(1);
  }

  const md = fs.readFileSync(srcPath, "utf8");
  const diagram = extractFirstFencedBlock(md);
  if (!diagram) {
    process.stderr.write("No fenced code block found in docs/system-layers-diagram.v1.md\n");
    process.exit(1);
  }

  fs.mkdirSync(path.dirname(svgOut), { recursive: true });
  fs.mkdirSync(path.dirname(courtPdfOut), { recursive: true });

  // SVG
  fs.writeFileSync(svgOut, buildSvg(diagram), "utf8");
  const svgHash = writeShaSidecar(svgOut, svgSha);

  // Court landscape PDF
  await renderCourtLandscapePdf(diagram, courtPdfOut);
  const pdfHash = writeShaSidecar(courtPdfOut, courtPdfSha);

  process.stdout.write(`Wrote ${path.relative(repoRoot, svgOut)}\n`);
  process.stdout.write(`Wrote ${path.relative(repoRoot, svgSha)}\n`);
  process.stdout.write(`sha256(svg)=${svgHash}\n`);
  process.stdout.write(`Wrote ${path.relative(repoRoot, courtPdfOut)}\n`);
  process.stdout.write(`Wrote ${path.relative(repoRoot, courtPdfSha)}\n`);
  process.stdout.write(`sha256(pdf)=${pdfHash}\n`);
}

await main();
