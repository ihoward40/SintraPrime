# Supermemory Operational Scripts Integration (v2)

This document describes the integration of the v2 Supermemory operational scripts into the SintraPrime repository. These scripts add even more robust validation, including `-Strict` mode for the receipts summary script and Node.js preflight checks, while maintaining a stable `v1` schema for Make.com compatibility.

---

## 1. `sm-receipts-summary.ps1` (v2)

This script reads Supermemory receipt files and generates a health summary.

### What `-Strict` Mode Does (NEW in v2)

When the `-Strict` flag is used, the script performs additional validation on the receipt file's tail:

1.  **Valid JSON:** Ensures there are valid JSON records.
2.  **Event Field:** Verifies that at least one record has an `event` field.
3.  **Supermemory Attempts:** Checks that at least one `sm.*` attempt was detected.
4.  **Secret Leakage Scan:** Scans for the presence of `"text"` or `"rawText"` property keys to prevent accidental secret leakage. If found, the script will fail.

If any of these strict checks fail, the script will set `status = "fail"` and `exitCode = 8`.

### Usage

**Human Mode (one-line health summary):**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ops\sm-receipts-summary.ps1
```

**Make.com Mode (for automation):**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ops\sm-receipts-summary.ps1 -MakeFriendly
```

**Make.com Pretty Debug Mode:**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ops\sm-receipts-summary.ps1 -MakeFriendlyPretty
```

### JSON Output Fields (v2)

- `version`: `"sm-make-v1"` (Stable)
- `strict`: `true` or `false` (NEW)
- `status`: `ok` or `fail`
- `exitCode`: `0` for success, `8` for strict mode failure, other non-zero for other failures
- `hits`: `{ "attempts": <number>, "successes": <number>, "errors": <number> }`
- `p95`: 95th percentile latency in milliseconds
- `receiptFile`: The name of the receipt file that was analyzed

---

## 2. `restart-supermemory.ps1` (v2)

This script is a proof runner that performs a series of checks to ensure Supermemory is functioning correctly.

### What `-Strict` Mode Does (Enhanced in v2)

When the `-Strict` flag is used, the script performs several layers of validation:

**1. Node.js Preflight Checks (NEW in v2):**
-   **Node Version:** Verifies that `node --version` runs and is not an ancient version.
-   **CLI Syntax Check:** Runs `node --check` on both the search and index CLIs to prove they are syntactically valid and parsable by Node.js.

**2. Core Validation Checks (from v1):**

1.  **Search & Index CLI Existence:** Verifies that both the search and index CLIs exist at their expected paths.
2.  **Search CLI Schema Validation:** Ensures the search CLI returns parseable JSON that matches one of the expected "v1-ish" shapes (e.g., a JSON array, or an object with an `items`, `results`, or `hits` property).
3.  **Index CLI JSON Output:** Requires the index CLI to output at least one parseable JSON object. If the indexer only prints human-readable logs, `-Strict` mode will intentionally fail.
4.  **Positive/Bait Search Conformance:** Ensures the output of the positive and bait token searches also conforms to the expected schema.

### Usage

**Human Mode (full proof run with detailed output):**

```powershell
# With strict validation
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ops\restart-supermemory.ps1 -Strict
```

**Make.com Mode (for automation):**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ops\restart-supermemory.ps1 -MakeFriendly -Strict
```

**Make.com Pretty Debug Mode:**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ops\restart-supermemory.ps1 -MakeFriendlyPretty -Strict
```

**Optional Parameters:**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ops\restart-supermemory.ps1 `
  -Tag "sintraprime__prod__howard_trust__ops" `
  -IndexPath ".\src" `
  -WaitReceiptsMs 6000
```

### JSON Output Fields (v2)

- `version`: `"sm-make-v1"` (Stable)
- `strict`: `true` or `false`
- `status`: `ok` or `fail`
- `exitCode`: `0` for success, non-zero for failure (different codes for different failure types)
- `hits`: `{ "positive": <number>, "bait": <number> }`
- `p95`: 95th percentile latency in milliseconds
- `receiptFile`: The name of the receipt file that was analyzed

---

## The "MakeFriendly" Guarantee (v2)

When the `-MakeFriendly` or `-MakeFriendlyPretty` switch is used:

- **`version` field:** The JSON output will always include a `version` field with the value `"sm-make-v1"`. This allows for robust routing and schema enforcement in Make.com.
- **No extraneous output:** The scripts will not write to `stdout` or `stderr` using `Write-Host`, `Write-Output`, etc.
- **Captured output:** Output from external commands (like Node.js) is captured, not printed.
- **Single JSON object:** The script's entire output to `stdout` is a single, well-formed JSON object with no trailing newline.
- **Consistent exit code:** The script's exit code will match the `exitCode` field in the JSON payload.
- **Error trapping:** Even in the case of an unexpected error, the script will emit a valid JSON object with an error status.

---

## A Note on `-Strict` and the Index CLI

**Strict mode requires the index CLI to output JSON.** If your index CLI currently only prints human-readable logs, `-Strict` mode will intentionally fail. To fix this, you should upgrade your index CLI to either:

-   Add a `--json` flag that enables JSON output.
-   Always print a final JSON summary line, e.g., `{"status":"ok","indexed":12,"skipped":0,"errors":0,"tag":"..."}`.

This is the recommended approach to make `-Strict` mode deterministic and audit-friendly.

---

## A Note on Verification

As noted in the original instructions, the successful completion of the SintraPrime implementation should be verified through evidence, not just assertions. The workflow of using health endpoints, analyzing receipts, and running proof scripts like these is the correct approach to achieve this verification.

---

## Recommended Next-Level Upgrades

Based on the v2 script upgrades, here are the recommended next steps for hardening your operational tooling:

1.  **Hard Schema Pinning:** Ship a `sm-make-v1.schema.json` file and have `-Strict` mode validate against it, rather than just performing shape checks. This eliminates parsing drift.
2.  **CLI Self-Test Verbs:** Add `--version`, `--self-test --json`, and `--schema --json` verbs to your Supermemory CLIs. This makes `-Strict` mode faster and more reliable.
3.  **Signed Receipts:** Add `receiptHash` (SHA-256), `chainHash` (hash chain), and an optional `ed25519Signature` to your receipts for a tamper-evident, court-safe audit trail.
4.  **Deterministic Timing:** Include `startedAt`, `endedAt`, `durationMs`, `p50`, `p95`, and `p99` in the Make-friendly JSON for more precise performance telemetry.
5.  **Stronger Secret Leakage Detection:** Scan for patterns resembling keys (prefixes, JWT-like blobs, high-entropy strings) in receipts and logs to prevent accidental data spills.
6.  **Idempotent Proof Runs:** Emit a `runId` and `idempotencyKey` in the script output and log it to receipts to prevent Make.com retries from creating phantom runs.
7.  **Make.com Router Hardening:** Create a dedicated Make.com sub-flow that parses the JSON, filters on `version == "sm-make-v1"`, routes by `exitCode`, and sends failures to a dead-letter queue.
8.  **One-Line Diagnostic Capsule:** In human mode, print a single summary line with pointers to the receipt file and the last error cause for faster debugging.
