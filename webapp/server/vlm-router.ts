import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { TRPCError } from "@trpc/server";

export const vlmRouter = router({
  // Analyze an image using the Vision Language Model
  analyzeImage: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
        prompt: z.string().default("Analyze this image in detail. Describe what you see, extract any text, and identify key entities or legally relevant information."),
        analysisType: z.enum(["general", "ocr", "evidence", "document"]).default("general"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        let systemPrompt = "You are an expert AI Vision Assistant for SintraPrime, specializing in analyzing images, documents, and visual evidence.";
        
        if (input.analysisType === "ocr") {
          systemPrompt += " Your primary task is to extract all text from the image exactly as it appears, preserving formatting and layout where possible.";
        } else if (input.analysisType === "evidence") {
          systemPrompt += " Your primary task is to analyze this image as potential legal evidence. Identify key objects, people, timestamps, locations, and any anomalies or details that might be relevant to a case.";
        } else if (input.analysisType === "document") {
          systemPrompt += " Your primary task is to analyze this scanned document. Extract the main clauses, identify the document type, parties involved, dates, and summarize the core purpose.";
        }

        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: input.prompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: input.imageUrl,
                    detail: "high",
                  },
                },
              ],
            },
          ],
        });

        const analysis = response.choices[0]?.message?.content;

        if (!analysis) {
          throw new Error("No analysis returned from the vision model.");
        }

        // Try to extract structured data if it's a document or evidence
        let structuredData = null;
        if (input.analysisType === "document" || input.analysisType === "evidence") {
          try {
            const extractionResponse = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content: "Extract key entities from the following image analysis. Return ONLY a JSON object with the following structure: { \"entities\": string[], \"summary\": string, \"confidence\": number (0-1) }",
                },
                {
                  role: "user",
                  content: analysis,
                }
              ],
              responseFormat: { type: "json_object" }
            });
            
            const jsonStr = extractionResponse.choices[0]?.message?.content;
            if (jsonStr) {
              structuredData = JSON.parse(jsonStr);
            }
          } catch (e) {
            console.error("Failed to extract structured data:", e);
            // Non-fatal, continue with just the text analysis
          }
        }

        return {
          success: true,
          analysis,
          structuredData,
        };
      } catch (error) {
        console.error("VLM Analysis Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to analyze image: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }),
});
