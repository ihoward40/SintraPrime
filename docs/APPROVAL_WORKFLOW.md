# Approval Workflow (Approve-by-Hash)

SintraPrime shipping/publishing gates require **approve-by-hash**.

This means:

- `05_hash/manifest_sha256.txt` is the run’s canonical content hash for approval.
- `05_hash/approval.json` must contain `approved:true` and a matching `manifest_sha256`.

## Operator flow

1. Create a run (G3 when shipping/publishing is intended)

```bash
npm run -s run:new -- --tag CASEFILE --objective "..." --governance G3
```

1. Verify the run (optional but recommended)

```bash
npm run -s verify:run -- --run-id RUN-... --json
```

1. Approve the run (typo-proof)

```bash
npm run -s approve:run -- --run-id RUN-... --by "Isiah Tarik Howard" --note "Approved for ship"
```

`approve:run` updates `05_hash/approval.json` and (by default) refreshes `ledger.jsonl` so `verify-run.js` stays green.

1. Ship / publish

```bash
npm run -s run:ship -- --run-id RUN-...
# or
npm run -s run:publish -- --run-id RUN-...
```

## Versioning rule (recommended)

Bump the repo `package.json` version whenever changing any of:

- run directory structure
- hashing / verifier semantics
- ship/publish gate logic
- ledger schemas or record kinds
- approval schema fields required for shipping

This keeps provenance meaningful in logs and receipts.
