import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import process from "node:process";
import { redactJson } from "../src/audit/redact.js";

function usage(): never {
  const rel = "node --import tsx ./scripts/make-court-packet.ts";
  // Intentionally concise: court packets are evidence; keep operator steps simple.
  // Args are explicit to avoid accidental selection of wrong audit bundle.
  process.stderr.write(
    `Usage:\n` +
      `  ${rel} <execution_id> --run-type <db|page> --target-id <NOTION_ID> [--out <dir>] [--zip <path>] [--export-dir <path>]\n\n` +
      `Notes:\n` +
      `  - Run /audit export <execution_id> first to produce the audit bundle under exports/audit_exec/.\n` +
      `  - If multiple bundles exist for the same execution_id, pass --zip/--export-dir explicitly.\n`
  );
  process.exit(2);
}

function mustString(v: unknown, name: string): string {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) throw new Error(`Missing ${name}`);
  return s;
}

function sha256(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
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

function mkdirp(p: string) {
  fs.mkdirSync(p, { recursive: true });
}

function writeText(filePath: string, text: string) {
  mkdirp(path.dirname(filePath));
  fs.writeFileSync(filePath, text, "utf8");
}

function copyFile(src: string, dst: string) {
  mkdirp(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

async function listMatchingFiles(dirAbs: string, predicate: (name: string) => boolean): Promise<string[]> {
  if (!fs.existsSync(dirAbs)) return [];
  const out: string[] = [];
  const entries = await fs.promises.readdir(dirAbs, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    if (predicate(ent.name)) out.push(path.join(dirAbs, ent.name));
  }
  return out.sort((a, b) => a.localeCompare(b));
}

function isZipLikeFileName(name: string): boolean {
  // Accept collision-suffixed variants produced on Windows, e.g. ".zip_2" or ".zip-2".
  // Also accept plain ".zip".
  return /\.zip(?:[._-]\d+)?$/i.test(name);
}

async function findExportDirs(auditBase: string, executionId: string): Promise<string[]> {
  if (!fs.existsSync(auditBase)) return [];
  const entries = await fs.promises.readdir(auditBase, { withFileTypes: true });
  const dirs = entries
    .filter((e) => e.isDirectory() && e.name.startsWith(`audit_${executionId}`))
    .map((e) => path.join(auditBase, e.name))
    .sort((a, b) => a.localeCompare(b));
  return dirs;
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
      // ignore malformed
    }
  }
  return null;
}

function findSingleMatchOrThrow(label: string, matches: string[]): string {
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) {
    throw new Error(`Unable to locate ${label}. Run /audit export <execution_id> first, or pass an explicit path.`);
  }
  throw new Error(
    `Multiple ${label} matches found; pass an explicit path.\n` + matches.map((m) => `- ${m}`).join("\n")
  );
}

function normalizePathForPacket(p: string): string {
  // Use forward slashes in README for copy/paste portability.
  return String(p).replace(/\\/g, "/");
}

