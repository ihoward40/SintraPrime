# Make.com → Slack Automation Hardening (TikTok Leads + Loop-Proofing)

This runbook captures guardrails that prevent Slack spam, ghost posts,
and bot loops.

> **Operator note:** Do not edit Make template JSON directly. Guardrails are
> enforced automatically by pre-commit and CI (`ci:make-guards`);
> unguarded templates cannot be committed or merged.

## Stop-the-bleeding checklist (do this first)

1. **Disable the scenario(s)** that are spamming Slack until guards are deployed.
2. In Make, open **Scenario → History** and confirm whether the spam runs are:
   triggered by **empty/heartbeat payloads** (common with social/webhook modules),
   triggered by **Slack Watch Messages** reacting to your own bot,
   or caused by **multiple notification layers** (Slack channel + Slack email +
   Gmail forwarding).
3. Re-enable only after:
   a hard payload gate is in place, dedupe exists, and Slack self-ignore filters
   exist.

## Canonical guardrails (TikTok → Log → (Optional) Alert)

This repo includes a deterministic scenario definition you can implement in Make:

- `templates/template-tiktok-comment-intake-v1.1-guarded.json`

> **REQUIRED FOR ANY SOCIAL → SLACK FLOW**
>
> - Filter: non-empty payload (exact expression below)
> - Filter: ignore bot/self messages (if Slack-triggered anywhere)
> - Datastore: dedupe on immutable event ID
>
> If any item is missing, do **not** enable the scenario.

### 1) Hard payload gate (blocks empty / heartbeat events)

Add a filter immediately after your TikTok module (or webhook receiver) to require
minimum fields.

Recommended filter logic (adapt field paths to your module):

- Comment ID exists
- Username exists
- Comment text exists and `length(trim(text)) > 2`

Example expression pattern:

```
exists(comment.id)
AND exists(comment.text)
AND length(trim(comment.text)) > 2
AND exists(comment.username)
AND length(trim(comment.username)) > 0
```

### 2) Dedupe by TikTok Comment ID (prevents repeats)

Use a Make **Data Store** as a registry:

- Data store name: `tiktok_comment_registry`
- Key: `comment_id`

Flow:

1. **Get a record** by `comment_id`
2. Filter: “record does not exist”
3. **Create a record** with metadata (timestamp, username, video_id)

This ensures:

- scenario retries don’t spam,
- TikTok duplicate deliveries don’t spam,
- and you can safely branch into Slack.

### 3) Separate “silent log lane” vs “alert lane”

To keep Slack clean:

- Always log validated events (Sheets/Notion/DB) **silently**.
- Only send Slack when intent is high (score threshold).

If you want GPT replies, gate them behind the same threshold
(don’t generate responses for low-signal comments).

### 4) Sheets logging guard (prevents junk rows)

Before “Add a row”, add a filter requiring:

- `comment_id` non-empty
- `username` non-empty
- `comment` length > 2

This blocks empty payloads from creating blank rows.

## Preventing Slack bot loops (including `/invite @IkeBot` loops)

If you have any scenario that starts with **Slack → Watch Messages / Watch Events**,
add a hard self-ignore filter.

Minimum requirements:

- Ignore bot messages (`bot_id` present)
- Ignore messages where `user == BOT_USER_ID`
- Ignore command-like text, especially `/invite`

Example filter pattern (adapt to your Slack module’s output fields):

```
exists(slack.user)
AND slack.user != BOT_USER_ID
AND (not(exists(slack.bot_id)) OR slack.bot_id = '')
AND not(startsWith(slack.text, '/invite'))
```

Also ensure your bot does not post messages that trigger your own Slack watchers
(e.g., restrict watchers to a dedicated channel or to human users only).

## Notification hygiene (reduces “spam” that isn’t Make)

If you still see spam after guards:

- Set Slack channel notifications to **Mentions only** (or use a dedicated channel).
- Disable Slack email notifications for that channel if you’re also routing Gmail
  alerts.
- In Gmail-based scenarios, use label gating (see the repo’s Gmail runbook)
  so each email is posted once.

