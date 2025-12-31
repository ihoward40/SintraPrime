import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import archiver from "archiver";
import os from "node:os";
import { spawnSync } from "node:child_process";

function listFilesRecursive(rootDir: string): string[] {
  const out: string[] = [];
  const stack: string[] = [rootDir];

  while (stack.length) {
    const dir = stack.pop()!;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        stack.push(abs);
      } else if (e.isFile()) {
        out.push(abs);
      }
    }
  }

  return out;
}

function sha256File(absPath: string): string {
  const h = crypto.createHash("sha256");
  const buf = fs.readFileSync(absPath);
  h.update(buf);
  return h.digest("hex");
}

function sha256Buffer(buf: Buffer): string {
  const h = crypto.createHash("sha256");
  h.update(buf);
  return h.digest("hex");
}

function toFileUri(absPath: string): string {
  const p = absPath.replace(/\\/g, "/");
  // Windows paths become file:///C:/...
  if (/^[A-Za-z]:\//.test(p)) return `file:///${p}`;
  return `file://${p}`;
}

function tryCreateRfc3161Timestamp(params: {
  sha256Txt: Buffer;
  tsaUrl: string;
}): { tsr: Buffer; tsq?: Buffer } | null {
  const tsaUrl = params.tsaUrl.trim();
  if (!tsaUrl) return null;

  const openssl = spawnSync("openssl", ["version"], { encoding: "utf8" });
  if (openssl.status !== 0) return null;

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "clickops-tsa-"));
  const shaPath = path.join(tmp, "sha256.txt");
  const tsqPath = path.join(tmp, "sha256.tsq");
  const tsrPath = path.join(tmp, "sha256.tsr");
  try {
    fs.writeFileSync(shaPath, params.sha256Txt);

    const q = spawnSync(
      "openssl",
      ["ts", "-query", "-data", shaPath, "-sha256", "-cert", "-out", tsqPath],
      { encoding: "utf8" }
    );
    if (q.status !== 0) return null;

    const r = spawnSync(
      "openssl",
      ["ts", "-reply", "-queryfile", tsqPath, "-out", tsrPath, "-url", tsaUrl],
      { encoding: "utf8" }
    );
    if (r.status !== 0) return null;

    const tsr = fs.readFileSync(tsrPath);
    const tsq = fs.readFileSync(tsqPath);
    return { tsr, tsq };
  } finally {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
}

function parseTsaList(): string[] {
  const primary = String(process.env.CLICKOPS_TSA_URL ?? "").trim();
  const listRaw = String(process.env.CLICKOPS_TSA_LIST ?? "").trim();
  const parts = listRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const out: string[] = [];
  const seen = new Set<string>();

  const push = (u: string) => {
    const v = u.trim();
    if (!v) return;
    const k = v.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(v);
  };

  // Back-compat: CLICKOPS_TSA_URL participates as highest priority.
  if (primary) push(primary);
  for (const p of parts) push(p);

  return out;
}

function isHttpUrl(s: string): boolean {
  const v = String(s ?? "").trim();
  return /^https?:\/\//i.test(v);
}

function resolvePublishManifestUrl(templateOrUrl: string, runId: string): string | null {
  const raw = String(templateOrUrl ?? "").trim();
  if (!raw) return null;
  const resolved = raw.replace(/\{\{\s*RUN_ID\s*\}\}/g, runId);
  return isHttpUrl(resolved) ? resolved : null;
}

// Minimal QR generator + renderer.
// Uses a dependency-free QR implementation via internal matrix algorithm is overkill;
// instead we rely on qrcode-generator (tiny, pure JS) if installed.
function renderQrPng(params: { text: string; moduleSize: number; margin: number }): Buffer | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const qrGen = require("qrcode-generator");
    const qr = qrGen(0, "M");
    qr.addData(params.text);
    qr.make();

    const size = qr.getModuleCount();
    const dim = (size + params.margin * 2) * params.moduleSize;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PNG } = require("pngjs");
    const png = new PNG({ width: dim, height: dim });

    for (let y = 0; y < dim; y++) {
      for (let x = 0; x < dim; x++) {
        const i = (png.width * y + x) << 2;
        png.data[i] = 255;
        png.data[i + 1] = 255;
        png.data[i + 2] = 255;
        png.data[i + 3] = 255;
      }
    }

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const isDark = qr.isDark(r, c);
        const baseX = (c + params.margin) * params.moduleSize;
        const baseY = (r + params.margin) * params.moduleSize;
        if (!isDark) continue;
        for (let dy = 0; dy < params.moduleSize; dy++) {
          for (let dx = 0; dx < params.moduleSize; dx++) {
            const x = baseX + dx;
            const y = baseY + dy;
            const i = (png.width * y + x) << 2;
            png.data[i] = 0;
            png.data[i + 1] = 0;
            png.data[i + 2] = 0;
            png.data[i + 3] = 255;
          }
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Buffer } = require("buffer");
    return PNG.sync.write(png);
  } catch {
    return null;
  }
}

