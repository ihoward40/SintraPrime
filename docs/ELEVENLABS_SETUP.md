# ElevenLabs Voice Synthesis Setup Guide

This guide explains how to set up ElevenLabs voice synthesis integration for the 9-character mythic voice system.

## Overview

The ElevenLabs integration provides high-quality text-to-speech synthesis with support for 9 distinct character voices that map to different speech categories (system, warning, error, critical, success, info, debug, legal).

### Features

- ✅ **Security First**: No hardcoded API keys, environment validation
- ✅ **Rate Limiting**: Global request queue prevents concurrent API calls and 429 errors
- ✅ **Fail-Open Design**: Won't crash your application if API is unavailable
- ✅ **Multi-Character Support**: 9 distinct character voices for different contexts
- ✅ **Windows Auto-Play**: Optional automatic playback on Windows
- ✅ **Debug Logging**: Detailed logging when enabled

## Prerequisites

1. **ElevenLabs Account**: Sign up at https://elevenlabs.io
2. **API Key**: Get your API key from https://elevenlabs.io/app/settings/api-keys
3. **Voice IDs**: Browse and select voices from https://elevenlabs.io/app/voice-library

## Setup Instructions

### Step 1: Create Local Environment File

Create a `.env.local` file in the project root (this file is automatically ignored by git):

**Windows / PowerShell quickstart (recommended):**

```powershell
cd "C:\Users\admin\.sintraprime esm project"
Copy-Item -Force .env.example .env.local
notepad .env.local
```

Notes:
- `.env.local` uses `NAME=value` lines (no `$env:` prefix).
- In PowerShell, typing `NAME=value` directly will error; PowerShell session variables must be set like `$env:NAME="value"`.

```bash
# ElevenLabs API Key (required)
ELEVEN_API_KEY=sk_your_actual_api_key_here

# Character Voice IDs
# Get these from: https://elevenlabs.io/app/voice-library
ELEVEN_VOICE_DRAGON=voice_id_for_critical_messages
ELEVEN_VOICE_ANDROID=voice_id_for_system_messages
ELEVEN_VOICE_JUDGE=voice_id_for_legal_messages
ELEVEN_VOICE_ORACLE=voice_id_for_warnings
ELEVEN_VOICE_WARRIOR=voice_id_for_debug_messages
ELEVEN_VOICE_NARRATOR=voice_id_for_info_messages
ELEVEN_VOICE_PROSECUTOR=voice_id_for_errors
ELEVEN_VOICE_SAGE=voice_id_for_success_messages
ELEVEN_VOICE_DEFAULT=voice_id_for_fallback

# Optional: Output directory for generated audio files
ELEVEN_OUTPUT_DIR=voice/dynamic

# Optional: Auto-play audio on Windows (0=off, 1=on)
ELEVEN_AUTO_PLAY=0

# Optional: Enable debug logging (0=off, 1=on)
SPEECH_DEBUG=1

# Enable ElevenLabs sink
SPEECH_SINKS=console,elevenlabs
```

**Important Security Notes:**
- Never commit `.env.local` to git
- Never use placeholder values in production
- Keep your API key secret

### Step 2: Choose Voices

