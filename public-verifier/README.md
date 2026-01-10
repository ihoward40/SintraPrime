# Public Verifier (Static)

This folder is a **trust-minimized, static verifier** for public artifacts.

## Contract

- `index.json` is the append-only manifest.
- Verification is **client-side** SHA-256 using browser WebCrypto.
- The verifier is **read-only**: it does not assert any new facts.

## Hosting

- GitHub Pages: publish this folder as the site root.
- Cloudflare Pages / S3 static hosting also works.

## Update flow (recommended)

1. Add a new artifact entry to `index.json` (append-only).
2. Publish the artifact under `public-verifier/artifacts/` (or an external URL).
3. Ensure CI passes `npm run -s ci:public-verifier`.