// Tiny 5x7 font for banner stamping (ASCII subset).
const FONT_5X7: Record<string, number[]> = {
  " ": [0, 0, 0, 0, 0],
  "-": [0, 0, 0b11111, 0, 0],
  "_": [0, 0, 0, 0, 0b11111],
  ":": [0, 0b00100, 0, 0b00100, 0],
  "/": [0b00001, 0b00010, 0b00100, 0b01000, 0b10000],
  ".": [0, 0, 0, 0, 0b00100],
  "=": [0, 0b11111, 0, 0b11111, 0],
  "#": [0b01010, 0b11111, 0b01010, 0b11111, 0b01010],
  "A": [0b11110, 0b00101, 0b00101, 0b11110, 0],
  "B": [0b11111, 0b10101, 0b10101, 0b01010, 0],
  "C": [0b01110, 0b10001, 0b10001, 0b10001, 0],
  "D": [0b11111, 0b10001, 0b10001, 0b01110, 0],
  "E": [0b11111, 0b10101, 0b10101, 0b10001, 0],
  "F": [0b11111, 0b00101, 0b00101, 0b00001, 0],
  "I": [0b10001, 0b11111, 0b10001, 0, 0],
  "M": [0b11111, 0b00010, 0b00100, 0b00010, 0b11111],
  "N": [0b11111, 0b00010, 0b00100, 0b01000, 0b11111],
  "O": [0b01110, 0b10001, 0b10001, 0b01110, 0],
  "P": [0b11111, 0b00101, 0b00101, 0b00010, 0],
  "R": [0b11111, 0b00101, 0b01101, 0b10010, 0],
  "S": [0b10010, 0b10101, 0b10101, 0b01001, 0],
  "T": [0b00001, 0b11111, 0b00001, 0, 0],
  "U": [0b01111, 0b10000, 0b10000, 0b01111, 0],
  "Y": [0b00011, 0b00100, 0b11000, 0, 0],
  "a": [0b01000, 0b10100, 0b10100, 0b11100, 0],
  "b": [0b11111, 0b10100, 0b10100, 0b01000, 0],
  "c": [0b01100, 0b10010, 0b10010, 0, 0],
  "d": [0b01000, 0b10100, 0b10100, 0b11111, 0],
  "e": [0b01100, 0b10110, 0b10110, 0b00100, 0],
  "f": [0b00100, 0b11110, 0b00101, 0, 0],
  "i": [0, 0b10100, 0, 0, 0],
  "l": [0b10001, 0b11111, 0b10000, 0, 0],
  "n": [0b11110, 0b00100, 0b00100, 0b11000, 0],
  "o": [0b01100, 0b10010, 0b10010, 0b01100, 0],
  "p": [0b11110, 0b01010, 0b01010, 0b00100, 0],
  "r": [0b11110, 0b00100, 0b00010, 0, 0],
  "s": [0b10000, 0b10110, 0b01010, 0, 0],
  "t": [0b00100, 0b01111, 0b10100, 0, 0],
  "u": [0b01110, 0b10000, 0b10000, 0b11110, 0],
  "v": [0b00110, 0b01000, 0b10000, 0b01000, 0b00110],
  "x": [0b10010, 0b01100, 0b01100, 0b10010, 0],
  "0": [0b01110, 0b10001, 0b10001, 0b01110, 0],
  "1": [0, 0b10010, 0b11111, 0b10000, 0],
  "2": [0b11001, 0b10101, 0b10101, 0b10010, 0],
  "3": [0b10001, 0b10101, 0b10101, 0b01010, 0],
  "4": [0b00111, 0b00100, 0b00100, 0b11111, 0],
  "5": [0b10111, 0b10101, 0b10101, 0b01001, 0],
  "6": [0b01110, 0b10101, 0b10101, 0b01000, 0],
  "7": [0b00001, 0b11101, 0b00011, 0, 0],
  "8": [0b01010, 0b10101, 0b10101, 0b01010, 0],
  "9": [0b00010, 0b10101, 0b10101, 0b01110, 0],
};

