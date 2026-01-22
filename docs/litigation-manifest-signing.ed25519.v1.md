# Litigation Manifest Signing — Ed25519 v1 (Design Spec)

Status: **Design-only (no runtime behavior yet)**  
Purpose: Add provenance (authenticity) to `BINDER_PACKET_MANIFEST.json` without changing packet determinism, grading semantics, or manifest contents.

---

## Canonicalization

**canonicalization id:** `stable-minified-v1`

The signature MUST be computed over canonical JSON bytes derived from the parsed manifest object (not raw file bytes), to prevent harmless formatting changes from invalidating signatures.

Rules:

- Parse `BINDER_PACKET_MANIFEST.json` as JSON.
- Serialize using **recursive stable key ordering** (all objects, all nesting levels).
- Serialize as **minified JSON** (no extra whitespace).
- Encode as **UTF-8** bytes.
- Line endings: canonical output has **no newlines** (minified). If a serializer emits a newline for any reason, it MUST be `\n` only (never `\r\n`).

Signed bytes = `stableMinifiedV1(manifestObject)` encoded as UTF-8.

---

## Artifacts

Signing MUST NOT modify `BINDER_PACKET_MANIFEST.json` or any existing evidence files.

When signing is performed, write:

1) `BINDER_PACKET_MANIFEST.sig`
- Contents: Ed25519 signature over canonical bytes.
- Encoding: base64 (preferred) or hex (must be stated in metadata).

2) `BINDER_PACKET_MANIFEST.sigmeta.json` (recommended, not required)
- Example fields:
  - `keyId` (string)
  - `algorithm` = `"Ed25519"`
  - `signedAtUtc` (RFC 3339 / ISO 8601 UTC)
  - `canonicalization` = `"stable-minified-v1"`
  - `encoding` = `"base64"` (or `"hex"`)
  - `toolVersion` (string)

A `.pub` file inside evidence folders is **not required**. Public keys are managed via key resolution rules below.

---

## Verifier Integration

### authorityChain

Add (when signing support is implemented):

`authorityChain.manifestSignature`:

- `present` (boolean)
- `valid` (boolean | null if cannot be evaluated)
- `keyId` (string | null)
- `algorithm` (`"Ed25519"` | null)
- `sigSha256` (string | null) — SHA-256 of `.sig` file bytes
- `pubKeySha256` (string | null) — SHA-256 of public key bytes used
- `signedAtUtc` (string | null)

### Warning Codes

Signature-related issues MUST be represented as warnings (not grade changes), so policy can enforce via `--fail-on`:

- `WARN_SIGNATURE_MISSING`
- `WARN_SIGNATURE_INVALID`
- `WARN_SIGNATURE_PUBKEY_MISSING`

These warnings are eligible for escalation using existing `--fail-on` mechanisms.

**Grade semantics must remain unchanged.**

---

## CLI Flags (Design)

Keep signing orthogonal to verification, and court-safe.

### Verify signature

- `--verify-signature`
- `--pub <path>` optional if key resolution succeeds

### Sign manifest

- `--sign`
- `--key <path-to-private-key>`
- `--key-id <id>` optional but recommended
- `--pub <path>` optional (used for metadata hashing / reporting; verification can resolve separately)

---

## Refusal Rules (Court-boring defaults)

Signing MUST be conservative and refuse in ambiguous contexts.

- `--sign` MUST refuse unless `exitReason === "OK"` (strongest rule; avoids signing questionable states).
- `--sign` MUST refuse if `BINDER_PACKET_MANIFEST.json` is missing or unparseable.
- `--sign` MUST refuse during `--auto-fix --apply` unless explicitly enabled by a dedicated override flag (e.g., `--allow-sign-after-refit`), to avoid “signed the clone” surprises.
- `--sign` MUST NOT regenerate, synthesize, reorder, or “fix” any evidence artifacts.

---

## Key Layout and Resolution

Default convention:

- Private key: `keys/<keyId>.ed25519`
- Public key:  `keys/<keyId>.ed25519.pub`

Resolution rules:

- If `--pub` is provided, use it.
- Else if `keyId` is known (from CLI `--key-id` or `sigmeta.keyId`), attempt:
  - `keys/<keyId>.ed25519.pub`
- If no public key can be resolved, emit `WARN_SIGNATURE_PUBKEY_MISSING`.

Evidence folders SHOULD NOT require a bundled public key for portability unless explicitly desired by policy.

---

## Determinism and Semantics Guarantee

- Signing is **post-build provenance only**.
- No changes to packet bytes, manifest hashes, exhibit ordering, or grading logic are permitted.
- Signature warnings are separate from grade and are enforceable only via policy (`--fail-on`).

End of spec.