function buildClerkReadme(opts: {
  execution_id: string;
  run_type: "db" | "page";
  target_id: string;
  bundleZipRel: string;
}): string {
  const { execution_id, run_type, target_id, bundleZipRel } = opts;
  const runDesc = run_type === "db" ? "read-only Notion database snapshot" : "read-only Notion page snapshot";

  return (
    `# Court Packet — ${execution_id}\n\n` +
    `## What this packet is\n` +
    `This folder is an evidence-grade export of a single execution (${execution_id}) whose purpose was a ${runDesc}.\n\n` +
    `## What the run did\n` +
    `- Operation: ${runDesc}\n` +
    `- Target: ${run_type.toUpperCase()} ${target_id}\n` +
    `- External writes: none intended (read-only posture)\n\n` +
    `## Exhibits\n` +
    `- Exhibit A — System Governance (constitution + Tier-6 live safety contract)\n` +
    `- Exhibit B — Run Receipt + Receipt Hash\n` +
    `- Exhibit C — Audit Bundle Zip + Verifier Script\n` +
    `- Exhibit D — Redacted Artifacts (Notion + prestate if present)\n\n` +
    `## Integrity proofs\n` +
    `- Exhibit B contains receipt.json and receipt_hash.txt (SHA-256 of the receipt file).\n` +
    `- Exhibit C contains an audit bundle zip. The zip includes hashes.json and verify.js.\n\n` +
    `## How to verify (one command)\n` +
    `1) Unzip ${bundleZipRel} to a folder (any location).\n` +
    `2) In that unzipped folder, run:\n\n` +
    "```bash\n" +
    "node verify.js\n" +
    "```\n\n" +
    `A successful verification prints an OK result and exits 0.\n`
  );
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    // Print usage and exit 0 for help.
    const rel = "node --import tsx ./scripts/make-court-packet.ts";
    process.stdout.write(
      `Usage:\n` +
        `  ${rel} <execution_id> --run-type <db|page> --target-id <NOTION_ID> [--out <dir>] [--zip <path>] [--export-dir <path>]\n\n` +
        `Notes:\n` +
        `  - Run /audit export <execution_id> first to produce the audit bundle under exports/audit_exec/.\n` +
        `  - If multiple bundles exist for the same execution_id, pass --zip/--export-dir explicitly.\n`
    );
    process.exit(0);
  }

  const execution_id = argv[0] && !argv[0].startsWith("-") ? argv[0] : "";

  const getFlag = (name: string): string | null => {
    const idx = argv.findIndex((a) => a === name);
    if (idx === -1) return null;
    const v = String(argv[idx + 1] ?? "").trim();
    return v ? v : null;
  };

  if (!execution_id) usage();

  const runTypeRaw = getFlag("--run-type");
  const target_id = getFlag("--target-id");

  const run_type = (runTypeRaw === "db" || runTypeRaw === "page" ? runTypeRaw : null) as "db" | "page" | null;
  if (!run_type || !target_id) usage();

  const outRoot =
    getFlag("--out") ||
    path.join(process.cwd(), "exports", "court_packets", `court_packet_${execution_id}`);

  const zipArg = getFlag("--zip");
  const exportDirArg = getFlag("--export-dir");

  const auditBase = path.join(process.cwd(), "exports", "audit_exec");
  const zipMatches = zipArg
    ? [path.resolve(zipArg)]
    : await listMatchingFiles(auditBase, (n) => n.startsWith(`audit_${execution_id}`) && isZipLikeFileName(n));

  const zipAbs = findSingleMatchOrThrow("audit bundle zip", zipMatches);

  const exportDirMatches = exportDirArg
    ? [path.resolve(exportDirArg)]
    : await findExportDirs(auditBase, execution_id);

  const exportDirAbs = findSingleMatchOrThrow("audit bundle directory", exportDirMatches);
  const verifyAbs = path.join(exportDirAbs, "verify.js");
  if (!fs.existsSync(verifyAbs)) {
    throw new Error(`Audit export directory missing verify.js: ${exportDirAbs}`);
  }

  const receipt = readReceiptForExecutionId(execution_id);
  if (!receipt) {
    throw new Error(`No receipt found for execution_id=${execution_id} in runs/receipts.jsonl`);
  }

  // Packet layout
  const exhibitA = path.join(outRoot, "Exhibit_A_System_Governance");
  const exhibitB = path.join(outRoot, "Exhibit_B_Run_Receipt");
  const exhibitC = path.join(outRoot, "Exhibit_C_Audit_Bundle");
  const exhibitD = path.join(outRoot, "Exhibit_D_Artifacts");

  mkdirp(exhibitA);
  mkdirp(exhibitB);
  mkdirp(exhibitC);
  mkdirp(exhibitD);

  // Exhibit A
  const constitutionSrc = path.join(process.cwd(), "docs", "CONSTITUTION.v1.md");
  const tier6SafetySrc = path.join(process.cwd(), "docs", "tier6-live-accounts-safety.md");
  if (!fs.existsSync(constitutionSrc)) throw new Error(`Missing ${constitutionSrc}`);
  if (!fs.existsSync(tier6SafetySrc)) throw new Error(`Missing ${tier6SafetySrc}`);
  copyFile(constitutionSrc, path.join(exhibitA, "CONSTITUTION.v1.md"));
  copyFile(tier6SafetySrc, path.join(exhibitA, "tier6-live-accounts-safety.md"));

  // Exhibit B
  const receiptRedacted = redactJson(receipt);
  const receiptPath = path.join(exhibitB, "receipt.json");
  writeText(receiptPath, stableJsonStringify(receiptRedacted));
  const receiptHash = sha256(Buffer.from(fs.readFileSync(receiptPath)));
  writeText(path.join(exhibitB, "receipt_hash.txt"), receiptHash + "\n");

  // Exhibit C
  const bundleZipName = `audit_bundle_${execution_id}.zip`;
  const bundleZipDst = path.join(exhibitC, bundleZipName);
  copyFile(zipAbs, bundleZipDst);
  copyFile(verifyAbs, path.join(exhibitC, "verify.js"));

  // Third-party verification handoff
  const handoffRoot = path.join(outRoot, "verification_handoff");
  mkdirp(handoffRoot);
  copyFile(zipAbs, path.join(handoffRoot, "audit_bundle.zip"));
  const handoffTemplateRoot = path.join(process.cwd(), "templates", "verification_handoff");
  const handoffReadmeSrc = path.join(handoffTemplateRoot, "README_verify.md");
  const handoffExpectedSrc = path.join(handoffTemplateRoot, "expected_output.json");
  const handoffVerifySrc = path.join(handoffTemplateRoot, "verify.js");
  if (!fs.existsSync(handoffReadmeSrc)) throw new Error(`Missing ${handoffReadmeSrc}`);
  if (!fs.existsSync(handoffExpectedSrc)) throw new Error(`Missing ${handoffExpectedSrc}`);
  if (!fs.existsSync(handoffVerifySrc)) throw new Error(`Missing ${handoffVerifySrc}`);
  copyFile(handoffReadmeSrc, path.join(handoffRoot, "README_verify.md"));
  copyFile(handoffExpectedSrc, path.join(handoffRoot, "expected_output.json"));
  copyFile(handoffVerifySrc, path.join(handoffRoot, "verify.js"));

  // Exhibit D
  const runsRoot = path.join(process.cwd(), "runs");
  const notionDir = path.join(runsRoot, "notion");
  const prestateDir = path.join(runsRoot, "prestate");

  const notionFiles = listMatchingFiles(notionDir, (n) => n.startsWith(`${execution_id}.`) && n.endsWith(".json"));
  const prestateFiles = listMatchingFiles(prestateDir, (n) => n.startsWith(`${execution_id}.`) && n.endsWith(".json"));

  for (const abs of notionFiles) {
    const rel = path.join("runs", "notion", path.basename(abs));
    copyFile(abs, path.join(exhibitD, rel));
  }
  for (const abs of prestateFiles) {
    const rel = path.join("runs", "prestate", path.basename(abs));
    copyFile(abs, path.join(exhibitD, rel));
  }

  // Root README
  const readme = buildClerkReadme({
    execution_id,
    run_type,
    target_id,
    bundleZipRel: normalizePathForPacket(path.relative(outRoot, bundleZipDst)),
  });
  writeText(path.join(outRoot, "00_README_FOR_CLERK.md"), readme);

  process.stdout.write(
    JSON.stringify(
      {
        kind: "CourtPacket",
        execution_id,
        out_dir: normalizePathForPacket(path.resolve(outRoot)),
        exhibits: {
          A: normalizePathForPacket(path.relative(process.cwd(), exhibitA)),
          B: normalizePathForPacket(path.relative(process.cwd(), exhibitB)),
          C: normalizePathForPacket(path.relative(process.cwd(), exhibitC)),
          D: normalizePathForPacket(path.relative(process.cwd(), exhibitD)),
        },
        verification_handoff: normalizePathForPacket(path.relative(process.cwd(), handoffRoot)),
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
