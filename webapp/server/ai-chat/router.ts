import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { invokeLLM } from "../_core/llm";
import { storagePut } from "../storage";
import * as chatConvHelpers from "../db/chat-conversation-helpers";
import { transcribeAudio } from "../_core/voiceTranscription";
import { TRPCError } from "@trpc/server";

export const aiChatRouter = router({
  // Upload file to S3
  uploadFile: protectedProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.string(),
        fileData: z.string(), // base64 encoded
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Decode base64
        const buffer = Buffer.from(input.fileData, "base64");
        
        // Generate unique file key
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileKey = `ai-chat/${ctx.user.id}/${timestamp}-${randomSuffix}-${input.fileName}`;
        
        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.fileType);
        
        return {
          success: true,
          url,
          fileKey,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to upload file: ${error}`,
        });
      }
    }),

  // Process uploaded file (extract text, transcribe audio, analyze image)
  processFile: protectedProcedure
    .input(
      z.object({
        fileUrl: z.string(),
        fileType: z.string(),
        fileName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        let extractedText = "";
        
        // Handle different file types
        if (input.fileType.startsWith("audio/")) {
          // Transcribe audio using Whisper API
          const transcription = await transcribeAudio({
            audioUrl: input.fileUrl,
          });
          if ('text' in transcription) {
            extractedText = transcription.text;
          } else {
            extractedText = `[Audio transcription failed: ${transcription.error}]`;
          }
        } else if (input.fileType === "application/pdf") {
          // Extract text from PDF
          try {
            const pdfParseModule = await import("pdf-parse") as any;
            const pdfParse = pdfParseModule.default || pdfParseModule;
            const response = await fetch(input.fileUrl);
            const buffer = Buffer.from(await response.arrayBuffer());
            const data = await pdfParse(buffer);
            extractedText = `[PDF file: ${input.fileName}]\n\nExtracted Text:\n${data.text}\n\nPages: ${data.numpages}\nMetadata: ${JSON.stringify(data.info)}`;
          } catch (error) {
            extractedText = `[PDF file: ${input.fileName}]\nFailed to extract text: ${error}\nPlease describe the document content.`;
          }
        } else if (input.fileType.startsWith("image/")) {
          // Analyze image with vision model
          try {
            const visionResponse = await invokeLLM({
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: "Analyze this image and describe what you see. Focus on any text, documents, evidence, or legally relevant content.",
                    },
                    {
                      type: "image_url",
                      image_url: {
                        url: input.fileUrl,
                      },
                    },
                  ],
                },
              ],
            });
            const analysis = visionResponse.choices[0]?.message?.content || "No analysis available";
            extractedText = `[Image file: ${input.fileName}]\n\nImage Analysis:\n${analysis}`;
          } catch (error) {
            extractedText = `[Image file: ${input.fileName}]\nFailed to analyze image: ${error}\nPlease describe what you see in the image.`;
          }
        } else {
          extractedText = `[File: ${input.fileName}]\nFile type: ${input.fileType}`;
        }
        
        return {
          success: true,
          extractedText,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to process file: ${error}`,
        });
      }
    }),

  // Send chat message with LLM integration
  sendMessage: protectedProcedure
    .input(
      z.object({
        message: z.string(),
        caseId: z.number().optional(),
        conversationId: z.number().optional(),
        fileContext: z.array(
          z.object({
            fileName: z.string(),
            fileType: z.string(),
            extractedText: z.string(),
          })
        ).optional(),
        conversationHistory: z.array(
          z.object({
            role: z.enum(["user", "assistant"]),
            content: z.string(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Build system prompt
        let systemPrompt = `You are SintraPrime AI Assistant, a legal AI assistant helping with legal research, case analysis, document drafting, and more. 

Current user: ${ctx.user.name} (${ctx.user.email})

Guidelines:
- Provide accurate, professional legal assistance
- Cite sources when possible
- Use clear, concise language
- Ask clarifying questions when needed
- Never provide legal advice (you are a tool, not a lawyer)`;

        // Add case context if provided
        if (input.caseId) {
          const { getDb } = await import("../db");
          const db = await getDb();
          const cases = await import("../../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          
          if (!db) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Database connection failed",
            });
          }
          
          const caseData = await db
            .select()
            .from(cases.cases)
            .where(eq(cases.cases.id, input.caseId))
            .limit(1);
          
          if (caseData.length > 0) {
            const c = caseData[0];
            systemPrompt += `\n\nCurrent Case Context:
Title: ${c.title}
Type: ${c.caseType}
Status: ${c.status}
Description: ${c.description || "N/A"}`;
          }
        }

        // Add file context if provided
        if (input.fileContext && input.fileContext.length > 0) {
          systemPrompt += `\n\nAttached Files:\n`;
          for (const file of input.fileContext) {
            systemPrompt += `\n--- ${file.fileName} (${file.fileType}) ---\n${file.extractedText}\n`;
          }
        }

        // Build messages array
        const messages: any[] = [
          { role: "system", content: systemPrompt },
        ];

        // Add conversation history
        if (input.conversationHistory && input.conversationHistory.length > 0) {
          // Take last 10 messages to avoid context overflow
          const recentHistory = input.conversationHistory.slice(-10);
          messages.push(...recentHistory);
        }

        // Add current user message
        messages.push({
          role: "user",
          content: input.message,
        });

        // Save user message to database if conversationId provided
        if (input.conversationId) {
          await chatConvHelpers.addMessage({
            conversationId: input.conversationId,
            role: "user",
            content: input.message,
            attachments: input.fileContext ? JSON.stringify(input.fileContext) : null,
          });
        }

        // Call LLM
        const response = await invokeLLM({ messages });

        const assistantMessageContent = response.choices[0]?.message?.content;
        const assistantMessage = typeof assistantMessageContent === "string" 
          ? assistantMessageContent 
          : "Sorry, I couldn't generate a response.";

        // Save assistant message to database if conversationId provided
        if (input.conversationId) {
          await chatConvHelpers.addMessage({
            conversationId: input.conversationId,
            role: "assistant",
            content: assistantMessage,
            attachments: null,
          });
        }

        return {
          success: true,
          message: assistantMessage,
        };
      } catch (error) {
        console.error("AI Chat error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to process chat message: ${error}`,
        });
      }
    }),

  // Create new conversation
  createConversation: protectedProcedure
    .input(
      z.object({
        caseId: z.number().optional(),
        title: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const conversationId = await chatConvHelpers.createConversation({
        userId: ctx.user.id,
        caseId: input.caseId || null,
        title: input.title || "New Conversation",
      });
      return { conversationId };
    }),

  // Get user's conversations
  getConversations: protectedProcedure
    .input(
      z.object({
        caseId: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const conversations = await chatConvHelpers.getUserConversations(
        ctx.user.id,
        input.caseId
      );
      return conversations;
    }),

  // Get conversation messages
  getConversationMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const messages = await chatConvHelpers.getConversationMessages(
        input.conversationId
      );
      return messages;
    }),

  // Update conversation title
  updateConversationTitle: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        title: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await chatConvHelpers.updateConversationTitle(
        input.conversationId,
        input.title
      );
      return { success: true };
    }),

  // Delete conversation
  deleteConversation: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await chatConvHelpers.deleteConversation(input.conversationId);
      return { success: true };
    }),

  // Get suggested prompts for quick actions
  getSuggestedPrompts: protectedProcedure
    .input(
      z.object({
        category: z.enum(["analysis", "drafting", "research", "strategy"]).nullable().optional(),
      })
    )
    .query(async ({ input }) => {
      const allPrompts = [
        // Analysis Category
        { id: 1, category: "analysis", title: "Analyze Contract", prompt: "Analyze this contract and identify key terms, obligations, and potential risks." },
        { id: 2, category: "analysis", title: "Review Evidence", prompt: "Review this evidence and assess its relevance, credibility, and potential impact on the case." },
        { id: 3, category: "analysis", title: "Case Strength Assessment", prompt: "Assess the overall strength of this case, identifying strong points and weaknesses." },
        
        // Drafting Category
        { id: 4, category: "drafting", title: "Draft Motion", prompt: "Draft a motion to dismiss based on the following facts and legal arguments." },
        { id: 5, category: "drafting", title: "Write Demand Letter", prompt: "Write a professional demand letter addressing the following issues." },
        { id: 6, category: "drafting", title: "Create Discovery Request", prompt: "Create a comprehensive discovery request for the following information." },
        
        // Research Category
        { id: 7, category: "research", title: "Find Case Law", prompt: "Find relevant case law supporting the following legal argument." },
        { id: 8, category: "research", title: "Statute Analysis", prompt: "Analyze the following statute and explain its application to this situation." },
        { id: 9, category: "research", title: "Legal Precedent", prompt: "Research legal precedents related to this issue and summarize key findings." },
        
        // Strategy Category
        { id: 10, category: "strategy", title: "Litigation Strategy", prompt: "Develop a litigation strategy for this case, including key arguments and timeline." },
        { id: 11, category: "strategy", title: "Settlement Analysis", prompt: "Analyze settlement options and provide recommendations based on case strengths." },
        { id: 12, category: "strategy", title: "Risk Assessment", prompt: "Assess litigation risks and provide strategic recommendations." },
      ];

      if (input.category) {
        return allPrompts.filter(p => p.category === input.category);
      }
      
      return allPrompts;
    }),
});

