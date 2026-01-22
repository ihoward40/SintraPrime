import crypto from "node:crypto";

export function sha256Hex(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), "utf8");
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/**
 * Canonical JSON stringify to keep hashes deterministic.
 * - Sorts object keys
 * - No whitespace
 */
export function canonicalJson(obj) {
  return JSON.stringify(obj, (key, value) => {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.keys(value)
        .sort()
        .reduce((acc, k) => {
          acc[k] = value[k];
          return acc;
        }, {});
    }
    return value;
  });
}

export function hashCanonicalJson(obj) {
  return sha256Hex(canonicalJson(obj));
}
