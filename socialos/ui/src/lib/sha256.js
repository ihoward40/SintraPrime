import { canonicalStringify } from "./canonical_json.js";

export async function sha256HexFromCanonical(obj) {
  const text = canonicalStringify(obj);
  const enc = new TextEncoder();
  const data = enc.encode(text);
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, "0")).join("");
}
