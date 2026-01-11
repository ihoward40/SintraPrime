import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import process from "node:process";
import { spawnSync } from "node:child_process";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { redactJson } from "../src/audit/redact.js";

function usage(exitCode: number): never {
  const rel = "node --import tsx ./scripts/make-court-binder.ts";
  process.stderr.write(
    `Usage:\n` +
      `  ${rel} <execution_id> --run-type <db|page> --target-id <NOTION_ID> [--out <dir>] [--bundle-dir <path>] [--bundle-zip <path>]\n\n` +
      `Outputs:\n` +
      `  <out>/BINDER/00_COVER_PAGE.pdf\n` +
      `  <out>/BINDER/01_EXECUTIVE_SUMMARY.pdf\n` +
      `  <out>/BINDER/02_SYSTEM_AUTHORITY.pdf\n` +
      `  <out>/BINDER/03_EXECUTION_TIMELINE.pdf\n` +
      `  <out>/BINDER/04_EVIDENCE_LOGS.pdf\n` +
      `  <out>/BINDER/05_VERIFY_INSTRUCTIONS.pdf\n` +
      `  <out>/BINDER/EXHIBITS/*\n` +
      `  <out>/VERIFICATION/*\n`
  );
  process.exit(exitCode);
}

function sha256Bytes(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function sha256File(p: string) {
  return sha256Bytes(fs.readFileSync(p));
}

function mkdirp(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function writeText(filePath: string, text: string) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, text, "utf8");
}

function stableJsonStringify(value: unknown) {
  const stable = (v: any): any => {
    if (v === null || v === undefined) return v;
    if (Array.isArray(v)) return v.map(stable);
    if (typeof v !== "object") return v;
    const keys = Object.keys(v).sort();
    const out: any = {};
    for (const k of keys) out[k] = stable(v[k]);
    return out;
  };
  return JSON.stringify(stable(value), null, 2) + "\n";
}

function listFiles(dirAbs: string): string[] {
  if (!fs.existsSync(dirAbs)) return [];
  return fs
    .readdirSync(dirAbs, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => path.join(dirAbs, e.name))
    .sort((a, b) => a.localeCompare(b));
}

function listMatchingFiles(dirAbs: string, predicate: (name: string) => boolean): string[] {
  return listFiles(dirAbs).filter((p) => predicate(path.basename(p)));
}

function isZipLikeFileName(name: string): boolean {
  // Accept collision-suffixed variants produced on Windows, e.g. ".zip_2" or ".zip-2".
  // Also accept plain ".zip".
  return /\.zip(?:[._-]\d+)?$/i.test(name);
}

function readReceiptForExecutionId(executionId: string): any | null {
  const receiptsPath = path.join(process.cwd(), "runs", "receipts.jsonl");
  if (!fs.existsSync(receiptsPath)) return null;
  const raw = fs.readFileSync(receiptsPath, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    try {
      const row = JSON.parse(lines[i]);
      if (row?.execution_id === executionId) return row;
    } catch {
      // ignore
    }
  }
  return null;
}

function findSingleMatchOrThrow(label: string, matches: string[]): string {
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) throw new Error(`Unable to locate ${label}. Run /audit export <execution_id> first.`);
  throw new Error(`Multiple ${label} matches found; pass an explicit path.\n` + matches.map((m) => `- ${m}`).join("\n"));
}

function normalizePath(p: string) {
  return String(p).replace(/\\/g, "/");
}

function renderMarkdownPdf(opts: { inPath: string; outPath: string }) {
  mkdirp(path.dirname(opts.outPath));
  const scriptAbs = path.join(process.cwd(), "scripts", "pdf", "render-court-pdf.mjs");
  const res = spawnSync(process.execPath, [scriptAbs, "--no-header", "--in", opts.inPath, "--out", opts.outPath], {
    stdio: "inherit",
    env: process.env,
  });
  if (res.status !== 0) {
    throw new Error(`PDF render failed: ${normalizePath(opts.inPath)} -> ${normalizePath(opts.outPath)}`);
  }
}

