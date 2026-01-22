import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildBinderPacketPdf } from "../src/litigation/binder-pdf.js";
import { getLitigationTemplatePlan } from "../src/litigation/plan.js";
import { buildCoverMd, buildIndexMd } from "../src/litigation/binder.js";

const execFileAsync = promisify(execFile);

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function sha256File(absPath) {
  const buf = await fs.readFile(absPath);
  return sha256Hex(buf);
}

async function fileSize(absPath) {
  const st = await fs.stat(absPath);
  return Number(st.size || 0);
}

async function readTail(absPath, maxBytes) {
  const fh = await fs.open(absPath, "r");
  try {
    const st = await fh.stat();
    const size = Number(st.size || 0);
    const toRead = Math.min(Math.max(0, maxBytes), size);
    const start = Math.max(0, size - toRead);
    const buf = Buffer.alloc(toRead);
    if (toRead === 0) return Buffer.alloc(0);
    await fh.read(buf, 0, toRead, start);
    return buf;
  } finally {
    await fh.close();
  }
}

function stripShaPrefix(s) {
  const raw = String(s || "").trim();
  if (raw.startsWith("sha256:")) return raw.slice("sha256:".length);
  return raw;
}

function exists(absPath) {
  try {
    return fssync.existsSync(absPath);
  } catch {
    return false;
  }
}

function normalizePathForPrint(p) {
  return String(p || "").split(path.sep).join("/");
}

function formatShortHash(hex) {
  const s = String(hex || "").trim();
  if (!s) return "";
  if (s.length <= 16) return s;
  return `${s.slice(0, 8)}…${s.slice(-8)}`;
}

function createReporter({ quiet = false } = {}) {
  const checks = [];
  let failCount = 0;
  let warnCount = 0;

  function push(status, id, message, details) {
    const raw = details && typeof details === "object" ? details : null;
    const code = raw && typeof raw.code === "string" ? String(raw.code) : undefined;
    const cleanDetails = raw && code ? (() => {
      const { code: _code, ...rest } = raw;
      return Object.keys(rest).length ? rest : undefined;
    })() : raw || undefined;
    checks.push({ status, id, code, message, details: cleanDetails });
  }

  function ok(id, message, details) {
    push("ok", id, message, details);
    if (!quiet) process.stdout.write(`OK: ${message}\n`);
  }

  function warn(id, message, details) {
    warnCount += 1;
    push("warn", id, message, details);
    if (!quiet) process.stderr.write(`WARN: ${message}\n`);
  }

  function fail(id, message, details) {
    failCount += 1;
    push("fail", id, message, details);
    if (!quiet) process.stderr.write(`FAIL: ${message}\n`);
  }

  function summary() {
    return { failCount, warnCount, okCount: checks.filter((c) => c.status === "ok").length };
  }

  return { ok, warn, fail, checks, summary };
}

function parseArgs(argv) {
  const args = {
    folder: null,
    strict: false,
    quiet: false,
    json: false,
    printPolicy: false,
    reportPath: null,
    mode: null,
    minExhibits: null,
    maxConcurrency: 8,
    git: false,
    autoFix: false,
    apply: false,
    outDir: null,
    force: false,
    reason: null,
    ticket: null,
    refitOnlyPdf: false,
    minGrade: null,
    failOn: [],
    failOnPolicy: null,
  };

  const takeValue = (i) => {
    if (i + 1 >= argv.length) return { value: null, nextIndex: i };
    return { value: argv[i + 1], nextIndex: i + 1 };
  };

  for (let i = 2; i < argv.length; i += 1) {
    const a = String(argv[i] || "");
    if (a === "--strict") {
      args.strict = true;
      continue;
    }
    if (a === "--quiet") {
      args.quiet = true;
      continue;
    }
    if (a === "--json") {
      args.json = true;
      continue;
    }
    if (a === "--print-policy") {
      args.printPolicy = true;
      // Operator delight: avoid scrolling by default.
      args.quiet = true;
      continue;
    }
    if (a === "--git") {
      args.git = true;
      continue;
    }
    if (a === "--auto-fix") {
      args.autoFix = true;
      continue;
    }
    if (a === "--apply") {
      args.apply = true;
      continue;
    }
    if (a === "--out") {
      const { value, nextIndex } = takeValue(i);
      args.outDir = value ? String(value) : null;
      i = nextIndex;
      continue;
    }
    if (a === "--force") {
      args.force = true;
      continue;
    }
    if (a === "--reason") {
      const { value, nextIndex } = takeValue(i);
      args.reason = value ? String(value) : null;
      i = nextIndex;
      continue;
    }
    if (a === "--ticket") {
      const { value, nextIndex } = takeValue(i);
      args.ticket = value ? String(value) : null;
      i = nextIndex;
      continue;
    }
    if (a === "--refit-only-pdf") {
      args.refitOnlyPdf = true;
      continue;
    }
    if (a === "--min-grade" || a === "--require-grade") {
      const { value, nextIndex } = takeValue(i);
      args.minGrade = value ? String(value) : null;
      i = nextIndex;
      continue;
    }
    if (a === "--fail-on") {
      const { value, nextIndex } = takeValue(i);
      const raw = value ? String(value) : "";
      if (raw) args.failOn.push(raw);
      i = nextIndex;
      continue;
    }
    if (a === "--fail-on-policy") {
      const { value, nextIndex } = takeValue(i);
      args.failOnPolicy = value ? String(value) : null;
      i = nextIndex;
      continue;
    }
    if (a === "--report") {
      const { value, nextIndex } = takeValue(i);
      args.reportPath = value ? String(value) : null;
      i = nextIndex;
      continue;
    }
    if (a === "--mode") {
      const { value, nextIndex } = takeValue(i);
      args.mode = value ? String(value) : null;
      i = nextIndex;
      continue;
    }
    if (a === "--min-exhibits") {
      const { value, nextIndex } = takeValue(i);
      const n = Number(value);
      args.minExhibits = Number.isFinite(n) ? n : null;
      i = nextIndex;
      continue;
    }
    if (a === "--max-concurrency") {
      const { value, nextIndex } = takeValue(i);
      const n = Number(value);
      args.maxConcurrency = Number.isFinite(n) && n > 0 ? Math.floor(n) : args.maxConcurrency;
      i = nextIndex;
      continue;
    }
    if (!args.folder && !a.startsWith("--")) args.folder = a;
  }
  return args;
}

function normalizeFailOnList({ failOn, failOnPolicy }) {
  const list = [];
  for (const entry of Array.isArray(failOn) ? failOn : []) {
    for (const part of String(entry || "").split(",")) {
      const code = String(part || "").trim().toUpperCase();
      if (!code) continue;
      list.push(code);
    }
  }

  const pol = String(failOnPolicy || "").trim().toLowerCase();
  if (pol === "publish") {
    list.push("WARN_GIT_DIRTY", "WARN_NO_GIT_CONTEXT");
  } else if (pol === "strict") {
    list.push("WARN_GIT_DIRTY", "WARN_NO_GIT_CONTEXT", "WARN_PDF_SANITY_WEAK", "WARN_PROVENANCE_MISSING");
  }

  const uniq = Array.from(new Set(list)).filter((c) => /^WARN_[A-Z0-9_]+$/.test(c));
  uniq.sort((a, b) => a.localeCompare(b));
  return uniq;
}

async function readToolVersion(repoRoot) {
  try {
    const pkg = JSON.parse(await fs.readFile(path.join(repoRoot, "package.json"), "utf8"));
    const v = String(pkg?.version || "").trim();
    return v || "unknown";
  } catch {
    return "unknown";
  }
}

function normalizeMinGrade(raw) {
  const s = String(raw || "").trim().toUpperCase();
  if (!s) return null;
  if (s === "A" || s === "GRADE A") return "GRADE A";
  if (s === "B" || s === "GRADE B") return "GRADE B";
  if (s === "C" || s === "GRADE C") return "GRADE C";
  return null;
}

function gradeRank(grade) {
  // Higher is better.
  if (grade === "GRADE A") return 3;
  if (grade === "GRADE B") return 2;
  if (grade === "GRADE C") return 1;
  return 0;
}

function gradeLetter(grade) {
  if (grade === "GRADE A") return "A";
  if (grade === "GRADE B") return "B";
  if (grade === "GRADE C") return "C";
  return null;
}

