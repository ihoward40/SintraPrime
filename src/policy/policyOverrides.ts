import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";

export type PolicyOverrides = {
  browser?: {
    allow?: string[];
    /** Optional ISO timestamp; if in the past, browser overrides are ignored. */
    expires_at?: string;
  };
  shell?: {
    /** If true, shell stdout/stderr are written without redaction. */
    allow_plaintext_logs?: boolean;
  };
};

type LoadParams = { cwd?: string; overridesPath?: string; now?: Date };

let cachedSync: { p: string; value: PolicyOverrides; loadedAtMs: number } | null = null;
let cachedAsync: { p: string; value: PolicyOverrides; loadedAtMs: number } | null = null;

function defaultPath(cwd: string) {
  return path.join(cwd, "policy.overrides.json");
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function parseOverrides(obj: unknown, now: Date): PolicyOverrides {
  if (!isRecord(obj)) return {};

  const out: PolicyOverrides = {};

  const browserRaw = (obj as any).browser;
  if (isRecord(browserRaw)) {
    const expiresAt = typeof browserRaw.expires_at === "string" ? browserRaw.expires_at.trim() : "";
    let expired = false;
    if (expiresAt) {
      const d = new Date(expiresAt);
      expired = !Number.isFinite(d.getTime()) || d.getTime() <= now.getTime();
    }

    if (!expired) {
      const allow = Array.isArray(browserRaw.allow) ? browserRaw.allow.map((s) => String(s).trim()).filter(Boolean) : [];
      out.browser = {
        allow,
        ...(expiresAt ? { expires_at: expiresAt } : {}),
      };
    }
  }

  const shellRaw = (obj as any).shell;
  if (isRecord(shellRaw)) {
    const allowPlain = shellRaw.allow_plaintext_logs === true;
    out.shell = { allow_plaintext_logs: allowPlain };
  }

  return out;
}

export async function loadPolicyOverrides(params?: LoadParams): Promise<PolicyOverrides> {
  const cwd = typeof params?.cwd === "string" && params.cwd.trim() ? params.cwd : process.cwd();
  const now = params?.now instanceof Date ? params.now : new Date();
  const p =
    typeof params?.overridesPath === "string" && params.overridesPath.trim() ? params.overridesPath : defaultPath(cwd);

  if (cachedAsync && cachedAsync.p === p) return cachedAsync.value;

  try {
    const raw = await fsp.readFile(p, "utf8");
    const obj = JSON.parse(raw);
    const value = parseOverrides(obj, now);
    cachedAsync = { p, value, loadedAtMs: Date.now() };
    return value;
  } catch {
    const value: PolicyOverrides = {};
    cachedAsync = { p, value, loadedAtMs: Date.now() };
    return value;
  }
}

export function loadPolicyOverridesSync(params?: LoadParams): PolicyOverrides {
  const cwd = typeof params?.cwd === "string" && params.cwd.trim() ? params.cwd : process.cwd();
  const now = params?.now instanceof Date ? params.now : new Date();
  const p =
    typeof params?.overridesPath === "string" && params.overridesPath.trim() ? params.overridesPath : defaultPath(cwd);

  if (cachedSync && cachedSync.p === p) return cachedSync.value;

  try {
    const raw = fs.readFileSync(p, "utf8");
    const obj = JSON.parse(raw);
    const value = parseOverrides(obj, now);
    cachedSync = { p, value, loadedAtMs: Date.now() };
    return value;
  } catch {
    const value: PolicyOverrides = {};
    cachedSync = { p, value, loadedAtMs: Date.now() };
    return value;
  }
}

export function getBrowserAllowOverrides(overrides: PolicyOverrides): string[] {
  const allow = overrides.browser?.allow;
  return Array.isArray(allow) ? allow : [];
}
