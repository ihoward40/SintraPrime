/**
 * Text-to-Speech Service using ElevenLabs API
 * 
 * Provides high-quality voice synthesis for audio overviews
 */

interface TTSVoice {
  id: string;
  name: string;
  gender: "male" | "female";
  description: string;
}

// Pre-configured voices for podcast-style audio overviews
export const PODCAST_VOICES: { hostA: TTSVoice; hostB: TTSVoice } = {
  hostA: {
    id: "21m00Tcm4TlvDq8ikWAM", // Rachel - warm, enthusiastic female voice
    name: "Rachel",
    gender: "female",
    description: "Warm, enthusiastic guide - perfect for Host A",
  },
  hostB: {
    id: "pNInz6obpgDQGcFmaJgB", // Adam - knowledgeable, expert male voice
    name: "Adam",
    gender: "male",
    description: "Knowledgeable expert - perfect for Host B",
  },
};

export interface TTSSegment {
  text: string;
  voice: "hostA" | "hostB";
}

export interface TTSResult {
  audioUrl: string;
  duration: number; // in seconds
  segments: TTSSegment[];
}

/**
 * Generate speech audio from text using ElevenLabs API
 */
export async function generateSpeech(
  text: string,
  voiceId: string
): Promise<Buffer> {
  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
  
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY environment variable is not set");
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate two-voice podcast-style audio from segments
 */
export async function generatePodcastAudio(
  segments: TTSSegment[]
): Promise<TTSResult> {
  const { storagePut } = await import("../storage");
  
  // Generate audio for each segment
  const audioBuffers: Buffer[] = [];
  let totalDuration = 0;

  for (const segment of segments) {
    const voiceId = segment.voice === "hostA" 
      ? PODCAST_VOICES.hostA.id 
      : PODCAST_VOICES.hostB.id;
    
    const audioBuffer = await generateSpeech(segment.text, voiceId);
    audioBuffers.push(audioBuffer);
    
    // Estimate duration (rough calculation: ~150 words per minute)
    const wordCount = segment.text.split(/\s+/).length;
    const segmentDuration = (wordCount / 150) * 60;
    totalDuration += segmentDuration;
  }

  // Concatenate all audio buffers
  const combinedAudio = Buffer.concat(audioBuffers);

  // Upload to S3
  const timestamp = Date.now();
  const audioKey = `audio-overviews/podcast-${timestamp}.mp3`;
  const { url: audioUrl } = await storagePut(audioKey, combinedAudio, "audio/mpeg");

  return {
    audioUrl,
    duration: Math.round(totalDuration),
    segments,
  };
}

/**
 * Fallback: Generate audio using OpenAI TTS (if ElevenLabs fails or API key not available)
 */
export async function generateSpeechOpenAI(
  text: string,
  voice: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer" = "alloy"
): Promise<Buffer> {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const response = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: text,
      voice,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI TTS API error: ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

/**
 * Generate podcast audio using OpenAI TTS (fallback)
 */
export async function generatePodcastAudioOpenAI(
  segments: TTSSegment[]
): Promise<TTSResult> {
  const { storagePut } = await import("../storage");
  
  const audioBuffers: Buffer[] = [];
  let totalDuration = 0;

  for (const segment of segments) {
    // Use different voices for hosts
    const voice = segment.voice === "hostA" ? "nova" : "onyx";
    const audioBuffer = await generateSpeechOpenAI(segment.text, voice);
    audioBuffers.push(audioBuffer);
    
    // Estimate duration
    const wordCount = segment.text.split(/\s+/).length;
    const segmentDuration = (wordCount / 150) * 60;
    totalDuration += segmentDuration;
  }

  // Concatenate all audio buffers
  const combinedAudio = Buffer.concat(audioBuffers);

  // Upload to S3
  const timestamp = Date.now();
  const audioKey = `audio-overviews/podcast-${timestamp}.mp3`;
  const { url: audioUrl } = await storagePut(audioKey, combinedAudio, "audio/mpeg");

  return {
    audioUrl,
    duration: Math.round(totalDuration),
    segments,
  };
}

/**
 * Main function: Try ElevenLabs first, fallback to OpenAI if needed
 */
export async function generatePodcastAudioWithFallback(
  segments: TTSSegment[]
): Promise<TTSResult> {
  try {
    // Try ElevenLabs first (better quality)
    return await generatePodcastAudio(segments);
  } catch (error) {
    console.warn("ElevenLabs TTS failed, falling back to OpenAI:", error);
    // Fallback to OpenAI TTS
    return await generatePodcastAudioOpenAI(segments);
  }
}
