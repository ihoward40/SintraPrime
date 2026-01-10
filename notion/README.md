# Notion Import Artifacts (Phase II)

This folder contains import-ready artifacts for provisioning the Notion "command surface".

- Schemas (authoritative): `notion/schemas/*.schema.json`
- Migration CSVs (headers + sample row): `notion/migrations/*.csv`

## Invariants

- Notion never computes facts.
- Notion triggers, displays, and records.
- Enforcement lives repo-side (Make Lint). Notion cannot authorize unsafe automation.

## Notes on buttons

Notion "button"/automation blocks are not reliably provisionable via the public Notion API.
This repo therefore treats buttons as a contract document:

- `docs/notion-button-webhook-contract.md`

When Phase III adds the Make scenario ZIP + webhook endpoints, these button contracts become executable without remapping.
