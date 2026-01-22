# Creditor Behavior AI Prediction Engine (CBAPE)

CBAPE turns SintraPrime from reactive enforcement into predictive strategy.

## Enable

Set:
- `BEHAVIOR_PREDICTION_ENABLED=1`
- `OPENAI_API_KEY=...`

Optional:
- `BEHAVIOR_PREDICTION_MODEL` (default `gpt-4.1-mini`)
- `BEHAVIOR_PREDICTION_CHANNEL` (default `#all-ikesolutions`)
- `BEHAVIOR_HISTORY_PATH` (default `output/data/behaviorHistory.json`)

## Trigger

CBAPE listens to:
- `creditor.classified`

and emits:
- `behavior.predicted` (structured prediction payload)
- `case.update` (Slack text summary via existing bindings)
- `briefing.voice` (short Oracle/Judge narration via ElevenLabs)

## Memory

Predictions are appended to `output/data/behaviorHistory.json` (ignored by git). The engine uses the most recent entries to improve subsequent predictions.

## Safety

- In-process dedupe prevents repeated predictions for the same creditor within ~6 hours.
- Output is requested as strict JSON; if the model returns non-JSON, it is wrapped and still emitted.
