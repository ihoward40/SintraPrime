---
name: claude-code-clawdbot
description: "Run Claude Code locally via the `claude` CLI in headless automation (PTY when available) or in an interactive tmux session for slash-command workflows."
---

# Claude Code (local CLI)

This skill drives the locally installed **Claude Code** CLI (`claude`).

## Modes

- **Headless**: best for normal prompts, scripts, cron, CI.
- **Interactive (tmux)**: best for slash commands (lines starting with `/`) and long multi-step flows.

## Requirements

- `claude` installed on the host (`claude --version`)
- For interactive mode: `tmux` available
- For best headless reliability on Linux: `script(1)` available (optional)

## Examples

Headless planning:

```bash
./scripts/claude_code_run.py --mode headless --permission-mode plan -p "Summarize this repo in 5 bullets."
```

Headless with allowed tools:

```bash
./scripts/claude_code_run.py \
  --mode headless \
  --permission-mode acceptEdits \
  --allowedTools "Bash,Read,Edit" \
  -p "Run tests and fix failures."
```

Interactive tmux (slash commands):

```bash
./scripts/claude_code_run.py \
  --mode interactive \
  --tmux-session cc \
  --permission-mode acceptEdits \
  --allowedTools "Bash,Read,Edit,Write" \
  -p $'/speckit.tasks\n/speckit.implement'
```
