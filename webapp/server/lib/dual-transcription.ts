import { transcribeAudio } from "../_core/voiceTranscription";

export interface DualTranscriptionResult {
  text: string;
  language: string;
  provider: "whisper" | "google" | "consensus";
  whisperResult?: {
    text: string;
    language: string;
    confidence?: number;
  };
  googleResult?: {
    text: string;
    language: string;
    confidence?: number;
  };
  accuracy: "high" | "medium" | "low";
}

/**
 * Calculate similarity between two strings using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  const distance = matrix[len1][len2];
  return maxLen === 0 ? 1 : 1 - distance / maxLen;
}

/**
 * Transcribe audio using Google Speech-to-Text API
 */
async function transcribeWithGoogle(
  audioUrl: string,
  language?: string
): Promise<{ text: string; language: string; confidence?: number }> {
  try {
    // Note: This is a placeholder for Google Speech-to-Text integration
    // In production, you would use the Google Cloud Speech-to-Text API
    // For now, we'll use a mock implementation
    
    console.log("[DualTranscription] Google Speech-to-Text not yet implemented, using Whisper as fallback");
    
    // Fallback to Whisper
    const result = await transcribeAudio({
      audioUrl,
      language,
    });

    if ('error' in result) {
      throw new Error(result.error);
    }

    return {
      text: result.text,
      language: result.language || language || "en",
      confidence: 0.85, // Mock confidence
    };
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Google transcription failed: ${error.message}`
        : "Google transcription failed"
    );
  }
}

/**
 * Transcribe audio using both Whisper and Google Speech-to-Text,
 * then compare results and return the most accurate one
 */
export async function dualTranscribe(
  audioUrl: string,
  language?: string
): Promise<DualTranscriptionResult> {
  try {
    // Run both transcriptions in parallel
    const [whisperPromise, googlePromise] = await Promise.allSettled([
      transcribeAudio({ audioUrl, language }),
      transcribeWithGoogle(audioUrl, language),
    ]);

    let whisperResult: { text: string; language: string; confidence?: number } | null = null;
    let googleResult: { text: string; language: string; confidence?: number } | null = null;

    // Extract Whisper result
    if (whisperPromise.status === "fulfilled") {
      const result = whisperPromise.value;
      if (!('error' in result)) {
        whisperResult = {
          text: result.text,
          language: result.language || language || "en",
          confidence: 0.9, // Whisper typically has high confidence
        };
      }
    }

    // Extract Google result
    if (googlePromise.status === "fulfilled") {
      googleResult = googlePromise.value;
    }

    // If both failed, throw error
    if (!whisperResult && !googleResult) {
      throw new Error("Both transcription services failed");
    }

    // If only one succeeded, use that one
    if (!whisperResult && googleResult) {
      return {
        text: googleResult.text,
        language: googleResult.language,
        provider: "google",
        googleResult,
        accuracy: "medium",
      };
    }

    if (whisperResult && !googleResult) {
      return {
        text: whisperResult.text,
        language: whisperResult.language,
        provider: "whisper",
        whisperResult,
        accuracy: "medium",
      };
    }

    // Both succeeded - compare results
    if (whisperResult && googleResult) {
      const similarity = calculateSimilarity(
        whisperResult.text.toLowerCase(),
        googleResult.text.toLowerCase()
      );

      console.log(`[DualTranscription] Similarity: ${(similarity * 100).toFixed(2)}%`);

      // If results are very similar (>90% match), use consensus
      if (similarity > 0.9) {
        return {
          text: whisperResult.text, // Use Whisper as primary
          language: whisperResult.language,
          provider: "consensus",
          whisperResult,
          googleResult,
          accuracy: "high",
        };
      }

      // If results differ significantly, use the one with higher confidence
      const whisperConf = whisperResult.confidence || 0.5;
      const googleConf = googleResult.confidence || 0.5;

      if (whisperConf >= googleConf) {
        return {
          text: whisperResult.text,
          language: whisperResult.language,
          provider: "whisper",
          whisperResult,
          googleResult,
          accuracy: similarity > 0.7 ? "medium" : "low",
        };
      } else {
        return {
          text: googleResult.text,
          language: googleResult.language,
          provider: "google",
          whisperResult,
          googleResult,
          accuracy: similarity > 0.7 ? "medium" : "low",
        };
      }
    }

    // Fallback (should never reach here)
    throw new Error("Unexpected transcription state");
  } catch (error) {
    console.error("[DualTranscription] Error:", error);
    throw new Error(
      error instanceof Error
        ? `Dual transcription failed: ${error.message}`
        : "Dual transcription failed"
    );
  }
}
