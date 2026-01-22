# Adaptive Enforcement AI

Adaptive Enforcement AI dynamically tunes enforcement timelines and escalation behavior based on:
- Creditor type/name (policy profiles)
- Behavior predictions (from CBAPE)
- Overdue events (from the enforcement chain)

## Enable

Set:
- `ADAPTIVE_ENFORCEMENT_ENABLED=1`

Optional:
- `ADAPTIVE_ENFORCEMENT_VOICE=0|1` (default `1`)

## Event Flow

Inputs:
- `behavior.predicted`
- `enforcement.overdue`

Outputs:
- `adaptive.policy.updated` (enforcement chain timing knobs)
- `enforcement.chain.adaptiveEscalate` (controlled immediate escalation)
- `case.update` and `briefing.voice` (via existing Slack/ElevenLabs bindings)

## Policy Profiles

Policies live in `ui/enforcement/adaptiveEnforcementAI.js` and are keyed by creditor type plus name-based overrides. They control:
- `baseDaysBetweenStages`
- `tightenOnHighRisk` (multiplier, e.g. `0.5` = 50% faster)
- `escalateOnIgnore`
- default Slack channel + voice persona
