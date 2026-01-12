# Signing Keys (Public)

This folder holds **public** verification keys that may be referenced by CI verification gates.

- Do not commit private keys.
- `signing.ed25519.pub` (base64) is expected to be an Ed25519 public key (32 bytes, base64-encoded).

If no signatures are present in `runs/DEEPTHINK_*`, CI signature verification skips and remains green.
