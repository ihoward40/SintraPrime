from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError


@dataclass(frozen=True)
class SlackUploadResult:
    ok: bool
    file_id: Optional[str] = None
    channel: Optional[str] = None
    permalink: Optional[str] = None
    error: Optional[str] = None


def load_env(bundle_root: Path) -> None:
    env_path = bundle_root / "config" / ".env"
    if env_path.exists():
        load_dotenv(env_path)
    else:
        load_dotenv()


def upload_audio_to_slack(
    *,
    bundle_root: Path,
    file_path: Path,
    channel: Optional[str] = None,
    title: Optional[str] = None,
    initial_comment: Optional[str] = None,
) -> SlackUploadResult:
    load_env(bundle_root)

    token = os.getenv("SLACK_BOT_TOKEN")
    if not token:
        return SlackUploadResult(ok=False, error="Missing SLACK_BOT_TOKEN")

    channel_final = channel or os.getenv("SLACK_DEFAULT_CHANNEL")
    if not channel_final:
        return SlackUploadResult(ok=False, error="Missing SLACK_DEFAULT_CHANNEL (or pass channel=)")

    client = WebClient(token=token)

    file_path = file_path.expanduser().resolve()
    if not file_path.exists():
        return SlackUploadResult(ok=False, error=f"File not found: {file_path}")

    try:
        resp = client.files_upload_v2(
            channel=channel_final,
            file=str(file_path),
            filename=file_path.name,
            title=title or file_path.stem,
            initial_comment=initial_comment,
        )

        file_id = None
        permalink = None

        # Slack's response shape can vary slightly; attempt best-effort extraction.
        if isinstance(resp, dict):
            file_obj = resp.get("file") or (resp.get("files")[0] if resp.get("files") else None)
            if isinstance(file_obj, dict):
                file_id = file_obj.get("id")
                permalink = file_obj.get("permalink")

        return SlackUploadResult(ok=True, file_id=file_id, channel=channel_final, permalink=permalink)

    except SlackApiError as e:
        return SlackUploadResult(ok=False, error=f"Slack API error: {e.response.get('error') if e.response else str(e)}")
