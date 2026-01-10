# Publish the Phase X ZIP (Operational Checklist)

Date: 2026-01-10

This checklist publishes the already-built Phase X deterministic ZIP **without changing the Phase X lock**.

## Inputs (authoritative)

- File: `dist/phaseX/ike-governance-phaseX.zip`
- Expected SHA-256: `8b94fb2456b4549ab8de76d0438e9853e889e65e7e7a441004c0fda3d35a1d2b`

## Step 1 — Verify ZIP hash locally

Windows PowerShell:

```powershell
Get-FileHash -Algorithm SHA256 dist\phaseX\ike-governance-phaseX.zip
```

Confirm the hash equals the expected value above.

## Step 2 — Place the ZIP where the public verifier can link it

Option A (recommended for GitHub Pages style hosting):

- Copy the ZIP to: `public-verifier/artifacts/ike-governance-phaseX.zip`

Note: This repo currently treats `dist/` as build output, so this publication step is intentionally separate.

Option B (external hosting):

- Upload the ZIP to a static host (S3/Cloudflare/R2/etc) and point the public verifier `url` to it.

## Step 3 — Verify the public-verifier manifest entry

The manifest entry is in `public-verifier/index.json` and should include:

- `sha256`: `8b94fb2456b4549ab8de76d0438e9853e889e65e7e7a441004c0fda3d35a1d2b`
- `url`: `./artifacts/ike-governance-phaseX.zip` (or your external URL)

## Step 4 — Browser verification

Open the public verifier page and:

1) Reload `index.json`
2) Select your local `ike-governance-phaseX.zip`
3) Confirm it matches the published SHA-256

## Guardrail

Do not regenerate or re-zip the bundle after publication unless you intend a new lifecycle (supersession).
The only acceptable way to publish is to publish the exact bytes that match the committed hash.
