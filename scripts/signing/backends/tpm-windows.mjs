// TPM backend placeholder.
//
// This intentionally does NOT implement TPM operations in-repo.
// To enable, wire it to a locally-installed tool that can produce:
// - a signature over provided bytes
// - an attestation object
//
// CI must remain green without TPM hardware; verification is presence-conditional.

export function createTpmWindowsSigner() {
  return {
    kind: "tpm-windows",
    sign() {
      throw new Error(
        "TPM signing backend is not implemented in-repo. Provide a local tool integration (out of scope for v1).",
      );
    },
    getPublicKeyB64() {
      throw new Error(
        "TPM signing backend is not implemented in-repo. Provide a local tool integration (out of scope for v1).",
      );
    },
    getAttestation() {
      return null;
    },
  };
}
