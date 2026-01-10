# Make.com → Slack Automation Hardening (TikTok Leads + Loop-Proofing)

This file is a copy of the broader hardening runbook from the main workspace.

If you are using this folder as a standalone repo, keep this as your general reference and treat `docs/gmail-slack-label-gated-runbook.md` as the canonical Gmail → Slack SOP.

---

````markdown
# Make.com → Slack Automation Hardening (TikTok Leads + Loop-Proofing)

This runbook turns two common failure modes into deterministic, non-spammy behavior:

- **TikTok → Slack lead alerts** posting with empty fields ("ghost posts").
- **Slack invite/message loops** (e.g., repeated `/invite @IkeBot`).

## Red Flags (60-second triage)

- **Slack message has timestamps only / blank Username/Comment/GPT Reply** → mapping is wrong, Map toggle is OFF, or upstream bundle lacks those fields.
- **Slack posts repeated messages every few minutes** → you have a Slack-triggered scenario posting back into the same channel (feedback loop).
- **GPT module ran but Slack "GPT Reply" is blank** → wrong OpenAI output path (e.g., `choices[0].message.content` vs `choices[0].text`).
- **Scenario “looks fine” but still misbehaves** → add the temporary RAW bundle debug step and inspect actual module output.

## Fastest way to find the offending scenario

When you don’t know which scenario is responsible, start from Slack and work backward.

### 1) Use Slack message metadata

- Open one of the spammy messages in Slack.
- Look for the attribution line (e.g., “via Make” / “via Incoming Webhook”) and the sending identity.
- Open **Message details** (Slack UI: “…” → *View message details*) and note:
  - Sending app / integration
  - Timestamp
  - Channel

This tells you whether the message is coming from Make.com (most common), a Slack Workflow, or a custom integration.

### 2) Match it in Make.com History

In Make.com:

1. Go to **Scenarios** and sort by **Last run**.
2. Open the most recently-run scenarios around the Slack message timestamp.
3. Use **History** and open a run that aligns with the Slack timestamp.
4. Confirm by checking the module that posts to Slack and comparing:
   - Channel
   - Message body

Tip: if you have multiple Slack scenarios, use browser search in the scenario editor for the channel name (e.g., `all-ikesolutions`) or a distinctive phrase in the message.

## Scope

- Applies to Make.com scenarios that:
  - Watch TikTok comments (or any upstream webhook/API module)
  - Optionally call OpenAI
  - Post to Slack channels
- Applies to any Slack scenario that both **reads from** and **writes to** Slack.

## Deterministic Gmail → Slack Alerts (Label-Gated, Split, Loop-Proof)

See `docs/gmail-slack-label-gated-runbook.md` for the canonical SOP and click-path.
````
