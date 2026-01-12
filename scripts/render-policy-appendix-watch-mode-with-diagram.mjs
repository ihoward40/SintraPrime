#!/usr/bin/env node
/**
 * Render a submission-ready PDF appendix for Watch Mode that includes:
 * - Front page: system layers diagram (canonical)
 * - Appendix: pinned clause-family mapping + alignment notes + platform-specific copy
 *
 * Output:
 *   releases/policy-appendix/watch-mode/<version>/SintraPrime_Policy_Appendix_Watch_Mode_with_Diagram.pdf
 *   releases/policy-appendix/watch-mode/<version>/SintraPrime_Policy_Appendix_Watch_Mode_with_Diagram.pdf.sha256
 *
 * Args:
 *   --version <vX.Y.Z>   (default: v1.0.1)
 *   --outDir <path>     (optional override)
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function extractFirstFencedBlock(markdown) {
  const m = markdown.match(/```[\s\S]*?\n([\s\S]*?)\n```/);
  if (!m) return null;
  return m[1];
}

function pickSection(md, header) {
  const h = `## ${header}`;
  const start = md.indexOf(h);
  if (start < 0) return null;
  const rest = md.slice(start + h.length);
  const next = rest.indexOf("\n## ");
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}

function toHtmlBlock(mdSection) {
  if (!mdSection) return "";
  // Minimal, deterministic conversion: preserve line breaks; replace markdown bullets;
  // linkify URLs (clickable) while remaining safe (no HTML injection).
  return toSafeHtml(mdSection);
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx < 0) return null;
  return process.argv[idx + 1] ?? null;
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function toSafeHtml(mdSection) {
  if (!mdSection) return "";
  const normalized = mdSection
    .replace(/\r\n/g, "\n")
    .replace(/\n\n/g, "\n")
    .replace(/\n- /g, "\n• ")
    .replace(/\n### /g, "\n\n");

  // Support markdown links: [label](https://...)
  // Support bare URLs: https://...
  const pattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>")\]]+)/g;
  let out = "";
  let last = 0;
  for (const m of normalized.matchAll(pattern)) {
    const idx = m.index ?? 0;
    out += escapeHtml(normalized.slice(last, idx));

    const label = m[1];
    const linkUrl = m[2];
    const bareUrl = m[3];
    const url = linkUrl ?? bareUrl;
    const text = linkUrl ? label : url;
    out += `<a href="${escapeAttr(url)}">${escapeHtml(text)}</a>`;

    last = idx + m[0].length;
  }
  out += escapeHtml(normalized.slice(last));

  return out.replace(/\n/g, "<br/>");
}

const repoRoot = process.cwd();

const policySrcPath = path.join(repoRoot, "docs", "policy", "watch-mode-policy-appendix.v1.md");
const diagramSrcPath = path.join(repoRoot, "docs", "system-layers-diagram.v1.md");

const version = getArg("--version") ?? "v1.0.2";
const outDir =
  getArg("--outDir") ?? path.join(repoRoot, "releases", "policy-appendix", "watch-mode", version);
const outPdf = path.join(outDir, "SintraPrime_Policy_Appendix_Watch_Mode_with_Diagram.pdf");
const outSha = path.join(outDir, "SintraPrime_Policy_Appendix_Watch_Mode_with_Diagram.pdf.sha256");

if (!fs.existsSync(policySrcPath)) {
  process.stderr.write(`Missing source: ${policySrcPath}\n`);
  process.exit(1);
}
if (!fs.existsSync(diagramSrcPath)) {
  process.stderr.write(`Missing source: ${diagramSrcPath}\n`);
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });

const policyMd = fs.readFileSync(policySrcPath, "utf8");
const diagramMd = fs.readFileSync(diagramSrcPath, "utf8");

const systemLayersDiagram = extractFirstFencedBlock(diagramMd);
if (!systemLayersDiagram) {
  process.stderr.write("No fenced code block found in docs/system-layers-diagram.v1.md\n");
  process.exit(1);
}

const pinnedSection = pickSection(policyMd, "Pinned clause-family mapping (by platform)");
const alignmentSection = pickSection(policyMd, "Alignment notes (common policy clause families)");
const platformSection = pickSection(policyMd, "Platform-specific explanations (copy/paste)");

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SintraPrime Policy Appendix (Watch Mode)</title>
  <style>
    @page { size: Letter portrait; margin: 0.75in; }

    html, body { margin: 0; padding: 0; background: #fff; color: #000; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.35;
    }

    h1 { font-size: 16pt; margin: 0 0 6px 0; }
    .meta { font-size: 9.5pt; color: #222; margin-bottom: 14px; }

    h2 { font-size: 12.5pt; margin: 16px 0 6px 0; }
    h3 { font-size: 11pt; margin: 10px 0 4px 0; }

    .box {
      border: 1px solid #000;
      padding: 10px 12px;
      margin: 10px 0;
    }

    pre {
      margin: 0;
      white-space: pre;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 10.5pt;
      line-height: 1.2;
    }

    .diagram-page {
      page-break-after: always;
      break-after: page;
    }

    .diagram-title {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 12.5pt;
      font-weight: 600;
      margin: 0 0 10px 0;
    }

    .small { font-size: 9.5pt; color: #222; }
    .quote { border-left: 3px solid #000; padding-left: 10px; margin: 8px 0; }
  </style>
</head>
<body>
  <div class="diagram-page">
    <div class="diagram-title">System Layers (Neutral)</div>
    <div class="box">
      <pre>${escapeHtml(systemLayersDiagram)}</pre>
    </div>
    <div class="small">Front page: conceptual architecture only. Observation artifacts are optional and non-authoritative.</div>
  </div>

  <h1>SintraPrime — Policy Appendix (Watch Mode)</h1>
  <div class="meta">Scope: non-governing transparency explanation • Format: PDF appendix (Letter, portrait)</div>

  <h2>System Integrity &amp; Transparency Statement</h2>
  <div class="quote">
    <div>${escapeHtml(
      "The system separates governance, execution, observation, and verification into distinct layers to prevent hidden automation or authority escalation. Execution occurs only after validation. Watch Mode, when enabled, provides phase-gated visual observation of approved actions and produces non-authoritative artifacts for transparency only. Finalized records are protected via append-only cryptographic hashing and can be verified independently using an offline tool. Governance behavior is versioned and immutable absent explicit release. This architecture enables transparency and auditability without introducing autonomous control."
    )}</div>
  </div>

  <h2>Pinned clause families (by platform)</h2>
  <div class="small">Mapping to common policy clause families; no clause numbers (they change by revision).</div>
  <div class="box">${toHtmlBlock(pinnedSection)}</div>

  <h2>Alignment Notes (Common Policy Clause Families)</h2>
  <div class="small">These notes are phrased to map to common reviews of automation, scraping/data-access, and integrity/anti-circumvention.</div>
  <div class="box">${toHtmlBlock(alignmentSection)}</div>

  <h2>Platform-Specific Explanations (Copy/Paste)</h2>
  <div class="box">${toHtmlBlock(platformSection)}</div>

  <div class="small">Note: Watch Mode is observational only. Verification is deterministic and offline. This appendix does not confer authority or change system behavior.</div>
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
    margin: { top: "0.75in", right: "0.75in", bottom: "0.75in", left: "0.75in" },
    preferCSSPageSize: true,
  });
} finally {
  await browser.close();
}

const pdfBuf = fs.readFileSync(outPdf);
const hash = sha256Hex(pdfBuf);
fs.writeFileSync(outSha, `${hash}  ${path.basename(outPdf)}\n`, "utf8");

process.stdout.write(`Wrote ${path.relative(repoRoot, outPdf)}\n`);
process.stdout.write(`Wrote ${path.relative(repoRoot, outSha)}\n`);
process.stdout.write(`sha256=${hash}\n`);
