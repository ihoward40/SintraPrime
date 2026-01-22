from __future__ import annotations

from datetime import datetime
from pathlib import Path

from sintraprime_speech_engine import OUTPUT_DIR, speak
from voice_router import pick_voice


def generate_briefing() -> Path:
    # Placeholder; will connect to Notion later
    now = datetime.now()
    briefing = f"""
Good morning, Isiah.
Today is {now.strftime('%A, %B %d, %Y')}.
Stand tall; the Trust advances.

Key Actions:
1. Enforcement tasks pending.
2. Credit bureau updates in review.
3. TikTok launch momentum increasing.
""".strip()

    voice = pick_voice(briefing)
    out_path = OUTPUT_DIR / "live" / f"briefing_{now.strftime('%Y%m%d')}.mp3"

    speak(briefing, character=voice, output_path=out_path, mode="live", force=True)
    return out_path


if __name__ == "__main__":
    path = generate_briefing()
    print("Briefing generated:", path)
