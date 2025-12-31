# One-Shot Build Doctrine v1.1 (Additive)

## Relationship to v1.0
v1.1 is additive. It does not modify v1.0 semantics.

v1.0 remains frozen: see `docs/ONE_SHOT_BUILD_DOCTRINE.v1.0.md`.

## Additions in v1.1

### 1) CI Guardrail (Dry-Run Only)
When `CI=1` is present in the environment:
- the one-shot runner must refuse non-dry-run execution
- only `--dry-run` is permitted

Rationale: prevent accidental artifact creation and prevent timestamp drift caused by CI retries.

### 2) Batch Runner (Single Master Timestamp)
Batch execution is permitted via a separate orchestrator:
- `scripts/one-shot-build-batch.ts`
- all cases in the batch share the same locked `--now`
- each case writes to its own output root under `deliverables/v1.0/batch/<CASE>/...`
- each case emits its own `RUN_PROVENANCE.json`

Batch input must not contain duplicates. Duplicate case IDs are a hard error.

### 3) Public Verifier (Mirror-Only)
A read-only verifier is provided:
- `scripts/public-verify-mirror.ts`

It must:
- consume only a mirror directory
- verify the feed signature and referenced blob hashes
- emit a receipt (`PUBLIC_VERIFY_RECEIPT.json`)

It must not:
- access sources
- rebuild artifacts
- require secrets

### 4) Transparency Surface (Static Index)
The mirror site builder emits a minimal transparency page:
- `index.html` at the mirror root

The page:
- lists objects and links to content-addressed blobs
- points to `feed/latest.json`, `feed/latest.sig`, and `feed/PUBLIC_KEY.pem`
- includes a deterministic “Generated at: <NOW> (UTC)” line based on the feed timestamp

No runtime services are required.

## Amendment Rule
v1.1 is immutable. Any behavioral changes require a new versioned doctrine document (v1.2, v2.0, etc.).
