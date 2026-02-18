/**
 * ElevenLabs API Integration Test
 * 
 * Validates that the ELEVENLABS_API_KEY is correctly configured
 * and can successfully generate speech audio.
 */

import { describe, it, expect } from "vitest";
import { generateSpeech, PODCAST_VOICES } from "./lib/tts-service";

describe("ElevenLabs TTS Integration", () => {
  it("should have ELEVENLABS_API_KEY configured", () => {
    expect(process.env.ELEVENLABS_API_KEY).toBeDefined();
    expect(process.env.ELEVENLABS_API_KEY).not.toBe("");
  });

  it("should generate speech audio successfully", async () => {
    const testText = "Hello, this is a test of the ElevenLabs text-to-speech system.";
    
    try {
      const audioBuffer = await generateSpeech(testText, PODCAST_VOICES.hostA.id);
      
      // Verify we got a valid audio buffer
      expect(audioBuffer).toBeInstanceOf(Buffer);
      expect(audioBuffer.length).toBeGreaterThan(0);
      
      // MP3 files start with specific magic bytes
      // Check for MP3 header (0xFF 0xFB or 0xFF 0xFA or ID3 tag)
      const firstByte = audioBuffer[0];
      const isMP3 = firstByte === 0xFF || 
                    (audioBuffer[0] === 0x49 && audioBuffer[1] === 0x44 && audioBuffer[2] === 0x33); // ID3
      
      expect(isMP3).toBe(true);
    } catch (error) {
      // If this fails, the API key is likely invalid
      throw new Error(`ElevenLabs API test failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, 30000); // 30 second timeout for API call

  it("should have valid voice IDs configured", () => {
    expect(PODCAST_VOICES.hostA.id).toBeDefined();
    expect(PODCAST_VOICES.hostB.id).toBeDefined();
    expect(PODCAST_VOICES.hostA.id.length).toBeGreaterThan(0);
    expect(PODCAST_VOICES.hostB.id.length).toBeGreaterThan(0);
  });
});
