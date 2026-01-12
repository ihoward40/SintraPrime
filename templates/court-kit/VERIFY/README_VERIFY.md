# Offline Verification Procedure (Court Kit)

This procedure verifies a sealed evidence bundle **offline**.

It produces one of two outcomes:

- **PASS**
- **FAIL**

## Run (one command)

From the repository root:

```powershell
node scripts/verify.js "templates/court-kit/BUNDLES/BUNDLE.zip" --strict
```

Replace `BUNDLE.zip` with the actual bundle filename.

## What the verifier does

It verifies the bundle contents against the bundle’s own declared file list and hashes, and prints a single verification report.

## How to read the result

On execution, the verifier prints a single status line:

- If you see `OK` (e.g., `[OK] audit bundle verify`), the outcome is **PASS**.
- If you see `FAIL` (e.g., `[FAIL] audit bundle verify`), the outcome is **FAIL**.

The verifier also prints a JSON report to stdout. Preserve that JSON report exactly as printed.

## Constraints

- Offline use.
- Read-only: do not modify the bundle.

