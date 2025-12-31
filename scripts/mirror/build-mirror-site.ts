import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

function argValue(argv: string[], name: string): string | null {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  const v = argv[i + 1];
  if (!v || v.startsWith("--")) return null;
  return v;
}

function requireIso(s: string, label: string): string {
  const v = String(s ?? "").trim();
  if (!v) throw new Error(`${label} is required`);
  const t = Date.parse(v);
  if (!Number.isFinite(t)) throw new Error(`${label} must be an ISO date-time`);
  return new Date(t).toISOString();
}

function ensureDirSync(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
}

function refuseOverwrite(absPath: string) {
  if (fs.existsSync(absPath)) throw new Error(`Refusing to overwrite existing path: ${absPath}`);
}

function toPosix(p: string) {
  return p.replace(/\\/g, "/");
}

function sha256Hex(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function canonicalize(obj: any): string {
  // Shallow-stable ordering is sufficient for a demo feed signature.
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonicalize).join(",")}]`;
  const keys = Object.keys(obj).sort();
  const entries = keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`);
  return `{${entries.join(",")}}`;
}

function mainKeypair() {
  // Demo-only Ed25519 keypair. Not for production.
  // Fixed to keep the mirror demo mechanically reproducible.
  const privateKeyPem = [
    "-----BEGIN PRIVATE KEY-----",
    "MC4CAQAwBQYDK2VwBCIEIF82wBVXmEaTSS9T3FrNRKpW/TYK+TNKg759PRYtVSqV",
    "-----END PRIVATE KEY-----",
    "",
  ].join("\n");

  const publicKeyPem = [
    "-----BEGIN PUBLIC KEY-----",
    "MCowBQYDK2VwAyEARvI8nvE/pKmNwwo2nKcoyUGKhSG6FP4isJ6LgdWS3To=",
    "-----END PUBLIC KEY-----",
    "",
  ].join("\n");

  return { privateKeyPem, publicKeyPem };
}

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderIndexHtml(latest: any): string {
  const created = String(latest?.created_at_utc ?? "");
  const objects: any[] = Array.isArray(latest?.objects) ? latest.objects : [];

  const rows = objects
    .map((o) => {
      const kind = escapeHtml(String(o?.kind ?? ""));
      const source = escapeHtml(String(o?.source_name ?? ""));
      const sha256 = escapeHtml(String(o?.sha256 ?? ""));
      const p = String(o?.path ?? "");
      const href = escapeHtml(p);
      const pathText = escapeHtml(p);
      return `<tr><td>${kind}</td><td>${source}</td><td><a href="${href}">${pathText}</a></td><td><code>${sha256}</code></td></tr>`;
    })
    .join("\n");

  return [
    "<!doctype html>",
    "<html lang=\"en\">",
    "<meta charset=\"utf-8\">",
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">",
    "<title>Public Mirror (Static)</title>",
    "<body>",
    "<h1>Public Mirror (Static Bytes)</h1>",
    "<p>This directory contains static files only. No servers, no secrets.</p>",
    `<p><b>Feed created at (UTC):</b> ${escapeHtml(created)}</p>`,
    "<h2>Verify (offline)</h2>",
    "<p>Verification procedure:</p>",
    "<ol>",
    "<li>Verify the signature of <code>feed/latest.json</code> using <code>feed/PUBLIC_KEY.pem</code> and <code>feed/latest.sig</code>.</li>",
    "<li>Verify each referenced blob’s SHA-256 matches the value listed in <code>feed/latest.json</code>.</li>",
    "</ol>",
    "<p>Files:</p>",
    "<ul>",
    "<li><a href=\"feed/latest.json\">feed/latest.json</a></li>",
    "<li><a href=\"feed/latest.sig\">feed/latest.sig</a></li>",
    "<li><a href=\"feed/PUBLIC_KEY.pem\">feed/PUBLIC_KEY.pem</a></li>",
    "</ul>",
    "<h2>Objects</h2>",
    "<table border=\"1\" cellpadding=\"6\" cellspacing=\"0\">",
    "<thead><tr><th>kind</th><th>source_name</th><th>path</th><th>sha256</th></tr></thead>",
    "<tbody>",
    rows || "<tr><td colspan=\"4\"><i>No objects published.</i></td></tr>",
    "</tbody>",
    "</table>",
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

async function copyToBlob(params: { siteAbs: string; sourceAbs: string; extHint?: string }) {
  const bytes = fs.readFileSync(params.sourceAbs);
  const h = sha256Hex(bytes);
  const ext = params.extHint || path.extname(params.sourceAbs).replace(/^\./, "");
  const blobName = ext ? `${h}.${ext}` : h;
  const rel = toPosix(path.posix.join("blobs", blobName));
  const destAbs = path.join(params.siteAbs, "blobs", blobName);
  ensureDirSync(path.dirname(destAbs));
  fs.writeFileSync(destAbs, bytes);
  return { sha256: h, rel_path: rel, byte_length: bytes.length };
}

async function listKitZips(kitsDirAbs: string): Promise<string[]> {
  if (!fs.existsSync(kitsDirAbs)) return [];
  const entries = await fsp.readdir(kitsDirAbs, { withFileTypes: true });
  const zips = entries
    .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".zip"))
    .map((e) => path.join(kitsDirAbs, e.name));
  zips.sort((a, b) => a.localeCompare(b));
  return zips;
}