1. Visit the [ElevenLabs Voice Library](https://elevenlabs.io/app/voice-library)
2. Preview voices to find ones that match each character:
   - **Dragon**: Urgent, commanding, powerful
   - **Android**: Neutral, robotic, precise
   - **Judge**: Authoritative, formal, measured
   - **Oracle**: Mysterious, knowing, warning
   - **Warrior**: Strong, direct, action-oriented
   - **Narrator**: Clear, informative, neutral (default)
   - **Prosecutor**: Accusatory, sharp, direct
   - **Sage**: Wise, calm, reassuring
3. Copy the Voice ID for each selected voice
4. Add them to your `.env.local` file

### Step 3: Test the Integration

Run the diagnostic script to validate your setup:

```bash
node test-elevenlabs-complete.mjs
```

You can also run an in-app style speech probe (uses the real `speak()` pipeline):

```bash
npm run speak:test -- --text "Immediate alert. Containment required." --category critical --autoplay --debug
```

Note: `speak:test` also auto-loads `.env.local` from the project root.

Additional helpers:

```bash
npm run speak:voices
npm run speak:cinematic -- --preset cinematic --autoplay --debug
npm run speak:open-latest
```

PowerShell equivalent:

```powershell
node test-elevenlabs-complete.mjs
```

The script will:
1. ✅ Validate your API key
2. ✅ Test API connectivity
3. ✅ Generate a test audio file
4. ✅ Test Windows playback (if applicable)
5. ✅ Generate audio for all configured character voices

Expected output:
```
🎤 ElevenLabs Voice Synthesis - Complete Diagnostic

✅ Loaded environment from .env.local

=== Environment Validation ===
✅ ELEVEN_API_KEY is set
✅ ELEVEN_VOICE_NARRATOR is configured
...
✅ 5 voice(s) configured

=== Testing API Connectivity ===
✅ Connected to ElevenLabs API
   User: starter tier
   Character quota: 5234 / 10000

=== Testing Audio Generation ===
Generating test audio with voice ID: abc123...
✅ Audio generated successfully: voice/dynamic/test-basic.mp3
   Size: 15.23 KB

=== Testing All Character Voices ===
Generating audio for Dragon...
✅ Dragon: Generated (14.56 KB)
...
📊 Summary: 5 succeeded, 3 skipped

✅ All tests completed successfully!
```

### Step 4: Enable in Your Application

To enable ElevenLabs voice synthesis in your application, set the `SPEECH_SINKS` environment variable:

```bash
SPEECH_SINKS=console,elevenlabs
```

You can combine multiple sinks:
- `console` - Standard error output
- `elevenlabs` - ElevenLabs voice synthesis
- `webhook` - Webhook notifications
- `os-tts` - OS text-to-speech

## Character Voice Mapping

The system automatically maps speech categories to character voices:

| Speech Category | Character | Voice Environment Variable | Typical Use Case |
|----------------|-----------|---------------------------|------------------|
| `critical` | Dragon | `ELEVEN_VOICE_DRAGON` | Urgent system alerts |
| `system` | Android | `ELEVEN_VOICE_ANDROID` | System status messages |
| `legal` | Judge | `ELEVEN_VOICE_JUDGE` | Legal notices, terms |
| `warning` | Oracle | `ELEVEN_VOICE_ORACLE` | Warnings, cautions |
| `debug` | Warrior | `ELEVEN_VOICE_WARRIOR` | Debug information |
| `info` | Narrator | `ELEVEN_VOICE_NARRATOR` | General information (default) |
| `error` | Prosecutor | `ELEVEN_VOICE_PROSECUTOR` | Error messages |
| `success` | Sage | `ELEVEN_VOICE_SAGE` | Success confirmations |
| _(fallback)_ | Default | `ELEVEN_VOICE_DEFAULT` | When category not matched |

## Rate Limiting

The integration includes built-in rate limiting to prevent 429 errors:

- **Global Request Queue**: All API requests are queued and processed sequentially
- **Automatic Spacing**: 100ms delay between requests
- **No External Dependencies**: Simple enqueue pattern without external libraries

This ensures your application won't be throttled even when multiple speech events occur simultaneously.

## Troubleshooting

### "ELEVEN_API_KEY is not set"

**Solution**: Create a `.env.local` file with your actual API key:
```bash
ELEVEN_API_KEY=sk_your_actual_api_key
```

If you're setting it for the current PowerShell session only:

```powershell
$env:ELEVEN_API_KEY="sk_your_actual_api_key"
```

### "No character voice IDs configured"

**Solution**: Add at least one voice ID to `.env.local`. The Narrator voice is a good default:
```bash
ELEVEN_VOICE_NARRATOR=your_narrator_voice_id
```

### API Error 401 (Unauthorized)

**Cause**: Invalid API key

**Solution**: 
1. Verify your API key at https://elevenlabs.io/app/settings/api-keys
2. Make sure you copied the entire key (starts with `sk_`)
3. Update `.env.local` with the correct key

### API Error 429 (Rate Limit)

**Cause**: Too many concurrent requests

**Solution**: 
- The integration includes automatic rate limiting
- If you still see 429 errors, check if you're making direct API calls elsewhere
- Consider upgrading your ElevenLabs plan for higher rate limits

### No audio file generated

**Solution**: 
1. Enable debug logging: `SPEECH_DEBUG=1`
2. Check the console for error messages
3. Verify the output directory exists and is writable
4. Confirm you have sufficient API quota remaining

### Audio files but no playback on Windows

**Solution**:
1. Set `ELEVEN_AUTO_PLAY=1` in `.env.local`
2. Ensure PowerShell is available
3. Check Windows audio settings

## Best Practices

### Security
- ✅ Always use `.env.local` for credentials
- ✅ Never commit API keys to git
- ✅ Use environment variables, never hardcode keys
- ✅ Rotate API keys periodically

### Performance
- ✅ Let the built-in rate limiting handle request spacing
- ✅ Don't disable the fail-open behavior
- ✅ Monitor your API quota usage
- ✅ Consider caching frequently used phrases

### Voice Selection
- ✅ Preview voices before selecting
- ✅ Choose distinct voices for better category differentiation
- ✅ Test voices with your actual message content
- ✅ Consider your audience's language and accent preferences

## Advanced Configuration

### Custom Output Directory

Change where audio files are saved:

```bash
ELEVEN_OUTPUT_DIR=my-custom-voice-output
```

### Debug Logging

Enable detailed logging for troubleshooting:

```bash
SPEECH_DEBUG=1
```

This will output:
- Request queue status
- Voice ID selection
- API request/response details
- File save locations
- Error details

### Windows Auto-Play

Enable automatic playback on Windows:

```bash
ELEVEN_AUTO_PLAY=1
```

Note: Auto-play only works on Windows platform.

## API Quota Management

Monitor your API usage:
1. Visit https://elevenlabs.io/app/settings
2. Check your character count and limit
3. Consider upgrading for higher quotas

**Free Tier**: ~10,000 characters/month
**Starter Tier**: ~30,000 characters/month
**Creator Tier**: ~100,000 characters/month

Each character in your speech text counts toward your quota.

## Support and Resources

- **ElevenLabs Docs**: https://docs.elevenlabs.io
- **Voice Library**: https://elevenlabs.io/app/voice-library
- **API Reference**: https://docs.elevenlabs.io/api-reference
- **Pricing**: https://elevenlabs.io/pricing

## Model Information

The integration uses `eleven_multilingual_v2` - ElevenLabs' current multilingual model supporting:
- High-quality voice synthesis
- Multiple languages
- Consistent voice characteristics
- Fast generation times

This is the recommended model as of 2024 (older models like `eleven_monolingual_v1` are deprecated).
