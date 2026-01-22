import type { LlmMessage, LlmProvider, LlmRunResult, LlmToolCall, LlmToolSpec } from "./types.js";

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function mustEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing ${name} env var`);
  return v.trim();
}

function parseToolCallsFromContent(content: any[]): LlmToolCall[] {
  if (!Array.isArray(content)) return [];
  const out: LlmToolCall[] = [];
  for (const part of content) {
    if (part?.type === "tool_use" && typeof part?.name === "string") {
      out.push({
        id: String(part?.id ?? ""),
        name: String(part.name),
        input: part?.input,
      });
    }
  }
  return out;
}

function parseTextFromContent(content: any[]): string {
  if (!Array.isArray(content)) return "";
  return content
    .filter((p) => p?.type === "text")
    .map((p) => String(p?.text ?? ""))
    .join("");
}

async function postJsonWithRetry(url: string, body: unknown, headers: Record<string, string>) {
  let attempt = 0;
  let lastErr: unknown = null;

  while (attempt < 5) {
    attempt += 1;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let json: any = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }

      if (res.ok) return json;

      const status = res.status;
      const msg = json?.error?.message || text || `HTTP ${status}`;

      // Retry on rate limits and transient server errors.
      if (status === 429 || (status >= 500 && status <= 599)) {
        const backoff = 250 * Math.pow(2, attempt - 1);
        await sleep(backoff);
        continue;
      }

      throw new Error(`Claude API error (${status}): ${msg}`);
    } catch (e) {
      lastErr = e;
      const backoff = 250 * Math.pow(2, attempt - 1);
      await sleep(backoff);
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

export class ClaudeProvider implements LlmProvider {
  private apiKey: string;
  private baseUrl: string;
  private version: string;
  private betaHeader?: string;

  constructor(opts?: { apiKey?: string; baseUrl?: string; version?: string; betaHeader?: string }) {
    this.apiKey = opts?.apiKey ?? mustEnv("ANTHROPIC_API_KEY");
    this.baseUrl = opts?.baseUrl ?? (process.env.ANTHROPIC_BASE_URL?.trim() || "https://api.anthropic.com");
    this.version = opts?.version ?? (process.env.ANTHROPIC_VERSION?.trim() || "2023-06-01");
    this.betaHeader = opts?.betaHeader ?? (process.env.ANTHROPIC_BETA?.trim() || undefined);
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": this.apiKey,
      "anthropic-version": this.version,
    };
    if (this.betaHeader) h["anthropic-beta"] = this.betaHeader;
    return h;
  }

  private async messagesCreate(body: any): Promise<any> {
    const url = `${this.baseUrl}/v1/messages`;
    return postJsonWithRetry(url, body, this.headers());
  }

  async generate(params: {
    system?: string;
    messages: LlmMessage[];
    model: string;
    maxTokens?: number;
    temperature?: number;
  }): Promise<LlmRunResult> {
    const body: any = {
      model: params.model,
      max_tokens: params.maxTokens ?? 1024,
      temperature: params.temperature ?? 0.2,
      messages: params.messages,
    };
    if (params.system) body.system = params.system;

    const json = await this.messagesCreate(body);
    const content = Array.isArray(json?.content) ? json.content : [];

    return {
      text: parseTextFromContent(content),
      toolCalls: [],
      raw: json,
    };
  }

  async runWithTools(params: {
    system?: string;
    messages: LlmMessage[];
    model: string;
    maxTokens?: number;
    temperature?: number;
    tools: LlmToolSpec[];
    toolChoice?: "auto" | { type: "tool"; name: string };
  }): Promise<LlmRunResult> {
    const body: any = {
      model: params.model,
      max_tokens: params.maxTokens ?? 1024,
      temperature: params.temperature ?? 0.2,
      messages: params.messages,
      tools: params.tools,
    };
    if (params.system) body.system = params.system;
    if (params.toolChoice) body.tool_choice = params.toolChoice;

    const json = await this.messagesCreate(body);
    const content = Array.isArray(json?.content) ? json.content : [];

    return {
      text: parseTextFromContent(content),
      toolCalls: parseToolCallsFromContent(content),
      raw: json,
    };
  }
}