function drawRect(png: any, x: number, y: number, w: number, h: number, rgba: [number, number, number, number]) {
  const [r, g, b, a] = rgba;
  for (let yy = y; yy < y + h; yy++) {
    if (yy < 0 || yy >= png.height) continue;
    for (let xx = x; xx < x + w; xx++) {
      if (xx < 0 || xx >= png.width) continue;
      const i = (png.width * yy + xx) << 2;
      png.data[i] = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = a;
    }
  }
}

function drawChar(png: any, ch: string, x: number, y: number, scale: number, rgba: [number, number, number, number]) {
  const glyph = FONT_5X7[ch] ?? FONT_5X7["?"];
  if (!glyph) return;
  for (let cx = 0; cx < 5; cx++) {
    const col = glyph[cx] ?? 0;
    for (let cy = 0; cy < 7; cy++) {
      const on = (col >> (6 - cy)) & 1;
      if (!on) continue;
      drawRect(png, x + cx * scale, y + cy * scale, scale, scale, rgba);
    }
  }
}

function drawText(png: any, text: string, x: number, y: number, scale: number, rgba: [number, number, number, number]) {
  const lines = text.split("\n");
  let yy = y;
  for (const line of lines) {
    let xx = x;
    for (const ch of line) {
      drawChar(png, ch, xx, yy, scale, rgba);
      xx += (5 + 1) * scale;
    }
    yy += (7 + 2) * scale;
  }
}

function stampPng(params: {
  pngBuffer: Buffer;
  run_id: string;
  spec_name: string;
  mode: string;
  timestampIso: string;
  manifest_ref: string;
  qr_payload: string;
}): Buffer {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { PNG } = require("pngjs");
  const img = PNG.sync.read(params.pngBuffer);

  const bannerText =
    `RUN_ID: ${params.run_id}\n` +
    `SPEC: ${params.spec_name}\n` +
    `TIME: ${params.timestampIso}\n` +
    `MODE: ${params.mode}\n` +
    `MANIFEST: ${params.manifest_ref}`;

  const scale = 2;
  const padding = 8;
  const lineH = (7 + 2) * scale;
  const lines = bannerText.split("\n");
  const maxChars = Math.max(...lines.map((l) => l.length));
  const textW = maxChars * (5 + 1) * scale;
  const textH = lines.length * lineH;
  const boxW = Math.min(img.width - 12, textW + padding * 2);
  const boxH = Math.min(img.height - 12, textH + padding * 2);

  drawRect(img, 6, 6, boxW, boxH, [0, 0, 0, 140]);
  drawText(img, bannerText, 6 + padding, 6 + padding, scale, [255, 255, 255, 255]);

  const qr = renderQrPng({ text: params.qr_payload, moduleSize: 2, margin: 2 });
  if (qr) {
    const qrImg = PNG.sync.read(qr);
    const qrX = Math.max(0, img.width - qrImg.width - 6);
    const qrY = 6;
    // high-contrast white background
    drawRect(img, qrX - 2, qrY - 2, qrImg.width + 4, qrImg.height + 4, [255, 255, 255, 255]);
    for (let y = 0; y < qrImg.height; y++) {
      for (let x = 0; x < qrImg.width; x++) {
        const si = (qrImg.width * y + x) << 2;
        const a = qrImg.data[si + 3];
        if (!a) continue;
        const di = (img.width * (qrY + y) + (qrX + x)) << 2;
        if (qrX + x < 0 || qrX + x >= img.width || qrY + y < 0 || qrY + y >= img.height) continue;
        img.data[di] = qrImg.data[si];
        img.data[di + 1] = qrImg.data[si + 1];
        img.data[di + 2] = qrImg.data[si + 2];
        img.data[di + 3] = 255;
      }
    }
  }

  return PNG.sync.write(img);
}

export type AuditManifest = {
  version: 2;
  created_at: string;
  run_id: string;
  files: Array<{ path: string; bytes: number; sha256: string }>;
};

