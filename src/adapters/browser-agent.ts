import path from "node:path";
import fs from "node:fs/promises";
import { getBrowserAllowOverrides, loadPolicyOverrides } from "../policy/policyOverrides.js";

export type BrowserAllowlist = {
  allow: string[];
};

let cachedAllowlist: Set<string> | null = null;
let cachedAllowlistPath: string | null = null;

export async function loadBrowserAllowlist(params?: { cwd?: string; allowlistPath?: string }): Promise<Set<string>> {
  const cwd = typeof params?.cwd === "string" && params.cwd.trim() ? params.cwd : process.cwd();
  const p =
    typeof params?.allowlistPath === "string" && params.allowlistPath.trim()
      ? params.allowlistPath
      : path.join(cwd, "browser.allowlist.json");

  if (cachedAllowlist && cachedAllowlistPath === p) return cachedAllowlist;

  try {
    const raw = await fs.readFile(p, "utf8");
    const obj = JSON.parse(raw) as BrowserAllowlist;
    const allow = Array.isArray(obj?.allow) ? obj.allow.map((s) => String(s).trim()).filter(Boolean) : [];
    const overrides = await loadPolicyOverrides({ cwd });
    const extra = getBrowserAllowOverrides(overrides);
    cachedAllowlist = new Set([...allow, ...extra].map((s) => String(s).trim()).filter(Boolean));
    cachedAllowlistPath = p;
    return cachedAllowlist;
  } catch {
    cachedAllowlist = new Set();
    cachedAllowlistPath = p;
    return cachedAllowlist;
  }
}

export function isAllowlistedHost(allow: Set<string>, hostname: string): boolean {
  const h = String(hostname ?? "").trim().toLowerCase();
  if (!h) return false;
  // Exact match only (secure default).
  return allow.has(h);
}
