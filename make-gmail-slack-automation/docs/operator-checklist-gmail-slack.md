# Operator Checklist — Gmail → Slack Alerts

## Before Enabling
- [ ] Gmail labels exist:
  - [ ] ALERT_SLACK
  - [ ] ALERT_SLACK_POSTED
- [ ] Gmail trigger uses **Gmail search**
- [ ] Query includes:
```

label:ALERT_SLACK -label:ALERT_SLACK_POSTED

```
- [ ] Slack message contains **no slash commands**
- [ ] Notify and Delete are separate scenarios

---

## During Normal Operation
- [ ] One Slack post per email
- [ ] POSTED label applied after posting
- [ ] Cleanup scenario deletes only POSTED emails

---

## If Slack Gets Noisy
- [ ] Disable Slack module only
- [ ] Capture Slack message + timestamp
- [ ] Check Gmail labels on one email
- [ ] Inspect Make execution history
- [ ] Confirm which route fired

---

## Before Re-Enabling
- [ ] POSTED label logic verified
- [ ] Router filters intact
- [ ] No admin text in Slack message

---

## Absolute Rules
- [ ] No Slack post without label gate
- [ ] No admin commands in automation
- [ ] No delete without POSTED label

Print this or pin it in Notion.
