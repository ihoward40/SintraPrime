import { createGammaClient, GammaApiError } from "./client.js";
import type { GammaGenerationCreateRequest, GammaGenerationGetResponse } from "./types.js";

export type GammaGenerateOptions = {
  apiKey: string;
  request: GammaGenerationCreateRequest;
  poll?: { intervalMs?: number; maxWaitMs?: number };
};

export type GammaGenerateResult = {
  generationId: string;
  final: GammaGenerationGetResponse;
  fileUrls: Record<string, string>;
};

export async function gammaGenerateAndWait(opts: GammaGenerateOptions): Promise<GammaGenerateResult> {
  const client = createGammaClient({ apiKey: opts.apiKey });
  const created = await client.createGeneration(opts.request);

  const generationId = created.generationId ?? (created.id as string | undefined);
  if (!generationId) {
    throw new Error("Gamma createGeneration did not return generationId.");
  }

  const intervalMs = opts.poll?.intervalMs ?? 1500;
  const maxWaitMs = opts.poll?.maxWaitMs ?? 120_000;
  const deadline = Date.now() + maxWaitMs;

  let last: GammaGenerationGetResponse | undefined;

  while (Date.now() < deadline) {
    last = await client.getGeneration(generationId);
    const status = String(last.status ?? "").toUpperCase();

    if (status === "SUCCEEDED" || status === "SUCCESS" || status === "COMPLETED") break;
    if (status === "FAILED" || status === "CANCELED") break;

    await sleep(intervalMs);
  }

  if (!last) throw new Error("Gamma generation polling failed (no response).");

  const status = String(last.status ?? "").toUpperCase();
  if (!(status === "SUCCEEDED" || status === "SUCCESS" || status === "COMPLETED")) {
    throw new GammaApiError(`Gamma generation not successful (status=${String(last.status ?? "")})`, {
      body: last,
    });
  }

  return { generationId, final: last, fileUrls: extractFileUrls(last) };
}

function extractFileUrls(g: GammaGenerationGetResponse): Record<string, string> {
  const out: Record<string, string> = {};
  if (g.fileUrls && typeof g.fileUrls === "object") {
    for (const [k, v] of Object.entries(g.fileUrls)) {
      if (typeof v === "string") out[k] = v;
    }
  }
  if (Array.isArray(g.files)) {
    for (const f of g.files) {
      if (f?.type && f?.url) out[String(f.type)] = String(f.url);
    }
  }
  return out;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
