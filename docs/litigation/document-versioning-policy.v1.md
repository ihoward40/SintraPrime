# Document Versioning Policy (v1)

**Governance artifact — process documentation only**  
**Drafted documents must never be overwritten. Each version is preserved with its own hash and metadata.**

---

## Purpose

This policy governs version preservation for all drafted documents in the litigation workflow. It prevents accidental overwrite of prior drafts and preserves the complete revision history of every document with an auditable chain.

---

## Policy

### Core Rule

**No drafted document may be overwritten.** When a document is revised:

1. The existing file is retained in place with its version suffix.
2. A new file is created with the next sequential version suffix.
3. The new version's metadata records the prior version ID for traceability.

### Versioning Convention

Documents are named using the following convention:

```
{DocumentType}_v{N}.{ext}
```

Examples:
- `Notice_v1.pdf`
- `Notice_v2.pdf`
- `Notice_v3.pdf`
- `DemandLetter_v1.docx`
- `CasePacket_v1.pdf`
- `CasePacket_v2.pdf`

Version numbers are sequential integers starting at 1. No skipping, no suffix modifiers (e.g., `_v1a` is not permitted — use `_v2` instead).

### Metadata Requirements

Each version must have a corresponding metadata entry in the Document Version manifest:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `document_id` | string | Yes | Stable identifier for the document (all versions share this) |
| `version` | integer | Yes | Sequential version number (1, 2, 3, …) |
| `case_id` | string | Yes | Parent case identifier |
| `document_type` | string | Yes | E.g., `notice`, `demand_letter`, `case_packet`, `exhibit` |
| `filename` | string | Yes | Exact filename including version suffix and extension |
| `sha256` | string | Yes | SHA-256 hex hash of the file at the time of version creation |
| `created_at` | datetime | Yes | ISO 8601 UTC timestamp when this version was created |
| `created_by` | string | Yes | Author or system that produced this version |
| `supersedes_version` | integer | No | Version number of the prior version (null for v1) |
| `status` | enum | Yes | `draft` / `pending_approval` / `approved` / `submitted` / `superseded` / `archived` |
| `notes` | string | No | Description of changes from prior version |

### Status Transitions

```
draft → pending_approval → approved → submitted
                                    → superseded (if a newer version is created after approval)
```

Once a version is `submitted`, it is immutable. A new version must be created for any subsequent changes.

---

## Example: CASE-666234B709 Document Versions

```yaml
case_id: CASE-666234B709
manifest_version: "1"
generated: "2026-07-03"

documents:

  - document_id: DOC-CASE666234B709-NOTICE-001
    version: 1
    case_id: CASE-666234B709
    document_type: notice
    filename: Notice_v1.pdf
    sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    created_at: "2026-07-03T10:00:00Z"
    created_by: Hermes
    supersedes_version: null
    status: draft
    notes: "Initial draft of deficiency response notice prepared from ChatGPT-generated content."

  - document_id: DOC-CASE666234B709-NOTICE-001
    version: 2
    case_id: CASE-666234B709
    document_type: notice
    filename: Notice_v2.pdf
    sha256: "placeholder-will-be-computed-on-file-creation"
    created_at: null
    created_by: null
    supersedes_version: 1
    status: draft
    notes: "Pending — revision to incorporate chain-of-title evidence once REQ-001 and REQ-002 are fulfilled."
```

---

## Implementation Rules

1. **No file may be saved with the same filename as an existing version.** The system must reject or rename any file that matches an existing `filename` in the manifest.
2. **Hash must be computed at creation time** and recorded before the file is placed in the case directory.
3. **Prior versions are read-only** once their status reaches `pending_approval` or beyond.
4. **All versions are retained** in the case directory. No version may be deleted except by explicit authorized archival action (which itself must be logged).

---

## Schema

See `notion/schemas/Document_Version.schema.json` for the machine-readable schema.

---

## Governance Note

This policy applies to all documents produced within the litigation workflow regardless of file format. External submissions that have been sent (`status: submitted`) are permanently immutable and cannot be superseded by a new version in the same submission context — a new submission would be a separate document event.
