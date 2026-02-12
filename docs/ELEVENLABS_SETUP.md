# ElevenLabs Voice Synthesis Setup Guide

SintraPrime includes optional integration with ElevenLabs for high-quality text-to-speech voice synthesis. This guide walks you through the setup process.

## Features

- **Global Rate Limiting**: Serialized API calls prevent 429 errors
- **8 Speech Categories**: System, warning, error, critical, success, info, debug, legal
- **Character Voices**: Map categories to distinct character voices
- **Fail-Open Design**: Errors are logged but never crash the application
- **Multi-Model Support**: Uses `eleven_multilingual_v2` by default
- **Optional Auto-Play**: Automatically play generated audio (Windows/Mac/Linux)

## Prerequisites

1. **ElevenLabs Account**: Sign up at https://elevenlabs.io
2. **API Key**: Generate an API key from your account dashboard
3. **Voice IDs**: Select voices from https://api.elevenlabs.io/v1/voices

## Setup Instructions

### 1. Configure Environment Variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your ElevenLabs credentials:

```bash
# Required: Your ElevenLabs API key
ELEVEN_API_KEY=sk_your_actual_elevenlabs_api_key_here

# Required: Default voice ID (fallback for all categories)
ELEVEN_VOICE_DEFAULT=your_default_voice_id_here

# Optional: Category-specific voices for character personalities
ELEVEN_VOICE_DRAGON=voice_id_for_critical_messages
ELEVEN_VOICE_ANDROID=voice_id_for_system_messages
ELEVEN_VOICE_JUDGE=voice_id_for_legal_messages
ELEVEN_VOICE_ORACLE=voice_id_for_warnings
ELEVEN_VOICE_WARRIOR=voice_id_for_debug_messages
ELEVEN_VOICE_NARRATOR=voice_id_for_info_messages
ELEVEN_VOICE_PROSECUTOR=voice_id_for_errors
ELEVEN_VOICE_SAGE=voice_id_for_success_messages

# Optional: Output directory for generated MP3s
ELEVEN_OUTPUT_DIR=runs/speech-elevenlabs

# Optional: Auto-play generated audio (1 = enabled, 0 = disabled)
ELEVEN_AUTO_PLAY=0

# Optional: Model configuration
ELEVEN_MODEL_ID=eleven_multilingual_v2
ELEVEN_STABILITY=0.5
ELEVEN_SIMILARITY_BOOST=0.5
ELEVEN_USE_SPEAKER_BOOST=1
```

### 2. Enable Speech Sinks

Update your `SPEECH_SINKS` environment variable to include `elevenlabs`:

```bash
# Single sink
SPEECH_SINKS=elevenlabs

# Multiple sinks (comma-separated)
SPEECH_SINKS=console,elevenlabs
```

### 3. Verify Configuration

Run the diagnostic script to verify your setup:

```bash
npm run diag:elevenlabs
```

This script will:
1. Verify API connectivity
2. Validate your voice IDs
3. Generate a test MP3
4. Test rate limiting behavior

**Expected output:**
```
🔍 SintraPrime ElevenLabs Diagnostic Suite
==========================================

=== TEST 1: API Connectivity ===
✅ API Key: Valid
✅ Account: Active

=== TEST 2: Voice Configuration ===
✅ Default Voice: Found (Voice Name)
✅ Dragon Voice: Found (Voice Name)
...

=== TEST 3: Audio Generation ===
✅ Generated test.mp3 (45.2 KB)

=== TEST 4: Rate Limiting ===
✅ Request 1: 1.2s
✅ Request 2: 1.1s (serialized)
```

## Usage

### Programmatic Usage

```typescript
import { elevenLabsSink } from './src/speech/sinks/elevenLabsSink.js';

// Speak with default voice
elevenLabsSink.speak({
  text: 'Hello from SintraPrime',
  category: 'info',
  timestamp: new Date().toISOString(),
});

// Speak with category-specific voice
elevenLabsSink.speak({
  text: 'Critical system alert',
  category: 'critical',  // Uses ELEVEN_VOICE_DRAGON
  timestamp: new Date().toISOString(),
});
```

### Speech Categories

