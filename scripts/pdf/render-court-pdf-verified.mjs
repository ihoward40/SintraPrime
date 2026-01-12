import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import crypto from "node:crypto";

import MarkdownIt from "markdown-it";
import puppeteer from "puppeteer";
import QRCode from "qrcode";

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

function requireString(args, key) {
  const value = args[key];
  if (!value || typeof value !== "string") {
    throw new Error(`Missing required --${key}`);
  }
  return value;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sha256Hex(data) {
  return crypto.createHash("sha256").update(data).digest("hex");
}

const args = parseArgs(process.argv);

if (args.help) {
  process.stdout.write(
    [
      "Usage:",
      "  node scripts/pdf/render-court-pdf-verified.mjs --in <input.md> --out <output.pdf> [options]",
      "",
      "Options:",
      "  --title <text>         Document title (defaults to input filename)",
      "  --court <text>         Court header line (optional)",
      "  --case <text>          Case number/caption (optional)",
      "  --date <YYYY-MM-DD>    Date line (optional)",
      "  --no-header            Do not inject a header block (verbatim body only)",
      "  --variant <full|half>  Page size: full=Letter, half=Half-letter",
      "  --no-qr                Do not include a QR code (hash still printed)",
      "  --qr-text <text>       Override QR payload (defaults to sha256:<hash>)",
      "  --doc-id <text>        Override document id (defaults to first 12 of hash)",
      "",
    ].join("\n")
  );
  process.exit(0);
}

const inPath = requireString(args, "in");
const outPath = requireString(args, "out");

const variant = String(args.variant ?? "full");
if (variant !== "full" && variant !== "half") {
  throw new Error("--variant must be 'full' or 'half'");
}

const inputMd = fs.readFileSync(inPath, "utf8");

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: false,
});

const bodyHtml = md.render(inputMd);

const title = String(args.title ?? path.basename(inPath));
const court = args.court ? String(args.court) : "";
const caseLine = args.case ? String(args.case) : "";
const dateLine = args.date ? String(args.date) : "";
const noHeader = !!args["no-header"];

const headerLines = noHeader
  ? []
  : [court && escapeHtml(court), caseLine && escapeHtml(caseLine), escapeHtml(title), dateLine && escapeHtml(dateLine)].filter(Boolean);

const headerHtml = headerLines.length
  ? `<div class="court-header">${headerLines
      .map((l) => `<div class="court-header-line">${l}</div>`)
      .join("")}</div>`
  : "";

// Hash scope: deterministic over input markdown + declared header fields + variant.
const hashPayload = JSON.stringify(
  {
    input_md: inputMd,
    title,
    court,
    case: caseLine,
    date: dateLine,
    variant,
    header_injected: !noHeader,
  },
  null,
  0
);

const hash = sha256Hex(hashPayload);
const docId = typeof args["doc-id"] === "string" && String(args["doc-id"]).trim() ? String(args["doc-id"]).trim() : hash.slice(0, 12);

const includeQr = !args["no-qr"];
const qrText =
  typeof args["qr-text"] === "string" && String(args["qr-text"]).trim()
    ? String(args["qr-text"]).trim()
    : `sha256:${hash}`;

const qrDataUrl = includeQr
  ? await QRCode.toDataURL(qrText, {
      errorCorrectionLevel: "M",
      margin: 1,
      scale: 4,
    })
  : null;

const footerHtml = `
  <div class="verification-footer">
    <div class="verification-left">
      <div><span class="label">Doc ID:</span> <span class="mono">${escapeHtml(docId)}</span></div>
      <div><span class="label">SHA-256:</span> <span class="mono">${escapeHtml(hash)}</span></div>
    </div>
    ${qrDataUrl ? `<div class="verification-qr"><img alt="verification qr" src="${qrDataUrl}" /></div>` : ""}
  </div>
`;

const css = `
  @page {
    margin: ${variant === "half" ? "0.65in" : "1.0in"};
  }
  body {
    font-family: "Times New Roman", Times, serif;
    font-size: 12pt;
    line-height: 1.25;
    color: #000;
  }
  .court-header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    padding-bottom: 0.15in;
    border-bottom: 1px solid #000;
  }
  .court-header-line {
    text-align: center;
    font-size: 11pt;
  }
  .verification-footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    padding-top: 0.12in;
    border-top: 1px solid #000;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 0.25in;
  }
  .verification-left {
    font-size: 9pt;
  }
  .verification-left .label {
    font-weight: bold;
  }
  .mono {
    font-family: Consolas, "Courier New", monospace;
    font-size: 9pt;
  }
  .verification-qr img {
    width: 0.9in;
    height: 0.9in;
  }
  .content {
    margin-top: ${headerLines.length ? (variant === "half" ? "1.0in" : "1.1in") : "0"};
    padding-bottom: 1.15in;
  }
  h1, h2, h3 { page-break-after: avoid; }
  pre, blockquote { page-break-inside: avoid; }
  pre {
    font-family: Consolas, "Courier New", monospace;
    font-size: 10pt;
    border: 1px solid #000;
    padding: 0.12in;
    white-space: pre-wrap;
    word-break: break-word;
  }
  code {
    font-family: Consolas, "Courier New", monospace;
    font-size: 10pt;
  }
  hr { border: none; border-top: 1px solid #000; }
`;

const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>${css}</style>
</head>
<body>
  ${headerHtml}
  ${footerHtml}
  <div class="content">${bodyHtml}</div>
</body>
</html>`;

fs.mkdirSync(path.dirname(outPath), { recursive: true });

const browser = await puppeteer.launch({
  headless: "new",
});

try {
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load" });

  if (variant === "half") {
    await page.pdf({
      path: outPath,
      printBackground: true,
      width: "5.5in",
      height: "8.5in",
    });
  } else {
    await page.pdf({
      path: outPath,
      printBackground: true,
      format: "Letter",
    });
  }
} finally {
  await browser.close();
}

process.stdout.write(outPath + "\n");
