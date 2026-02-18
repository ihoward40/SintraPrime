#!/usr/bin/env python3
"""Helper for running Claude Code (`claude` CLI) as a ClawdBot skill.

Design goals:
- Headless mode should be resilient in non-interactive automation.
- Interactive mode uses tmux for slash-command workflows.

This script is intentionally small and only wraps the CLI.
"""

from __future__ import annotations

import argparse
import os
import shlex
import shutil
import subprocess
import sys
import time
from pathlib import Path


def looks_like_slash_commands(prompt: str | None) -> bool:
    if not prompt:
        return False
    return any(line.lstrip().startswith("/") for line in prompt.splitlines())


def default_claude_bin() -> str:
    env = os.environ.get("CLAUDE_CODE_BIN")
    if env:
        return env
    found = shutil.which("claude")
    if found:
        return found
    return "/home/ubuntu/.local/bin/claude"


def build_cmd(args: argparse.Namespace) -> list[str]:
    cmd: list[str] = [args.claude_bin]

    if args.permission_mode:
        cmd += ["--permission-mode", args.permission_mode]

    if args.allowed_tools:
        cmd += ["--allowedTools", args.allowed_tools]

    if args.output_format:
        cmd += ["--output-format", args.output_format]

    if args.json_schema:
        cmd += ["--json-schema", args.json_schema]

    if args.append_system_prompt:
        cmd += ["--append-system-prompt", args.append_system_prompt]

    if args.system_prompt:
        cmd += ["--system-prompt", args.system_prompt]

    if args.continue_latest:
        cmd.append("--continue")

    if args.resume:
        cmd += ["--resume", args.resume]

    if args.prompt is not None:
        cmd += ["-p", args.prompt]

    if args.extra:
        cmd += args.extra

    return cmd


def run_headless(cmd: list[str], cwd: str | None) -> int:
    if os.name == "nt":
        return int(subprocess.run(cmd, cwd=cwd).returncode)

    script_bin = shutil.which("script")
    if not script_bin:
        return int(subprocess.run(cmd, cwd=cwd).returncode)

    cmd_str = " ".join(shlex.quote(part) for part in cmd)
    return int(subprocess.run([script_bin, "-q", "-c", cmd_str, "/dev/null"], cwd=cwd).returncode)


def tmux(socket_path: str, *argv: str) -> list[str]:
    return ["tmux", "-S", socket_path, *argv]


def tmux_capture(socket_path: str, target: str, lines: int) -> str:
    return subprocess.check_output(
        tmux(socket_path, "capture-pane", "-p", "-J", "-t", target, "-S", f"-{lines}"),
        text=True,
    )


def tmux_wait_for(socket_path: str, target: str, needle: str, timeout_s: int) -> bool:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            if needle in tmux_capture(socket_path, target, lines=200):
                return True
        except subprocess.CalledProcessError:
            pass
        time.sleep(0.5)
    return False