function formatPolicyHeadline({ grade, policyDecision, clerkSummary }) {
  const pd = policyDecision && typeof policyDecision === "object" ? policyDecision : {};
  const failOn = Array.isArray(pd.failOn) ? pd.failOn : [];
  const triggered = Array.isArray(pd.failOnTriggered) ? pd.failOnTriggered : [];
  const minGrade = pd.minGrade || "∅";

  const parts = [
    String(grade || "").trim(),
    `exit=${pd.exitCode}`,
    String(pd.exitReason || "").trim(),
    `evaluated=${pd.evaluatedState}`,
    `minGrade=${minGrade}`,
    `failOn=[${failOn.join(",")}]`,
  ].filter(Boolean);
  if (triggered.length) parts.push(`triggered=[${triggered.join(",")}]`);

  const line1 = parts.join(" • ");
  const line2 = String(clerkSummary || "").trim();
  return [line1, line2].filter(Boolean).join("\n");
}

function buildClerkSummary(grade) {
  if (grade === "GRADE A") return "GRADE A: Verified: manifest, inputs, and all exhibits match; packet reproducible.";
  if (grade === "GRADE B") return "GRADE B: Verified: manifest matches all present files; inputs missing; not reproducible.";
  return "GRADE C: Not verified: failures detected; see discrepancies.";
}

