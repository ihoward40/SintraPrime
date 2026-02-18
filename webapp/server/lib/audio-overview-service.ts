/**
 * Audio Overview Service
 * 
 * Generates podcast-style audio overviews with two AI voices discussing research documents.
 * Features:
 * - Two-voice conversation (Host A and Host B)
 * - Natural dialogue flow
 * - Key points summarization
 * - Engaging presentation style
 */

import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import { generatePodcastAudioWithFallback, type TTSSegment } from "./tts-service";

export interface AudioOverviewScript {
  title: string;
  duration: number; // estimated in seconds
  segments: Array<{
    speaker: "Host A" | "Host B";
    text: string;
  }>;
}

export interface AudioOverviewResult {
  audioUrl: string;
  transcript: string;
  duration: number;
  focusAreas: string[];
}

export class AudioOverviewService {
  /**
   * Generate conversation script from documents
   */
  async generateScript(
    documents: Array<{ fileName: string; content: string }>,
    focusAreas?: string[]
  ): Promise<AudioOverviewScript> {
    const context = documents
      .map((doc) => `[${doc.fileName}]\n${doc.content.substring(0, 15000)}`)
      .join("\n\n---\n\n");

    const focusPrompt = focusAreas?.length
      ? `Focus the discussion on: ${focusAreas.join(", ")}`
      : "";

    const prompt = `Create a podcast-style conversation script between two hosts discussing the following research documents.

${focusPrompt}

Documents:
${context}

Requirements:
- Host A: Enthusiastic, asks questions, guides the conversation
- Host B: Expert, provides insights, explains concepts
- Natural dialogue with back-and-forth
- 8-12 exchanges total
- Each segment should be 2-4 sentences
- Cover key findings, interesting insights, and practical takeaways
- Make it engaging and easy to understand

Respond in JSON format:
{
  "title": "Podcast title",
  "segments": [
    {
      "speaker": "Host A",
      "text": "Welcome to..."
    },
    {
      "speaker": "Host B",
      "text": "Thanks for having me..."
    }
  ]
}`;

    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "You are a podcast script writer. Create engaging, natural conversations.",
        },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "podcast_script",
          strict: true,
          schema: {
            type: "object",
            properties: {
              title: { type: "string" },
              segments: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    speaker: {
                      type: "string",
                      enum: ["Host A", "Host B"],
                    },
                    text: { type: "string" },
                  },
                  required: ["speaker", "text"],
                  additionalProperties: false,
                },
              },
            },
            required: ["title", "segments"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0].message.content;
    const result = JSON.parse(typeof content === "string" ? content : "{}");

    // Estimate duration (average speaking rate: 150 words per minute)
    const totalWords = result.segments.reduce(
      (sum: number, seg: any) => sum + seg.text.split(/\s+/).length,
      0
    );
    const estimatedDuration = Math.ceil((totalWords / 150) * 60);

    return {
      title: result.title || "Research Overview",
      duration: estimatedDuration,
      segments: result.segments || [],
    };
  }

  /**
   * Generate audio from script using TTS
   * 
   * Uses ElevenLabs API (with OpenAI TTS fallback) to generate realistic two-voice podcast audio.
   */
  async generateAudio(
    script: AudioOverviewScript,
    userId: number,
    collectionId: number
  ): Promise<AudioOverviewResult> {
    // Generate full transcript
    const transcript = script.segments
      .map((seg) => `**${seg.speaker}:** ${seg.text}`)
      .join("\n\n");

    // Extract focus areas from script
    const focusAreas = this.extractFocusAreas(script);

    // Convert script segments to TTS format
    const ttsSegments: TTSSegment[] = script.segments.map((seg) => ({
      text: seg.text,
      voice: seg.speaker === "Host A" ? "hostA" : "hostB",
    }));

    // Generate actual audio using TTS service (ElevenLabs with OpenAI fallback)
    const audioResult = await generatePodcastAudioWithFallback(ttsSegments);

    return {
      audioUrl: audioResult.audioUrl,
      transcript,
      duration: audioResult.duration,
      focusAreas,
    };
  }

  /**
   * Extract focus areas from script content
   */
  private extractFocusAreas(script: AudioOverviewScript): string[] {
    // Simple keyword extraction from script
    const allText = script.segments.map((s) => s.text).join(" ");
    
    // This is a simplified implementation
    // In production, use NLP techniques or LLM to extract key topics
    const keywords: string[] = [];
    
    // Look for common patterns
    const patterns = [
      /(?:about|discuss|cover|focus on|explore) ([^,.]+)/gi,
      /(?:key|main|important) (?:point|topic|finding|insight)s? (?:is|are|include) ([^,.]+)/gi,
    ];

    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(allText)) !== null) {
        if (match[1]) {
          keywords.push(match[1].trim());
        }
      }
    }

    // Return unique keywords, limit to 5
    const uniqueKeywords = Array.from(new Set(keywords));
    return uniqueKeywords.slice(0, 5);
  }

  /**
   * Generate audio overview from documents (complete workflow)
   */
  async generateOverview(
    documents: Array<{ fileName: string; content: string }>,
    userId: number,
    collectionId: number,
    focusAreas?: string[]
  ): Promise<AudioOverviewResult> {
    // Step 1: Generate script
    const script = await this.generateScript(documents, focusAreas);

    // Step 2: Generate audio from script
    const result = await this.generateAudio(script, userId, collectionId);

    return result;
  }
}

// Export singleton instance
export const audioOverviewService = new AudioOverviewService();
