#!/usr/bin/env node
/**
 * Render a policy-submission-ready PDF appendix for Watch Mode.
 * Output:
 *   releases/policy-appendix/watch-mode/<version>/SintraPrime_Policy_Appendix_Watch_Mode.pdf
 *   releases/policy-appendix/watch-mode/<version>/SintraPrime_Policy_Appendix_Watch_Mode.pdf.sha256
 *
 * Args:
 *   --version <vX.Y.Z>   (default: v1.0.2)
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

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;");
}

function pickSection(md, header) {
  const h = `## ${header}`;
  const start = md.indexOf(h);
  if (start < 0) return null;
  const rest = md.slice(start + h.length);
  const next = rest.indexOf("\n## ");
  return (next < 0 ? rest : rest.slice(0, next)).trim();
}

function extractCodeBlock(md, header, codeFenceTitle) {
  const section = pickSection(md, header);
  if (!section) return null;
  const idx = section.indexOf(codeFenceTitle);
  const slice = idx >= 0 ? section.slice(idx) : section;
  const m = slice.match(/```[\s\S]*?\n([\s\S]*?)\n```/);
  return m ? m[1] : null;
}

function toSafeHtml(mdSection) {
  if (!mdSection) return "";
  const normalized = mdSection
    .replace(/\r\n/g, "\n")
    .replace(/\n\n/g, "\n")
    .replace(/\n- /g, "\n• ")
    .replace(/\n### /g, "\n\n");

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

function getArg(name) {
  const idx = process.argv.indexOf(name);
  if (idx < 0) return null;
  return process.argv[idx + 1] ?? null;
}

const repoRoot = process.cwd();
const srcPath = path.join(repoRoot, "docs", "policy", "watch-mode-policy-appendix.v1.md");

const version = getArg("--version") ?? "v1.0.2";
const outDir =
  getArg("--outDir") ?? path.join(repoRoot, "releases", "policy-appendix", "watch-mode", version);
const outPdf = path.join(outDir, "SintraPrime_Policy_Appendix_Watch_Mode.pdf");
const outSha = path.join(outDir, "SintraPrime_Policy_Appendix_Watch_Mode.pdf.sha256");

if (!fs.existsSync(srcPath)) {
  process.stderr.write(`Missing source: ${srcPath}\n`);
  process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });

const md = fs.readFileSync(srcPath, "utf8");

const diagram = extractCodeBlock(md, "Policy submission: diagram + paragraph (exact format)", "### System layers");
if (!diagram) {
  process.stderr.write("Missing policy submission diagram code block.\n");
  process.exit(1);
}

const platformSection = pickSection(md, "Platform-specific explanations (copy/paste)");
const alignmentSection = pickSection(md, "Alignment notes (common policy clause families)");
const pinnedSection = pickSection(md, "Pinned clause-family mapping (by platform)");

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
    .quote { border-left: 3px solid #000; padding-left: 10px; margin: 8px 0; }
    .small { font-size: 9.5pt; color: #222; }
    ul { margin: 6px 0 6px 18px; }
    li { margin: 2px 0; }
  </style>
</head>
<body>
  <h1>SintraPrime — Policy Appendix (Watch Mode)</h1>
  <div class="meta">Scope: non-governing transparency explanation • Format: one-page appendix (Letter, portrait)</div>

  <h2>System Layers (Overview)</h2>
  <div class="box">
    <pre>${escapeHtml(diagram)}</pre>
  </div>

  <h2>System Integrity &amp; Transparency Statement</h2>
  <div class="quote">
    <div>${escapeHtml("The system separates governance, execution, observation, and verification into distinct layers to prevent hidden automation or authority escalation. Execution occurs only after validation. Watch Mode, when enabled, provides phase-gated visual observation of approved actions and produces non-authoritative artifacts for transparency only. Finalized records are protected via append-only cryptographic hashing and can be verified independently using an offline tool. Governance behavior is versioned and immutable absent explicit release. This architecture enables transparency and auditability without introducing autonomous control.")}</div>
  </div>

  <h2>Pinned clause families (by platform)</h2>
  <div class="small">URLs and small excerpts are included for verifiability.</div>
  <div class="box">
    ${toSafeHtml(pinnedSection)}
  </div>

  <h2>Alignment Notes (Common Policy Clause Families)</h2>
  <div class="small">These notes are phrased to map to common reviews of automation, scraping/data-access, and integrity/anti-circumvention.</div>
  <div class="box">
    ${toSafeHtml(alignmentSection)}
  </div>

  <h2>Platform-Specific Explanations (Copy/Paste)</h2>
  <div class="box">
    ${toSafeHtml(platformSection)}
  </div>

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
