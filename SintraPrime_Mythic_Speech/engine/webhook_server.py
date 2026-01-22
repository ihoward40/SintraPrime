from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

from flask import Flask, jsonify, request

from sintraprime_speech_engine import SintraPrimeSpeechEngine, default_bundle_root, timestamp_slug


def create_app(bundle_root: Path) -> Flask:
    app = Flask(__name__)

    @app.get("/health")
    def health() -> Any:
        return jsonify({"ok": True})

    @app.post("/speak")
    def speak() -> Any:
        body = request.get_json(silent=True) or {}
        if not isinstance(body, dict):
            return jsonify({"ok": False, "error": "Expected JSON object"}), 400

        text = body.get("text")
        persona = body.get("persona") or body.get("voice") or body.get("character")
        if not text or not isinstance(text, str):
            return jsonify({"ok": False, "error": "Missing 'text' (string)"}), 400
        if not persona or not isinstance(persona, str):
            return jsonify({"ok": False, "error": "Missing 'persona' (string) (or 'voice')"}), 400

        out_mode = body.get("out_mode") or body.get("mode") or "test"
        if out_mode not in ("test", "live"):
            return jsonify({"ok": False, "error": "out_mode/mode must be 'test' or 'live'"}), 400

        voice_settings = body.get("voice_settings")
        if voice_settings is not None and not isinstance(voice_settings, dict):
            return jsonify({"ok": False, "error": "voice_settings must be an object if provided"}), 400

        bundle_out = bundle_root / "output" / out_mode / timestamp_slug()
        filename = body.get("filename")
        if filename and isinstance(filename, str):
            if not filename.lower().endswith(".mp3"):
                filename = filename + ".mp3"
            out_path = bundle_out / filename
        else:
            out_path = bundle_out / f"{persona}.mp3"

        engine = SintraPrimeSpeechEngine(bundle_root=bundle_root)
        res = engine.speak(
            text=text,
            persona=persona,
            output_path=out_path,
            voice_settings=voice_settings,
            force=bool(body.get("force", False)),
        )

        return jsonify(
            {
                "ok": True,
                "persona": res.persona,
                "output_path": str(res.output_path),
                "request_id": res.eleven_request_id,
            }
        )

    return app


def main() -> int:
    parser = argparse.ArgumentParser(description="SintraPrime Mythic Speech webhook server")
    parser.add_argument("--host", default=os.getenv("WEBHOOK_HOST", "127.0.0.1"))
    parser.add_argument("--port", type=int, default=int(os.getenv("WEBHOOK_PORT", "5005")))
    parser.add_argument(
        "--print-example",
        action="store_true",
        help="Print an example curl request and exit",
    )
    args = parser.parse_args()

    if args.print_example:
        example = {
            "text": "We do not panic. We proceed with precision.",
            "voice": "oracle",
            "mode": "test",
            "voice_settings": {"stability": 0.4, "similarity_boost": 0.8},
        }
        print(
            "curl -X POST http://{host}:{port}/speak -H \"Content-Type: application/json\" -d '{json}'".format(
                host=args.host,
                port=args.port,
                json=json.dumps(example),
            )
        )
        return 0

    bundle_root = default_bundle_root()
    app = create_app(bundle_root=bundle_root)
    app.run(host=args.host, port=args.port)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
