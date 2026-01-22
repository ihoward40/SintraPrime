import fs from "node:fs/promises";
import fssync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function usage(msg) {
  const lines = [
    msg ? `Error: ${msg}` : null,
    "Usage:",
    "  node scripts/verify-litigation-packet.mjs <litigation_out_dir> [--json] [--quiet]",
    "",
    "Notes:",
    "  - Reads <litigation_out_dir>/BINDER_PACKET_MANIFEST.json and emits JSON.",
    "  - Exit code is 0 on success; non-zero on missing/invalid inputs.",
  ].filter(Boolean);
  process.stderr.write(lines.join("\n") + "\n");
}

function sha256Hex(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

async function sha256File(absPath) {
  const b = await fs.readFile(absPath);
  return sha256Hex(b);
}

function parseArgs(argv) {
  const out = { _: [] };
  const args = Array.isArray(argv) ? argv.slice(2) : [];
  for (let i = 0; i < args.length; i++) {
    const a = String(args[i] || "");
    if (a.startsWith("--")) {
      out[a.slice(2)] = "true";
    } else {
      out._.push(a);
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const folder = String(args._[0] || "").trim();
  if (!folder) {
    usage("Missing <litigation_out_dir>");
    process.exit(2);
    return;
  }

  const absDir = path.resolve(process.cwd(), folder);
  const manifestPath = path.join(absDir, "BINDER_PACKET_MANIFEST.json");
  if (!fssync.existsSync(manifestPath)) {
    usage(`Missing binder manifest: ${manifestPath}`);
    process.exit(3);
    return;
  }

  const raw = await fs.readFile(manifestPath, "utf8");
  let manifest;
  try {
    manifest = JSON.parse(raw);
  } catch (e) {
    usage(`Invalid JSON in ${manifestPath}: ${String(e?.message || e)}`);
    process.exit(3);
    return;
  }

  const exhibits = Array.isArray(manifest?.exhibits) ? manifest.exhibits : [];
  const manifestSha256 = await sha256File(manifestPath);

  const out = {
    kind: "LitigationPacketVerification",
    ok: true,
    folder: absDir,
    manifest: {
      file: "BINDER_PACKET_MANIFEST.json",
      sha256: `sha256:${manifestSha256}`,
    },
    exhibits: exhibits.map((e) => ({
      exhibit: String(e?.exhibit || e?.code || "").trim(),
      artifactFile: e?.artifactFile || e?.relPath || null,
      sha256: e?.sha256 || null,
      title: e?.title || null,
      kind: e?.kind || null,
      status: e?.status || null,
    })),
  };

  process.stdout.write(JSON.stringify(out, null, 2) + "\n");
}

main().catch((err) => {
  process.stderr.write(String(err?.stack || err?.message || err) + "\n");
  process.exit(1);
});
