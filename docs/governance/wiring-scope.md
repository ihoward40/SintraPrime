# Governance Wiring Scope Declaration

**Status:** Draft (Required for any wiring change)
**Change Type:** ☐ New wiring ☑ Modification ☐ Removal
**Branch:** copilot/implement-credit-monitoring-system
**Scope Hash (SHA-256):** ____________________
**Prepared By:** ____________________
**Date (UTC):** 2026-02-03

---

## 1. Purpose of This Change

Stabilize deterministic smoke vector execution on Windows, and add tooling/integration wiring used by local runtime paths (speech sink integration, env loading helper, deterministic automations schema snapshot generator).

---

## 2. Specifications Being Wired

List the exact spec(s), schema(s), or template(s) being connected to runtime behavior.

- Spec / Schema Name: Smoke vectors runner (deterministic local mock server)
	- File Path: scripts/smoke-vectors.js

- Spec / Schema Name: Automations schema snapshot (deterministic fingerprint)
	- File Path: scripts/schema-snapshot-automations.mjs
	- Output: scripts/schema-snapshots/automations.schema-snapshot.json

- Spec / Schema Name: Speech sink integration (ElevenLabs)
	- File Path: src/speech/sinks/elevenLabsSink.ts
	- Wiring: src/speech/sinks/index.ts

---

## 3. Execution Paths Affected (Explicit)

List every execution path that will change.

- Path / Module: scripts/smoke-vectors.js
	- Before: local mock server could leak on Windows and hold port 8787, causing cross-run nondeterminism.
	- After: PID tracking + stale-process cleanup + forced shutdown fallback to keep vectors deterministic across repeated runs.

- Path / Module: scripts/schema-snapshot-automations.mjs
	- Before: no deterministic automations snapshot generator.
	- After: snapshot tool generates stable per-file hashes and a manifest hash.

- Path / Module: src/speech/sinks/*
	- Before: no ElevenLabs sink.
	- After: ElevenLabs sink available via env configuration and registered in sink index.

---

## 4. Execution Paths Explicitly **Not** Affected

List related paths that are intentionally untouched.

- Path / Module: live webhook smoke path
	- Reason for non-impact: remote webhook smoke runner remains available behind the explicit smoke:webhook script; default smoke remains local.

---

## 5. Authority Impact Assessment

☐ No authority expansion  
☐ Authority expansion (explain below)

☑ No authority expansion

If any authority is expanded, specify:
- Previous authority boundary:
- New authority boundary:
- Mitigations / controls:

---

## 6. Safety & Restraint Controls

Describe controls that prevent overreach.

- Refusal logging impact:
- Demo/Observe mode protections:
- Kill switches / guards:

---

## 7. Backward Compatibility

☐ Existing runs unaffected  
☐ Existing runs affected (explain)

---

## 8. Validation & Evidence

- Tests added or updated:
- Manual verification steps:
- Evidence artifacts produced:

- Tests added or updated: smoke:vectors determinism hardened; existing smoke vectors validate behavior.
- Manual verification steps: run npm run typecheck; run npm run smoke:vectors twice back-to-back on Windows.
- Evidence artifacts produced: scripts/schema-snapshots/automations.schema-snapshot.json; smoke vector output artifacts under runs/.

---

## 9. Non-Regression Statement

> This change does not silently activate previously inert specifications and does not
> alter governance semantics beyond what is explicitly described above.

**Signature:** ____________________  
**Role:** ____________________