| Category  | Use Case                  | Voice Mapping          |
|-----------|---------------------------|------------------------|
| system    | System notifications      | ELEVEN_VOICE_ANDROID   |
| warning   | Warning messages          | ELEVEN_VOICE_ORACLE    |
| error     | Error messages            | ELEVEN_VOICE_PROSECUTOR|
| critical  | Critical alerts           | ELEVEN_VOICE_DRAGON    |
| success   | Success confirmations     | ELEVEN_VOICE_SAGE      |
| info      | Informational messages    | ELEVEN_VOICE_NARRATOR  |
| debug     | Debug/diagnostic output   | ELEVEN_VOICE_WARRIOR   |
| legal     | Legal/compliance messages | ELEVEN_VOICE_JUDGE     |

## Voice Selection

### Finding Voice IDs

1. List all available voices:
   ```bash
   curl -X GET "https://api.elevenlabs.io/v1/voices" \
        -H "xi-api-key: YOUR_API_KEY"
   ```

2. Select voices that match your desired character personalities
3. Copy the `voice_id` from the response
4. Add to your `.env.local` configuration

### Recommended Voice Characteristics

- **Dragon (Critical)**: Deep, authoritative, urgent
- **Android (System)**: Neutral, clear, technical
- **Judge (Legal)**: Formal, measured, serious
- **Oracle (Warning)**: Mysterious, cautionary
- **Warrior (Debug)**: Direct, confident
- **Narrator (Info)**: Warm, informative
- **Prosecutor (Error)**: Sharp, accusatory
- **Sage (Success)**: Wise, affirming

## Rate Limiting

ElevenLabs enforces rate limits on API requests. SintraPrime handles this automatically:

- **Global Queue**: All requests are serialized
- **Prevents 429 Errors**: No concurrent API calls
- **Fail-Open**: Errors don't crash the application
- **Debug Logging**: Enable with `SPEECH_DEBUG=1`

## Output Files

Generated MP3 files are saved to `ELEVEN_OUTPUT_DIR` with the naming pattern:

```
speech_{timestamp}_{category}.mp3
```

Example:
```
runs/speech-elevenlabs/speech_2026-02-12T20-30-45-123Z_critical.mp3
```

## Auto-Play

When `ELEVEN_AUTO_PLAY=1`, generated audio is automatically opened:

- **Windows**: Uses PowerShell `Start-Process`
- **macOS**: Uses `afplay`
- **Linux**: Uses `xdg-open`

**Note**: Auto-play is best-effort and may fail silently if the required tools aren't available.

## Debugging

Enable debug logging:

```bash
export SPEECH_DEBUG=1
```

Debug output includes:
- API request details
- Voice selection logic
- File write confirmations
- Error messages

Example debug output:
```
[speech:elevenlabs] wrote runs/speech-elevenlabs/speech_2026-02-12_info.mp3 (45234 bytes)
[speech:elevenlabs] No voice id configured; skipping
[speech:elevenlabs] error: HTTP 429: Rate limit exceeded
```

## Security Notes

- **Never commit** your API key to version control
- Store credentials in `.env.local` (git-ignored)
- Use environment variable placeholders in `.env.example`
- Generated audio files are excluded via `.gitignore` (`runs/` directory)
- API errors are logged but never expose credentials

## Cost Management

Monitor your ElevenLabs usage:
1. Check your account dashboard for character limits
2. Each request consumes characters based on text length
3. Consider implementing additional rate limiting for high-volume scenarios

## Troubleshooting

### Error: ELEVEN_API_KEY missing
**Solution**: Set `ELEVEN_API_KEY` in `.env.local`

### Error: No voice id configured
**Solution**: Set `ELEVEN_VOICE_DEFAULT` or category-specific voice variables

### Error: HTTP 401 Unauthorized
**Solution**: Verify your API key is correct and active

### Error: HTTP 429 Rate Limit
**Solution**: This should be prevented by the queue. If you see this, report it as a bug.

### Silent Failures
**Solution**: Enable `SPEECH_DEBUG=1` to see detailed error messages

### Auto-play Not Working
**Solution**: Ensure required tools are installed:
- Windows: PowerShell (built-in)
- macOS: `afplay` (built-in)
- Linux: `xdg-open` (install via package manager)

## Support

For issues or questions:
1. Check the diagnostic output: `npm run diag:elevenlabs`
2. Enable debug logging: `SPEECH_DEBUG=1`
3. Review the security policy in `SECURITY.md`
4. Open an issue on GitHub with diagnostic output
