# SintraPrime Installation Shapes (Windows) (v1.0.0)

## Status

- Version: v1.0.0
- Date: 2026-01-11
- Mode: descriptive (read-only)

---

## Shapes

### Headless background agent

- Installs: local files + local scheduler registration (optional).
- Runs: at boot (enforcement / verification posture only).
- Does not imply: automations, network access, or background execution of tasks.

### Dashboard-driven desktop tool

- Installs: local application UI.
- Runs: on demand (operator present).
- Does not imply: autonomous execution.

### CLI-only verifier

- Installs: verifier logic only.
- Runs: on demand.
- Intended for: third parties verifying artifacts.

### Locked, read-only evidence generator

- Installs: deterministic packaging/export tooling.
- Runs: on demand.
- Constraint: outputs are artifacts; no live capture or opinion layer implied.

---

## Boot vs On-Demand

- Boot posture is described by governance documents.
- On-demand actions require an explicit operator trigger.

See governance entrypoint: `docs/governance/index.md`.

---

## “Agent” vs “Automation” (Vocabulary)

- **Agent**: a program that can enforce policy and refuse actions by default.
- **Automation**: an execution of a task that produces output.

A system may have an agent without having automations enabled.
