from __future__ import annotations

import time
from pathlib import Path

from playback_cli import play_audio
from sintraprime_speech_engine import OUTPUT_DIR

CHECK_INTERVAL = 5  # seconds


def watch_folder() -> None:
    played: set[Path] = set()
    live_dir = OUTPUT_DIR / "live"
    live_dir.mkdir(parents=True, exist_ok=True)

    print("[SintraPrime] Voice Daemon active. Watching for new audio...")

    while True:
        for f in live_dir.rglob("*.mp3"):
            if f not in played:
                play_audio(f)
                played.add(f)
        time.sleep(CHECK_INTERVAL)


if __name__ == "__main__":
    watch_folder()
