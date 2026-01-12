// Pluggable signer interface (Tier 1 / Tier 2 backends).
//
// Contract:
// - sign(bytes: Uint8Array) -> { sigB64: string, kind: string }
// - getPublicKeyB64() -> string
// - getAttestation() -> object | null
//
// IMPORTANT: This module is not used by DeepThink by default.

import { createSoftwareEd25519Signer } from "./backends/software-ed25519.mjs";
import { createTpmWindowsSigner } from "./backends/tpm-windows.mjs";

export function createSigner({ backend, secretKeyPath }) {
  if (backend === "software-ed25519") {
    return createSoftwareEd25519Signer({ secretKeyPath });
  }
  if (backend === "tpm-windows") {
    return createTpmWindowsSigner();
  }
  throw new Error(`Unknown signer backend: ${backend}`);
}
