"attempts": <number>, "successes": <number>, "errors": <number> }`
- `p95`: 95th percentile latency in milliseconds
- `receiptFile`: The name of the receipt file that was analyzed

---

## 2. `restart-supermemory.ps1`

This script is a proof runner that performs a series of checks to ensure Supermemory is functioning correctly.

**Checks Performed:**

1.  **Key Presence:** Verifies that a `SUPERMEMORY_API_KEY` is present (checks length only, never prints the key).
2.  **Indexing:** Indexes a slice of the repository (default: `src/`).
3.  **Positive Control:** Searches for a unique token that is guaranteed to be in the index.
4.  **Bait Token:** Searches for a unique token that is guaranteed *not* to be in the index.

### Usage

**Human Mode (full proof run with detailed output):**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ops\restart-supermemory.ps1
```

**Make.com Mode (for automation):**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ops\restart-supermemory.ps1 -MakeFriendly
```

**Make.com Pretty Debug Mode:**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ops\restart-supermemory.ps1 -MakeFriendlyPretty
```

**Optional Parameters:**

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File ops\restart-supermemory.ps1 `
  -Tag "sintraprime__prod__howard_trust__ops" `
  -IndexPath ".\src" `
  -WaitReceiptsMs 6000
```

### JSON Output Fields

- `status`: `ok` or `fail`
- `exitCode`: `0` for success, non-zero for failure (different codes for different failure types)
- `hits`: `{ "positive": <number>, "bait": <number> }`
- `p95`: 95th percentile latency in milliseconds
- `receiptFile`: The name of the receipt file that was analyzed

---

## The "MakeFriendly" Guarantee

When the `-MakeFriendly` or `-MakeFriendlyPretty` switch is used:

- **No extraneous output:** The scripts will not write to `stdout` or `stderr` using `Write-Host`, `Write-Output`, etc.
- **Captured output:** Output from external commands (like Node.js) is captured, not printed.
- **Single JSON object:** The script's entire output to `stdout` is a single, well-formed JSON object with no trailing newline.
- **Consistent exit code:** The script's exit code will match the `exitCode` field in the JSON payload.
- **Error trapping:** Even in the case of an unexpected error, the script will emit a valid JSON object with an error status.

This ensures that Make.com scenarios can reliably parse the script's output without any extra noise.

---

## A Note on Verification

As noted in the original instructions, the successful completion of the SintraPrime implementation should be verified through evidence, not just assertions. The workflow of using health endpoints, analyzing receipts, and running proof scripts like these is the correct approach to achieve this verification.

## Future Enhancements

A potential future enhancement is to add a `-Strict` mode to the scripts. This mode would:

1.  Verify that the Supermemory search and index CLIs exist.
2.  Verify that the CLIs return the expected schema.
3.  Output a `version` field in the Make-friendly JSON to allow for schema version enforcement in Make.com.
