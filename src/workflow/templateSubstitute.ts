function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function substituteTemplatesDeep<T>(value: T, vars: Record<string, string>): T {
  const subString = (s: string) =>
    s.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_m, key) => {
      if (!(key in vars)) {
        throw new Error(`Missing template variable: ${key}`);
      }
      return String(vars[key]);
    });

  const walk = (v: unknown, depth: number): unknown => {
    if (depth > 12) return v;
    if (v === null || v === undefined) return v;
    if (typeof v === "string") return subString(v);
    if (typeof v === "number" || typeof v === "boolean") return v;
    if (Array.isArray(v)) return v.map((x) => walk(x, depth + 1));
    if (isRecord(v)) {
      const out: Record<string, unknown> = {};
      for (const k of Object.keys(v)) out[k] = walk(v[k], depth + 1);
      return out;
    }
    return v;
  };

  return walk(value, 0) as T;
}
