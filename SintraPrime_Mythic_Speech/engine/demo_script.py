from __future__ import annotations

import argparse
import json
from pathlib import Path

from sintraprime_speech_engine import SintraPrimeSpeechEngine, default_bundle_root, timestamp_slug


DEFAULT_LINE = "We do not panic. We proceed with precision."


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate a test MP3 for each persona in config/voices.json")
    parser.add_argument("--text", default=DEFAULT_LINE, help="Text to speak")
    parser.add_argument(
        "--out-dir",
        default=None,
        help="Output directory (default: output/test/<timestamp>/)",
    )
    parser.add_argument(
        "--voice-settings",
        default=None,
        help='Optional JSON string for ElevenLabs voice_settings, e.g. {"stability":0.4,"similarity_boost":0.8}',
    )
    parser.add_argument("--force", action="store_true", help="Overwrite files if they already exist")
    args = parser.parse_args()

    bundle_root = default_bundle_root()
    engine = SintraPrimeSpeechEngine(bundle_root=bundle_root)
    voices = engine.load_voices()

    out_dir = Path(args.out_dir) if args.out_dir else (bundle_root / "output" / "test" / timestamp_slug())
    out_dir.mkdir(parents=True, exist_ok=True)

    voice_settings = json.loads(args.voice_settings) if args.voice_settings else None

    results = []
    for persona in sorted(voices.keys()):
        out_path = out_dir / f"{persona}.mp3"
        res = engine.speak(
            text=args.text,
            persona=persona,
            output_path=out_path,
            voice_settings=voice_settings,
            force=args.force,
        )
        results.append({"persona": res.persona, "output_path": str(res.output_path)})

    print(json.dumps({"ok": True, "out_dir": str(out_dir), "files": results}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
