# SintraPrime Mythic Speech Engine (v1)

This is a repo-native ElevenLabs text-to-speech layer with a persona router ("pantheon") and deterministic CLIs.

## Safety / permissions

Use only voices you have the rights to use (e.g., your own cloned voice, licensed/purchased voices, or voices with explicit permission).

## Setup

1) Create a config file:

- Copy [tools/voice/pantheon.voices.example.json](../tools/voice/pantheon.voices.example.json) to `tools/voice/pantheon.voices.json`
- Replace each `VOICE_ID_...` placeholder with the real ElevenLabs `voice_id`

2) Set environment variables:

- `ELEVENLABS_API_KEY` (required)
- Optional: `ELEVENLABS_BASE_URL`

Never paste raw API keys into chat or commit them to the repo. Keep them only in your local `.env` / secrets manager.

## Generate speech (CLI)

- Speak explicit persona:

`node tools/voice/speak.mjs --persona scribe --text "Under Article 9, perfection is required." --out artifacts/voice/scribe.mp3`

- Auto persona selection:

`node tools/voice/speak.mjs --auto-persona --text "Notice of Dishonor…" --out artifacts/voice/auto.mp3`

Output is one JSON line on stdout.

## Demo pack

Generates one file per configured persona:

`node tools/voice/demo.mjs --out-dir artifacts/voice/demo`

## Slack upload (optional)

Uploads an audio file to a channel ID:

`node tools/voice/slack-upload.mjs --file artifacts/voice/demo/isiah.mp3 --channel C0123456789 --title "Daily Brief" --initial-comment "[INFO] Daily brief audio"`

Environment:

- `SLACK_BOT_TOKEN` (required)

## Make.com webhook server (optional)

Start the webhook server:

`node scripts/voice-webhook-server.mjs`

Help/version:

`node scripts/voice-webhook-server.mjs --help`

POST JSON to `http://localhost:8789/voice`:

```json
{"text":"Hello","persona":"isiah"}
```

Example `curl`:

`curl -s -X POST http://localhost:8789/voice -H "Content-Type: application/json" -d "{\"text\":\"Hello\",\"persona\":\"isiah\"}"`

Response is one JSON line and the audio is written to `artifacts/voice/webhook/out.mp3` (or your provided `out`).