function computeWarningsByCode(checks) {
  const out = {};
  for (const c of Array.isArray(checks) ? checks : []) {
    if (c?.status !== "warn") continue;
    const k = String(c?.code || "WARN_UNCATEGORIZED");
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

async function listFilesRecursive(rootAbs) {
  const out = [];
  async function walk(dirAbs) {
    const ents = await fs.readdir(dirAbs, { withFileTypes: true });
    for (const ent of ents) {
      const abs = path.join(dirAbs, ent.name);
      if (ent.isDirectory()) await walk(abs);
      else if (ent.isFile()) out.push(normalizePathForPrint(path.relative(rootAbs, abs)));
    }
  }
  await walk(rootAbs);
  out.sort((a, b) => a.localeCompare(b));
  return out;
}

function compareLexNonDecreasing(values) {
  for (let i = 1; i < values.length; i += 1) {
    if (String(values[i - 1]).localeCompare(String(values[i])) > 0) return false;
  }
  return true;
}

async function mapWithConcurrency(items, limit, fn) {
  const max = Math.max(1, Math.floor(limit || 1));
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const i = nextIndex;
      nextIndex += 1;
      if (i >= items.length) return;
      // eslint-disable-next-line no-await-in-loop
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from({ length: Math.min(max, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

async function tryGetGitContext(baseFolder) {
  try {
    const { stdout: top } = await execFileAsync("git", ["-C", baseFolder, "rev-parse", "--show-toplevel"], {
      windowsHide: true,
    });
    const toplevel = String(top || "").trim();
    if (!toplevel) return null;

    const { stdout: headOut } = await execFileAsync("git", ["-C", baseFolder, "rev-parse", "HEAD"], {
      windowsHide: true,
    });
    const head = String(headOut || "").trim();

    const { stdout: statusOut } = await execFileAsync("git", ["-C", baseFolder, "status", "--porcelain"], {
      windowsHide: true,
    });
    const dirty = String(statusOut || "").trim().length > 0;

    return { toplevel: normalizePathForPrint(toplevel), head, dirty };
  } catch {
    return null;
  }
}

function renderMarkdownReport(result) {
  const lines = [];
  lines.push(`# Litigation Packet Verification Report`);
  lines.push("");
  lines.push(`- **Started:** ${result.startedAt}`);
  lines.push(`- **Finished:** ${result.finishedAt}`);
  lines.push(`- **Folder:** ${result.relativeFolder}`);
  lines.push(`- **Strict:** ${result.strict ? "yes" : "no"}`);
  if (result.mode) lines.push(`- **Mode:** ${result.mode}`);
  if (typeof result.minExhibits === "number") lines.push(`- **Min exhibits:** ${result.minExhibits}`);
  if (result.grade) lines.push(`- **Court-Proof Grade:** ${result.grade} — ${result.gradeLabel || ""}`.trim());
  if (result.clerkSummary) lines.push(`- **Clerk Summary:** ${result.clerkSummary}`);
  if (result.verificationId) lines.push(`- **Verification ID:** ${result.verificationId}`);
  if (result.requiredMinGrade) lines.push(`- **Minimum Grade Required:** ${result.requiredMinGrade}`);
  if (Array.isArray(result.failOn) && result.failOn.length) lines.push(`- **Fail-On:** ${result.failOn.join(", ")}`);
  if (Array.isArray(result.failOnTriggered) && result.failOnTriggered.length) lines.push(`- **Fail-On Triggered:** ${result.failOnTriggered.join(", ")}`);
  if (result.exitReason) lines.push(`- **Exit Reason:** ${result.exitReason}`);
  lines.push(`- **Result:** ${result.ok ? "PASS" : "FAIL"}`);
  lines.push("");

  if (result.policyDecision) {
    lines.push(`## Policy Decision`);
    lines.push("");
    lines.push(`- evaluatedState: ${result.policyDecision.evaluatedState}`);
    lines.push(`- minGrade: ${result.policyDecision.minGrade || "(none)"}`);
    lines.push(`- grade: ${result.policyDecision.grade || "(unknown)"}`);
    lines.push(`- failOn: ${(Array.isArray(result.policyDecision.failOn) && result.policyDecision.failOn.length) ? result.policyDecision.failOn.join(", ") : "(none)"}`);
    lines.push(`- failOnTriggered: ${(Array.isArray(result.policyDecision.failOnTriggered) && result.policyDecision.failOnTriggered.length) ? result.policyDecision.failOnTriggered.join(", ") : "(none)"}`);
    lines.push(`- exitCode: ${result.policyDecision.exitCode}`);
    lines.push(`- exitReason: ${result.policyDecision.exitReason}`);
    lines.push("");
  }

  // Pinned, clerk-friendly provenance explanation.
  if (result.provenance) {
    lines.push(`## Provenance Status`);
    lines.push("");
    lines.push(`- packet_input.json: ${result.provenance.packet_input_json}`);
    lines.push(`- packet_input.sha256: ${result.provenance.packet_input_sha256}`);
    if (result.provenance.note) lines.push(`- Note: ${result.provenance.note}`);
    lines.push("");
  }

  if (result.authorityChain) {
    lines.push(`## Authority Chain`);
    lines.push("");
    const a = result.authorityChain;
    if (a.manifest?.sha256) lines.push(`- BINDER_PACKET_MANIFEST.json sha256: ${a.manifest.sha256}`);
    if (a.packet_input_json?.sha256) lines.push(`- packet_input.json sha256: ${a.packet_input_json.sha256}`);
    if (a.packet_pdf?.sha256) lines.push(`- BINDER_PACKET.pdf sha256: ${a.packet_pdf.sha256}`);
    if (a.generated_at) lines.push(`- generated_at: ${a.generated_at}`);
    if (a.git?.head) lines.push(`- git HEAD: ${a.git.head}${a.git.dirty ? " (DIRTY)" : ""}`);
    lines.push("");
  }

  if (result.git) {
    lines.push(`## Version Control`);
    lines.push("");
    lines.push(`- **Repo:** ${result.git.toplevel}`);
    lines.push(`- **HEAD:** ${result.git.head}`);
    lines.push(`- **Dirty:** ${result.git.dirty ? "yes" : "no"}`);
    lines.push("");
  }

  if (Array.isArray(result.fixPlan) && result.fixPlan.length) {
    lines.push(`## Fix Plan`);
    lines.push("");
    for (const a of result.fixPlan) {
      const status = a.allowed ? "ALLOWED" : "BLOCKED";
      lines.push(`- **${status}** ${a.action} — ${a.reasonCode}`);
      if (a.details) {
        for (const [k, v] of Object.entries(a.details)) {
          if (v === undefined) continue;
          lines.push(`  - ${k}: ${String(v)}`);
        }
      }
    }
    lines.push("");
  }

  if (result.exhibits && result.exhibits.length) {
    lines.push(`## Exhibits`);
    lines.push("");
    lines.push(`| Exhibit | File | SHA-256 |`);
    lines.push(`|---|---|---|`);
    for (const ex of result.exhibits) {
      const exCode = ex.exhibit || "";
      const file = ex.artifactFile || "";
      const sha = ex.sha256 || "";
      lines.push(`| ${exCode} | ${file} | ${sha} |`);
    }
    lines.push("");
  }

  lines.push(`## Checks`);
  lines.push("");
  for (const c of result.checks) {
    const prefix = c.status === "ok" ? "OK" : c.status === "warn" ? "WARN" : "FAIL";
    lines.push(`- **${prefix}** ${c.message}`);
    if (c.details) {
      lines.push(`  - id: ${c.id}`);
      for (const [k, v] of Object.entries(c.details)) {
        if (v === undefined) continue;
        lines.push(`  - ${k}: ${String(v)}`);
      }
    }
  }
  lines.push("");
  return lines.join("\n");
}

function isoCompact(ts) {
  return String(ts)
    .replace(/[:.]/g, "")
    .replace(/Z$/, "Z")
    .replace(/-/, "")
    .replace(/-/, "")
    .replace(/T/, "T");
}

function stampYmdHms() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const y = d.getUTCFullYear();
  const m = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mm = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${y}${m}${day}_${hh}${mm}${ss}`;
}

function normalizeMode(mode) {
  const m = String(mode || "").trim().toLowerCase();
  if (m === "dev") return "dev";
  if (m === "testing") return "testing";
  if (m === "evidence") return "evidence";
  return "evidence";
}

async function sha256FileIfExists(absPath) {
  if (!exists(absPath)) return null;
  try {
    return await sha256File(absPath);
  } catch {
    return null;
  }
}

async function snapshotKeyHashes(base, manifest) {
  const out = {
    cover: await sha256FileIfExists(path.join(base, "BINDER_COVER.md")),
    index: await sha256FileIfExists(path.join(base, "BINDER_INDEX.md")),
    packet_pdf: await sha256FileIfExists(path.join(base, "BINDER_PACKET.pdf")),
    manifest: await sha256FileIfExists(path.join(base, "BINDER_PACKET_MANIFEST.json")),
    packet_input: await sha256FileIfExists(path.join(base, "packet_input.json")),
  };
  const exhibits = Array.isArray(manifest?.exhibits) ? manifest.exhibits : [];
  out.exhibits = [];
  for (const ex of exhibits) {
    const file = String(ex?.artifactFile || "").trim();
    const code = String(ex?.exhibit || "").trim();
    if (!file) continue;
    // eslint-disable-next-line no-await-in-loop
    const sha = await sha256FileIfExists(path.join(base, file));
    out.exhibits.push({ exhibit: code, file, sha256: sha });
  }
  return out;
}

function verifyExitFromSummary(summary) {
  const failCount = Number(summary?.failCount || 0);
  const warnCount = Number(summary?.warnCount || 0);
  if (failCount > 0) return 3;
  if (warnCount > 0) return 2;
  return 0;
}

function buildIndexJsonFromManifest(manifest) {
  const exhibits = Array.isArray(manifest?.exhibits) ? manifest.exhibits : [];
  return {
    kind: "LITIGATION_PACKET_INDEX_V1",
    case_id: manifest?.case_id ?? null,
    generated_at: manifest?.generated_at ?? null,
    jurisdictionKey: manifest?.jurisdictionKey ?? null,
    venueKey: manifest?.venueKey ?? null,
    selection: manifest?.selection ?? null,
    outputs: manifest?.outputs ?? null,
    exhibits: exhibits.map((x) => ({
      exhibit: String(x?.exhibit || "").trim() || null,
      kind: x?.kind ?? null,
      title: x?.title ?? null,
      artifactFile: x?.artifactFile ?? null,
      sha256: x?.sha256 ?? null,
      templatePath: x?.templatePath ?? null,
    })),
  };
}

async function regenPacketPdfFromExistingSources({ base, manifest, outPdfPath }) {
  const coverText = await fs.readFile(path.join(base, "BINDER_COVER.md"), "utf8");
  const indexText = await fs.readFile(path.join(base, "BINDER_INDEX.md"), "utf8");
  const exhibits = Array.isArray(manifest?.exhibits) ? manifest.exhibits : [];

  const sections = [];
  sections.push({ title: "BINDER COVER", text: coverText });
  sections.push({ title: "BINDER INDEX", text: indexText });

  for (const ex of exhibits) {
    const code = String(ex?.exhibit || "").trim();
    const title = String(ex?.title || "").trim();
    const file = String(ex?.artifactFile || "").trim();
    if (!file) continue;

    const abs = path.join(base, file);
    let text = `# ${title}\n\n(Missing: ${file})\n`;
    if (exists(abs)) {
      // eslint-disable-next-line no-await-in-loop
      text = await fs.readFile(abs, "utf8");
    }

    sections.push({ title: `${code} — ${title}`.trim(), text });
  }

  await buildBinderPacketPdf({ sections, outPath: outPdfPath });
}

async function maybeReadPacketInput(base) {
  const p = path.join(base, "packet_input.json");
  if (!exists(p)) return { ok: false, reason: "missing" };
  try {
    const raw = await fs.readFile(p, "utf8");
    const obj = JSON.parse(raw);
    return { ok: true, raw, obj, sha256: sha256Hex(Buffer.from(raw, "utf8")) };
  } catch (e) {
    return { ok: false, reason: `parse_error:${String(e?.message || e)}` };
  }
}

async function regenCoverFromPacketInput({ outDir, packetInput, manifest }) {
  const plan = getLitigationTemplatePlan(packetInput.obj);
  // Safe determinism rule: when regenerating from an existing manifest, treat manifest.generated_at as authoritative.
  const generatedAt = String(manifest?.generated_at || "").trim() || null;
  const coverMd = buildCoverMd(packetInput.obj, plan, generatedAt);
  await fs.writeFile(path.join(outDir, "BINDER_COVER.md"), coverMd, "utf8");
}

async function regenIndexFromPacketInput({ outDir, packetInput, manifest }) {
  const plan = getLitigationTemplatePlan(packetInput.obj);
  // Safe determinism rule: when regenerating from an existing manifest, treat manifest.generated_at as authoritative.
  const generatedAt = String(manifest?.generated_at || "").trim() || null;

  // Build rows compatible with the existing manifest exhibit list.
  const rows = Array.isArray(manifest?.exhibits)
    ? manifest.exhibits.map((ex) => {
        const code = String(ex?.exhibit || "").trim();
        const file = String(ex?.artifactFile || "").trim();
        const title = String(ex?.title || "").trim();
        return { code, file, title, status: exists(path.join(outDir, file)) ? "READY" : "MISSING", sha256: null };
      })
    : [];

  for (const r of rows) {
    const abs = path.join(outDir, r.file);
    if (!exists(abs)) continue;
    // eslint-disable-next-line no-await-in-loop
    r.sha256 = await sha256File(abs);
  }

  // buildIndexMd expects binder-style row shape; pass minimal fields it reads.
  const binderRows = rows.map((r) => ({ code: r.code, title: r.title, file: r.file, status: r.status, sha256: r.sha256 }));
  const indexMd = buildIndexMd(packetInput.obj, binderRows, generatedAt);
  await fs.writeFile(path.join(outDir, "BINDER_INDEX.md"), indexMd, "utf8");
}

function computeFixPlan({ base, manifest, strict, reporterChecks, mode, packetInput, refitOnlyPdf }) {
  const fixes = [];
  const m = normalizeMode(mode);

  const hasManifest = exists(path.join(base, "BINDER_PACKET_MANIFEST.json"));
  const hasCover = exists(path.join(base, "BINDER_COVER.md"));
  const hasIndex = exists(path.join(base, "BINDER_INDEX.md"));
  const hasPdf = exists(path.join(base, "BINDER_PACKET.pdf"));

  const pdfOnly = Boolean(refitOnlyPdf);

  const exhibitFiles = Array.isArray(manifest?.exhibits) ? manifest.exhibits.map((x) => String(x?.artifactFile || "").trim()).filter(Boolean) : [];
  const missingExhibit = exhibitFiles.find((f) => !exists(path.join(base, f))) || null;

  // Policy: only regenerate derived artifacts when missing (never "fix" a mismatch).
  const needsPdf = !hasPdf;
  if (needsPdf) {
    const allowed = hasManifest && hasCover && hasIndex && !missingExhibit;
    fixes.push({
      kind: "action",
      action: "REGENERATE_PACKET_PDF",
      target: "BINDER_PACKET.pdf",
      reasonCode: "DERIVED_MISSING",
      allowed,
      policyMode: m,
      details: {
        expectedSha256: stripShaPrefix(manifest?.outputs?.packet_pdf?.sha256) || null,
        requires: "BINDER_COVER.md + BINDER_INDEX.md + exhibit files (from manifest)",
        blockedBecause: !allowed
          ? !hasManifest
            ? "manifest missing"
            : !hasCover
              ? "cover missing"
              : !hasIndex
                ? "index missing"
                : missingExhibit
                  ? `missing exhibit file: ${missingExhibit}`
                  : "unknown"
          : null,
      },
    });
  }

  if (pdfOnly) return fixes;

  if (!hasCover) {
    const allowed = hasManifest && packetInput?.ok;
    fixes.push({
      kind: "action",
      action: "REGENERATE_COVER_MD",
      target: "BINDER_COVER.md",
      reasonCode: "DERIVED_MISSING",
      allowed,
      policyMode: m,
      details: {
        expectedSha256: stripShaPrefix(manifest?.outputs?.cover?.sha256) || null,
        inputs: packetInput?.ok ? "packet_input.json + manifest.generated_at" : "(blocked: packet_input missing/unparseable)",
        blockedBecause: !allowed ? (!hasManifest ? "manifest missing" : "packet_input missing/unparseable") : null,
      },
    });
  }

  if (!hasIndex) {
    const allowed = hasManifest && packetInput?.ok;
    fixes.push({
      kind: "action",
      action: "REGENERATE_INDEX_MD",
      target: "BINDER_INDEX.md",
      reasonCode: "DERIVED_MISSING",
      allowed,
      policyMode: m,
      details: {
        expectedSha256: stripShaPrefix(manifest?.outputs?.index?.sha256) || null,
        inputs: packetInput?.ok ? "packet_input.json + manifest.exhibits + exhibit files" : "(blocked: packet_input missing/unparseable)",
        blockedBecause: !allowed ? (!hasManifest ? "manifest missing" : "packet_input missing/unparseable") : null,
      },
    });
  }

  const indexJsonPath = path.join(base, "index.json");
  if (!exists(indexJsonPath)) {
    const allowed = hasManifest;
    fixes.push({
      kind: "action",
      action: "REGENERATE_INDEX_JSON",
      target: "index.json",
      reasonCode: strict ? "DERIVED_FILE_MISSING_STRICT" : "DERIVED_FILE_MISSING",
      allowed,
      policyMode: m,
      details: {
        derivesFrom: "BINDER_PACKET_MANIFEST.json (no template/input mutation)",
        blockedBecause: allowed ? null : "manifest missing",
      },
    });
  }

  // Missing packet_input.* is never auto-created (policy: no rewriting inputs).
  const inputJsonMissing = !exists(path.join(base, "packet_input.json"));
  const inputShaMissing = !exists(path.join(base, "packet_input.sha256"));
  if (inputJsonMissing || inputShaMissing) {
    fixes.push({
      kind: "note",
      action: "NOOP_PACKET_INPUT",
      target: "packet_input.*",
      reasonCode: "INPUT_MISSING",
      allowed: false,
      policyMode: m,
      details: {
        note: "packet_input.* is treated as evidence input and is never synthesized in auto-fix.",
        missing: [inputJsonMissing ? "packet_input.json" : null, inputShaMissing ? "packet_input.sha256" : null].filter(Boolean).join(", "),
      },
    });
  }

  return fixes;
}

async function writeFixLogs({ outDir, fixLog }) {
  const jsonPath = path.join(outDir, "FIX_LOG.json");
  const mdPath = path.join(outDir, "FIX_LOG.md");
  await fs.writeFile(jsonPath, `${JSON.stringify(fixLog, null, 2)}\n`, "utf8");

  const lines = [];
  lines.push(`# Fix Log`);
  lines.push("");
  lines.push(`- **Started:** ${fixLog.startedAt}`);
  lines.push(`- **Finished:** ${fixLog.finishedAt}`);
  lines.push(`- **From:** ${fixLog.from.relative}`);
  lines.push(`- **To:** ${fixLog.to.relative}`);
  lines.push(`- **Mode:** ${fixLog.mode}`);
  if (fixLog.gradeBefore) lines.push(`- **Court-Proof Grade (before):** ${fixLog.gradeBefore} — ${fixLog.gradeBeforeLabel || ""}`.trim());
  if (fixLog.gradeAfter) lines.push(`- **Court-Proof Grade (after):** ${fixLog.gradeAfter} — ${fixLog.gradeAfterLabel || ""}`.trim());
  lines.push("");

  if (fixLog.provenance) {
    lines.push(`## Provenance Status`);
    lines.push("");
    lines.push(`- packet_input.json: ${fixLog.provenance.packet_input_json}`);
    lines.push(`- packet_input.sha256: ${fixLog.provenance.packet_input_sha256}`);
    if (fixLog.provenance.note) lines.push(`- Note: ${fixLog.provenance.note}`);
    lines.push("");
  }

  if (fixLog.noSurprises || fixLog.filesCreated || typeof fixLog.filesUnchangedCount === "number") {
    lines.push(`## No Surprises`);
    lines.push("");
    lines.push(`- Original folder untouched: ${fixLog.noSurprises?.originalUntouched ? "YES" : "(unknown)"}`);
    if (fixLog.noSurprises?.cloneCreatedAt) lines.push(`- Clone created at: ${fixLog.noSurprises.cloneCreatedAt}`);
    if (Array.isArray(fixLog.filesCreated) && fixLog.filesCreated.length) {
      lines.push(`- Files created: ${fixLog.filesCreated.join(", ")}`);
    } else {
      lines.push(`- Files created: (none)`);
    }
    if (typeof fixLog.filesUnchangedCount === "number") lines.push(`- Files unchanged: ${fixLog.filesUnchangedCount}`);
    lines.push("");
  }

  lines.push(`## Actions`);
  lines.push("");
  for (const a of fixLog.actions) {
    lines.push(`- **${a.status}** ${a.action} — ${a.reasonCode}`);
    if (a.details) {
      for (const [k, v] of Object.entries(a.details)) {
        if (v === undefined) continue;
        lines.push(`  - ${k}: ${String(v)}`);
      }
    }
  }
  lines.push("");
  lines.push(`## Hashes`);
  lines.push("");
  lines.push(`### Before`);
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(fixLog.beforeHashes, null, 2));
  lines.push("```");
  lines.push("");
  lines.push(`### After`);
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(fixLog.afterHashes, null, 2));
  lines.push("```");
  lines.push("");
  await fs.writeFile(mdPath, `${lines.join("\n")}\n`, "utf8");
}

async function runVerifierJson({ repoRoot, folder, strict, mode, minExhibits, maxConcurrency, git }) {
  const scriptPath = path.join(repoRoot, "scripts", "verify-litigation-packet.mjs");
  const args = [
    scriptPath,
    folder,
    "--json",
    "--quiet",
    "--max-concurrency",
    String(maxConcurrency || 8),
  ];
  if (strict) args.push("--strict");
  if (git) args.push("--git");
  if (mode) args.push("--mode", String(mode));
  if (typeof minExhibits === "number") args.push("--min-exhibits", String(minExhibits));

  try {
    const { stdout } = await execFileAsync(process.execPath, args, { windowsHide: true, maxBuffer: 10 * 1024 * 1024 });
    return { ok: true, result: JSON.parse(String(stdout || "{}")) };
  } catch (e) {
    const stdout = String(e?.stdout || "");
    try {
      return { ok: false, result: JSON.parse(stdout || "{}"), error: String(e?.message || e) };
    } catch {
      return { ok: false, result: null, error: String(e?.message || e) };
    }
  }
}

function decideExit({
  summary,
  autoFix,
  apply,
  fixPlan,
  fixBlocked,
  minGrade,
  intrinsicFailCount,
  minGradeNotMet,
  failOnTriggered,
}) {
  const failCount = Number(summary?.failCount || 0);
  const warnCount = Number(summary?.warnCount || 0);
  const triggered = Array.isArray(failOnTriggered) ? failOnTriggered : [];
  const intrinsicFails = Number(intrinsicFailCount || 0);

  // Order matters: we want exitReason to reflect the primary cause.
  if (intrinsicFails > 0) return { exitCode: 3, exitReason: "FAILURES" };
  if (minGradeNotMet) return { exitCode: 3, exitReason: "MIN_GRADE_NOT_MET" };
  if (triggered.length) return { exitCode: 3, exitReason: "FAIL_ON_TRIGGERED" };

  const minGradeNorm = normalizeMinGrade(minGrade);

  if (!autoFix) {
    // CI gating: when a minimum grade is specified and gates are satisfied,
    // warnings do not fail the run.
    if (minGradeNorm) return { exitCode: 0, exitReason: "OK" };
    if (warnCount > 0) return { exitCode: 2, exitReason: "WARNINGS" };
    return { exitCode: 0, exitReason: "OK" };
  }

  const issuesExist = failCount > 0 || warnCount > 0;
  const fixAvailable = Array.isArray(fixPlan) ? fixPlan.some((a) => a.kind === "action" && a.allowed) : false;

  if (!apply) {
    if (!issuesExist) return { exitCode: 0, exitReason: "OK" };
    if (fixAvailable) return { exitCode: 4, exitReason: "FIX_AVAILABLE" };
    const v = verifyExitFromSummary(summary);
    return { exitCode: v, exitReason: v === 2 ? "WARNINGS" : v === 3 ? "FAILURES" : "OK" };
  }

  if (fixBlocked) return { exitCode: 5, exitReason: "AUTOFIX_BLOCKED" };
  if (minGradeNorm) return { exitCode: 0, exitReason: "OK" };
  if (warnCount > 0) return { exitCode: 2, exitReason: "WARNINGS" };
  return { exitCode: 0, exitReason: "OK" };
}

function computeCourtProofGrade({ summary, checks }) {
  const failCount = Number(summary?.failCount || 0);
  if (failCount > 0) {
    return { grade: "GRADE C", label: "Incomplete / Needs Review" };
  }

  const inputJsonMissing = checks.some(
    (c) => (c.id === "recommended_file_missing" || c.id === "recommended_file_missing_strict") && c.details?.file === "packet_input.json",
  );
  const inputShaMissing = checks.some(
    (c) => (c.id === "recommended_file_missing" || c.id === "recommended_file_missing_strict") && c.details?.file === "packet_input.sha256",
  );
  const inputSkipped = checks.some((c) => c.id === "packet_input_missing" && c.status === "warn");
  const inputHashOk = checks.some((c) => c.id === "packet_input_hash" && c.status === "ok");

  if (!inputJsonMissing && !inputShaMissing && !inputSkipped && inputHashOk) {
    return { grade: "GRADE A", label: "Reproducible + Verifiable" };
  }

  if (inputJsonMissing || inputShaMissing || inputSkipped) {
    return { grade: "GRADE B", label: "Verifiable but not Reproducible" };
  }

  // Default if packet_input exists but wasn't verified (should be rare).
  return { grade: "GRADE B", label: "Verifiable but not Reproducible" };
}

function computeProvenanceStatus({ checks }) {
  const jsonMissing = checks.some(
    (c) => (c.id === "recommended_file_missing" || c.id === "recommended_file_missing_strict") && c.details?.file === "packet_input.json",
  );
  const shaMissing = checks.some(
    (c) => (c.id === "recommended_file_missing" || c.id === "recommended_file_missing_strict") && c.details?.file === "packet_input.sha256",
  );
  const hashOk = checks.some((c) => c.id === "packet_input_hash" && c.status === "ok");
  const hashFail = checks.some((c) => c.id === "packet_input_hash" && c.status === "fail");
  const skipped = checks.some((c) => c.id === "packet_input_missing" && c.status === "warn");

  const packet_input_json = jsonMissing ? "MISSING" : "PRESENT";
  const packet_input_sha256 = shaMissing ? "MISSING" : "PRESENT";

  let note = null;
  if (jsonMissing || shaMissing || skipped) {
    note = "Reproducibility degraded. Packet can be verified only to the extent that the manifest covers present files.";
  } else if (hashFail) {
    note = "packet_input hash mismatch. Provenance is compromised; manual review required.";
  } else if (hashOk) {
    note = "packet_input verified. Reproducibility story is complete.";
  }

  return { packet_input_json, packet_input_sha256, note };
}

async function main() {
  const {
    folder,
    strict,
    quiet,
    json,
    printPolicy,
    reportPath,
    mode,
    minExhibits,
    maxConcurrency,
    git,
    autoFix,
    apply,
    outDir,
    force,
    reason,
    ticket,
    refitOnlyPdf,
    minGrade,
    failOn: rawFailOn,
    failOnPolicy,
  } = parseArgs(process.argv);

  // In --json mode, suppress streaming logs to keep stdout valid JSON.
  const reporter = createReporter({ quiet: Boolean(json || quiet) });
  const repoRoot = process.cwd();
  const toolVersion = await readToolVersion(repoRoot);

  const failOn = normalizeFailOnList({ failOn: rawFailOn, failOnPolicy });

  // No surprises: if git-related fail-on codes are requested, implicitly enable --git.
  const wantsGitFailOn = failOn.includes("WARN_GIT_DIRTY") || failOn.includes("WARN_NO_GIT_CONTEXT");
  const effectiveGit = Boolean(git || wantsGitFailOn);

  const base = folder
    ? path.resolve(repoRoot, folder)
    : path.resolve(repoRoot, "artifacts", "SELFTEST-NJ-ESSEX-0001", "litigation");

  const startedAt = new Date().toISOString();
  const relativeFolder = normalizePathForPrint(path.relative(repoRoot, base));

  if (!quiet && !json) process.stdout.write(`OK: Verifying folder: ${relativeFolder}\n`);

  const required = [
    "BINDER_PACKET_MANIFEST.json",
    "BINDER_COVER.md",
    "BINDER_INDEX.md",
    "BINDER_PACKET.pdf",
  ];

  if (refitOnlyPdf) {
    reporter.ok("_refit_only_pdf", "Auto-fix scope constrained: PDF only.");
  }

  const optionalButRecommended = ["packet_input.json", "packet_input.sha256"];

  for (const f of required) {
    const p = path.join(base, f);
    if (!exists(p)) reporter.fail("required_file_missing", `Missing required file: ${f}`, { file: f });
    else reporter.ok("required_file_present", `Required file present: ${f}`, { file: f });
  }

  for (const f of optionalButRecommended) {
    const p = path.join(base, f);
    if (!exists(p)) {
      if (strict) reporter.fail("recommended_file_missing_strict", `Missing required file (strict): ${f}`, { file: f });
      else {
        const isProvenance = f === "packet_input.json" || f === "packet_input.sha256";
        reporter.warn("recommended_file_missing", `Missing recommended file: ${f}`, { file: f, code: isProvenance ? "WARN_PROVENANCE_MISSING" : "WARN_OPTIONAL_MISSING" });
      }
    } else {
      reporter.ok("recommended_file_present", `Recommended file present: ${f}`, { file: f });
    }
  }

  // Basic integrity checks for required files (non-empty)
  await mapWithConcurrency(
    required
      .map((f) => ({ file: f, abs: path.join(base, f) }))
      .filter((x) => exists(x.abs)),
    maxConcurrency,
    async ({ file: f, abs }) => {
      const size = await fileSize(abs);
      if (size <= 0) reporter.fail("file_empty", `File is empty: ${f}`, { file: f, size });
      else reporter.ok("file_nonempty", `File is non-empty: ${f}`, { file: f, size });

      if (f.toLowerCase().endsWith(".pdf")) {
        const head = await fs.readFile(abs, { encoding: null, flag: "r" }).then((b) => b.subarray(0, 8));
        const headStr = head.toString("latin1");
        if (!headStr.startsWith("%PDF")) {
          reporter.fail("pdf_header", `PDF header missing %PDF: ${f}`, { file: f, head: headStr });
        } else {
          reporter.ok("pdf_header", `PDF header ok: ${f}`, { file: f });
        }

        const tail = await readTail(abs, 2048);
        const tailStr = tail.toString("latin1");
        if (!tailStr.includes("%%EOF")) {
          reporter.warn("pdf_eof", `PDF missing %%EOF marker near end: ${f}`, { file: f, code: "WARN_PDF_SANITY_WEAK" });
        } else {
          reporter.ok("pdf_eof", `PDF EOF marker present: ${f}`, { file: f });
        }
      }
    },
  );

  let manifest;
  try {
    manifest = JSON.parse(await fs.readFile(path.join(base, "BINDER_PACKET_MANIFEST.json"), "utf8"));
  } catch (e) {
    reporter.fail("manifest_parse", `Cannot parse BINDER_PACKET_MANIFEST.json: ${String(e?.message || e)}`);
    manifest = null;
  }

  const packetInput = await maybeReadPacketInput(base);

  const exhibits = Array.isArray(manifest?.exhibits) ? manifest.exhibits : [];

  const effectiveMin =
    typeof minExhibits === "number"
      ? minExhibits
      : mode && String(mode).toLowerCase() === "testing"
        ? 1
        : 7;

  if (exhibits.length < effectiveMin) {
    reporter.fail("manifest_exhibit_count", `Expected >= ${effectiveMin} exhibits in manifest, got ${exhibits.length}`, {
      min: effectiveMin,
      got: exhibits.length,
    });
  } else {
    reporter.ok("manifest_exhibit_count", `Manifest exhibits: ${exhibits.length}`, { count: exhibits.length });
  }

  const exhibitCodes = exhibits.map((x) => String(x?.exhibit || "").trim()).filter(Boolean);
  if (exhibitCodes.length !== exhibits.length) {
    reporter.warn("manifest_missing_exhibit_code", "One or more exhibits missing 'exhibit' code in manifest.", {
      exhibits: exhibits.length,
      exhibitCodes: exhibitCodes.length,
    });
  }
  if (exhibitCodes.length && !compareLexNonDecreasing(exhibitCodes)) {
    reporter.fail("exhibit_order", "Exhibit ordering is not non-decreasing by exhibit code.", {
      firstOutOfOrder: (() => {
        for (let i = 1; i < exhibitCodes.length; i += 1) {
          if (String(exhibitCodes[i - 1]).localeCompare(String(exhibitCodes[i])) > 0) {
            return `${exhibitCodes[i - 1]} > ${exhibitCodes[i]}`;
          }
        }
        return null;
      })(),
    });
  } else {
    reporter.ok("exhibit_order", "Exhibit ordering is stable (lex non-decreasing).", {
      count: exhibitCodes.length,
    });
  }

  // Verify cover/index/pdF hashes
  const outputs = manifest?.outputs || {};
  const coverHash = stripShaPrefix(outputs?.cover?.sha256);
  const indexHash = stripShaPrefix(outputs?.index?.sha256);
  const pdfHash = stripShaPrefix(outputs?.packet_pdf?.sha256);

  if (coverHash) {
    const coverPath = path.join(base, "BINDER_COVER.md");
    if (!exists(coverPath)) {
      reporter.fail("cover_missing", "Cover file missing (cannot verify hash).", { file: "BINDER_COVER.md" });
    } else {
      const got = await sha256File(coverPath);
    if (got !== coverHash) {
      reporter.fail("cover_hash", "Cover hash mismatch.", {
        expected: coverHash,
        actual: got,
        expectedShort: formatShortHash(coverHash),
        actualShort: formatShortHash(got),
      });
    } else {
      reporter.ok("cover_hash", "Cover SHA-256 matches.", { sha256: got });
    }
    }
  } else {
    reporter.warn("cover_hash_missing", "Manifest missing outputs.cover.sha256");
  }

  if (indexHash) {
    const indexPath = path.join(base, "BINDER_INDEX.md");
    if (!exists(indexPath)) {
      reporter.fail("index_missing", "Index file missing (cannot verify hash).", { file: "BINDER_INDEX.md" });
    } else {
      const got = await sha256File(indexPath);
    if (got !== indexHash) {
      reporter.fail("index_hash", "Index hash mismatch.", {
        expected: indexHash,
        actual: got,
        expectedShort: formatShortHash(indexHash),
        actualShort: formatShortHash(got),
      });
    } else {
      reporter.ok("index_hash", "Index SHA-256 matches.", { sha256: got });
    }
    }
  } else {
    reporter.warn("index_hash_missing", "Manifest missing outputs.index.sha256");
  }

  if (outputs?.packet_pdf && pdfHash) {
    const pdfPath = path.join(base, "BINDER_PACKET.pdf");
    if (!exists(pdfPath)) {
      reporter.fail("packet_pdf_missing", "Packet PDF file missing (cannot verify hash).", { file: "BINDER_PACKET.pdf" });
    } else {
      const got = await sha256File(pdfPath);
    if (got !== pdfHash) {
      reporter.fail("packet_pdf_hash", "Packet PDF hash mismatch.", {
        expected: pdfHash,
        actual: got,
        expectedShort: formatShortHash(pdfHash),
        actualShort: formatShortHash(got),
      });
    } else {
      reporter.ok("packet_pdf_hash", "Packet PDF SHA-256 matches.", { sha256: got });
    }
    }
  } else {
    reporter.warn("packet_pdf_hash_missing", "Manifest missing outputs.packet_pdf.sha256 (packet PDF not asserted)");
  }

  // Verify exhibit hashes and existence (with concurrency limit)
  await mapWithConcurrency(
    exhibits.map((ex) => {
      const file = String(ex?.artifactFile || "").trim();
      const title = String(ex?.title || "").trim();
      const code = String(ex?.exhibit || "").trim();
      const expected = stripShaPrefix(ex?.sha256);
      return { file, title, code, expected };
    }),
    maxConcurrency,
    async ({ file, title, code, expected }) => {
      const label = code || title || file || "(untitled)";
      if (!file) {
        reporter.fail("exhibit_manifest_file", `Exhibit missing artifactFile in manifest: ${label}`, { exhibit: code, title });
        return;
      }

      const abs = path.join(base, file);
      if (!exists(abs)) {
        reporter.fail("exhibit_missing_file", `Missing exhibit file: ${file} (${label})`, { file, exhibit: code, title });
        return;
      }

      const size = await fileSize(abs);
      if (size <= 0) {
        reporter.fail("exhibit_empty", `Exhibit file is empty: ${file} (${label})`, { file, exhibit: code, size });
        return;
      }

      if (!expected) {
        reporter.fail("exhibit_missing_hash", `Missing sha256 for exhibit ${code || file}`, { file, exhibit: code, title });
        return;
      }

      const got = await sha256File(abs);
      if (got !== expected) {
        reporter.fail("exhibit_hash", `Exhibit hash mismatch: ${label}`, {
          exhibit: code,
          file,
          expected,
          actual: got,
          expectedShort: formatShortHash(expected),
          actualShort: formatShortHash(got),
        });
      } else {
        reporter.ok("exhibit_hash", `Exhibit SHA-256 matches: ${label}`, { exhibit: code, file, sha256: got, size });
      }
    },
  );
  reporter.ok("exhibit_hashes_complete", "Exhibit SHA-256 verification complete.");

  // Verify packet_input.sha256 matches packet_input.json (when present)
  const inputJsonPath = path.join(base, "packet_input.json");
  const inputShaPath = path.join(base, "packet_input.sha256");
  if (exists(inputJsonPath) && exists(inputShaPath)) {
    try {
      const inputJson = await fs.readFile(inputJsonPath);
      const expected = stripShaPrefix(await fs.readFile(inputShaPath, "utf8"));
      const got = sha256Hex(inputJson);
      if (got !== expected.trim()) {
        reporter.fail("packet_input_hash", "packet_input hash mismatch.", {
          expected: expected.trim(),
          actual: got,
          expectedShort: formatShortHash(expected.trim()),
          actualShort: formatShortHash(got),
        });
      } else {
        reporter.ok("packet_input_hash", "packet_input SHA-256 matches.", { sha256: got });
      }
    } catch (e) {
      reporter.fail("packet_input_error", `packet_input verification failed: ${String(e?.message || e)}`);
    }
  } else if (strict) {
    reporter.fail("packet_input_missing_strict", "packet_input files missing (strict mode)");
  } else {
    reporter.warn("packet_input_missing", "packet_input verification skipped (files missing)", { code: "WARN_PROVENANCE_MISSING" });
  }

  // Optional: check index.json presence
  const indexJsonPath = path.join(base, "index.json");
  if (exists(indexJsonPath)) reporter.ok("index_json", "index.json present (stronger reproducibility bundle).", { file: "index.json" });
  else if (strict) reporter.fail("index_json_missing_strict", "index.json missing (strict mode)", { file: "index.json" });
  else reporter.warn("index_json_missing", "index.json missing (optional but recommended)", { file: "index.json", code: "WARN_OPTIONAL_MISSING" });

  const gitContext = effectiveGit ? await tryGetGitContext(base) : null;
  if (effectiveGit && !gitContext) reporter.warn("git_context", "Git context unavailable (not a git worktree here, or git not installed)", { code: "WARN_NO_GIT_CONTEXT" });
  else if (gitContext) {
    reporter.ok("git_context", "Git context captured.", gitContext);
    if (gitContext.dirty) reporter.warn("git_dirty", "Git worktree is dirty (uncommitted changes).", { code: "WARN_GIT_DIRTY" });
  }

  const finishedAt = new Date().toISOString();
  const intrinsicSummary = reporter.summary();
  const intrinsicFailCount = Number(intrinsicSummary?.failCount || 0);
  const fixPlan = autoFix
    ? computeFixPlan({ base, manifest, strict, reporterChecks: reporter.checks, mode, packetInput, refitOnlyPdf })
    : [];
  const gradeInfo = computeCourtProofGrade({ summary: intrinsicSummary, checks: reporter.checks });
  const provenance = computeProvenanceStatus({ checks: reporter.checks });

  const requiredMinGrade = normalizeMinGrade(minGrade);
  const minGradeNotMet = Boolean(requiredMinGrade && gradeRank(gradeInfo.grade) < gradeRank(requiredMinGrade));
  if (requiredMinGrade && gradeRank(gradeInfo.grade) < gradeRank(requiredMinGrade)) {
    // Gate failure: keep intrinsic grade, but fail the run (CI-friendly) and make it explicit.
    reporter.fail("grade_requirement", `Minimum grade not met: require ${requiredMinGrade}, got ${gradeInfo.grade}`, {
      code: "GATE_MIN_GRADE",
      require: requiredMinGrade,
      got: gradeInfo.grade,
    });
  }

  // Consistency guard: if grading and warning logic drift, surface it explicitly.
  // (Example: provenance missing warnings should imply a non-A grade.)
  const warningsByCodePre = computeWarningsByCode(reporter.checks);
  if (gradeInfo.grade === "GRADE A" && Number(warningsByCodePre?.WARN_PROVENANCE_MISSING || 0) > 0) {
    reporter.warn(
      "internal_consistency",
      "Internal consistency warning: grade is A but provenance warning is present (possible regression in grading/warning logic).",
      { code: "WARN_INCONSISTENT_STATE", grade: gradeInfo.grade },
    );
  }

  const warningsByCode = computeWarningsByCode(reporter.checks);
  const failOnTriggered = failOn.filter((c) => Number(warningsByCode?.[c] || 0) > 0);
  if (failOnTriggered.length) {
    reporter.fail(
      "fail_on_triggered",
      `Fail-on triggered by warnings: ${failOnTriggered.join(", ")}`,
      { code: "GATE_FAIL_ON", triggered: failOnTriggered.join(",") },
    );
  }

  const manifestFileSha256 = exists(path.join(base, "BINDER_PACKET_MANIFEST.json"))
    ? await sha256File(path.join(base, "BINDER_PACKET_MANIFEST.json"))
    : null;

  const verificationId = sha256Hex(
    Buffer.from(
      [
        manifestFileSha256 || "no-manifest",
        relativeFolder,
        toolVersion,
        normalizeMode(mode) || "(none)",
        `strict=${strict ? "1" : "0"}`,
      ].join("|"),
      "utf8",
    ),
  );

  const authorityChain = {
    manifest: manifestFileSha256 ? { file: "BINDER_PACKET_MANIFEST.json", sha256: manifestFileSha256 } : null,
    packet_input_json: exists(path.join(base, "packet_input.json")) ? { file: "packet_input.json", sha256: await sha256File(path.join(base, "packet_input.json")) } : null,
    packet_pdf: exists(path.join(base, "BINDER_PACKET.pdf")) ? { file: "BINDER_PACKET.pdf", sha256: await sha256File(path.join(base, "BINDER_PACKET.pdf")) } : null,
    generated_at: manifest?.generated_at ? String(manifest.generated_at) : null,
    git: gitContext ? { head: gitContext.head || null, dirty: Boolean(gitContext.dirty) } : null,
  };
  const res = {
    startedAt,
    finishedAt,
    folder: base,
    relativeFolder,
    strict: Boolean(strict),
    mode: mode ? String(mode) : null,
    minExhibits: effectiveMin,
    maxConcurrency,
    ok: reporter.summary().failCount === 0,
    grade: gradeInfo.grade,
    gradeLabel: gradeInfo.label,
    clerkSummary: buildClerkSummary(gradeInfo.grade),
    verificationId,
    requiredMinGrade: requiredMinGrade || null,
    failOn,
    failOnTriggered,
    provenance,
    authorityChain,
    summary: reporter.summary(),
    warningsByCode,
    checks: reporter.checks,
    fixPlan,
    exhibits: Array.isArray(manifest?.exhibits)
      ? manifest.exhibits.map((x) => ({
          exhibit: String(x?.exhibit || "").trim(),
          artifactFile: String(x?.artifactFile || "").trim(),
          sha256: stripShaPrefix(x?.sha256),
        }))
      : [],
    git: gitContext,
    tool: { name: "verify-litigation-packet", version: toolVersion, node: process.version },
  };

  // Auto-fix apply: clone folder, apply allowed fixes, write FIX_LOGs
  let fixBlocked = false;
  let autoFixOutAbs = null;
  let afterVerify = null;
  if (autoFix && apply) {
    const normalized = normalizeMode(mode);
    if (normalized === "dev" && exists(path.join(base, "BINDER_PACKET_MANIFEST.json"))) {
      // Still never mutate in place; dev only relaxes convenience later. For now, same as evidence.
    }

    const blockedActions = Array.isArray(fixPlan)
      ? fixPlan.filter((a) => a.kind === "action" && !a.allowed)
      : [];
    if (blockedActions.length) {
      fixBlocked = true;
      reporter.fail(
        "autofix_policy_block",
        `Auto-fix blocked by policy: ${blockedActions.map((a) => `${a.action}(${a.reasonCode})`).join(", ")}`,
      );
    }

    const manifestPath = path.join(base, "BINDER_PACKET_MANIFEST.json");
    if (!exists(manifestPath) || !manifest) {
      fixBlocked = true;
      reporter.fail("autofix_requires_manifest", "--apply requires an existing, parseable BINDER_PACKET_MANIFEST.json (manifest is the authority).");
    }

    const stamp = stampYmdHms();
    const defaultOut = path.join(path.dirname(base), `litigation__refit__${stamp}`);
    const outAbs = path.resolve(repoRoot, outDir || defaultOut);
    autoFixOutAbs = outAbs;

    if (fixBlocked) {
      // No-op; do not write anything.
    } else if (path.resolve(outAbs) === path.resolve(base)) {
      fixBlocked = true;
      reporter.fail("autofix_outdir", "--out resolves to the same folder; refusing to mutate evidence in place.");
    } else if (exists(outAbs)) {
      fixBlocked = true;
      reporter.fail("autofix_outdir", "--out folder already exists; refusing to overwrite.", { out: normalizePathForPrint(outAbs) });
    } else {
      await fs.mkdir(path.dirname(outAbs), { recursive: true });
      await fs.cp(base, outAbs, { recursive: true, errorOnExist: true });

      const cloneCreatedAt = new Date().toISOString();

      const beforeHashes = await snapshotKeyHashes(base, manifest);
      const actions = [];

      for (const a of fixPlan) {
        if (a.kind !== "action") {
          actions.push({ ...a, status: "NOTE" });
          continue;
        }
        if (!a.allowed) {
          actions.push({ ...a, status: "BLOCKED" });
          continue;
        }

        if (a.action === "REGENERATE_COVER_MD") {
          const coverPath = path.join(outAbs, "BINDER_COVER.md");
          if (exists(coverPath)) {
            actions.push({ ...a, status: "SKIPPED", details: { ...(a.details || {}), note: "exists" } });
            continue;
          }
          try {
            await regenCoverFromPacketInput({ outDir: outAbs, packetInput, manifest });
            actions.push({ ...a, status: "APPLIED" });
          } catch (e) {
            actions.push({ ...a, status: "FAILED", details: { ...(a.details || {}), error: String(e?.message || e) } });
          }
          continue;
        }

        if (a.action === "REGENERATE_INDEX_MD") {
          const indexPath = path.join(outAbs, "BINDER_INDEX.md");
          if (exists(indexPath)) {
            actions.push({ ...a, status: "SKIPPED", details: { ...(a.details || {}), note: "exists" } });
            continue;
          }
          try {
            await regenIndexFromPacketInput({ outDir: outAbs, packetInput, manifest });
            actions.push({ ...a, status: "APPLIED" });
          } catch (e) {
            actions.push({ ...a, status: "FAILED", details: { ...(a.details || {}), error: String(e?.message || e) } });
          }
          continue;
        }

        if (a.action === "REGENERATE_PACKET_PDF") {
          try {
            const pdfPath = path.join(outAbs, "BINDER_PACKET.pdf");
            if (exists(pdfPath)) {
              actions.push({ ...a, status: "SKIPPED", details: { ...(a.details || {}), note: "exists" } });
              continue;
            }
            await regenPacketPdfFromExistingSources({ base: outAbs, manifest, outPdfPath: path.join(outAbs, "BINDER_PACKET.pdf") });
            actions.push({ ...a, status: "APPLIED" });
          } catch (e) {
            actions.push({ ...a, status: "FAILED", details: { ...(a.details || {}), error: String(e?.message || e) } });
          }
        } else if (a.action === "REGENERATE_INDEX_JSON") {
          try {
            const indexObj = buildIndexJsonFromManifest(manifest);
            const indexJsonOut = path.join(outAbs, "index.json");
            if (exists(indexJsonOut)) {
              actions.push({ ...a, status: "SKIPPED", details: { ...(a.details || {}), note: "exists" } });
              continue;
            }
            await fs.writeFile(indexJsonOut, `${JSON.stringify(indexObj, null, 2)}\n`, "utf8");
            actions.push({ ...a, status: "APPLIED" });
          } catch (e) {
            actions.push({ ...a, status: "FAILED", details: { ...(a.details || {}), error: String(e?.message || e) } });
          }
        } else {
          actions.push({ ...a, status: "SKIPPED" });
        }
      }

      const afterHashes = await snapshotKeyHashes(outAbs, manifest);
      // Re-verify repaired clone to produce a court-proof "after" result.
      afterVerify = await runVerifierJson({
        repoRoot,
        folder: normalizePathForPrint(path.relative(repoRoot, outAbs)),
        strict,
        mode,
        minExhibits: effectiveMin,
        maxConcurrency,
        git,
      });

      const fixLog = {
        kind: "LITIGATION_PACKET_FIX_LOG_V1",
        startedAt,
        finishedAt: new Date().toISOString(),
        mode: normalized,
        gradeBefore: res.grade,
        gradeBeforeLabel: res.gradeLabel,
        gradeAfter: afterVerify?.result?.grade || null,
        gradeAfterLabel: afterVerify?.result?.gradeLabel || null,
        policy: {
          neverMutateInPlace: true,
          twoPhase: true,
          manifestImmutable: true,
          inputsImmutable: true,
        },
        operator: {
          force: Boolean(force),
          reason: reason || null,
          ticket: ticket || null,
        },
        from: { folder: base, relative: relativeFolder },
        to: { folder: outAbs, relative: normalizePathForPrint(path.relative(repoRoot, outAbs)) },
        noSurprises: {
          originalUntouched: true,
          cloneCreatedAt,
        },
        provenance: computeProvenanceStatus({ checks: reporter.checks }),
        plan: fixPlan,
        actions,
        filesCreated: (() => {
          const created = [];
          for (const act of actions) {
            if (act.status !== "APPLIED") continue;
            if (act.action === "REGENERATE_COVER_MD") created.push("BINDER_COVER.md");
            if (act.action === "REGENERATE_INDEX_MD") created.push("BINDER_INDEX.md");
            if (act.action === "REGENERATE_PACKET_PDF") created.push("BINDER_PACKET.pdf");
            if (act.action === "REGENERATE_INDEX_JSON") created.push("index.json");
          }
          return Array.from(new Set(created)).sort((a, b) => a.localeCompare(b));
        })(),
        beforeHashes,
        afterHashes,
        afterVerify: afterVerify?.result?.summary
          ? {
              ok: Boolean(afterVerify?.result?.ok),
              grade: afterVerify?.result?.grade || null,
              gradeLabel: afterVerify?.result?.gradeLabel || null,
              summary: afterVerify.result.summary,
            }
          : null,
        tool: { name: "verify-litigation-packet", version: toolVersion, node: process.version },
      };

      try {
        const allFiles = await listFilesRecursive(outAbs);
        const createdCount = Array.isArray(fixLog.filesCreated) ? fixLog.filesCreated.length : 0;
        fixLog.filesUnchangedCount = Math.max(0, allFiles.length - createdCount);
      } catch {
        // best-effort only
      }

      await writeFixLogs({ outDir: outAbs, fixLog });

      if (!quiet && !json) {
        process.stdout.write(`OK: Auto-fix output: ${normalizePathForPrint(path.relative(repoRoot, outAbs))}\n`);
        process.stdout.write(`OK: Wrote FIX_LOG.json and FIX_LOG.md\n`);
      }

      const afterFails = Number(afterVerify?.result?.summary?.failCount || 0);
      if (afterFails > 0) {
        // Bright-line: cannot repair without changing evidence inputs.
        reporter.fail(
          "autofix_after_verify_failed",
          "Cannot repair without changing evidence inputs; manual review required.",
          {
            outDir: normalizePathForPrint(path.relative(repoRoot, outAbs)),
            failCount: afterFails,
          },
        );
      }
    }
  }

  const decisionTarget = autoFix && apply && afterVerify?.result ? afterVerify.result : res;
  const baseForExit = decisionTarget?.summary || res.summary;
  const requiredMinGradeForDecision = normalizeMinGrade(minGrade);
  const minGradeNotMetForDecision = Boolean(
    requiredMinGradeForDecision && gradeRank(decisionTarget?.grade) < gradeRank(requiredMinGradeForDecision),
  );
  const warningsByCodeForDecision = decisionTarget?.warningsByCode || warningsByCode;
  const failOnTriggeredForDecision = failOn.filter((c) => Number(warningsByCodeForDecision?.[c] || 0) > 0);
  const intrinsicFailCountForDecision = autoFix && apply && afterVerify?.result?.summary
    ? Number(afterVerify.result.summary.failCount || 0)
    : intrinsicFailCount;

  const decision = decideExit({
    summary: baseForExit,
    autoFix,
    apply,
    fixPlan,
    fixBlocked,
    minGrade,
    intrinsicFailCount: intrinsicFailCountForDecision,
    minGradeNotMet: minGradeNotMetForDecision,
    failOnTriggered: failOnTriggeredForDecision,
  });
  process.exitCode = decision.exitCode;

  const policyDecision = {
    evaluatedState: autoFix && apply && afterVerify?.result ? "after" : "before",
    minGrade: requiredMinGradeForDecision ? gradeLetter(requiredMinGradeForDecision) : null,
    grade: gradeLetter(decisionTarget?.grade),
    failOn: Array.isArray(failOn) ? failOn : [],
    failOnTriggered: Array.isArray(failOnTriggeredForDecision) ? failOnTriggeredForDecision : [],
    exitCode: decision.exitCode,
    exitReason: decision.exitReason,
  };

  const resWithExit = { ...res, exitCode: decision.exitCode, exitReason: decision.exitReason, policyDecision };

  if (printPolicy) {
    const headline = formatPolicyHeadline({
      grade: decisionTarget?.grade || res.grade,
      policyDecision,
      clerkSummary: decisionTarget?.clerkSummary || res.clerkSummary,
    });
    const stream = json ? process.stderr : process.stdout;
    stream.write(`${headline}\n`);
  }

  if (reportPath) {
    const outAbs = path.isAbsolute(reportPath) ? reportPath : path.join(repoRoot, reportPath);
    await fs.mkdir(path.dirname(outAbs), { recursive: true });
    const reportTarget = autoFix && apply && afterVerify?.result
      ? { ...afterVerify.result, policyDecision, exitCode: decision.exitCode, exitReason: decision.exitReason }
      : resWithExit;
    await fs.writeFile(outAbs, renderMarkdownReport(reportTarget), "utf8");
    if (!quiet && !json) process.stdout.write(`OK: Wrote report: ${normalizePathForPrint(path.relative(repoRoot, outAbs))}\n`);
  }

  if (json) {
    if (autoFix && apply) {
      process.stdout.write(
        `${JSON.stringify(
          {
            kind: "LITIGATION_PACKET_AUTO_FIX_RESULT_V1",
            exitCode: decision.exitCode,
            exitReason: decision.exitReason,
            policyDecision,
            before: resWithExit,
            after: afterVerify?.result || null,
            outDir: autoFixOutAbs ? normalizePathForPrint(path.relative(repoRoot, autoFixOutAbs)) : null,
            blocked: Boolean(fixBlocked),
          },
          null,
          2,
        )}\n`,
      );
    } else {
      process.stdout.write(`${JSON.stringify(resWithExit, null, 2)}\n`);
    }
  } else {
    if (autoFix && !apply) {
      const issuesExist = res.summary.failCount > 0 || res.summary.warnCount > 0;
      if (!quiet) {
        process.stdout.write(`OK: Auto-fix plan mode (no writes).\n`);
        if (issuesExist) {
          const fixAvailable = Array.isArray(fixPlan) && fixPlan.some((a) => a.kind === "action" && a.allowed);
          process.stdout.write(
            fixAvailable
              ? "WARN: Fixes available. Re-run with --apply to write a repaired clone.\n"
              : "WARN: No policy-allowed fixes available (notes may still be present).\n",
          );
          if (Array.isArray(fixPlan) && fixPlan.length) {
            for (const a of fixPlan) {
              const tag = a.kind === "note" ? "NOTE" : a.allowed ? "ALLOWED" : "BLOCKED";
              process.stdout.write(`OK: ${tag}: ${a.action} -> ${a.target || "(none)"} (${a.reasonCode})\n`);
            }
          }
        }
      }
    }

    if (autoFix && apply && afterVerify?.result) {
      const afterOk = Boolean(afterVerify.result.ok);
      if (!quiet) {
        process.stdout.write(`OK: Re-verified repaired clone: ${afterOk ? "PASS" : "FAIL"}\n`);
      }
    }

    if (decision.exitCode === 0 && !quiet) process.stdout.write("OK: Verified clean.\n");
    if (decision.exitCode === 2 && !quiet) process.stdout.write("WARN: Verified with warnings.\n");
  }
}

main().catch((err) => {
  console.error(String(err?.stack || err?.message || err));
  process.exit(1);
});
