import { writeArtifactRelative } from "./writeBrowserEvidence.js";

export function writeDocsCaptureArtifact(input: {
  execution_id: string;
  step_id: string;
  url: string;
  http_status: number;
  content_type: string | null;
  sha256_hex: string;
  body_bytes: Buffer;
}) {
  const base = `runs/docs-capture/${input.execution_id}/${input.step_id}`;

  const meta = {
    kind: "docs.capture.v1",
    execution_id: input.execution_id,
    step_id: input.step_id,
    url: input.url,
    http_status: input.http_status,
    content_type: input.content_type,
    sha256_hex: input.sha256_hex,
    bytes: input.body_bytes.length,
  };

  const metaFile = writeArtifactRelative(`${base}/meta.json`, Buffer.from(JSON.stringify(meta, null, 2), "utf8"), "application/json");
  const bodyMime = input.content_type && String(input.content_type).trim() ? String(input.content_type) : "application/octet-stream";
  const bodyFile = writeArtifactRelative(`${base}/body.bin`, input.body_bytes, bodyMime);

  return { metaFile, bodyFile };
}
