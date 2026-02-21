---
sidebar_position: 5
title: Workflow Runner
description: YAML/JSON declarative workflow automation with live auditable execution in SintraPrime.
---

# Workflow Runner

The Workflow Runner enables declarative automation through YAML or JSON workflow definitions. Every workflow execution is fully auditable, with receipts generated for each step and the overall workflow.

## Workflow Definition

Workflows are defined in YAML or JSON format:

```yaml title="workflows/evidence-collection.yml"
name: evidence-collection
version: "1.0"
description: Collect and process evidence from multiple sources

trigger:
  type: schedule
  cron: "0 9 * * 1"  # Every Monday at 9 AM

governance:
  mode: SINGLE_RUN_APPROVED
  max_cost: 5.00
  approval_required: false

steps:
  - id: capture-web
    adapter: snapshot
    action: capture
    params:
      urls:
        - "https://example.com/policy"
        - "https://example.com/terms"
      format: pdf
      diff_detection: true

  - id: check-email
    adapter: gmail
    action: ingest
    params:
      label: "evidence"
      since: "7d"

  - id: build-timeline
    adapter: timeline
    action: build
    depends_on: [capture-web, check-email]
    params:
      sources:
        - "${{ steps.capture-web.output }}"
        - "${{ steps.check-email.output }}"

  - id: generate-report
    adapter: narrative
    action: generate
    depends_on: [build-timeline]
    params:
      timeline: "${{ steps.build-timeline.output }}"
      template: weekly-evidence-summary

on_error:
  action: notify
  adapter: slack
  params:
    channel: "#alerts"
    message: "Evidence collection workflow failed: ${{ error.message }}"
```

## Trigger Types

| Trigger | Description | Example |
|:---|:---|:---|
| `manual` | Triggered by CLI or API | `/workflow run evidence-collection` |
| `schedule` | Cron-based scheduling | `cron: "0 9 * * 1"` |
| `webhook` | Triggered by incoming webhook | `path: /hooks/evidence` |
| `event` | Triggered by system events | `event: receipt.created` |

## Step Configuration

Each step supports these fields:

| Field | Required | Description |
|:---|:---|:---|
| `id` | Yes | Unique step identifier |
| `adapter` | Yes | Adapter to use for execution |
| `action` | Yes | Action to perform |
| `params` | No | Action parameters |
| `depends_on` | No | Array of step IDs that must complete first |
| `condition` | No | Conditional expression for execution |
| `retry` | No | Retry configuration |
| `timeout` | No | Step timeout in seconds |

### Conditional Execution

```yaml
steps:
  - id: notify-if-changes
    adapter: slack
    action: send
    condition: "${{ steps.capture-web.output.changes_detected == true }}"
    params:
      channel: "#policy-changes"
      message: "Policy changes detected!"
```

### Retry Configuration

```yaml
steps:
  - id: send-email
    adapter: gmail
    action: send
    retry:
      max_attempts: 3
      backoff: exponential
      initial_delay: 1000
```

## Variable Interpolation

Workflows support variable interpolation using `${{ }}` syntax:

| Expression | Description |
|:---|:---|
| `${{ steps.<id>.output }}` | Output from a previous step |
| `${{ env.VARIABLE }}` | Environment variable |
| `${{ trigger.payload }}` | Trigger payload data |
| `${{ workflow.name }}` | Workflow metadata |

## Execution

```bash
# Run a workflow
npx sintraprime workflow run workflows/evidence-collection.yml

# Run with parameter overrides
npx sintraprime workflow run workflows/evidence-collection.yml \
  --param urls="https://custom-url.com"

# Dry run (plan without executing)
npx sintraprime workflow run workflows/evidence-collection.yml --dry-run

# List all workflows
npx sintraprime workflow list

# View workflow history
npx sintraprime workflow history evidence-collection
```

## Receipt Integration

Every workflow execution generates receipts at two levels:

1. **Step receipts** — One receipt per step, capturing inputs, outputs, and governance checks
2. **Workflow receipt** — A summary receipt for the entire workflow, referencing all step receipts

```json title="Workflow Receipt"
{
  "receipt_id": "rcpt_workflow_a1b2c3",
  "operation": {
    "type": "workflow.completed",
    "workflow": "evidence-collection",
    "steps_total": 4,
    "steps_completed": 4,
    "steps_failed": 0,
    "duration_ms": 45000
  },
  "step_receipts": [
    "rcpt_step_d4e5f6",
    "rcpt_step_g7h8i9",
    "rcpt_step_j0k1l2",
    "rcpt_step_m3n4o5"
  ]
}
```

:::tip Workflow Best Practices
- Keep workflows focused on a single concern
- Use `depends_on` to express true dependencies, not sequencing
- Set appropriate timeouts for each step
- Always include `on_error` handlers for production workflows
- Use dry runs to validate workflows before execution
:::

## Next Steps

- [Agent Mode Engine](./agent-mode-engine) — The underlying execution pipeline
- [Adapters Overview](../adapters/overview) — Available adapters for workflow steps
- [Evidence Lifecycle](../evidence-systems/lifecycle) — How workflows feed evidence systems
