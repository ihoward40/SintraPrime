# SintraPrime Event Bus (UI server)

The UI server includes a lightweight in-process event bus for internal modules to emit events.

## Import

```js
import { eventBus } from "../ui/core/eventBus.js";
```

## Emit events

### Case update

```js
eventBus.emit("case.update", {
  caseId: "CASE-123",
  title: "Stage moved to REVIEW",
  summary: "Awaiting signatures.",
  link: "https://notion.so/...",
  // optional overrides
  channel: "#all-ikesolutions",
  idempotency_key: "case-CASE-123-review",
});
```

### Enforcement event

```js
eventBus.emit("enforcement.event", {
  creditor: "Verizon",
  status: "Escalated",
  details: "New deadline triggered.",
  link: "https://notion.so/...",
});
```

### TikTok lead

```js
eventBus.emit("tiktok.lead", {
  username: "someuser",
  comment: "How do I start?",
  link: "https://tiktok.com/...",
  auto_reply: "Reply draft...",
});
```

### System error

```js
eventBus.emit("system.error", {
  source: "notion-sync",
  error: "Rate limit",
  context: { job_id: "abc" },
});
```

### Voice briefing

```js
eventBus.emit("briefing.voice", {
  text: "Daily operational briefing...",
  channel: "#all-ikesolutions",
  title: "Daily Mythic Briefing",
  subdir: "daily-briefings",
  // optional: character
  // character: "isiah",
});
```

## Slack bindings

Bindings are registered by a side-effect import in the UI server:
- [ui/integrations/slackEvents.js](ui/integrations/slackEvents.js)

This means emitting events will result in Slack messages/uploads (and voice briefings) when `SLACK_BOT_TOKEN` and ElevenLabs config are set.
