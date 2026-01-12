# Watch Mode — Level 1–3 Safe Escalations (Spec Text)

This document is governance text.
It is normative where it uses MUST/SHOULD/MAY.

## 1) Run-Ledger Documentation Baseline Binding (Spec Text)

**Purpose:**
Bind every Watch Mode run to an explicit, immutable documentation baseline so execution context can never drift silently.

### Specification (normative)

**Declaration Requirement**
Every Watch Mode run **MUST declare** the documentation baseline under which it operates.

This declaration is **descriptive**, not executable.

### Required Fields (Run Manifest / Header)

```json
{
  "documentation_baseline": {
    "watch_mode_docs": {
      "baseline_tag": "watch-mode-docs-v1",
      "baseline_commit": "<git_commit_hash>",
      "addendum_tag": "watch-mode-docs-v1.1",
      "addendum_commit": "<git_commit_hash>"
    }
  }
}
```

### Ledger Requirement (First Entry)

The first event in the run ledger **MUST** be:

```json
{
  "event": "DECLARE_DOCUMENTATION_BASELINE",
  "baseline_tag": "watch-mode-docs-v1",
  "addendum_tag": "watch-mode-docs-v1.1",
  "ts": "<ISO-8601 timestamp>"
}
```

### Governance Note

- Runs **without** a declared documentation baseline are **non-compliant by design**
- Absence of declaration triggers a **refusal**, not fallback behavior
- This binding enables post-hoc verification without relying on video artifacts

## 2) Watch Mode Video Hashing (Spec + Naming Convention)

**Purpose:**
Treat Watch Mode recordings as verifiable observational artifacts, not illustrative media.

### Artifact Classification

Watch Mode videos are classified as:

> **Observational Evidence (Non-Deterministic)**

They corroborate actions but do not replace ledger-based verification.

### Hashing Requirement

Each Watch Mode video **MUST** have a sidecar SHA-256 hash file.

### Naming Convention

```
screen/
├── notion.mp4
├── notion.mp4.sha256
├── make.mp4
├── make.mp4.sha256
├── slack.mp4
├── slack.mp4.sha256
```

### Hash File Format (plain text)

```
<sha256_hash>  <filename>
```

### Governance Notes

- Video hashes protect against post-run tampering
- Videos are **never** authoritative alone
- Determinism relies on: plan + apply artifacts + ledger

## 3) Public Verifier Cut — Sanitized Evidence Bundle (Design)

**Purpose:**
Provide third parties a **safe, non-executing, non-privileged** verification bundle.

### Design Principles

- No secrets
- No tokens
- No write capability
- No executable code
- Verifiable by hash alone

### Bundle Structure

```
public_verifier/
├── README.md
├── documentation/
│   ├── watch-mode-spec-implementation-map.v1.md
│   ├── watch-mode-spec-implementation-map.v1.1.addendum.md
│   └── watch-mode-transparency-report.v1.md
├── run_declaration/
│   ├── documentation_baseline.json
│   └── documentation_baseline.json.sha256
├── ledger/
│   ├── ledger.header.json
│   └── ledger.header.json.sha256
├── video_hashes/
│   ├── notion.mp4.sha256
│   ├── make.mp4.sha256
│   └── slack.mp4.sha256
└── checksums/
    └── public_verifier.sha256
```

### Explicit Exclusions

The public verifier cut **does not include**:

- Full ledgers
- Video files
- API credentials
- Internal configs
- Execution plans

### README.md (one-paragraph purpose)

> This bundle allows independent verification that a Watch Mode run declared and adhered to a specific documentation baseline, without granting access to execution systems or sensitive data.

## 4) Level 1–3 Safety Escalations (Non-Theatrical)

### A. Claims Boundary (Transparency Report Insert)

```md
### Claims Boundary

Watch Mode provides visual corroboration of system actions.
It does not independently guarantee authorization, correctness, legal sufficiency, or outcome.
```

### B. Version Compatibility Table (Additive)

```md
### Documentation Compatibility

| Run Date | Docs Baseline | Addendum | Compatible |
|--------|--------------|----------|------------|
| 2026-01-11 | v1 | v1.1 | Yes |
```

### C. Deterministic Replay Assertion (v1.1 Addendum)

```md
Watch Mode recordings are observational artifacts.
Deterministic replay relies on plan, apply, and ledger artifacts, not video.
```

### D. Optional Metadata Binding (Allowed, Not Required)

Videos **MAY** embed the documentation tag hash as metadata for correlation.
Absence of metadata does not invalidate the run if hashes are present.
