# Phase X — Freeze & Notarization (Governance Snapshot)

This folder defines the **Phase X freeze mechanism** for this repo.

The goal is to produce a **defensible, reproducible snapshot** of the governed surface:

- Notion command-surface artifacts (`notion/` + the button contract)
- Make execution artifacts (`make-gmail-slack-automation/`, `scenarios/`, lint profiles)
- Slack workflow governance artifacts (`slack/`)
- The repo-side validators that enforce the above (`scripts/*.mjs`)

This is **integrity tooling**. It is not legal advice.

---

## The contract

- A freeze is represented by a committed lock file:
  - `governance/freeze/phaseX.lock.json`
- CI will verify that the lock exactly matches the current governed files:
  - `npm run -s ci:phaseX-freeze-verify`

For local parity (operator command), use:

- `npm run -s phaseX:freeze-verify`

If the lock file does not exist, CI **no-ops** (Phase X not declared yet).

For a distribution-style submission kit, a separate release lock can be used:

- `governance/freeze/release.lock.json`
- CI verifier: `npm run -s ci:release-freeze`

If `release.lock.json` does not exist, CI **no-ops**.

---

## Operator workflow (recommended)

1) Ensure CI is green.
2) Commit your working tree changes.
3) Run the freeze generator:

```bash
npm run -s phaseX:freeze
```

Outputs:
- `governance/freeze/phaseX.lock.json` (commit this to declare the freeze)
- `dist/phaseX/ike-governance-phaseX.zip` (ignored by git)
- `dist/phaseX/ike-governance-phaseX.zip.sha256` (ignored by git)
- `governance/freeze/phaseX.roothash.txt` (ignored by git; convenience for timestamping)

4) Optional: RFC-3161 timestamping scaffold:

```bash
npm run -s phaseX:timestamp -- --tsa <TSA_URL>
```

This generates a timestamp query and (optionally) submits it to the TSA.
Outputs are written under `governance/freeze/rfc3161/`.

If you are using `release.lock.json` as a hard gate, commit the TSA response referenced by the lock.

---

## Declaring an authoritative freeze

When you are ready to declare the freeze as authoritative:

1) Ensure your git working tree is clean.
2) Run `npm run -s phaseX:freeze` (no `--allow-dirty`).
3) Run `npm run -s phaseX:freeze-verify`.
4) Commit the lock:

```bash
git add governance/freeze/phaseX.lock.json
git commit -m "Phase X freeze lock (authoritative)"
```

---

## Release bundle (submission kit)

To build a deterministic `release.bundle.zip` plus `hashes.json` and a `release.lock.json` stub:

```bash
npm run -s phaseX:release-bundle
```

Outputs:
- `dist/phaseX/release.bundle.zip` (ignored by git)
- `governance/freeze/hashes.json` (commit)
- `governance/freeze/hashes.sha256.txt` (commit)
- `governance/freeze/release.lock.json` (commit, then fill RFC-3161 fields)

---

## Notes

- The freeze script defaults to requiring a clean git working tree.
- If you intentionally want to generate a draft while dirty, use:

```bash
npm run -s phaseX:freeze -- --allow-dirty
```

### Optional hardening: timestamp-required mode

If you want CI to require RFC-3161 evidence (instead of treating it as additive), run verification with:

```bash
PHASEX_REQUIRE_TIMESTAMP=1 npm run -s ci:phaseX-freeze-verify
```

On Windows PowerShell:

```powershell
$env:PHASEX_REQUIRE_TIMESTAMP='1'
npm run -s ci:phaseX-freeze-verify
```

On Windows cmd.exe:

```bat
set PHASEX_REQUIRE_TIMESTAMP=1&& npm run -s ci:phaseX-freeze-verify
```

Default remains **off** unless you explicitly set the env var.
