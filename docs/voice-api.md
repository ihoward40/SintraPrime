# Voice API (ElevenLabs)

This repo includes an Express-mounted voice API in the UI server.

## Setup

- Set `ELEVENLABS_API_KEY` (or `ELEVEN_API_KEY`) in your local env.
- Fill `config/voices.json` with real ElevenLabs *voice IDs*.
- Start the server:
  - `UI_PORT=3001 node ui/server.js`
  - or `npm run ui:server` (defaults to port 3000 unless `UI_PORT` is set)

Audio files are written under `artifacts/voice/router/*` by default.

## Endpoints

### POST /api/voice/test

Streams `audio/mpeg` for quick playback.

```bash
curl -sS -X POST "http://localhost:3001/api/voice/test" \
  -H "Content-Type: application/json" \
  -d "{\"text\":\"This is a quick voice test.\",\"character\":\"isiah\"}" \
  --output test.mp3
```

### POST /api/voice/case-briefing

Writes an MP3 to disk and returns the relative path.

```bash
curl -sS -X POST "http://localhost:3001/api/voice/case-briefing" \
  -H "Content-Type: application/json" \
  -d "{\"caseId\":\"CASE-123\",\"text\":\"Case 123 status: ready for review.\"}" 
```

### POST /api/voice/deadline-alert

Writes an MP3 to disk and returns the relative path.

```bash
curl -sS -X POST "http://localhost:3001/api/voice/deadline-alert" \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Deadline in 48 hours: respond to the notice.\"}" 
```
