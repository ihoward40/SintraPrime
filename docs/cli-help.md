# CLI Help

This file is auto-generated from `--help` output.

Regenerate with: `node scripts/generate-cli-help.mjs`

## sintraprimer --help

```text
Usage: sintraprimer [options] [command]

SintraPrime CLI

Options:
  -V, --version                          output the version number
  -h, --help                             display help for command

Commands:
  federal                                Federal court helpers
  hearing                                Hearing helpers
  transcript                             Transcript helpers
  v2                                     Experimental v2 features (quarantined)
  receipt                                Receipt ladder operations
  enforce                                Enforcement workflows (guarded)
  exhibit                                Exhibit packet tools
  audit.build [options]                  Build Gmail master audit JSON from local email-ingest evidence (filesystem-only)
  gmail.scan [options]                   DEPRECATED: use audit.build (filesystem-only email evidence → reports/gmail_master_audit_live.json)
  verizon.escalate [options]             Generate Verizon escalation drafts from local email-ingest evidence (draft-only; no send)
  accounts.monetize [options]            Classify accounts from local email-ingest evidence into cash-first monetization buckets
  credit.rank [options]                  Rank accounts by credit unlock potential (read-only; derived from local email evidence)
  email.diff [options]                   Daily diff scan from local email-ingest evidence (no Gmail writes)
  export.regulator [options]             Export regulator-ready complaint packet(s) from audit data (draft/export only).
  trust.bankpack [options]               Generate a trust bank onboarding draft pack (filesystem only)
  dashboard.cash [options]               Produce a cash-first dashboard JSON (draft/export only; filesystem output)
  law.pull [options]                     Pull primary law/regulatory sources into runs/law-ingest (draft-only; receipts)
  law.index [options]                    Build a local law index + citation graph from runs/law-ingest
  law.watch [options]                    Scheduled law watch run (pull + diff) from a watch spec JSON
  law.memo [options]                     Generate a court-safe memo bundle from claims + authorities JSON
  law.verify [options]                   Verify law ingest + memo bundles (schema + hashes + authority-mode guardrails)
  workflow.run [options]                 Run a WorkflowDefinition JSON deterministically (policy-gated)
  workflow.replay [options]              Replay a workflow run by printing the stored receipt JSON
  abilities.list                         List available capabilities (abilities), providers, and security capability mapping
  abilities.resolve [options]            Resolve required capabilities to an unambiguous agent@version map
  verify                                 Read-only verification commands
  elc-validate [options] <bundleDir>
  ledger-validate [options] <bundleDir>
  gmail.auth [options]                   Authorize Gmail access via OAuth (nuclear scope supported; fail-closed behind policy + encryption)
  gmail.pull [options]                   Pull Gmail messages (read-only) into local runs/email-ingest (filesystem-only; no Gmail writes)
  court                                  Court pack operations
  help [command]                         display help for command
```

## sintraprimer workflow.run --help

```text
Usage: sintraprimer workflow.run [options]

Run a WorkflowDefinition JSON deterministically (policy-gated)

Options:
  --spec <path>       WorkflowDefinition JSON path
  --secrets <path>    Optional secrets JSON file (used for template vars +
                      redaction)
  --dotenv <path>     Optional .env file to load for template vars
  --operator-id <id>  Override operator id for role checks
  -h, --help          display help for command
```

## sintraprimer workflow.replay --help

```text
Usage: sintraprimer workflow.replay [options]

Replay a workflow run by printing the stored receipt JSON

Options:
  --receipt <path>  Path to a workflow receipt JSON
  -h, --help        display help for command
```

Notes:

- `workflow.run` supports `.yaml` and `.json` specs.

- Use `--dotenv` and/or `--secrets` to inject template vars (e.g. `{{REPO_URL}}`).
