import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function argValue(argv: string[], name: string): string | null {
  const i = argv.indexOf(name);
  if (i === -1) return null;
  const v = argv[i + 1];
  if (!v || v.startsWith("--")) return null;
  return v;
}

function toPosix(p: string) {
  return p.replace(/\\/g, "/");
}

function sha256Hex(buf: Buffer): string {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function canonicalize(obj: any): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonicalize).join(",")}]`;
  const keys = Object.keys(obj).sort();
  const entries = keys.map((k) => `${JSON.stringify(k)}:${canonicalize(obj[k])}`);
  return `{${entries.join(",")}}`;
}

function mustExist(absPath: string, label: string) {
  if (!fs.existsSync(absPath)) throw new Error(`${label} missing: ${toPosix(absPath)}`);
}

function verifySig(params: { publicKeyPem: string; digestHex: string; sigB64: string }) {
  const ok = crypto.verify(null, Buffer.from(params.digestHex, "hex"), params.publicKeyPem, Buffer.from(params.sigB64, "base64"));
  if (!ok) throw new Error("Signature verification FAILED");
}

function verifyBlobSha256(params: { siteAbs: string; relPath: string; expectedHex: string }) {
  const abs = path.join(params.siteAbs, params.relPath.replace(/\//g, path.sep));
  mustExist(abs, "blob");
  const bytes = fs.readFileSync(abs);
  const got = sha256Hex(bytes);
  if (got !== params.expectedHex) throw new Error(`Blob hash mismatch for ${params.relPath}: expected ${params.expectedHex} got ${got}`);
}

function writeJson(absPath: string, obj: any) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, JSON.stringify(obj, null, 2) + "\n", "utf8");
}

function main() {
  const argv = process.argv.slice(2);
  const siteRel = argValue(argv, "--site");
  const outRel = argValue(argv, "--out") || process.cwd();

  if (!siteRel) {
    console.error("Usage: public-verify-mirror.ts --site <mirror_site_dir> [--out <receipt_dir>]");
    process.exit(2);
  }

  const siteAbs = path.resolve(process.cwd(), siteRel);
  const outAbs = path.resolve(process.cwd(), outRel);
  const receiptAbs = path.join(outAbs, "PUBLIC_VERIFY_RECEIPT.json");

  const latestAbs = path.join(siteAbs, "feed", "latest.json");
  const sigAbs = path.join(siteAbs, "feed", "latest.sig");
  const pubAbs = path.join(siteAbs, "feed", "PUBLIC_KEY.pem");

  mustExist(latestAbs, "feed");
  mustExist(sigAbs, "feed");
  mustExist(pubAbs, "feed");

  const latest = JSON.parse(fs.readFileSync(latestAbs, "utf8"));
  const sigB64 = fs.readFileSync(sigAbs, "utf8").trim();
  const publicKeyPem = fs.readFileSync(pubAbs, "utf8");

  const digestHex = sha256Hex(Buffer.from(canonicalize(latest), "utf8"));
  verifySig({ publicKeyPem, digestHex, sigB64 });

  const objects: any[] = Array.isArray(latest?.objects) ? latest.objects : [];
  for (const o of objects) {
    const rel = String(o?.path ?? "");
    const expected = String(o?.sha256 ?? "");
    if (!rel || !expected) throw new Error("Invalid object entry in feed (missing path/sha256)");
    verifyBlobSha256({ siteAbs, relPath: rel, expectedHex: expected });
  }

  const receipt = {
    ok: true,
    kind: "PublicMirrorVerificationReceipt",
    verified_at_utc: new Date().toISOString(),
    site: toPosix(siteRel),
    feed_signature: "PASS",
    objects_verified: objects.length,
    feed_digest: `sha256:${digestHex}`,
  };

  writeJson(receiptAbs, receipt);

  // eslint-disable-next-line no-console
  console.log(JSON.stringify(receipt, null, 2));
}

try {
  main();
} catch (e: any) {
  // eslint-disable-next-line no-console
  console.error(String(e?.message ?? e));
  process.exitCode = 2;
}
