import type {
  GammaGenerationCreateRequest,
  GammaGenerationCreateResponse,
  GammaGenerationGetResponse,
} from "./types.js";

export type GammaClientOptions = {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
};

export class GammaApiError extends Error {
  status?: number;
  body?: unknown;
  constructor(msg: string, opts?: { status?: number; body?: unknown }) {
    super(msg);
    this.name = "GammaApiError";
    this.status = opts?.status;
    this.body = opts?.body;
  }
}

export function createGammaClient(opts: GammaClientOptions) {
  const baseUrl = (opts.baseUrl ?? "https://public-api.gamma.app/v1.0").replace(/\/+$/, "");
  const timeoutMs = opts.timeoutMs ?? 60_000;

  async function request<T>(path: string, init: RequestInit): Promise<T> {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const res = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": opts.apiKey,
          ...(init.headers ?? {}),
        },
        signal: ctrl.signal,
      });

      const text = await res.text();
      const body = text ? safeJson(text) : undefined;

      if (!res.ok) {
        throw new GammaApiError(`Gamma API error ${res.status}`, { status: res.status, body });
      }
      return (body as T) ?? ({} as T);
    } finally {
      clearTimeout(t);
    }
  }

  return {
    createGeneration: (payload: GammaGenerationCreateRequest) =>
      request<GammaGenerationCreateResponse>("/generations", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    getGeneration: (generationId: string) =>
      request<GammaGenerationGetResponse>(`/generations/${encodeURIComponent(generationId)}`, {
        method: "GET",
      }),
  };
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return { raw: s };
  }
}
