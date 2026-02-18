import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { transcribeAudio } from "../_core/voiceTranscription";
import { TRPCError } from "@trpc/server";

export const voiceRouter = router({
  /**
   * Transcribe audio using Whisper API
   */
  transcribe: protectedProcedure
    .input(
      z.object({
        audioData: z.string(), // Base64 encoded audio
        language: z.string().optional(),
      })
    )
    .mutation(async ({ input }: { input: { audioData: string; language?: string } }) => {
      try {
        // Convert base64 to buffer
        const base64Data = input.audioData.split(",")[1] || input.audioData;
        const audioBuffer = Buffer.from(base64Data, "base64");

        // Save to temporary file
        const fs = await import("fs/promises");
        const path = await import("path");
        const tmpDir = "/tmp";
        const tmpFile = path.join(tmpDir, `audio-${Date.now()}.webm`);

        await fs.writeFile(tmpFile, audioBuffer);

        // Transcribe using Whisper
        const result = await transcribeAudio({
          audioUrl: tmpFile,
          language: input.language,
        });

        // Clean up temporary file
        await fs.unlink(tmpFile);

        if ('error' in result) {
          throw new Error(result.error);
        }

        return {
          text: result.text,
          language: result.language,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Transcription failed",
        });
      }
    }),

  /**
   * Text-to-speech conversion
   */
  textToSpeech: protectedProcedure
    .input(
      z.object({
        text: z.string(),
        voice: z.enum(["alloy", "echo", "fable", "onyx", "nova", "shimmer"]).optional(),
        speed: z.number().min(0.25).max(4.0).optional(),
        model: z.enum(["tts-1", "tts-1-hd"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }: { ctx: any; input: { text: string; voice?: "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer"; speed?: number; model?: "tts-1" | "tts-1-hd" } }) => {
      try {
        const { textToSpeechWithStorage } = await import("../lib/text-to-speech");
        
        const result = await textToSpeechWithStorage(
          {
            text: input.text,
            voice: input.voice,
            speed: input.speed,
            model: input.model,
          },
          ctx.user.id
        );
        
        return {
          success: true,
          audioUrl: result.audioUrl,
          audioKey: result.audioKey,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Text-to-speech failed",
        });
      }
    }),

  /**
   * Dual-API audio transcription (Whisper + Google Speech-to-Text)
   */
  dualTranscribe: protectedProcedure
    .input(
      z.object({
        audioData: z.string(), // Base64 encoded audio
        language: z.string().optional(),
      })
    )
    .mutation(async ({ input }: { input: { audioData: string; language?: string } }) => {
      try {
        // Convert base64 to buffer
        const base64Data = input.audioData.split(",")[1] || input.audioData;
        const audioBuffer = Buffer.from(base64Data, "base64");

        // Save to temporary file
        const fs = await import("fs/promises");
        const path = await import("path");
        const tmpDir = "/tmp";
        const tmpFile = path.join(tmpDir, `audio-dual-${Date.now()}.webm`);

        await fs.writeFile(tmpFile, audioBuffer);

        // Transcribe using dual API
        const { dualTranscribe } = await import("../lib/dual-transcription");
        const result = await dualTranscribe(tmpFile, input.language);

        // Clean up temporary file
        await fs.unlink(tmpFile);

        return result;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Dual transcription failed",
        });
      }
    }),
});
