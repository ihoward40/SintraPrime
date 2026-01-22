import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { buildLitigationPackage } from "../litigation/index.js";

function sha256Hex(buf: Buffer) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function stableJsonStringify(value: any) {
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

function ensureSafeCaseId(caseId: string) {
  return String(caseId || "CASE-UNKNOWN")
    .trim()
    .replace(/[^A-Za-z0-9._\-]/g, "_")
    .slice(0, 160);
}

export async function runLitigationPacketCommand(params: { rootDir: string; payload: unknown }) {
  const payload = params.payload as any;
  const op = String(payload?.op || "").trim();
  if (!op) {
    return {
      kind: "NeedInput",
      reason: "Missing op",
      expected: {
        op: "LITIGATION_ENGINE_V1_BUILD_PACKET",
        case_id: "string",
        venue: "string",
        matter_type: "string",
        fields: "Record<string,string>",
      },
    };
  }

  const allowed = new Set(["LITIGATION_ENGINE_V1_BUILD_PACKET", "LITIGATION_BUILD_PACKET_V1"]);
  if (!allowed.has(op)) {
    return {
      kind: "NeedInput",
      reason: `Unknown op: ${op}`,
      allowed_ops: [...allowed],
    };
  }

  const caseId = ensureSafeCaseId(String(payload?.case_id || payload?.caseId || ""));
  if (!caseId) {
    return { kind: "NeedInput", reason: "Missing case_id" };
  }

  const venue = String(payload?.venue || "GENERIC").trim() || "GENERIC";
  const matterType = String(payload?.matter_type || payload?.matterType || "GENERIC").trim() || "GENERIC";
  const fields = (payload?.fields && typeof payload.fields === "object") ? payload.fields : {};

  const outDir = path.join(params.rootDir, "artifacts", caseId, "litigation");
  await fs.mkdir(outDir, { recursive: true });

  const normalizedPayload = {
    op,
    case_id: caseId,
    venue,
    matter_type: matterType,
    status: payload?.status ?? null,
    fields,
  };

  const json = stableJsonStringify(normalizedPayload);
  const payloadHash = sha256Hex(Buffer.from(json, "utf8"));
  await fs.writeFile(path.join(outDir, "packet_input.json"), json, "utf8");
  await fs.writeFile(path.join(outDir, "packet_input.sha256"), `sha256:${payloadHash}\n`, "utf8");

  await buildLitigationPackage(
    {
      case_id: caseId,
      venue,
      matter_type: matterType,
      fields,
      vars: fields,
    },
    outDir,
  );

  const manifestPath = path.join(outDir, "BINDER_PACKET_MANIFEST.json");
  const packetPdfPath = path.join(outDir, "BINDER_PACKET.pdf");

  let manifestSha: string | null = null;
  try {
    const buf = await fs.readFile(manifestPath);
    manifestSha = `sha256:${sha256Hex(buf)}`;
  } catch {
    manifestSha = null;
  }

  let packetSha: string | null = null;
  try {
    const buf = await fs.readFile(packetPdfPath);
    packetSha = `sha256:${sha256Hex(buf)}`;
  } catch {
    packetSha = null;
  }

  return {
    ok: true,
    op,
    case_id: caseId,
    outDir: path.relative(params.rootDir, outDir).split(path.sep).join("/"),
    input: { file: "packet_input.json", sha256: `sha256:${payloadHash}` },
    binder: {
      manifest: { file: "BINDER_PACKET_MANIFEST.json", sha256: manifestSha },
      packet_pdf: { file: "BINDER_PACKET.pdf", sha256: packetSha },
      cover: { file: "BINDER_COVER.md" },
      index: { file: "BINDER_INDEX.md" },
    },
  };
}
