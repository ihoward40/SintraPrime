// OpenAI API key is injected via environment

export type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

export interface TextToSpeechOptions {
  text: string;
  voice?: TTSVoice;
  speed?: number; // 0.25 to 4.0
  model?: "tts-1" | "tts-1-hd";
}

export interface TextToSpeechResult {
  audioBuffer: Buffer;
  mimeType: string;
}

/**
 * Convert text to speech using OpenAI TTS API
 */
export async function textToSpeech(
  options: TextToSpeechOptions
): Promise<TextToSpeechResult> {
  const {
    text,
    voice = "alloy",
    speed = 1.0,
    model = "tts-1",
  } = options;

  if (!text || text.trim().length === 0) {
    throw new Error("Text is required for text-to-speech conversion");
  }

  if (text.length > 4096) {
    throw new Error("Text exceeds maximum length of 4096 characters");
  }

  if (speed < 0.25 || speed > 4.0) {
    throw new Error("Speed must be between 0.25 and 4.0");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: text,
        voice,
        speed,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI TTS API error: ${error}`);
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());

    return {
      audioBuffer,
      mimeType: "audio/mpeg",
    };
  } catch (error) {
    console.error("[TextToSpeech] Error:", error);
    throw new Error(
      error instanceof Error
        ? `Text-to-speech conversion failed: ${error.message}`
        : "Text-to-speech conversion failed"
    );
  }
}

/**
 * Convert text to speech and save to storage
 */
export async function textToSpeechWithStorage(
  options: TextToSpeechOptions,
  userId: number
): Promise<{ audioUrl: string; audioKey: string }> {
  const { storagePut } = await import("../storage");
  
  const result = await textToSpeech(options);
  
  // Generate unique key
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(7);
  const audioKey = `tts/${userId}/${timestamp}-${randomSuffix}.mp3`;
  
  // Upload to S3
  const { url } = await storagePut(
    audioKey,
    result.audioBuffer,
    result.mimeType
  );
  
  return {
    audioUrl: url,
    audioKey,
  };
}