async function main() {
  const argv = process.argv.slice(2);

  const nowIso = requireIso(argValue(argv, "--now") || new Date().toISOString(), "--now");
  const kitsDirRel = argValue(argv, "--kits") || path.join("dist", "public_verification_kits");
  const outRel = argValue(argv, "--out") || path.join("dist", "mirror_site");

  const kitsDirAbs = path.resolve(process.cwd(), kitsDirRel);
  const outAbs = path.resolve(process.cwd(), outRel);

  refuseOverwrite(outAbs);
  ensureDirSync(outAbs);
  ensureDirSync(path.join(outAbs, "feed"));
  ensureDirSync(path.join(outAbs, "blobs"));

  const { privateKeyPem, publicKeyPem } = mainKeypair();

  // Mirror: include verification kit ZIPs (optional but powerful).
  const kitZips = await listKitZips(kitsDirAbs);
  const kits: any[] = [];

  for (const zipAbs of kitZips) {
    const blob = await copyToBlob({ siteAbs: outAbs, sourceAbs: zipAbs, extHint: "zip" });
    kits.push({
      kind: "verification_kit",
      source_name: path.basename(zipAbs),
      sha256: blob.sha256,
      path: blob.rel_path,
      byte_length: blob.byte_length,
    });
  }

  // Registry/feed: minimal, signed, points to content-addressed blobs.
  const latest = {
    kind: "PublicMirrorFeed",
    version: "v1.0",
    created_at_utc: nowIso,
    note:
      "Signed feed for offline verification. Mirror hosts bytes only. Verify signature, then verify blob hashes.",
    public_key: {
      format: "pem",
      path: "feed/PUBLIC_KEY.pem",
      key_id: "demo-ed25519-v1",
    },
    revocations: {
      present: false,
      note: "No revocation list in this demo feed.",
    },
    objects: kits,
  };

  const latestBytes = Buffer.from(canonicalize(latest), "utf8");
  const latestDigestHex = sha256Hex(latestBytes);
  const sigB64 = crypto.sign(null, Buffer.from(latestDigestHex, "hex"), privateKeyPem).toString("base64");

  fs.writeFileSync(path.join(outAbs, "feed", "PUBLIC_KEY.pem"), publicKeyPem, "utf8");
  fs.writeFileSync(path.join(outAbs, "feed", "latest.json"), JSON.stringify(latest, null, 2) + "\n", "utf8");
  fs.writeFileSync(path.join(outAbs, "feed", "latest.sig"), sigB64 + "\n", "utf8");
  fs.writeFileSync(path.join(outAbs, "index.html"), renderIndexHtml(latest), "utf8");

  // eslint-disable-next-line no-console
  console.log(
    JSON.stringify(
      {
        ok: true,
        out_dir: toPosix(path.relative(process.cwd(), outAbs)),
        feed: {
          latest_json: "feed/latest.json",
          latest_sig: "feed/latest.sig",
          public_key: "feed/PUBLIC_KEY.pem",
          digest: `sha256:${latestDigestHex}`,
        },
        mirrored_kits: kits.length,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(String(e?.message ?? e));
  process.exitCode = 2;
});
