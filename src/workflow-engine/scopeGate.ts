import type { AdapterUseDeclaration } from "../adapters/governedAdapter.js";

export type ScopeGateDecision =
  | { allowed: true }
  | { allowed: false; denied: { code: string; reason: string } };

export function requireAdapterScope(params: {
  uses: AdapterUseDeclaration[];
  adapter: string;
  scope: string;
}): ScopeGateDecision {
  const adapter = String(params.adapter ?? "").trim();
  const scope = String(params.scope ?? "").trim();
  if (!adapter || !scope) {
    return { allowed: false, denied: { code: "SCOPE_GATE_INVALID", reason: "adapter and scope required" } };
  }

  const u = (params.uses ?? []).find((x) => String(x.adapter).trim() === adapter);
  if (!u) {
    return { allowed: false, denied: { code: "SCOPE_GATE_MISSING_ADAPTER", reason: `missing uses entry for adapter '${adapter}'` } };
  }

  const scopes = Array.isArray(u.scopes) ? u.scopes.map((s) => String(s).trim()) : [];
  if (!scopes.includes(scope)) {
    return {
      allowed: false,
      denied: { code: "SCOPE_GATE_MISSING_SCOPE", reason: `adapter '${adapter}' missing scope '${scope}'` },
    };
  }

  return { allowed: true };
}

/**
 * Lightweight scope checker for adapters.
 *
 * - If a Zod enum/schema is passed, validates the scope value.
 * - If `uses` + `adapter` are provided, additionally enforces that the workflow declared the scope.
 *
 * Throws on denial.
 */
export function checkScope(
  schema: { safeParse?: (v: unknown) => { success: boolean } } | null | undefined,
  scope: string,
  opts?: { uses?: AdapterUseDeclaration[]; adapter?: string }
) {
  const s = String(scope ?? "").trim();
  if (!s) throw new Error("SCOPE_GATE_INVALID: scope required");

  if (schema?.safeParse) {
    const ok = schema.safeParse(s);
    if (!ok?.success) throw new Error(`SCOPE_GATE_INVALID: invalid scope '${s}'`);
  }

  if (opts?.uses && opts?.adapter) {
    const d = requireAdapterScope({ uses: opts.uses, adapter: opts.adapter, scope: s });
    if (d.allowed === false) throw new Error(`${d.denied.code}: ${d.denied.reason}`);
  }

  return s;
}
