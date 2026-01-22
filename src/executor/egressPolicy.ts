import { domainToASCII } from "node:url";

export type HttpMethod = "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS";

export type EgressKind = "packet" | "binder" | "receipt" | "other";
export type EgressStage = "Notice" | "Cure" | "Default" | "Regulator Ready";

export interface EgressGuard {
  case_id: string;
  notion_page_id: string;
  stage?: EgressStage;
  kind?: EgressKind;
  override_reason?: string;
  override_by?: string;
}

export interface PlanStep {
  step_id?: string;
  name?: string;
  action?: string;
  url?: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  egress_guard?: EgressGuard;
}

export interface PlanState {
  // Set once any step with egress_guard is encountered.
  seen_guarded_step: boolean;

  // Set once any guarded external request was attempted.
  in_egress_chain: boolean;

  // Optional diagnostics.
  touched_hosts: Set<string>;
}

export interface EgressDecision {
  requires_guard: boolean;
  reason: string;
}

export interface EgressAllowlist {
  exactHosts: Set<string>;
  hostRegexes: RegExp[];
}

export type AllowlistMatch = "exact" | "regex" | "none";

function normalizeHost(host: string): string {
  const trimmed = String(host ?? "").trim();
  if (!trimmed) return "";

  // Strip any trailing dot(s) ("example.com." -> "example.com").
  const stripped = trimmed.replace(/\.+$/g, "");

  // Punycode normalize (best-effort) + lowercase.
  const ascii = domainToASCII(stripped) || stripped;
  return ascii.toLowerCase();
}

export function loadEgressAllowlistFromEnv(env: NodeJS.ProcessEnv = process.env): EgressAllowlist {
  const exact = String(env.EGRESS_ALLOWED_DOMAINS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const regexes = String(env.EGRESS_ALLOWED_DOMAINS_REGEX ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p) => new RegExp(p));

  return { exactHosts: new Set(exact), hostRegexes: regexes };
}

export function isHostAllowed(host: string, allow: EgressAllowlist): boolean {
  const h = normalizeHost(host);
  if (allow.exactHosts.has(h)) return true;
  return allow.hostRegexes.some((r) => r.test(h));
}

export function allowlistMatch(host: string, allow: EgressAllowlist): AllowlistMatch {
  const h = normalizeHost(host);
  if (!h) return "none";
  if (allow.exactHosts.has(h)) return "exact";
  if (allow.hostRegexes.some((r) => r.test(h))) return "regex";
  return "none";
}

function isExternalUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function hostOf(url: string): string {
  return normalizeHost(new URL(url).hostname);
}

function headerHas(step: PlanStep, key: string): boolean {
  const h = step.headers ?? {};
  const needle = key.toLowerCase();
  return Object.keys(h).some((k) => k.toLowerCase() === needle);
}

function hasAuthishHeaders(step: PlanStep): boolean {
  return (
    headerHas(step, "authorization") ||
    headerHas(step, "cookie") ||
    Object.keys(step.headers ?? {}).some((k) => k.toLowerCase().startsWith("x-csrf"))
  );
}

function nameLooksSendish(step: PlanStep): boolean {
  const s = `${step.name ?? ""} ${step.action ?? ""}`.toLowerCase();
  return /upload|submit|dispatch|send|portal|certified|mail|file|complaint|filed/.test(s);
}

export function initPlanState(): PlanState {
  return {
    seen_guarded_step: false,
    in_egress_chain: false,
    touched_hosts: new Set<string>(),
  };
}

export function requiresEgressGuard(step: PlanStep, state: PlanState): EgressDecision {
  const method = String(step.method ?? "GET").toUpperCase() as HttpMethod;
  const url = step.url;

  if (!isExternalUrl(url)) return { requires_guard: false, reason: "non_external_or_no_url" };

  if (method !== "GET" && method !== "HEAD") {
    return { requires_guard: true, reason: "non_get_non_head" };
  }

  if (state.in_egress_chain) {
    return { requires_guard: true, reason: "egress_chain_get" };
  }

  if (hasAuthishHeaders(step)) {
    return { requires_guard: true, reason: "auth_headers_get" };
  }

  if (nameLooksSendish(step)) {
    return { requires_guard: true, reason: "sendish_get" };
  }

  return { requires_guard: false, reason: "public_get" };
}

export function updatePlanStateAfterStep(step: PlanStep, state: PlanState, decision: EgressDecision) {
  if (isExternalUrl(step.url)) {
    try {
      state.touched_hosts.add(hostOf(String(step.url)));
    } catch {
      // best-effort only
    }
  }

  if (step.egress_guard) state.seen_guarded_step = true;
  if (decision.requires_guard && step.egress_guard && isExternalUrl(step.url)) state.in_egress_chain = true;
}

export function isNotionHost(hostname: string): boolean {
  return hostname.toLowerCase() === "api.notion.com";
}

export function isLocalHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1";
}

export function safeHostFromUrl(url: string): string | null {
  try {
    return normalizeHost(new URL(url).hostname);
  } catch {
    return null;
  }
}

export function redactUrlForLogs(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url;
  }
}