async function writeSimplePdf(outPath: string, title: string, lines: string[]) {
  const doc = await PDFDocument.create();
  doc.setTitle(title);
  doc.setAuthor("SintraPrime");
  doc.setProducer("SintraPrime");
  doc.setCreator("SintraPrime");

  const page = doc.addPage([612, 792]); // Letter
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await doc.embedFont(StandardFonts.TimesRomanBold);

  const marginX = 72;
  let y = 792 - 72;

  const draw = (text: string, bold: boolean, size: number) => {
    page.drawText(text, {
      x: marginX,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0, 0, 0),
    });
    y -= size + 10;
  };

  draw(title, true, 16);
  y -= 6;

  const wrapWidth = 90;
  for (const line of lines) {
    const raw = String(line ?? "");
    if (!raw.trim()) {
      y -= 10;
      continue;
    }
    // Extremely simple wrapping: split on spaces.
    const words = raw.split(/\s+/);
    let cur = "";
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (next.length > wrapWidth) {
        draw(cur, false, 12);
        cur = w;
      } else {
        cur = next;
      }
    }
    if (cur) draw(cur, false, 12);
  }

  const bytes = await doc.save({ useObjectStreams: false });
  mkdirp(path.dirname(outPath));
  fs.writeFileSync(outPath, bytes);
}