def run_interactive(args: argparse.Namespace) -> int:
    if os.name == "nt":
        print("interactive tmux mode is not supported on Windows", file=sys.stderr)
        return 2

    if not shutil.which("tmux"):
        print("tmux not found in PATH", file=sys.stderr)
        return 2

    socket_dir = (
        args.tmux_socket_dir
        or os.environ.get("CLAWDBOT_TMUX_SOCKET_DIR")
        or f"{os.environ.get('TMPDIR', '/tmp')}/clawdbot-tmux-sockets"
    )
    Path(socket_dir).mkdir(parents=True, exist_ok=True)
    socket_path = str(Path(socket_dir) / args.tmux_socket_name)

    session = args.tmux_session
    target = f"{session}:0.0"

    subprocess.run(tmux(socket_path, "kill-session", "-t", session), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    subprocess.check_call(tmux(socket_path, "new-session", "-d", "-s", session, "-n", "shell"))

    cwd = args.cwd or os.getcwd()

    base: list[str] = [args.claude_bin]
    if args.permission_mode:
        base += ["--permission-mode", args.permission_mode]
    if args.allowed_tools:
        base += ["--allowedTools", args.allowed_tools]
    if args.append_system_prompt:
        base += ["--append-system-prompt", args.append_system_prompt]
    if args.system_prompt:
        base += ["--system-prompt", args.system_prompt]
    if args.continue_latest:
        base.append("--continue")
    if args.resume:
        base += ["--resume", args.resume]
    if args.extra:
        base += args.extra

    launch = f"cd {shlex.quote(cwd)} && " + " ".join(shlex.quote(p) for p in base)
    subprocess.check_call(tmux(socket_path, "send-keys", "-t", target, "-l", "--", launch))
    subprocess.check_call(tmux(socket_path, "send-keys", "-t", target, "Enter"))

    # Best-effort folder trust prompt acknowledgement.
    if tmux_wait_for(socket_path, target, "trust this folder", timeout_s=20):
        subprocess.run(tmux(socket_path, "send-keys", "-t", target, "Enter"), check=False)
        time.sleep(1)

    if args.prompt:
        for line in [ln for ln in args.prompt.splitlines() if ln.strip()]:
            subprocess.check_call(tmux(socket_path, "send-keys", "-t", target, "-l", "--", line))
            subprocess.check_call(tmux(socket_path, "send-keys", "-t", target, "Enter"))
            time.sleep(args.interactive_send_delay_ms / 1000.0)

    print("Started interactive Claude Code in tmux")
    print(f"Monitor:  tmux -S {shlex.quote(socket_path)} attach -t {shlex.quote(session)}")
    print(f"Snapshot: tmux -S {shlex.quote(socket_path)} capture-pane -p -J -t {shlex.quote(target)} -S -200")

    if args.interactive_wait_s > 0:
        time.sleep(args.interactive_wait_s)
        try:
            print("\n--- tmux snapshot (last 200 lines) ---\n")
            print(tmux_capture(socket_path, target, lines=200))
        except subprocess.CalledProcessError:
            pass

    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="Run Claude Code (`claude`) headless or via tmux")

    ap.add_argument("-p", "--prompt", help="Prompt text")
    ap.add_argument("--mode", choices=["auto", "headless", "interactive"], default="auto")

    ap.add_argument("--permission-mode", default=None)
    ap.add_argument("--allowedTools", dest="allowed_tools")
    ap.add_argument("--output-format", dest="output_format", choices=["text", "json", "stream-json"])
    ap.add_argument("--json-schema", dest="json_schema")

    ap.add_argument("--append-system-prompt", dest="append_system_prompt")
    ap.add_argument("--system-prompt", dest="system_prompt")

    ap.add_argument("--continue", dest="continue_latest", action="store_true")
    ap.add_argument("--resume")

    ap.add_argument("--claude-bin", default=default_claude_bin())
    ap.add_argument("--cwd")

    ap.add_argument("--tmux-session", default="cc")
    ap.add_argument("--tmux-socket-dir", default=None)
    ap.add_argument("--tmux-socket-name", default="claude-code.sock")
    ap.add_argument("--interactive-wait-s", type=int, default=0)
    ap.add_argument("--interactive-send-delay-ms", type=int, default=800)

    ap.add_argument("extra", nargs=argparse.REMAINDER)

    args = ap.parse_args()

    extra = list(args.extra or [])
    if extra and extra[0] == "--":
        extra = extra[1:]
    args.extra = extra

    if not Path(args.claude_bin).exists() and not shutil.which(args.claude_bin):
        print(f"claude binary not found: {args.claude_bin}", file=sys.stderr)
        return 2

    mode = args.mode
    if mode == "auto" and looks_like_slash_commands(args.prompt):
        mode = "interactive"

    if mode == "interactive":
        return run_interactive(args)

    return run_headless(build_cmd(args), cwd=args.cwd)


if __name__ == "__main__":
    raise SystemExit(main())
