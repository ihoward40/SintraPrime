# Clerk Quickstart (v1.0)

Purpose: **verify integrity** and **locate cited lines** without trusting the publisher.

## What this is / what this is not
- This system **preserves records** and **proves integrity**.
- It **does not make legal claims**.
- It **does not file anything**.
- It may prepare packets and indexes **without summarizing content**.

## Verify in under 2 minutes
1. Obtain a verification kit ZIP.
2. Run the verifier.
3. Look for **PASS**.

Example:
```bash
sintraprime-verify verify-bundle bundles/IRS-TRANSCRIPT-SET-002
```

Expected outcome:
- Artifact hashes match the manifest (SHA-256).
- Merkle root matches.
- (If present) signature checks pass.

## Review without reading everything
Use the Evidence Index and citations to jump directly to:
- source file
- page
- line

## Hostile audit replay
If someone asks “was it altered?”, focus on:
- hash-at-ingestion vs current hash
- ledger timeline replay
- outbound disabled status

No narrative is required—only the proofs.
