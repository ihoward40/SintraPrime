# Agent Mode Engine

## Agent Mode (API-only)

Validator → Planner → Executor pipeline and receipt logging: [docs/agent-mode-executor-v1.md](docs/agent-mode-executor-v1.md)

## Governance

GOVERNANCE_RELEASE: SintraPrime_Mode_Governance_v1.1
SUPERSEDES: SintraPrime_Mode_Governance_v1.0

GOVERNANCE_RELEASES (CITEABLE)

- SintraPrime_Mode_Governance_v1.0 (baseline; frozen)
- SintraPrime_Mode_Governance_v1.1 (delta; active)


Change Control:
All governance changes are tracked via explicit release deltas.
See governance-history.v1.md for a chronological index.

### Governance (Authoritative)

- Governance documents: [docs/governance/index.md](docs/governance/index.md)
  - Governance release record: [docs/governance/releases/SintraPrime_Mode_Governance_v1.0.md](docs/governance/releases/SintraPrime_Mode_Governance_v1.0.md)
  - Governance release record: [docs/governance/releases/SintraPrime_Mode_Governance_v1.1.md](docs/governance/releases/SintraPrime_Mode_Governance_v1.1.md)

For Watch Mode auditability, see the **Watch Mode v1 Spec → Implementation Map**, which documents implemented features and intentional non-implementations:  
[docs/watch-mode-spec-implementation-map.v1.md](docs/watch-mode-spec-implementation-map.v1.md)

### Governance Index

All governance, verification, transparency, and integrity specifications are enumerated in a single index for auditability and ease of review:

- **Governance Index (v1)**  
  [`docs/governance-index.v1.md`](docs/governance-index.v1.md)

The index is descriptive and versioned. Absence of a document implies non-implementation by design.

External reviewers can follow a read-only verification path in the **Public Verifier How-To**: [`docs/public-verifier-how-to.v1.md`](docs/public-verifier-how-to.v1.md).

> **v1.0 is frozen for evidentiary use. No semantic changes permitted.**
>
> Freeze/fork procedure: [docs/governance/freeze-v1-fork-v2.md](docs/governance/freeze-v1-fork-v2.md)

- **Current Governance Checkpoint:**  
  Phase X Lock v1.4 — Read-Only Analysis Integration  
  [phaseX-lock-v1.4](https://github.com/ihoward40/SintraPrime/releases/tag/phaseX-lock-v1.4)

## Windows path note

You may see the repo at both:

- `C:\Users\admin\agent-mode-engine`
- `C:\Users\admin\.sintraprime esm project\agent-mode-engine`

On this machine, the second path is a Windows junction that points to the first.
They are the same working tree.

Run commands from either path, but prefer `C:\Users\admin\agent-mode-engine` to avoid confusion.

## Speech tiers (stderr-only)

The CLI can emit optional "speech" lines to **stderr** for operator visibility.
Speech is derived-only (non-authoritative), does not change behavior, and does not affect the JSON emitted on stdout.

Enable speech with `SPEECH_TIERS` (comma-separated):

- `S3`: delta speech (notable changes)
- `S5`: autonomy/status speech
- `S6`: requalification + confidence feedback (threshold crossings)

Speech is also artifact-backed for auditability:

- `runs/speech-deltas/`
- `runs/speech-status/`
- `runs/speech-feedback/`

Example:

- `set SPEECH_TIERS=S3,S5,S6` (Windows `cmd`)

## Run Integrity Verification (CI)

To verify run artifact integrity in CI, use the built-in verifier.
Gate on the exit code only.

```bash
node verify-run.js runs --json > verify.json
```

GitHub Actions (one line, gate on exit code):

```yaml
- run: node verify-run.js runs --json > verify.json
```

Make.com (one line, Command module):

```bash
node verify-run.js runs --json > verify.json
```

- Exit code 0: all verified
- Exit code 1: verification failed or no verifiable runs present

The JSON output is informational and may be archived or parsed for reporting.
Verification is non-governing and does not initiate or block execution.

Additional one-page artifacts (for outsiders / regulators):

- System layers diagram: docs/system-layers-diagram.v1.md
- Audit integrity statement: docs/audit-integrity-statement.v1.md
- Audit integrity statements (by audience): docs/audit-integrity-statements.by-audience.v1.md
- System Layers Diagram (print-ready PDF): releases/diagrams/system-layers/v1.0.0/system-layers.pdf (SHA-256: releases/diagrams/system-layers/v1.0.0/system-layers.pdf.sha256)
- System Layers Diagram (vector SVG): releases/diagrams/system-layers/v1.0.0/system-layers.svg (SHA-256: releases/diagrams/system-layers/v1.0.0/system-layers.svg.sha256)
- System Layers Diagram (Court, Landscape PDF): releases/diagrams/system-layers-court-landscape/v1.0.0/system-layers.court.landscape.pdf (SHA-256: releases/diagrams/system-layers-court-landscape/v1.0.0/system-layers.court.landscape.pdf.sha256)

Watch Mode (outsider-facing):

- Watch Mode overview: docs/watch-mode-overview.v1.md
- Watch Mode platform & safety framing: docs/watch-mode-platform-safety.v1.md
- Watch Mode policy appendix (MD): docs/policy/watch-mode-policy-appendix.v1.md
- Watch Mode policy appendix (PDF): releases/policy-appendix/watch-mode/v1.0.2/SintraPrime_Policy_Appendix_Watch_Mode.pdf (SHA-256: releases/policy-appendix/watch-mode/v1.0.2/SintraPrime_Policy_Appendix_Watch_Mode.pdf.sha256)
- Watch Mode policy appendix (PDF, with diagram): releases/policy-appendix/watch-mode/v1.0.2/SintraPrime_Policy_Appendix_Watch_Mode_with_Diagram.pdf (SHA-256: releases/policy-appendix/watch-mode/v1.0.2/SintraPrime_Policy_Appendix_Watch_Mode_with_Diagram.pdf.sha256)

## Operator Fast UI (Tier-14)

Local-only “thin skin” UI that reads `runs/` and forwards existing `/<command>` calls.

- Start: `npx tsx src/cli/run-operator-ui.ts "/operator-ui web serve --port 3000"`
- Open: <http://127.0.0.1:3000>
- Selftest: `npx tsx src/cli/run-operator-ui.ts "/operator-ui web selftest"`
