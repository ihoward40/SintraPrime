from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


def open_file_default_app(path: Path) -> None:
    # "Playback" here means "open in the OS default audio player".
    if sys.platform.startswith("win"):
        os.startfile(str(path))  # type: ignore[attr-defined]
        return

    if sys.platform == "darwin":
        subprocess.check_call(["open", str(path)])
        return

    subprocess.check_call(["xdg-open", str(path)])


def play_audio(path: Path) -> None:
    """Compatibility alias used by player_daemon.py."""
    open_file_default_app(path)


def main() -> int:
    parser = argparse.ArgumentParser(description="Open an MP3 file in the default audio app")
    parser.add_argument("file", help="Path to .mp3")
    args = parser.parse_args()

    p = Path(args.file).expanduser().resolve()
    if not p.exists():
        print(f"File not found: {p}", file=sys.stderr)
        return 2

    open_file_default_app(p)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