export type LockState = {
  lock_ttl_minutes: number;
  acquired_at: string | null;
  expires_at: string | null;
  released_cleanly: boolean;
};

export type RunMetadata = {
  run_id: string;
  spec_label: string;
  spec_name: string;
  mode: string;
  started_at: string;
  finished_at: string;
  visualize: boolean;
  dry_run: boolean;
  receipt: unknown;
  error: string | null;
  publish_manifest_url?: string | null;
  rfc3161?: {
    tsa_used: string | null;
    attempted: string[];
    status: "success" | "unavailable";
  };
  policy: {
    browser_allowlist_sha256: string | null;
  };
};

function readBrowserAllowlistSha256(cwd: string): string | null {
  try {
    const p = path.join(cwd, "browser.allowlist.json");
    const raw = fs.readFileSync(p);
    return sha256Buffer(raw);
  } catch {
    return null;
  }
}

function mapRunFileToZipPath(relPosix: string): string {
  if (relPosix.toLowerCase().endsWith(".png")) return `ARTIFACTS/screenshots/${relPosix}`;
  if (relPosix.toLowerCase().endsWith(".har")) return `ARTIFACTS/network.har/${relPosix}`;
  return `ARTIFACTS/${relPosix}`;
}

export async function createClickOpsAuditBundle(params: {
  runDirAbs: string;
  outZipAbs: string;
  run_id: string;
  spec_label: string;
  spec_name: string;
  mode: string;
  started_at: string;
  finished_at: string;
  visualize: boolean;
  dry_run: boolean;
  receipt: unknown;
  error: string | null;
  lock_state: LockState;
  publish_manifest_url?: string | null;
}): Promise<{ outZipAbs: string; manifest: AuditManifest; manifest_sha256: string; run_metadata: RunMetadata }>
{
  const runDirAbs = path.resolve(params.runDirAbs);
  const outZipAbs = path.resolve(params.outZipAbs);

  if (!fs.existsSync(runDirAbs) || !fs.statSync(runDirAbs).isDirectory()) {
    throw new Error(`audit bundle: run dir not found: ${runDirAbs}`);
  }

  const allAbs = listFilesRecursive(runDirAbs);
  const outRel = (() => {
    const rel = path.relative(runDirAbs, outZipAbs);
    if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) return null;
    return rel.replace(/\\/g, "/");
  })();

  const rels = allAbs
    .map((abs) => path.relative(runDirAbs, abs))
    .filter((rel) => rel && !rel.startsWith("..") && !path.isAbsolute(rel))
    .map((rel) => rel.replace(/\\/g, "/"))
    .filter((rel) => (outRel ? rel !== outRel : true))
    .sort((a, b) => a.localeCompare(b, "en"));

  const runMetadata: RunMetadata = {
    run_id: params.run_id,
    spec_label: params.spec_label,
    spec_name: params.spec_name,
    mode: params.mode,
    started_at: params.started_at,
    finished_at: params.finished_at,
    visualize: params.visualize,
    dry_run: params.dry_run,
    receipt: params.receipt ?? null,
    error: params.error ?? null,
    policy: {
      browser_allowlist_sha256: readBrowserAllowlistSha256(process.cwd()),
    },
  };

  const lockStateJson = JSON.stringify(params.lock_state, null, 2) + "\n";

  // Compute file list (as it will appear inside the zip).
  const fileEntries: Array<{ zipPath: string; abs?: string; bytes: number; sha256: string; content?: Buffer }> = [];

  // Add metadata files (buffers so we can hash deterministically).
  const lockBuf = Buffer.from(lockStateJson, "utf8");
  fileEntries.push({ zipPath: "LOCK_STATE.json", bytes: lockBuf.byteLength, sha256: sha256Buffer(lockBuf), content: lockBuf });
  // RFC-3161 metadata is recorded in RUN_METADATA.json, but timestamping is best-effort.
  // Note: to keep CHECKSUMS/sha256.txt and CHECKSUMS/sha256.tsr consistent with RUN_METADATA.json,
  // we select a TSA first, then timestamp the final sha256.txt after updating RUN_METADATA.json.
  const tsaList = parseTsaList();
  const includeTsq = String(process.env.CLICKOPS_TSA_INCLUDE_TSQ ?? "") === "1";
  const publishUrl = resolvePublishManifestUrl(
    String(params.publish_manifest_url ?? process.env.CLICKOPS_PUBLISH_MANIFEST_URL ?? ""),
    params.run_id
  );
  const rfc3161Meta: NonNullable<RunMetadata["rfc3161"]> = {
    tsa_used: null,
    attempted: [],
    status: "unavailable",
  };
  if (publishUrl) runMetadata.publish_manifest_url = publishUrl;
  runMetadata.rfc3161 = rfc3161Meta;

  const initialRunMetadataJson = JSON.stringify(runMetadata, null, 2) + "\n";
  const initialMetaBuf = Buffer.from(initialRunMetadataJson, "utf8");
  fileEntries.push({ zipPath: "RUN_METADATA.json", bytes: initialMetaBuf.byteLength, sha256: sha256Buffer(initialMetaBuf), content: initialMetaBuf });

  // Manifest (computed over all files except CHECKSUMS).
  const manifest: AuditManifest = {
    version: 2,
    created_at: new Date().toISOString(),
    run_id: params.run_id,
    files: fileEntries
      .filter((f) => !f.zipPath.startsWith("CHECKSUMS/"))
      .map((f) => ({ path: f.zipPath, bytes: f.bytes, sha256: f.sha256 }))
      .sort((a, b) => a.path.localeCompare(b.path, "en")),
  };
  const manifestJson = JSON.stringify(manifest, null, 2) + "\n";
  const manifestBuf = Buffer.from(manifestJson, "utf8");
  const manifestSha = sha256Buffer(manifestBuf);
  fileEntries.push({ zipPath: "MANIFEST.json", bytes: manifestBuf.byteLength, sha256: sha256Buffer(manifestBuf), content: manifestBuf });

  const manifestHashRef = `sha256:${manifestSha}`;
  const manifestRef = publishUrl ? publishUrl : manifestHashRef;
  const qrPayload = publishUrl ? publishUrl : manifestHashRef;

  const readme =
    "ClickOps Audit Bundle (v2)\n" +
    "\n" +
    "This zip is a deterministic, court-safe bundle containing:\n" +
    "- RUN_METADATA.json (run id, spec, mode, timings, status/error)\n" +
    "- LOCK_STATE.json (ttl, acquired/expiry, released_cleanly)\n" +
    "- ARTIFACTS/* (screenshots are banner-stamped; partial runs are expected)\n" +
    "- MANIFEST.json (bytes + SHA-256 for each file)\n" +
    "- CHECKSUMS/sha256.txt (sha256sum-compatible)\n" +
    (tsaList.length ? "- CHECKSUMS/sha256.tsr (RFC-3161 timestamp, best-effort)\n" : "") +
    (publishUrl ? `- Published manifest URL (QR encodes URL): ${publishUrl}\n` : "") +
    "\n" +
    "Verification (PowerShell example):\n" +
    "- Extract the zip\n" +
    "- Compute SHA256 for files and compare with CHECKSUMS/sha256.txt\n" +
    (tsaList.length
      ? "\nRFC-3161 Timestamp verification (requires TSA root chain):\n" +
        "openssl ts -verify -data CHECKSUMS/sha256.txt -in CHECKSUMS/sha256.tsr -CAfile tsa_root.pem\n"
      : "\nTo enable RFC-3161 timestamps, set CLICKOPS_TSA_LIST (comma-separated) or CLICKOPS_TSA_URL.\n") +
    "\n";
  const readmeBuf = Buffer.from(readme, "utf8");
  fileEntries.push({ zipPath: "README_Verification.txt", bytes: readmeBuf.byteLength, sha256: sha256Buffer(readmeBuf), content: readmeBuf });

  // Add run artifacts next, stamping PNGs in-bundle to include MANIFEST sha + QR.
  for (const rel of rels) {
    const abs = path.join(runDirAbs, rel);
    const st = fs.statSync(abs);
    const zipPath = mapRunFileToZipPath(rel);

    if (zipPath.toLowerCase().endsWith(".png")) {
      const raw = fs.readFileSync(abs);
      const tsIso = st.mtime ? new Date(st.mtime).toISOString() : new Date().toISOString();
      const stamped = stampPng({
        pngBuffer: raw,
        run_id: params.run_id,
        spec_name: params.spec_name,
        mode: params.mode,
        timestampIso: tsIso,
        manifest_ref: manifestRef,
        qr_payload: qrPayload,
      });
      fileEntries.push({ zipPath, bytes: stamped.byteLength, sha256: sha256Buffer(stamped), content: stamped });
    } else {
      fileEntries.push({ zipPath, abs, bytes: st.size, sha256: sha256File(abs) });
    }
  }

  // CHECKSUMS/sha256.txt does not include itself, and includes final in-zip content.
  const checksumLines = fileEntries
    .filter(
      (f) =>
        f.zipPath !== "CHECKSUMS/sha256.txt" &&
        f.zipPath !== "CHECKSUMS/sha256.tsr" &&
        f.zipPath !== "CHECKSUMS/sha256.tsq"
    )
    .map((f) => `${f.sha256}  ${f.zipPath}`)
    .sort((a, b) => a.localeCompare(b, "en"));
  const checksumText = checksumLines.join("\n") + "\n";
  const checksumBuf = Buffer.from(checksumText, "utf8");
  fileEntries.push({ zipPath: "CHECKSUMS/sha256.txt", bytes: checksumBuf.byteLength, sha256: sha256Buffer(checksumBuf), content: checksumBuf });

  // Optional RFC-3161 timestamp for sha256.txt (best-effort; fallback TSA list).
  // Two-pass: select a working TSA first, then timestamp the final sha256.txt after RUN_METADATA.json is updated.
  let selectedTsa: string | null = null;
  if (tsaList.length) {
    for (const tsaUrl of tsaList) {
      rfc3161Meta.attempted.push(tsaUrl);
      const probe = tryCreateRfc3161Timestamp({ sha256Txt: checksumBuf, tsaUrl });
      if (probe?.tsr) {
        selectedTsa = tsaUrl;
        break;
      }
    }
  }

  // Update RUN_METADATA.json with the TSA selection result (status reflects final timestamp step below).
  rfc3161Meta.tsa_used = selectedTsa;
  rfc3161Meta.status = "unavailable";
  {
    const updatedRunMetadataJson = JSON.stringify(runMetadata, null, 2) + "\n";
    const updatedMetaBuf = Buffer.from(updatedRunMetadataJson, "utf8");
    const idx = fileEntries.findIndex((f) => f.zipPath === "RUN_METADATA.json");
    if (idx >= 0) {
      fileEntries[idx] = {
        zipPath: "RUN_METADATA.json",
        bytes: updatedMetaBuf.byteLength,
        sha256: sha256Buffer(updatedMetaBuf),
        content: updatedMetaBuf,
      };
    }
  }

  // Recompute CHECKSUMS/sha256.txt because RUN_METADATA.json changed.
  {
    const lines = fileEntries
      .filter(
        (f) =>
          f.zipPath !== "CHECKSUMS/sha256.txt" &&
          f.zipPath !== "CHECKSUMS/sha256.tsr" &&
          f.zipPath !== "CHECKSUMS/sha256.tsq"
      )
      .map((f) => `${f.sha256}  ${f.zipPath}`)
      .sort((a, b) => a.localeCompare(b, "en"));
    const txt = lines.join("\n") + "\n";
    const buf = Buffer.from(txt, "utf8");
    const idx = fileEntries.findIndex((f) => f.zipPath === "CHECKSUMS/sha256.txt");
    if (idx >= 0) {
      fileEntries[idx] = {
        zipPath: "CHECKSUMS/sha256.txt",
        bytes: buf.byteLength,
        sha256: sha256Buffer(buf),
        content: buf,
      };
    }
  }

  // Final timestamp attempt (if a TSA was selected).
  if (selectedTsa) {
    const shaEntry = fileEntries.find((f) => f.zipPath === "CHECKSUMS/sha256.txt");
    const shaBuf = shaEntry?.content;
    if (shaBuf) {
      const ts = tryCreateRfc3161Timestamp({ sha256Txt: shaBuf, tsaUrl: selectedTsa });
      if (ts?.tsr) {
        rfc3161Meta.status = "success";
        fileEntries.push({ zipPath: "CHECKSUMS/sha256.tsr", bytes: ts.tsr.byteLength, sha256: sha256Buffer(ts.tsr), content: ts.tsr });
        if (includeTsq && ts.tsq) {
          fileEntries.push({ zipPath: "CHECKSUMS/sha256.tsq", bytes: ts.tsq.byteLength, sha256: sha256Buffer(ts.tsq), content: ts.tsq });
        }

        // Update RUN_METADATA.json one last time to reflect RFC-3161 success.
        const finalRunMetadataJson = JSON.stringify(runMetadata, null, 2) + "\n";
        const finalMetaBuf = Buffer.from(finalRunMetadataJson, "utf8");
        const idx = fileEntries.findIndex((f) => f.zipPath === "RUN_METADATA.json");
        if (idx >= 0) {
          fileEntries[idx] = {
            zipPath: "RUN_METADATA.json",
            bytes: finalMetaBuf.byteLength,
            sha256: sha256Buffer(finalMetaBuf),
            content: finalMetaBuf,
          };
        }

        // Update sha256.txt again since RUN_METADATA.json changed.
        const lines = fileEntries
          .filter(
            (f) =>
              f.zipPath !== "CHECKSUMS/sha256.txt" &&
              f.zipPath !== "CHECKSUMS/sha256.tsr" &&
              f.zipPath !== "CHECKSUMS/sha256.tsq"
          )
          .map((f) => `${f.sha256}  ${f.zipPath}`)
          .sort((a, b) => a.localeCompare(b, "en"));
        const txt = lines.join("\n") + "\n";
        const buf = Buffer.from(txt, "utf8");
        const shaIdx = fileEntries.findIndex((f) => f.zipPath === "CHECKSUMS/sha256.txt");
        if (shaIdx >= 0) {
          fileEntries[shaIdx] = {
            zipPath: "CHECKSUMS/sha256.txt",
            bytes: buf.byteLength,
            sha256: sha256Buffer(buf),
            content: buf,
          };
        }

        // Re-timestamp the final sha256.txt (now that RUN_METADATA.json reflects success).
        const finalShaEntry = fileEntries.find((f) => f.zipPath === "CHECKSUMS/sha256.txt");
        const finalShaBuf = finalShaEntry?.content;
        if (finalShaBuf) {
          const ts2 = tryCreateRfc3161Timestamp({ sha256Txt: finalShaBuf, tsaUrl: selectedTsa });
          if (ts2?.tsr) {
            const tsrIdx = fileEntries.findIndex((f) => f.zipPath === "CHECKSUMS/sha256.tsr");
            if (tsrIdx >= 0) {
              fileEntries[tsrIdx] = {
                zipPath: "CHECKSUMS/sha256.tsr",
                bytes: ts2.tsr.byteLength,
                sha256: sha256Buffer(ts2.tsr),
                content: ts2.tsr,
              };
            }
            if (includeTsq && ts2.tsq) {
              const tsqIdx = fileEntries.findIndex((f) => f.zipPath === "CHECKSUMS/sha256.tsq");
              if (tsqIdx >= 0) {
                fileEntries[tsqIdx] = {
                  zipPath: "CHECKSUMS/sha256.tsq",
                  bytes: ts2.tsq.byteLength,
                  sha256: sha256Buffer(ts2.tsq),
                  content: ts2.tsq,
                };
              }
            }
          }
        }
      }
    }
  }

  // Final stable order for zip emission.
  fileEntries.sort((a, b) => a.zipPath.localeCompare(b.zipPath, "en"));

  await new Promise<void>((resolve, reject) => {
    fs.mkdirSync(path.dirname(outZipAbs), { recursive: true });
    const out = fs.createWriteStream(outZipAbs);
    const archive = archiver("zip", {
      zlib: { level: 9 },
      // Determinism: avoid mtime metadata variations.
      // archiver sets per-entry date; we force via `date` in append calls.
    });

    out.on("close", () => resolve());
    out.on("error", (err) => reject(err));
    archive.on("warning", (err) => {
      // Treat warnings as errors for audit bundles.
      reject(err);
    });
    archive.on("error", (err) => reject(err));

    archive.pipe(out);

    const fixedDate = new Date("2000-01-01T00:00:00.000Z");

    for (const f of fileEntries) {
      if (f.abs) {
        archive.file(f.abs, { name: f.zipPath, date: fixedDate });
      } else if (f.content) {
        archive.append(f.content, { name: f.zipPath, date: fixedDate });
      } else {
        archive.append("", { name: f.zipPath, date: fixedDate });
      }
    }

    void archive.finalize();
  });

  return { outZipAbs, manifest, manifest_sha256: manifestSha, run_metadata: runMetadata };
}
