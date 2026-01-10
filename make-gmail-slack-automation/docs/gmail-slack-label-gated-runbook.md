# Deterministic Gmail → Slack Alerts
## Label-Gated, Split, Loop-Proof (Option A)

---

## Purpose

This runbook defines the **only approved pattern** for Gmail → Slack alerting
using Make.com. The goals are:

- Eliminate mystery triggers
- Prevent repeat Slack spam by design
- Ensure every Slack message is explainable from first principles
- Separate notification from cleanup (no side effects)

This system is production-grade and auditable under pressure.

---

## System Overview

**State lives in Gmail.**
Make.com executes deterministic transitions based on labels.

The system consists of:
- Two Gmail labels (state)
- Two Make scenarios (responsibility split)

Slack never triggers upstream systems.
Slack never executes admin commands.

---

## Gmail Labels (Source of Truth)

Create these labels in Gmail:

| Label | Meaning |
|-----|--------|
| `ALERT_SLACK` | Email is eligible for Slack notification |
| `ALERT_SLACK_POSTED` | Email has already been posted |

### Optional severity labels

| Severity | Label | Slack Channel |
|-------|-------|---------------|
| High | `ALERT_SLACK_HIGH` | `#alerts-critical` |
| Medium | `ALERT_SLACK_MEDIUM` | `#alerts-ops` |
| Low | `ALERT_SLACK_LOW` | `#alerts-info` |

Severity is **declared in Gmail**, never inferred in Make.

---

## Scenario A — Gmail → Slack Notify (Signals Only)

**Name:** `Gmail-Alert-to-Slack (Notify Only)`

### Gmail Trigger

- Module: Gmail > Watch Emails (v2)
- Filter type: **Gmail search**
- Query (paste verbatim):

```

label:ALERT_SLACK -label:ALERT_SLACK_POSTED

```

- Folder: `[Gmail]/All Mail`
- Mark as read when fetched: **Yes**
- Max results: **1**

---

### Router (Sanity Guard)

Single filter on Slack route:

```

exists({{1.id}})
AND exists({{1.subject}})
AND length({{1.subject}}) > 0
AND exists({{1.from.address}})
AND length({{1.from.address}}) > 0

```

---

### Slack Message (Production)

```

📧 New Email Alert

From: {{1.from.name}} <{{1.from.address}}>
Subject: {{1.subject}}
Date: {{1.date}}

Thread ID: {{1.threadId}}
Gmail UID: {{1.id}}

🔗 Open:
{{1.messageLink}}

```

**Non-negotiable:**
- No slash commands
- No admin actions
- No invites, joins, kicks, or workflow triggers

---

### Gmail State Write

After Slack post:

- Gmail > Modify Email
- Email ID (UID): `{{1.id}}`
- Add label: `ALERT_SLACK_POSTED`
- (Optional) Remove label: `ALERT_SLACK`

This makes reposting mechanically impossible without human intervention.

---

## Scenario B — Gmail → Delete (Cleanup Only)

**Name:** `Gmail-Delete-After-Notify`

### Gmail Trigger

- Filter type: Gmail search
- Query:

```

label:ALERT_SLACK_POSTED

```

- Folder: `[Gmail]/All Mail`
- Mark as read when fetched: **Yes**
- Max results: **1**

---

### Router (Safety)

```

exists({{1.id}})

```

---

### Delete Action

- Module: Gmail > Delete Email
- Email ID (UID): `{{1.id}}`
- Folder: `[Gmail]/All Mail`
- Expunge: **No**

Deletion is allowed **only after POSTED state exists**.

---

## Debug Mode (One-Run Only)

Temporary Slack message body:

```

DEBUG — Gmail Trigger
gmailUid={{1.id}}
gmailMessageId={{1.messageId}}
threadId={{1.threadId}}
from={{1.from.name}} <{{1.from.address}}>
subject={{1.subject}}
date={{1.date}}
rfcMessageId={{1.headers.messageId}}
link={{1.messageLink}}

```

Run once, confirm fields populate, then revert to production.

---

## Incident Response (60-Second Triage)

1. Disable the Slack module only
2. Confirm Slack noise stops
3. Inspect Gmail labels on one email
4. Open Make execution history
5. Identify which route fired and why

---

## Explainability Statement (Required)

> “This Slack alert came from Gmail UID `<id>`, matched label `<label>`,
> was posted once, labeled `ALERT_SLACK_POSTED`,
> and then cleaned up by a separate deletion scenario.”

---

## Non-Negotiable Rules

- No Slack post without label-gating
- No admin commands in automation
- No delete without POSTED label
- Slack never triggers upstream systems

---

## Status

This system is:
- Deterministic
- Loop-proof
- Auditable
- Safe under retries
