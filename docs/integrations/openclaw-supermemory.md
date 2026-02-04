# OpenClaw + Supermemory

## Documentation Index
Fetch the complete documentation index at:

```
https://supermemory.ai/docs/llms.txt
```

Use that file to discover all available pages before exploring further.

## Overview
OpenClaw is a multi-platform AI messaging gateway that connects to WhatsApp, Telegram, Discord, Slack, iMessage, and other messaging channels. The Supermemory plugin provides persistent memory across every channel.

> [!WARNING]
> This integration requires the **Supermemory Pro plan**. Upgrade at:
>
> ```
> https://console.supermemory.ai/billing
> ```

Source repo:

```
https://github.com/supermemoryai/openclaw-supermemory
```

## Get Your API Key
Create a Supermemory API key at:

```
https://console.supermemory.ai/keys
```

Prefer environment variables for secrets.

### macOS / Linux (zsh)
```bash
echo 'export SUPERMEMORY_OPENCLAW_API_KEY="sm_..."' >> ~/.zshrc
source ~/.zshrc
```

### macOS / Linux (bash)
```bash
echo 'export SUPERMEMORY_OPENCLAW_API_KEY="sm_..."' >> ~/.bashrc
source ~/.bashrc
```

### Windows (PowerShell)
```powershell
[System.Environment]::SetEnvironmentVariable("SUPERMEMORY_OPENCLAW_API_KEY", "sm_...", "User")
```

Restart your terminal after setting the variable.

## Install the Plugin
```bash
openclaw plugins install @supermemory/openclaw-supermemory
```

Restart OpenClaw after installing.

## How It Works
- **Auto-Recall**: Before every AI turn, Supermemory is queried for relevant memories and the user profile. Results are injected as context.
- **Auto-Capture**: After every AI turn, the conversation exchange is sent to Supermemory for extraction and long-term storage.

## Features

### AI Tools
| Tool | Description |
| --- | --- |
| `supermemory_store` | Save information to long-term memory. |
| `supermemory_search` | Search memories by query with similarity scores. |
| `supermemory_forget` | Delete a memory by query or ID. |
| `supermemory_profile` | View the user profile — persistent facts and recent context. |

### Slash Commands
| Command | Description |
| --- | --- |
| `/remember [text]` | Manually save something to memory. |
| `/recall [query]` | Search memories and see results with similarity scores. |

### CLI Commands
```bash
openclaw supermemory search <query>    # Search memories from the terminal
openclaw supermemory profile           # View user profile
openclaw supermemory wipe              # Delete all memories (requires confirmation)
```

## Manual Configuration (Optional)
Prefer env vars for secrets. Only use this if you *must* place the key in config (e.g., locked-down environment with managed config distribution).

Add the plugin entry to your `openclaw.json`:

```jsonc
{
  "plugins": {
    "entries": {
      "openclaw-supermemory": {
        "enabled": true,
        "config": {
          "apiKey": "sm_..."
        }
      }
    }
  }
}
```

### Advanced Options
| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `autoRecall` | `boolean` | `true` | Inject relevant memories before every AI turn. |
| `autoCapture` | `boolean` | `true` | Store conversation content after every turn. |
| `maxRecallResults` | `number` | `10` | Max memories injected into context per turn. |
| `profileFrequency` | `number` | `50` | Inject full user profile every N turns. |
| `captureMode` | `string` | `"all"` | `"all"` filters noise. `"everything"` captures all messages. |
| `debug` | `boolean` | `false` | Verbose debug logs. |
