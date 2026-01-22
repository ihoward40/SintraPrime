import { notionLiveGet } from "../adapters/notionLiveRead.js";
import { notionLivePatchWithIdempotency, notionLivePostWithIdempotency } from "../adapters/notionLiveWrite.js";
import type { NotionHttp } from "./http.js";

function asPath(p: string): string {
  const s = String(p ?? "").trim();
  if (!s) throw new Error("Notion path missing");
  return s.startsWith("/") ? s : `/${s}`;
}

export class NotionHttpLive implements NotionHttp {
  async get<T>(path: string): Promise<T> {
    const r = await notionLiveGet(asPath(path));
    if (r.http_status >= 400) throw new Error(`Notion GET failed HTTP ${r.http_status}`);
    return r.redacted as T;
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    const r = await notionLivePostWithIdempotency(asPath(path), body, null);
    if (r.http_status >= 400) throw new Error(`Notion POST failed HTTP ${r.http_status}`);
    return r.redacted as T;
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    const r = await notionLivePatchWithIdempotency(asPath(path), body, null);
    if (r.http_status >= 400) throw new Error(`Notion PATCH failed HTTP ${r.http_status}`);
    return r.redacted as T;
  }
}
