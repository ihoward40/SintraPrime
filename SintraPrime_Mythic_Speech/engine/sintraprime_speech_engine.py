from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Optional

import requests
from dotenv import load_dotenv


@dataclass(frozen=True)
class SpeechResult:
    persona: str
    voice_id: str
    text: str
    output_path: Path
    eleven_request_id: Optional[str] = None


class SintraPrimeSpeechEngine:
    """Minimal ElevenLabs-backed speech generator.

    - Loads env from config/.env (if present) and process environment.
    - Resolves persona -> voice_id via config/voices.json.
    - Writes audio to an output path (mp3 by default).
    """

    def __init__(
        self,
        bundle_root: Path,
        voices_path: Optional[Path] = None,
        eleven_api_key: Optional[str] = None,
        eleven_base_url: Optional[str] = None,
        timeout_s: int = 60,
    ):
        self.bundle_root = bundle_root

        # Load .env if present
        env_path = self.bundle_root / "config" / ".env"
        if env_path.exists():
            load_dotenv(env_path)
        else:
            # Also allow running from a dev machine where env vars are already set.
            load_dotenv()

        self.voices_path = voices_path or (self.bundle_root / "config" / "voices.json")
        self.eleven_api_key = eleven_api_key or os.getenv("ELEVEN_API_KEY")
        self.eleven_base_url = (eleven_base_url or os.getenv("ELEVEN_BASE_URL") or "https://api.elevenlabs.io").rstrip(
            "/"
        )
        self.timeout_s = timeout_s

        if not self.eleven_api_key:
            raise RuntimeError(
                "Missing ELEVEN_API_KEY. Create config/.env from config/.env.example or set ELEVEN_API_KEY in your environment."
            )

        self._voices_cache: Optional[Dict[str, str]] = None

    def load_voices(self) -> Dict[str, str]:
        if self._voices_cache is not None:
            return self._voices_cache

        if not self.voices_path.exists():
            raise FileNotFoundError(f"voices.json not found: {self.voices_path}")

        data = json.loads(self.voices_path.read_text(encoding="utf-8"))
        if not isinstance(data, dict) or not all(isinstance(k, str) and isinstance(v, str) for k, v in data.items()):
            raise ValueError("voices.json must be a JSON object of {persona: voice_id}")

        self._voices_cache = data
        return data

    def resolve_voice_id(self, persona: str) -> str:
        voices = self.load_voices()
        key = persona.strip().lower()
        if key not in voices:
            raise KeyError(
                f"Unknown persona '{persona}'. Available: {', '.join(sorted(voices.keys()))}"
            )
        return voices[key]

    def speak(
        self,
        *,
        text: str,
        persona: str,
        output_path: Path,
        model_id: str = "eleven_monolingual_v1",
        voice_settings: Optional[Dict[str, Any]] = None,
        force: bool = False,
    ) -> SpeechResult:
        voice_id = self.resolve_voice_id(persona)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        if output_path.exists() and not force:
            return SpeechResult(persona=persona, voice_id=voice_id, text=text, output_path=output_path)

        url = f"{self.eleven_base_url}/v1/text-to-speech/{voice_id}"
        headers = {
            "xi-api-key": self.eleven_api_key,
            "accept": "audio/mpeg",
            "content-type": "application/json",
        }
        payload: Dict[str, Any] = {
            "text": text,
            "model_id": model_id,
        }
        if voice_settings:
            payload["voice_settings"] = voice_settings

        resp = requests.post(url, headers=headers, json=payload, timeout=self.timeout_s)
        if resp.status_code >= 400:
            raise RuntimeError(
                f"ElevenLabs TTS failed: HTTP {resp.status_code} {resp.reason}: {resp.text[:500]}"
            )

        output_path.write_bytes(resp.content)
        req_id = resp.headers.get("x-request-id") or resp.headers.get("x_request_id")
        return SpeechResult(
            persona=persona,
            voice_id=voice_id,
            text=text,
            output_path=output_path,
            eleven_request_id=req_id,
        )


def default_bundle_root() -> Path:
    return Path(__file__).resolve().parents[1]


OUTPUT_DIR = default_bundle_root() / "output"


def timestamp_slug() -> str:
    return time.strftime("%Y%m%d_%H%M%S")


def speak(
    text: str,
    *,
    character: Optional[str] = None,
    voice: Optional[str] = None,
    persona: Optional[str] = None,
    output_path: Optional[Path] = None,
    mode: str = "test",
    voice_settings: Optional[Dict[str, Any]] = None,
    force: bool = False,
) -> SpeechResult:
    """Convenience wrapper.

    Supports Phase VII naming:
    - character / voice / persona are synonyms.
    - mode: 'test' or 'live'
    """

    who = (persona or voice or character or "").strip() or "isiah"
    if mode not in ("test", "live"):
        raise ValueError("mode must be 'test' or 'live'")

    bundle_root = default_bundle_root()
    if output_path is None:
        out_dir = OUTPUT_DIR / mode / timestamp_slug()
        output_path = out_dir / f"{who}.mp3"

    engine = SintraPrimeSpeechEngine(bundle_root=bundle_root)
    return engine.speak(text=text, persona=who, output_path=output_path, voice_settings=voice_settings, force=force)
