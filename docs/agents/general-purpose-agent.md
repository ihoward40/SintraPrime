---
sidebar_position: 4
title: General Purpose Agent
description: A flexible agent for ad-hoc task execution across all SintraPrime adapters.
---

# General Purpose Agent

The **General Purpose Agent** (GPA) is SintraPrime's flexible, multi-purpose agent designed for ad-hoc task execution. Unlike specialized agents, the GPA can use any adapter and perform any operation within its governance constraints.

## Capabilities

The GPA can perform any task that the governance layer permits, including:

- **Data gathering** — Collect information from web, email, and APIs
- **Communication** — Send emails, Slack messages, and notifications
- **Analysis** — Run DeepThink analysis on collected data
- **Automation** — Execute shell commands and browser automation
- **Reporting** — Generate reports and summaries

## Task Submission

```bash
# Simple task
npx sintraprime run "Check the status of all web snapshots"

# Task with specific adapter
npx sintraprime run --adapter gmail "Send a summary of today's receipts to admin@example.com"

# Task with governance override
npx sintraprime run --mode SINGLE_RUN_APPROVED "Update the Notion knowledge base"
```

## Example Tasks

### Web Research

```bash
npx sintraprime run "Research the latest changes to FCRA regulations and summarize findings"
```

The GPA will:
1. Use the Browser Operator to visit relevant regulatory websites
2. Capture web snapshots as evidence
3. Use DeepThink to analyze the content
4. Generate a summary with citations

### Email Processing

```bash
npx sintraprime run "Process all unread emails labeled 'legal' and create a timeline"
```

The GPA will:
1. Use the Gmail adapter to fetch emails
2. Parse email content and metadata
3. Feed events to the Timeline Builder
4. Generate a chronological summary

### System Maintenance

```bash
npx sintraprime run "Verify all receipt chains and report any integrity issues"
```

The GPA will:
1. Use the Shell adapter to run verification scripts
2. Check hash chain integrity
3. Verify Ed25519 signatures
4. Generate a health report

## Governance Constraints

The GPA operates under **standard governance**, which means:

| Constraint | Setting |
|:---|:---|
| Policy gates | All standard gates apply |
| Spending limits | Per-task and daily limits enforced |
| Approval | Required for destructive operations |
| Adapter access | Configurable per deployment |
| Monitoring | SentinelGuard monitors all GPA activity |

## Configuration

```json title="agents/general-purpose-agent.config.json"
{
  "id": "general-purpose-agent",
  "max_steps_per_task": 20,
  "default_timeout": 300000,
  "allowed_adapters": ["gmail", "notion", "slack", "shell", "browser", "snapshot"],
  "restricted_adapters": ["finance", "admin"],
  "auto_receipt": true
}
```

:::tip When to Use the GPA
Use the General Purpose Agent for ad-hoc tasks that don't fall within the domain of a specialized agent. For trust administration tasks, use the Howard Trust Navigator. For content creation, use the Content Production Agent. The GPA is your go-to agent for everything else.
:::

## Next Steps

- [Content Production Agent](./content-production-agent) — Specialized content creation
- [Adapters Overview](../adapters/overview) — Available adapters for the GPA
- [Workflow Runner](../core-concepts/workflow-runner) — Automate recurring GPA tasks
