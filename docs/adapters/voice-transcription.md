---
sidebar_position: 8
title: Voice & Transcription
description: ElevenLabs voice synthesis, speech-to-text, and the mythic voice character system.
---

# Voice & Transcription

SintraPrime integrates with ElevenLabs for voice synthesis and supports speech-to-text transcription for call recording processing. The system includes a unique **9-character mythic voice system** for distinct voice personas.

## Configuration

```bash title=".env"
ELEVENLABS_API_KEY=your-elevenlabs-api-key
ELEVENLABS_VOICE_ID=default-voice-id
TRANSCRIPTION_PROVIDER=whisper
```

## Voice Synthesis

### Text-to-Speech

```typescript
const result = await voiceAdapter.execute({
  type: 'synthesize',
  params: {
    text: 'Weekly trust report summary: All credit monitoring checks passed.',
    voice_id: 'mythic-narrator',
    output_format: 'mp3',
  },
  governance: { mode: 'SINGLE_RUN_APPROVED', receipt_required: true },
});
```

### 9-Character Mythic Voice System

SintraPrime features nine distinct voice characters, each with unique personality traits and use cases:

| Character | Voice Style | Use Case |
|:---|:---|:---|
| **Narrator** | Authoritative, clear | Reports, summaries |
| **Guardian** | Firm, protective | Security alerts |
| **Sage** | Wise, measured | Analysis, insights |
| **Herald** | Energetic, announcing | Notifications, updates |
| **Scribe** | Precise, detailed | Documentation |
| **Oracle** | Mysterious, prophetic | Predictions, forecasts |
| **Sentinel** | Watchful, alert | Monitoring alerts |
| **Architect** | Technical, structured | System explanations |
| **Emissary** | Diplomatic, warm | Communications |

## Transcription

### Speech-to-Text

```typescript
const result = await voiceAdapter.execute({
  type: 'transcribe',
  params: {
    audio_file: '/evidence/calls/call_20260220.mp3',
    language: 'en',
    confidence_scoring: true,
    speaker_identification: true,
  },
});
```

### Confidence Scoring

Transcriptions include per-segment confidence scores:

```json
{
  "segments": [
    {
      "start": 0.0,
      "end": 5.2,
      "text": "This is the weekly trust review meeting.",
      "confidence": 0.97,
      "speaker": "Speaker_1"
    }
  ],
  "overall_confidence": 0.94
}
```

## Integration with Evidence Systems

Voice and transcription data feeds into the [Call Ingest](../evidence-systems/call-ingest) system for evidence processing and the [Timeline Builder](../evidence-systems/timeline-builder) for chronological event assembly.

:::info Beta Status
The Voice & Transcription adapter is currently in beta. ElevenLabs integration is stable; advanced transcription features are under active development.
:::

## Next Steps

- [Call Ingest](../evidence-systems/call-ingest) — Call recording evidence processing
- [Content Production Agent](../agents/content-production-agent) — Voice content creation
- [Adapters Overview](./overview) — All available adapters
