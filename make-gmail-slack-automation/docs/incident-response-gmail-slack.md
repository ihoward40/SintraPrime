# Incident Response — Gmail → Slack Alerts
## Deterministic, Label-Gated System (Option A)

---

## Purpose

This document provides a **fast, repeatable incident response procedure**
for the Gmail → Slack alerting system.

Goals:
- Stop Slack noise immediately
- Identify the exact triggering input
- Verify state correctness
- Restore service safely

---

## Immediate Containment (30 Seconds)

1. Open Make → Scenario: `Gmail-Alert-to-Slack (Notify Only)`
2. Disable **Slack module only** (do not stop the Gmail trigger)
3. Confirm Slack noise stops within one polling interval

---

## Evidence to Capture (Copy/Paste)

- Slack channel name
- Timestamp range of noise
- Exact Slack message text
- Make scenario name
- Make execution IDs (1–3 latest)

---

## Ground Truth Audit

1. Open Make → Scenario → History
2. Open an execution that produced the Slack message
3. Inspect Gmail trigger bundle:
   - Gmail UID (`1.id`)
   - Thread ID (`1.threadId`)
   - From (`1.from.address`)
   - Subject (`1.subject`)
   - Labels (`1.labels`)
4. Inspect Router:
   - Which route fired?
   - Which condition evaluated true?

---

## Gmail State Verification

Open the email in Gmail and check labels:

| Label | Expected |
|------|----------|
| `ALERT_SLACK` | Present before posting |
| `ALERT_SLACK_POSTED` | Present after posting |

**Rules:**
- If POSTED is present → reposting should be impossible
- If POSTED is missing → Slack post should not have occurred

---

## Root Cause Matrix

| Symptom | Likely Cause | Corrective Action |
|------|-------------|------------------|
| Repeated Slack posts | POSTED label missing | Reapply label-gating |
| Slack spam | Admin text in message | Remove slash commands |
| Email deleted early | Cleanup scenario misfired | Verify POSTED gate |
| Empty Slack fields | Mapping error | Use DEBUG template |

---

## Debug Mode (One Run Only)

Temporarily replace Slack message with:

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

Run once → confirm → revert.

---

## Restoration Procedure

1. Confirm Gmail labels are correct
2. Confirm Router filters are intact
3. Re-enable Slack module
4. Monitor one polling interval

---

## Explainability Statement (Required)

> “This Slack alert was generated from Gmail UID `<id>`,
> matched label `<label>`,
> was posted once,
> then labeled `ALERT_SLACK_POSTED`,
> and processed by cleanup.”

---

## Non-Negotiable Rules

- No Slack post without label-gating
- No admin commands in automation
- No delete without POSTED label
- Slack never triggers upstream systems

---

## Status

This incident response procedure is authoritative.
