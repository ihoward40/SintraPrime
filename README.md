# Agent Mode Engine

## Agent Mode (API-only)

Validator → Planner → Executor pipeline and receipt logging: [docs/agent-mode-executor-v1.md](docs/agent-mode-executor-v1.md)

## Governance

### Governance (Authoritative)

- Governance documents: [docs/governance/index.md](docs/governance/index.md)

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

## Operator Fast UI (Tier-14)

Local-only “thin skin” UI that reads `runs/` and forwards existing `/<command>` calls.

- Start: `npx tsx src/cli/run-operator-ui.ts "/operator-ui web serve --port 3000"`
- Open: <http://127.0.0.1:3000>
- Selftest: `npx tsx src/cli/run-operator-ui.ts "/operator-ui web selftest"`
