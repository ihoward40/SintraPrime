# Autonomous Playbook Packs (APPs)

Playbook Packs let SintraPrime run creditor-specific strategies instead of treating every creditor the same.

## How it works

1) A source emits:
- `creditor.observed` `{ name, source, context }`

2) The classifier emits:
- `creditor.classified` `{ name, type, risk, tag, source, context }`

3) Playbooks listen and emit actions:
- `enforcement.chain.start`
- `doc.generate.*`
- `enforcement.event`
- `briefing.voice`

## Included playbooks

- Verizon: [ui/playbooks/verizonPlaybook.js](ui/playbooks/verizonPlaybook.js)
- Junk debt (LVNV/Midland/etc): [ui/playbooks/lvnvPlaybook.js](ui/playbooks/lvnvPlaybook.js)
- Chase/EWS: [ui/playbooks/chasePlaybook.js](ui/playbooks/chasePlaybook.js)
- Dakota Financial: [ui/playbooks/dakotaPlaybook.js](ui/playbooks/dakotaPlaybook.js)

## Channel routing

Set any of these to a channel ID (preferred) or `#channel-name`:
- `PLAYBOOK_CHANNEL_VERIZON`
- `PLAYBOOK_CHANNEL_JUNK_DEBT`
- `PLAYBOOK_CHANNEL_CHASE_EWS`
- `PLAYBOOK_CHANNEL_DAKOTA`

## Enable

Playbooks register when Autonomous Mode is enabled:
- `AUTONOMOUS_ENABLED=1`

If you want playbooks always-on (even without autonomous ticks), say so and I’ll register them at server boot instead.
