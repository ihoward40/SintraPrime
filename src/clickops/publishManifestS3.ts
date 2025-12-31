import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

function safeS3KeyPartFromRunId(runId: string): string {
  // Keep deterministic, but prevent path traversal / accidental prefixes.
  return String(runId ?? "")
    .trim()
    .replace(/[\\/<>:"|?*\x00-\x1F]/g, "_")
    .slice(0, 160);
}

function normalizePrefix(prefix: string | null): string {
  const p = String(prefix ?? "").trim();
  if (!p) return "";
  return p.replace(/^\/+/, "").replace(/\/+$/, "");
}

export type PublishManifestS3Target = {
  bucket: string;
  prefix: string; // normalized (no leading/trailing slash)
  run_id: string;
  key: string;
  s3_uri: string;
  https_url: string;
};

export function computeManifestS3Key(params: { run_id: string; prefix?: string | null }): string {
  const prefix = normalizePrefix(params.prefix ?? "");
  const runPart = safeS3KeyPartFromRunId(params.run_id);
  return prefix ? `${prefix}/${runPart}/MANIFEST.json` : `${runPart}/MANIFEST.json`;
}

export function parsePublishManifestS3Uri(input: string): { bucket: string; prefix: string } | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  if (!raw.toLowerCase().startsWith("s3://")) return null;

  const rest = raw.slice("s3://".length);
  const slash = rest.indexOf("/");
  const bucket = (slash === -1 ? rest : rest.slice(0, slash)).trim();
  const prefix = slash === -1 ? "" : rest.slice(slash + 1);

  if (!bucket) return null;
  return { bucket, prefix: normalizePrefix(prefix) };
}

export function toS3HttpsUrl(params: { bucket: string; key: string }): string {
  // Non-presigned, public URL shape. (May require bucket policy / auth to access.)
  const encodedKey = params.key
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `https://${params.bucket}.s3.amazonaws.com/${encodedKey}`;
}

export function resolvePublishManifestS3Target(params: {
  publish_manifest_s3?: string | null;
  env_bucket?: string | null;
  env_prefix?: string | null;
  run_id: string;
}): PublishManifestS3Target | null {
  const fromFlag = params.publish_manifest_s3 ? parsePublishManifestS3Uri(params.publish_manifest_s3) : null;
  const envBucket = String(params.env_bucket ?? "").trim();
  const envPrefix = normalizePrefix(String(params.env_prefix ?? "").trim());

  const bucket = fromFlag?.bucket ?? envBucket;
  const prefix = fromFlag ? fromFlag.prefix : envBucket ? envPrefix : "";

  if (!bucket) return null;

  const key = computeManifestS3Key({ run_id: params.run_id, prefix });
  const s3_uri = `s3://${bucket}/${key}`;
  const https_url = toS3HttpsUrl({ bucket, key });

  return { bucket, prefix, run_id: params.run_id, key, s3_uri, https_url };
}

export type S3PutLike = {
  putObject: (params: {
    bucket: string;
    key: string;
    body: Uint8Array;
    contentType: string;
  }) => Promise<void>;
};

class AwsSdkS3PutClient implements S3PutLike {
  private readonly client: S3Client;

  constructor() {
    this.client = new S3Client({});
  }

  async putObject(params: { bucket: string; key: string; body: Uint8Array; contentType: string }): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
        Body: params.body,
        ContentType: params.contentType,
      })
    );
  }
}

export async function publishManifestToS3(params: {
  target: PublishManifestS3Target;
  manifest_json: Buffer;
  s3?: S3PutLike;
}): Promise<{ ok: true; https_url: string; s3_uri: string } | { ok: false; error: { name?: string; message: string } }> {
  const s3 = params.s3 ?? new AwsSdkS3PutClient();

  try {
    await s3.putObject({
      bucket: params.target.bucket,
      key: params.target.key,
      body: params.manifest_json,
      contentType: "application/json; charset=utf-8",
    });

    return { ok: true, https_url: params.target.https_url, s3_uri: params.target.s3_uri };
  } catch (e: any) {
    return {
      ok: false,
      error: {
        name: e?.name ? String(e.name) : undefined,
        message: String(e?.message ?? e),
      },
    };
  }
}
