from __future__ import annotations

import argparse
import json
from pathlib import Path

from sintraprime_speech_engine import OUTPUT_DIR, speak
from voice_router import pick_voice


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate an MP3 from text using a mythic voice")
    parser.add_argument("text", nargs="?", help="Text to narrate")
    parser.add_argument("--text", dest="text_flag", help="Text to narrate (alternative to positional)")
    parser.add_argument("--voice", dest="voice", help="Persona/voice name (e.g., oracle)")
    parser.add_argument("--auto", action="store_true", help="Auto-pick voice based on text")
    parser.add_argument("--mode", choices=["test", "live"], default="test")
    parser.add_argument("--out", dest="out", default=None, help="Output path (.mp3)")
    parser.add_argument("--force", action="store_true", help="Overwrite if output exists")
    args = parser.parse_args()

    text = args.text_flag or args.text
    if not text:
        parser.error("Missing text. Provide positional text or --text")

    if args.auto:
        chosen = pick_voice(text)
    else:
        chosen = (args.voice or "isiah").strip().lower()

    out_path = Path(args.out).expanduser().resolve() if args.out else None

    res = speak(text, voice=chosen, output_path=out_path, mode=args.mode, force=args.force)

    # one-line JSON output for easy scripting
    print(
        json.dumps(
            {
                "ok": True,
                "voice": res.persona,
                "output_path": str(res.output_path),
                "request_id": res.eleven_request_id,
            }
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