function writeBinderVerifyJs(outPath: string) {
  const content = `import crypto from "node:crypto";\nimport fs from "node:fs";\nimport path from "node:path";\n\nfunction sha256File(p) {\n  const b = fs.readFileSync(p);\n  return crypto.createHash("sha256").update(b).digest("hex");\n}\n\nfunction usage(msg) {\n  if (msg) process.stderr.write("Error: " + msg + "\\n");\n  process.stderr.write("Usage: node EXHIBITS/E_verify.js\\n");\n  process.exit(2);\n}\n\ntry {\n  const root = process.cwd();\n  const exhibits = path.join(root, "EXHIBITS");\n  const hashesPath = path.join(exhibits, "D_hashes.sha256");\n  if (!fs.existsSync(hashesPath)) usage("Missing EXHIBITS/D_hashes.sha256");\n\n  const lines = fs.readFileSync(hashesPath, "utf8").split(/\\r?\\n/).filter(Boolean);\n  const expected = new Map();\n  for (const line of lines) {\n    const m = String(line).match(/^([a-f0-9]{64})\\s+(.+)$/i);\n    if (!m) continue;\n    expected.set(m[2].trim(), m[1].toLowerCase());\n  }\n\n  const failures = [];\n  for (const [rel, want] of expected.entries()) {\n    const abs = path.join(root, rel.replace(/\\//g, path.sep));\n    if (!fs.existsSync(abs)) {\n      failures.push({ rel, error: "missing" });\n      continue;\n    }\n    const got = sha256File(abs);\n    if (got !== want) {\n      failures.push({ rel, want, got });\n    }\n  }\n\n  const ok = failures.length === 0;\n  const out = { ok, checked: expected.size, failures };\n  process.stdout.write(JSON.stringify(out, null, 0) + "\\n");\n  process.exit(ok ? 0 : 3);\n} catch (e) {\n  process.stderr.write(String(e?.stack || e?.message || e) + "\\n");\n  process.exit(1);\n}\n`;
  writeText(outPath, content);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) usage(0);

  const execution_id = argv[0] && !argv[0].startsWith("-") ? String(argv[0]).trim() : "";
  if (!execution_id) usage(2);

  const getFlag = (name: string): string | null => {
    const idx = argv.findIndex((a) => a === name);
    if (idx === -1) return null;
    const v = String(argv[idx + 1] ?? "").trim();
    return v ? v : null;
  };

  const runTypeRaw = getFlag("--run-type");
  const target_id = getFlag("--target-id");
  const run_type = (runTypeRaw === "db" || runTypeRaw === "page" ? runTypeRaw : null) as "db" | "page" | null;
  if (!run_type || !target_id) usage(2);

  const outRoot = getFlag("--out") || path.join(process.cwd(), "exports", "court_packets", `COURT_PACKET_${execution_id}`);

  const packetRoot = outRoot;
  const binderRoot = path.join(packetRoot, "BINDER");
  const verificationRoot = path.join(packetRoot, "VERIFICATION");

  const bundleDirArg = getFlag("--bundle-dir");
  const bundleZipArg = getFlag("--bundle-zip");

  const auditBase = path.join(process.cwd(), "exports", "audit_exec");
  const exportDirMatches = bundleDirArg
    ? [path.resolve(bundleDirArg)]
    : fs.existsSync(auditBase)
      ? fs
          .readdirSync(auditBase, { withFileTypes: true })
          .filter((e) => e.isDirectory() && e.name.startsWith(`audit_${execution_id}`))
          .map((e) => path.join(auditBase, e.name))
          .sort((a, b) => a.localeCompare(b))
      : [];

  const bundleDirAbs = findSingleMatchOrThrow("audit bundle directory", exportDirMatches);

  const zipMatches = bundleZipArg
    ? [path.resolve(bundleZipArg)]
    : listMatchingFiles(auditBase, (n) => n.startsWith(`audit_${execution_id}`) && isZipLikeFileName(n));
  const bundleZipAbs = zipMatches.length ? findSingleMatchOrThrow("audit bundle zip", zipMatches) : null;

  const receipt = readReceiptForExecutionId(execution_id);
  if (!receipt) throw new Error(`No receipt found for execution_id=${execution_id} in runs/receipts.jsonl`);

  // VERIFICATION/ (mechanical, not hashed)
  mkdirp(verificationRoot);
  const auditVerifyAbs = path.join(bundleDirAbs, "verify.js");
  const auditManifestAbs = path.join(bundleDirAbs, "manifest.json");
  const auditRootHashAbs = path.join(bundleDirAbs, "roothash.txt");
  if (!fs.existsSync(auditVerifyAbs)) throw new Error(`Missing audit bundle verifier: ${normalizePath(auditVerifyAbs)}`);
  if (!fs.existsSync(auditManifestAbs)) throw new Error(`Missing audit bundle manifest: ${normalizePath(auditManifestAbs)}`);
  if (!fs.existsSync(auditRootHashAbs)) {
    throw new Error(
      `Missing audit bundle roothash.txt: ${normalizePath(auditRootHashAbs)}. Re-run /audit export ${execution_id}.`
    );
  }
  fs.copyFileSync(auditVerifyAbs, path.join(verificationRoot, "verify.js"));
  fs.copyFileSync(auditManifestAbs, path.join(verificationRoot, "manifest.json"));
  fs.copyFileSync(auditRootHashAbs, path.join(verificationRoot, "roothash.txt"));

  const verifyReadme = [
    "VERIFY (mechanical)",
    "Requires: Node.js >= 20",
    "1) Unzip the audit bundle zip to a folder.",
    "2) Run this one command from the packet root:",
    "   node VERIFICATION/verify.js <unzipped_bundle_dir> --json",
    "Expected output (one line JSON):",
    '   {"kind":"AuditBundleVerification","ok":true,...}',
    "Exit codes: 0 ok | 3 verify failed | 2 usage | 1 internal",
    "Files here are copies of the audit bundle anchors:",
    "   manifest.json, roothash.txt, verify.js",
    "No hashing is performed in VERIFICATION/.",
  ].join("\n");
  writeText(path.join(verificationRoot, "VERIFY_README.txt"), verifyReadme + "\n");

  const exhibitsDir = path.join(binderRoot, "EXHIBITS");
  mkdirp(exhibitsDir);

  // A_notionsnapshot.json
  const notionDir = path.join(process.cwd(), "runs", "notion");
  const notionFiles = listMatchingFiles(notionDir, (n) => n.startsWith(`${execution_id}.`) && n.endsWith(".json"));
  const aPath = path.join(exhibitsDir, "A_notionsnapshot.json");
  if (notionFiles.length === 1) {
    const raw = JSON.parse(fs.readFileSync(notionFiles[0], "utf8"));
    writeText(aPath, stableJsonStringify(redactJson(raw)));
  } else {
    writeText(
      aPath,
      stableJsonStringify({
        kind: "NotionSnapshotIndex",
        execution_id,
        files: notionFiles.map((p) => normalizePath(path.relative(process.cwd(), p))),
        note: notionFiles.length ? "Multiple artifacts found; see files list." : "No notion artifacts found under runs/notion/",
      })
    );
  }

  // B_receipts.jsonl (single line)
  const bPath = path.join(exhibitsDir, "B_receipts.jsonl");
  writeText(bPath, JSON.stringify(redactJson(receipt)) + "\n");

  // C_manifest.json (from audit bundle dir)
  const manifestAbs = path.join(bundleDirAbs, "manifest.json");
  const cPath = path.join(exhibitsDir, "C_manifest.json");
  if (!fs.existsSync(manifestAbs)) {
    writeText(cPath, stableJsonStringify({ kind: "ManifestMissing", execution_id, expected: normalizePath(manifestAbs) }));
  } else {
    const raw = JSON.parse(fs.readFileSync(manifestAbs, "utf8"));
    writeText(cPath, stableJsonStringify(redactJson(raw)));
  }

  // E_verify.js (binder-local verifier)
  const ePath = path.join(exhibitsDir, "E_verify.js");
  writeBinderVerifyJs(ePath);

  // D_hashes.sha256 (hashes for A/B/C/E and (optionally) the audit zip)
  const hashLines: Array<{ rel: string; sha256: string }> = [];
  const addHash = (abs: string, rel: string) => {
    hashLines.push({ rel: normalizePath(rel), sha256: sha256File(abs) });
  };

  addHash(aPath, "EXHIBITS/A_notionsnapshot.json");
  addHash(bPath, "EXHIBITS/B_receipts.jsonl");
  addHash(cPath, "EXHIBITS/C_manifest.json");
  addHash(ePath, "EXHIBITS/E_verify.js");

  const dPath = path.join(exhibitsDir, "D_hashes.sha256");
  // Deterministic ordering
  hashLines.sort((x, y) => x.rel.localeCompare(y.rel));
  writeText(dPath, hashLines.map((h) => `${h.sha256}  ${h.rel}`).join("\n") + "\n");

  // Supplemental legal PDFs (canonical Markdown → rendered PDF; not hash-bound to the execution).
  // These are clerk-facing filings / rehearsal materials that travel alongside the binder.
  const docsRoot = path.join(process.cwd(), "docs");
  const legalPdfSpecs: Array<{ srcAbs: string; dstAbs: string }> = [
    {
      srcAbs: path.join(docsRoot, "judicial-explainer.md"),
      dstAbs: path.join(exhibitsDir, "Exhibit_D_Judicial_Explainer.pdf"),
    },
    {
      srcAbs: path.join(docsRoot, "notice-state-electronic-records.md"),
      dstAbs: path.join(exhibitsDir, "Exhibit_F_State_Electronic_Records_Notice.pdf"),
    },
    {
      srcAbs: path.join(docsRoot, "memo-foundation-rule-104a.md"),
      dstAbs: path.join(exhibitsDir, "Exhibit_G_Rule_104a_Foundation_Memo.pdf"),
    },
    {
      srcAbs: path.join(docsRoot, "mock-daubert-challenge.md"),
      dstAbs: path.join(exhibitsDir, "Exhibit_H_Daubert_Response.pdf"),
    },
    {
      srcAbs: path.join(docsRoot, "legal-packet-index.md"),
      dstAbs: path.join(binderRoot, "Packet_Index.pdf"),
    },
  ];

  for (const spec of legalPdfSpecs) {
    if (!fs.existsSync(spec.srcAbs)) throw new Error(`Missing source doc: ${normalizePath(spec.srcAbs)}`);
    renderMarkdownPdf({ inPath: spec.srcAbs, outPath: spec.dstAbs });
  }

  // Binder top-level PDFs
  const started = String(receipt?.started_at || receipt?.created_at || "");
  const finished = String(receipt?.finished_at || "");
  const status = String(receipt?.status || "");
  const policy = String(receipt?.policy_code || "");

  await writeSimplePdf(path.join(binderRoot, "00_COVER_PAGE.pdf"), "Court Packet Cover Page", [
    `Execution ID: ${execution_id}`,
    `Run type: ${run_type.toUpperCase()} (read-only)` ,
    `Target: ${target_id}`,
    "",
    "Court: ______________________________",
    "Case No.: ___________________________",
    "Date: _______________________________",
  ]);

  await writeSimplePdf(path.join(binderRoot, "01_EXECUTIVE_SUMMARY.pdf"), "Executive Summary", [
    "This packet is a presentation binder for a single execution.",
    "Underlying integrity is proven by the exhibits and their hashes.",
    "",
    `Execution: ${execution_id}`,
    `Operation: Notion live ${run_type} snapshot (intended read-only)` ,
    `Target: ${target_id}`,
  ]);

  await writeSimplePdf(path.join(binderRoot, "02_SYSTEM_AUTHORITY.pdf"), "System Authority", [
    "Authority and invariants are defined by:",
    "- docs/CONSTITUTION.v1.md (supreme invariants)",
    "- docs/tier6-live-accounts-safety.md (live-account read-only contract)",
    "",
    "This binder does not grant authority. It documents the outputs of an execution.",
  ]);

  await writeSimplePdf(path.join(binderRoot, "03_EXECUTION_TIMELINE.pdf"), "Execution Timeline", [
    `Execution ID: ${execution_id}`,
    started ? `Started: ${started}` : "Started: (unknown)",
    finished ? `Finished: ${finished}` : "Finished: (unknown)",
    status ? `Status: ${status}` : "Status: (unknown)",
    policy ? `Policy code: ${policy}` : "Policy code: (none)",
  ]);

  await writeSimplePdf(path.join(binderRoot, "04_EVIDENCE_LOGS.pdf"), "Evidence Logs", [
    "Exhibits included:",
    "- A_notionsnapshot.json (snapshot or index)",
    "- B_receipts.jsonl (receipt line)",
    "- C_manifest.json (audit execution manifest)",
    "- D_hashes.sha256 (SHA-256 for exhibits)",
    "- E_verify.js (verifier script)",
    "",
    "All exhibits are stored under the EXHIBITS/ directory.",
  ]);

  await writeSimplePdf(path.join(binderRoot, "05_VERIFY_INSTRUCTIONS.pdf"), "Verify Instructions", [
    "1) Open a terminal in the binder root folder (the folder containing EXHIBITS/).",
    "2) Run:",
    "   node EXHIBITS/E_verify.js",
    "3) Verification outputs JSON and exits 0 on success.",
  ]);

  process.stdout.write(
    JSON.stringify(
      {
        kind: "CourtBinder",
        execution_id,
        out_dir: normalizePath(path.resolve(packetRoot)),
        binder_dir: normalizePath(path.resolve(binderRoot)),
        verification_dir: normalizePath(path.resolve(verificationRoot)),
        bundle_dir: normalizePath(bundleDirAbs),
        bundle_zip: bundleZipAbs ? normalizePath(bundleZipAbs) : null,
      },
      null,
      2
    ) + "\n"
  );
}

main().catch((err) => {
  process.exitCode = 1;
  process.stderr.write(String(err?.stack || err?.message || err) + "\n");
});
