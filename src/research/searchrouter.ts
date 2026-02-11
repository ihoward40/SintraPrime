import crypto from "node:crypto";

type SearchRouterMode = "quick" | "deep";

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function sha256Hex(s: string) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export type SearchRouterInput = {
  intent: "web_search" | "source_lookup";
  query: string;
  mode: SearchRouterMode;
  policy_context: {
    mode: string;
    tier: "T0" | "T1" | "T2" | "T3";
    risk_tags: string[];
    budget_class: "LOW" | "MEDIUM" | "HIGH";
  };
  constraints?: {
    domains_allowlist?: string[];
    recency_days?: number;
  };
};

export type SearchRouterOutput = {
  provider: string;
  mode: SearchRouterMode;
  model?: string;
  result_count: number;
  results: Array<{ title: string; snippet: string; url: string; published_at?: string }>;
  sources: string[];
  generated_at?: string;
};

export async function runSearchRouterV1(args: {
  execution_id: string;
  step_id: string;
  timeoutMs: number;
  input: unknown;
}): Promise<SearchRouterOutput> {
  if (!isRecord(args.input)) {
    throw new Error("SearchRouter payload must be an object");
  }

  const mode = (args.input.mode === "deep" ? "deep" : "quick") as SearchRouterMode;
  const query = typeof args.input.query === "string" ? args.input.query : "";
  const intent = args.input.intent;

  if (intent !== "web_search" && intent !== "source_lookup") {
    throw new Error(`SearchRouter invalid intent: ${String(intent)}`);
  }
  if (!query.trim()) {
    throw new Error("SearchRouter query is required");
  }

  // Default behavior: deterministic offline response unless an explicit endpoint is configured.
  const endpoint = String(process.env.SEARCHROUTER_ENDPOINT ?? "").trim();
  if (!endpoint) {
    const seed = sha256Hex(`${args.execution_id}:${args.step_id}:${query}`);
    return {
      provider: "offline",
      mode,
      result_count: 0,
      results: [],
      sources: [
        "SEARCHROUTER_ENDPOINT not set; returned deterministic empty result set",
        `seed=${seed}`,
      ],
      generated_at: new Date().toISOString(),
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), args.timeoutMs);
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ execution_id: args.execution_id, step_id: args.step_id, input: args.input }),
      signal: controller.signal,
    });

    const text = await res.text();
    let json: any = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }

    if (!res.ok) {
      throw new Error(`SearchRouter endpoint failed (${res.status}): ${text.slice(0, 500)}`);
    }

    if (!json || typeof json !== "object") {
      throw new Error("SearchRouter endpoint returned non-JSON response");
    }

    // Best-effort shape normalization.
    const provider = typeof json.provider === "string" && json.provider ? json.provider : "custom";
    const outMode = json.mode === "deep" ? "deep" : "quick";
    const resultsRaw = Array.isArray(json.results) ? json.results : [];
    const results = resultsRaw
      .map((r: any) => ({
        title: typeof r?.title === "string" ? r.title : "",
        snippet: typeof r?.snippet === "string" ? r.snippet : "",
        url: typeof r?.url === "string" ? r.url : "",
        published_at: typeof r?.published_at === "string" ? r.published_at : undefined,
      }))
      .filter((r: any) => r.title && r.url);

    const sources = Array.isArray(json.sources) ? json.sources.map((s: any) => String(s)) : [];

    return {
      provider,
      mode: outMode,
      model: typeof json.model === "string" ? json.model : undefined,
      result_count:
        typeof json.result_count === "number"
          ? json.result_count
          : Array.isArray(results)
            ? results.length
            : 0,
      results,
      sources,
      generated_at: typeof json.generated_at === "string" ? json.generated_at : new Date().toISOString(),
    };
  } finally {
    clearTimeout(timeout);
  }
}