Policy (make it explicit and boring):

- Automation channels = **mentions only**
- No email notifications for bot posts
- Enable order: (1) logging-only scenarios → (2) guarded intake → (3) Slack alerts
- Disable order: (1) Slack alerts → (2) intake → (3) logging

## Red Flags (60-second triage)

- **Slack message has timestamps only / blank Username/Comment/GPT Reply**
  → mapping is wrong, Map toggle is OFF, or upstream bundle lacks those fields.
- **Slack posts repeated messages every few minutes**
  → you have a Slack-triggered scenario posting back into the same channel
  (feedback loop).
- **GPT module ran but Slack "GPT Reply" is blank**
  → wrong OpenAI output path (e.g., `choices[0].message.content`
  vs `choices[0].text`).
- **Scenario “looks fine” but still misbehaves**
  → add the temporary RAW bundle debug step and inspect actual module output.

## Fastest way to find the offending scenario

When you don’t know which scenario is responsible, start from Slack and work backward.

### 1) Use Slack message metadata

- Open one of the spammy messages in Slack.
- Look for the attribution line (e.g., “via Make” / “via Incoming Webhook”)
  and the sending identity.
- Open **Message details** (Slack UI: “…” → *View message details*) and note:
  - Sending app / integration
  - Timestamp
  - Channel

This tells you whether the message is coming from Make.com (most common),
a Slack Workflow, or a custom integration.

### 2) Match it in Make.com History

In Make.com:

1. Go to **Scenarios** and sort by **Last run**.
2. Open the most recently-run scenarios around the Slack message timestamp.
3. Use **History** and open a run that aligns with the Slack timestamp.
4. Confirm by checking the module that posts to Slack and comparing:
   - Channel
   - Message body

Tip: if you have multiple Slack scenarios, use browser search in the scenario
editor for the channel name (e.g., `all-ikesolutions`) or a distinctive phrase.

## Scope

- Applies to Make.com scenarios that:
  - Watch TikTok comments (or any upstream webhook/API module)
  - Optionally call OpenAI
  - Post to Slack channels
- Applies to any Slack scenario that both **reads from** and **writes to** Slack.

## Deterministic Gmail → Slack Alerts (Label-Gated, Split, Loop-Proof)

See `docs/gmail-slack-label-gated-runbook.md` for the canonical SOP and click-path.

## Appendix A — Safe Enablement of Make → Slack Automations

Audience: operators, admins, non-technical users

Goal: prevent Slack floods, loops, and ghost alerts.

### Step 1 — Confirm the template is guarded

Before enabling anything, confirm:

- Template name includes `guarded` or `v1.1`.
- The template was added after the Slack hardening update.

If the template is older, do not enable it.

Screenshot placeholder:

- Make scenario list showing `template-tiktok-comment-intake-v1.1-guarded`

### Step 2 — Check the three safety switches (do not skip)

Inside the scenario, visually confirm:

1) Filter after the trigger

- Comment text is not empty.
- Username exists.

Screenshot placeholder:

- Filter module with “Text is not empty” conditions

2) Dedupe step

- Datastore “Get record” then “Create record”.
- Uses Comment ID (or Event ID) as the key.

Screenshot placeholder:

- Datastore Get + Create modules connected

3) Bot ignore (Slack only)

- Filter that ignores bot messages.

Screenshot placeholder:

- Filter: “Is bot message = false”

If any of these are missing, stop.

### Step 3 — Slack notification settings (critical)

In Slack:

- Open the automation channel.
- Set notifications to “Mentions only”.
- Disable email notifications for bot posts.

Screenshot placeholder:

- Slack channel notification settings → Mentions only

### Step 4 — Safe enable order

Always enable in this order:

1) Logging-only scenarios
2) Guarded intake scenarios
3) Slack alert scenarios (last)

### Step 5 — If something goes wrong

If Slack starts flooding:

1) Turn off Slack alert scenarios first
2) Leave logging on
3) Do not edit filters while live

Noise means a guardrail is missing.

### Golden rule

A quiet Slack is a healthy system.
Alerts are for money, failures, or humans.
