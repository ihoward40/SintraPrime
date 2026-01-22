# SintraPrime Mythic Speech Engine v1 (Python Deployment Bundle)

This bundle gives SintraPrime the ability to speak in 9 different mythic voices, switch tones automatically, generate daily briefings, run a local webhook for Make.com, and optionally upload MP3s to Slack — with secure `.env` isolated secrets.

## 1) What you need

- Python 3.10+ (3.11 recommended)
- An ElevenLabs API key
- (Optional) A Slack bot token if you want uploads

## 2) First-time setup (5 minutes)

From this folder:

1. Install dependencies:

   - Windows (PowerShell):
     - `python -m venv .venv`
     - `.\.venv\Scripts\Activate.ps1`
     - `pip install -r requirements.txt`

   - macOS/Linux:
     - `python3 -m venv .venv`
     - `source .venv/bin/activate`
     - `pip install -r requirements.txt`

2. Create your config file:

- Copy `config/.env.example` to `config/.env`
- Put your real key into `ELEVEN_API_KEY=...` (never paste keys into chat; keep them only in your local `.env`/secrets manager)

If you ever need to share a `.txt`/`.env` file for debugging, sanitize it first:

- `npm run -s secrets:sanitize -- --in path/to/file.txt`

This writes `file.sanitized.txt` and never prints secret values.

3. Set your voice IDs:

- Open `config/voices.json`
- Replace the placeholder strings (e.g. `VOICE_ID_ISIAH_PRIME`) with real ElevenLabs `voice_id` values.

## 3) Quick demo (generates one MP3 per persona)

Run:

- Windows / macOS / Linux:
  - `python engine/demo_script.py`

Outputs will be written under `output/test/<timestamp>/`.

You can play an MP3 by opening it normally, or use the helper:

- `python engine/playback_cli.py output/test/<timestamp>/oracle.mp3`

## 4) Single generate (programmatic usage)

Use the engine from Python:

- `python` then:
  - `from pathlib import Path`
  - `from engine.sintraprime_speech_engine import SintraPrimeSpeechEngine, default_bundle_root`
  - `engine = SintraPrimeSpeechEngine(bundle_root=default_bundle_root())`
  - `out = default_bundle_root() / "output" / "live" / "oracle.mp3"`
  - `engine.speak(text="Proceed with precision.", persona="oracle", output_path=out, force=True)`

Or use the convenience wrapper:

- `from engine.sintraprime_speech_engine import speak`
- `speak("Proceed with precision.", voice="oracle", mode="live", force=True)`

Or use the CLI:

- `python engine/speak_cli.py --text "Proceed with precision." --voice oracle --mode live`
- Auto-voice routing: `python engine/speak_cli.py --text "Notice of dishonor…" --auto`

## 5) Webhook server (optional)

Start the server:

- `python engine/webhook_server.py --host 127.0.0.1 --port 5005`

Print a ready-to-run curl example:

- `python engine/webhook_server.py --print-example`

Endpoints:

- `GET /health`
- `POST /speak`

Example request body (Make.com-friendly):

```json
{
  "text": "We do not panic. We proceed with precision.",
  "voice": "oracle",
  "mode": "test",
  "voice_settings": {"stability": 0.4, "similarity_boost": 0.8},
  "force": false
}
```

## 6) Slack upload (optional)

1. Put these in `config/.env`:

- `SLACK_BOT_TOKEN=...`
- `SLACK_DEFAULT_CHANNEL=...` (prefer a channel ID like `C0123456789`)

2. Use the helper in your own script:

- `from pathlib import Path`
- `from engine.slack_notifier import upload_audio_to_slack`
- `res = upload_audio_to_slack(bundle_root=Path('.'), file_path=Path('output/test/.../oracle.mp3'))`

If you want a CLI for Slack upload too, tell me your preferred command shape and I’ll add it.

## 7) Daily briefing

- `python engine/daily_briefing.py`

## 8) Desktop autoplay daemon

Watches `output/live/` for new `.mp3` files and opens them in your default audio player:

- `python engine/player_daemon.py`

## Notes / troubleshooting

- If you get `Unknown persona`, your `config/voices.json` is missing that persona key.
- If you get an ElevenLabs HTTP error, confirm your API key and voice IDs are valid.
