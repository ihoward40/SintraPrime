// src/adapters/telephony/transcriptionAdapter.ts
// Real-time transcription adapter for SintraPrime.
// Interfaces with transcription services (Deepgram, AssemblyAI) to provide
// real-time speech-to-text during voice calls. Feeds transcripts into the
// DeepThink Analysis Runner for sentiment analysis and call summaries.

import * as crypto from "crypto";

export interface TranscriptionConfig {
  provider: "deepgram" | "assemblyai";
  apiKey: string;
  language?: string;
  model?: string;
  /** Whether to enable speaker diarization */
  diarize?: boolean;
  /** Whether to enable punctuation */
  punctuate?: boolean;
}

export interface TranscriptionResult {
  text: string;
  confidence: number;
  speaker?: string;
  timestamp: number;
  isFinal: boolean;
}

export interface CallSummary {
  callId: string;
  duration: number;
  transcript: string;
  speakers: string[];
  keyTopics: string[];
  actionItems: string[];
  sentiment: "positive" | "neutral" | "negative" | "mixed";
  summary: string;
  generatedAt: string;
}

export type TranscriptionCallback = (result: TranscriptionResult) => void;

export class TranscriptionAdapter {
  private config: TranscriptionConfig;
  private transcriptBuffer: Map<string, TranscriptionResult[]> = new Map();

  constructor(config: TranscriptionConfig) {
    this.config = config;
  }

  /**
   * Get the WebSocket URL for real-time transcription streaming.
   * The VoiceAdapter will connect the call audio stream to this URL.
   */
  getStreamingUrl(callId: string): string {
    switch (this.config.provider) {
      case "deepgram": {
        const params = new URLSearchParams({
          model: this.config.model || "nova-2",
          language: this.config.language || "en",
          punctuate: String(this.config.punctuate !== false),
          diarize: String(this.config.diarize !== false),
          encoding: "mulaw",
          sample_rate: "8000",
          channels: "1",
        });
        return `wss://api.deepgram.com/v1/listen?${params.toString()}`;
      }
      case "assemblyai":
        return "wss://api.assemblyai.com/v2/realtime/ws?sample_rate=8000";
      default:
        throw new Error(`Unsupported transcription provider: ${this.config.provider}`);
    }
  }

  /**
   * Get authentication headers for the transcription WebSocket connection.
   */
  getAuthHeaders(): Record<string, string> {
    switch (this.config.provider) {
      case "deepgram":
        return { Authorization: `Token ${this.config.apiKey}` };
      case "assemblyai":
        return { Authorization: this.config.apiKey };
      default:
        return {};
    }
  }

  /**
   * Parse a transcription result from the provider's WebSocket message.
   */
  parseTranscriptionMessage(callId: string, data: string): TranscriptionResult | null {
    try {
      const parsed = JSON.parse(data);

      let result: TranscriptionResult | null = null;

      switch (this.config.provider) {
        case "deepgram": {
          const channel = parsed.channel;
          const alternative = channel?.alternatives?.[0];
          if (alternative && alternative.transcript) {
            result = {
              text: alternative.transcript,
              confidence: alternative.confidence || 0,
              speaker: parsed.channel?.alternatives?.[0]?.words?.[0]?.speaker
                ? `Speaker ${parsed.channel.alternatives[0].words[0].speaker}`
                : undefined,
              timestamp: parsed.start || Date.now() / 1000,
              isFinal: parsed.is_final || false,
            };
          }
          break;
        }
        case "assemblyai": {
          if (parsed.text) {
            result = {
              text: parsed.text,
              confidence: parsed.confidence || 0,
              timestamp: parsed.audio_start ? parsed.audio_start / 1000 : Date.now() / 1000,
              isFinal: parsed.message_type === "FinalTranscript",
            };
          }
          break;
        }
      }

      // Buffer final transcripts for summary generation
      if (result && result.isFinal) {
        if (!this.transcriptBuffer.has(callId)) {
          this.transcriptBuffer.set(callId, []);
        }
        this.transcriptBuffer.get(callId)!.push(result);
      }

      return result;
    } catch {
      return null;
    }
  }

  /**
   * Get the full transcript for a completed call.
   */
  getFullTranscript(callId: string): string {
    const results = this.transcriptBuffer.get(callId) || [];
    return results.map((r) => {
      const prefix = r.speaker ? `[${r.speaker}] ` : "";
      return `${prefix}${r.text}`;
    }).join("\n");
  }

  /**
   * Generate a call summary structure (to be enriched by an LLM).
   * The actual LLM call would be handled by SintraPrime's AI features.
   */
  generateCallSummaryData(callId: string, duration: number): Omit<CallSummary, "summary" | "sentiment" | "keyTopics" | "actionItems"> {
    const results = this.transcriptBuffer.get(callId) || [];
    const transcript = this.getFullTranscript(callId);
    const speakers = [...new Set(results.filter((r) => r.speaker).map((r) => r.speaker!))];

    return {
      callId,
      duration,
      transcript,
      speakers,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Clean up transcript buffer for a completed call.
   */
  clearCallBuffer(callId: string): void {
    this.transcriptBuffer.delete(callId);
  }

  /**
   * Transcribe a pre-recorded audio file (non-real-time).
   * Useful for processing voicemails or call recordings.
   */
  async transcribeFile(audioUrl: string): Promise<string> {
    switch (this.config.provider) {
      case "deepgram": {
        const response = await fetch("https://api.deepgram.com/v1/listen", {
          method: "POST",
          headers: {
            Authorization: `Token ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: audioUrl,
            model: this.config.model || "nova-2",
            language: this.config.language || "en",
            punctuate: true,
            diarize: this.config.diarize !== false,
          }),
        });

        if (!response.ok) {
          throw new Error(`Deepgram transcription error: ${response.status}`);
        }

        const data: any = await response.json();
        return data.results?.channels?.[0]?.alternatives?.[0]?.transcript || "";
      }
      case "assemblyai": {
        // AssemblyAI uses a two-step process: submit, then poll
        const submitResponse = await fetch("https://api.assemblyai.com/v2/transcript", {
          method: "POST",
          headers: {
            Authorization: this.config.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ audio_url: audioUrl }),
        });

        if (!submitResponse.ok) {
          throw new Error(`AssemblyAI submit error: ${submitResponse.status}`);
        }

        const submitData: any = await submitResponse.json();
        const transcriptId = submitData.id;

        // Poll for completion (simplified — in production, use proper polling with backoff)
        let transcript = "";
        for (let i = 0; i < 60; i++) {
          await new Promise((resolve) => setTimeout(resolve, 5000));

          const pollResponse = await fetch(
            `https://api.assemblyai.com/v2/transcript/${transcriptId}`,
            { headers: { Authorization: this.config.apiKey } }
          );

          const pollData: any = await pollResponse.json();
          if (pollData.status === "completed") {
            transcript = pollData.text || "";
            break;
          }
          if (pollData.status === "error") {
            throw new Error(`AssemblyAI transcription failed: ${pollData.error}`);
          }
        }

        return transcript;
      }
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }
}
