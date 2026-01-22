import crypto from "node:crypto";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

export function stableClone(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(stableClone);
  if (!isPlainObject(value)) return value;

  const keys = Object.keys(value).sort((a, b) => a.localeCompare(b, "en"));
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = stableClone((value as any)[k]);
  return out;
}

export function stableStringify(value: unknown, opts?: { indent?: number; trailingNewline?: boolean }): string {
  const indent = typeof opts?.indent === "number" ? opts.indent : 2;
  const trailingNewline = opts?.trailingNewline !== false;
  const text = JSON.stringify(stableClone(value), null, indent);
  return trailingNewline ? text + "\n" : text;
}

export function sha256Hex(data: string | Buffer): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function stableHash(value: unknown): string {
  const canonical = stableStringify(value, { indent: 0, trailingNewline: false });
  return `sha256:${sha256Hex(canonical)}`;
}
