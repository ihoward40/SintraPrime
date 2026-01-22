/**
 * Deterministic UUID derived from a 64-hex SHA256 string.
 * Sets version=4 and RFC4122 variant bits.
 */
export function uuidFromSha256Hex(sha256hex) {
  const hex = String(sha256hex || "").slice(0, 32);
  const b = Buffer.from(hex, "hex");

  if (b.length !== 16) {
    throw new Error("uuidFromSha256Hex expects >=32 hex chars");
  }

  // version 4
  b[6] = (b[6] & 0x0f) | 0x40;
  // variant 10xxxxxx
  b[8] = (b[8] & 0x3f) | 0x80;

  const s = b.toString("hex");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20, 32)}`;
}
