/**
 * NotebookLM tRPC Router
 * 
 * Handles:
 * - Research collection CRUD
 * - Document upload and management
 * - AI-powered insights generation
 * - Q&A with source citations
 * - Study guides, timelines, flashcards, quizzes
 */

import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { notebookLMService } from "./lib/notebooklm-service";
import { documentParser } from "./lib/document-parser";
import { audioOverviewService } from "./lib/audio-overview-service";
import { storagePut } from "./storage";
import { getVectorSearchService } from "./lib/vector-search-service";

export const notebooklmRouter = router({
  // ============================================================================
  // COLLECTION MANAGEMENT
  // ============================================================================

  listCollections: protectedProcedure.query(async ({ ctx }) => {
    return await db.getResearchCollectionsByUserId(ctx.user.id);
  }),

  getCollection: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const collection = await db.getResearchCollectionById(input.id);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }
      return collection;
    }),

  createCollection: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        caseId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await db.createResearchCollection({
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        caseId: input.caseId,
      });
    }),

  updateCollection: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const collection = await db.getResearchCollectionById(input.id);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }
      return await db.updateResearchCollection(input.id, {
        name: input.name,
        description: input.description,
      });
    }),

  deleteCollection: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const collection = await db.getResearchCollectionById(input.id);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }
      return await db.deleteResearchCollection(input.id);
    }),

  // ============================================================================
  // DOCUMENT MANAGEMENT
  // ============================================================================

  listDocuments: protectedProcedure
    .input(z.object({ collectionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const collection = await db.getResearchCollectionById(input.collectionId);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }
      return await db.getResearchDocumentsByCollectionId(input.collectionId);
    }),

  uploadDocument: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        fileName: z.string(),
        fileContent: z.string(), // Base64 or text content
        fileType: z.enum(["pdf", "docx", "txt", "url", "youtube"]),
        mimeType: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const collection = await db.getResearchCollectionById(input.collectionId);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      // Enforce 50-source limit
      const existingDocs = await db.getResearchDocumentsByCollectionId(input.collectionId);
      if (existingDocs.length >= 50) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Collection has reached the maximum of 50 sources. Please delete some documents before uploading new ones.",
        });
      }

      // Upload file to S3
      const fileBuffer = Buffer.from(input.fileContent, "base64");
      const fileKey = `research/${ctx.user.id}/${input.collectionId}/${Date.now()}-${input.fileName}`;
      const { url: fileUrl } = await storagePut(
        fileKey,
        fileBuffer,
        input.mimeType || "application/octet-stream"
      );

      // Parse document based on file type
      let extractedText = "";
      let metadata: any = {};
      
      try {
        const parsed = await documentParser.parseDocument(
          fileBuffer,
          input.mimeType || "application/octet-stream",
          input.fileName
        );
        extractedText = parsed.text;
        metadata = parsed.metadata;
      } catch (parseError) {
        console.error("[NotebookLM] Document parsing error:", parseError);
        // Fallback to treating as plain text
        extractedText = fileBuffer.toString("utf-8");
      }

      // Analyze document with AI
      const analysis = await notebookLMService.analyzeDocument(
        extractedText,
        input.fileName
      );

      // Save document to database
      return await db.createResearchDocument({
        collectionId: input.collectionId,
        fileName: input.fileName,
        fileUrl,
        fileType: input.fileType,
        fileSize: fileBuffer.length,
        mimeType: input.mimeType,
        extractedText,
        summary: analysis.summary,
        keyTopics: analysis.keyTopics,
      });
    }),

  deleteDocument: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const document = await db.getResearchDocumentById(input.id);
      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      const collection = await db.getResearchCollectionById(document.collectionId);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not authorized",
        });
      }

      return await db.deleteResearchDocument(input.id);
    }),

  // ============================================================================
  // AI INSIGHTS
  // ============================================================================

  askQuestion: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        question: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const collection = await db.getResearchCollectionById(input.collectionId);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      // Get all documents in collection
      const documents = await db.getResearchDocumentsByCollectionId(
        input.collectionId
      );

      if (documents.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No documents in collection",
        });
      }

      // Prepare documents for Q&A
      const docsForQA = documents.map((doc) => ({
        id: doc.id,
        fileName: doc.fileName,
        content: doc.extractedText || "",
      }));

      // Get answer with citations
      const result = await notebookLMService.answerQuestion(
        input.question,
        docsForQA
      );

      // Save insight to database
      await db.createResearchInsight({
        collectionId: input.collectionId,
        insightType: "qa",
        question: input.question,
        answer: result.answer,
        citations: result.citations,
        metadata: { confidence: result.confidence },
      });

      return result;
    }),

  generateStudyGuide: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        focusAreas: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const collection = await db.getResearchCollectionById(input.collectionId);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      const documents = await db.getResearchDocumentsByCollectionId(
        input.collectionId
      );

      if (documents.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No documents in collection",
        });
      }

      const docsForGuide = documents.map((doc) => ({
        fileName: doc.fileName,
        content: doc.extractedText || "",
      }));

      const studyGuide = await notebookLMService.generateStudyGuide(
        docsForGuide,
        input.focusAreas
      );

      // Save as insight
      await db.createResearchInsight({
        collectionId: input.collectionId,
        insightType: "study_guide",
        answer: JSON.stringify(studyGuide),
        metadata: { focusAreas: input.focusAreas },
      });

      return studyGuide;
    }),

  generateTimeline: protectedProcedure
    .input(z.object({ collectionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const collection = await db.getResearchCollectionById(input.collectionId);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      const documents = await db.getResearchDocumentsByCollectionId(
        input.collectionId
      );

      if (documents.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No documents in collection",
        });
      }

      const docsForTimeline = documents.map((doc) => ({
        fileName: doc.fileName,
        content: doc.extractedText || "",
      }));

      const timeline = await notebookLMService.generateTimeline(docsForTimeline);

      await db.createResearchInsight({
        collectionId: input.collectionId,
        insightType: "timeline",
        answer: JSON.stringify(timeline),
      });

      return timeline;
    }),

  generateFlashcards: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        count: z.number().min(5).max(50).default(20),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const collection = await db.getResearchCollectionById(input.collectionId);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      const documents = await db.getResearchDocumentsByCollectionId(
        input.collectionId
      );

      if (documents.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No documents in collection",
        });
      }

      const docsForFlashcards = documents.map((doc) => ({
        fileName: doc.fileName,
        content: doc.extractedText || "",
      }));

      const flashcards = await notebookLMService.generateFlashcards(
        docsForFlashcards,
        input.count
      );

      await db.createResearchInsight({
        collectionId: input.collectionId,
        insightType: "flashcard",
        answer: JSON.stringify(flashcards),
        metadata: { count: input.count },
      });

      return flashcards;
    }),

  generateQuiz: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        questionCount: z.number().min(5).max(25).default(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const collection = await db.getResearchCollectionById(input.collectionId);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      const documents = await db.getResearchDocumentsByCollectionId(
        input.collectionId
      );

      if (documents.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No documents in collection",
        });
      }

      const docsForQuiz = documents.map((doc) => ({
        fileName: doc.fileName,
        content: doc.extractedText || "",
      }));

      const quiz = await notebookLMService.generateQuiz(
        docsForQuiz,
        input.questionCount
      );

      await db.createResearchInsight({
        collectionId: input.collectionId,
        insightType: "quiz",
        answer: JSON.stringify(quiz),
        metadata: { questionCount: input.questionCount },
      });

      return quiz;
    }),

  generateBriefing: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        purpose: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const collection = await db.getResearchCollectionById(input.collectionId);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      const documents = await db.getResearchDocumentsByCollectionId(
        input.collectionId
      );

      if (documents.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No documents in collection",
        });
      }

      const docsForBriefing = documents.map((doc) => ({
        fileName: doc.fileName,
        content: doc.extractedText || "",
      }));

      const briefing = await notebookLMService.generateBriefing(
        docsForBriefing,
        input.purpose
      );

      await db.createResearchInsight({
        collectionId: input.collectionId,
        insightType: "briefing",
        answer: briefing,
        metadata: { purpose: input.purpose },
      });

      return { content: briefing };
    }),

  generateFAQ: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        questionCount: z.number().min(5).max(20).default(10),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const collection = await db.getResearchCollectionById(input.collectionId);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      const documents = await db.getResearchDocumentsByCollectionId(
        input.collectionId
      );

      if (documents.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No documents in collection",
        });
      }

      const docsForFAQ = documents.map((doc: any) => ({
        fileName: doc.fileName,
        content: doc.extractedText || "",
      }));

      const faq = await notebookLMService.generateFAQ(
        docsForFAQ,
        input.questionCount
      );

      await db.createResearchInsight({
        collectionId: input.collectionId,
        insightType: "faq",
        answer: JSON.stringify(faq),
        metadata: { questionCount: input.questionCount },
      });

      return { faqs: faq };
    }),

  // ============================================================================
  // INSIGHTS HISTORY
  // ============================================================================

  listInsights: protectedProcedure
    .input(z.object({ collectionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const collection = await db.getResearchCollectionById(input.collectionId);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }
      return await db.getResearchInsightsByCollectionId(input.collectionId);
    }),

  // ============================================================================
  // AUDIO OVERVIEW GENERATION
  // ============================================================================

  generateAudioOverview: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        focusAreas: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const collection = await db.getResearchCollectionById(input.collectionId);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }

      // Get all documents in collection
      const documents = await db.getResearchDocumentsByCollectionId(
        input.collectionId
      );

      if (documents.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No documents in collection",
        });
      }

      // Prepare documents for audio generation
      const docsForAudio = documents.map((doc: any) => ({
        fileName: doc.fileName,
        content: doc.extractedText || "",
      }));

      // Generate audio overview
      const result = await audioOverviewService.generateOverview(
        docsForAudio,
        ctx.user.id,
        input.collectionId,
        input.focusAreas
      );

      // Save to database
      const overview = await db.createResearchAudioOverview({
        collectionId: input.collectionId,
        audioUrl: result.audioUrl,
        transcript: result.transcript,
        duration: result.duration,
        focusAreas: result.focusAreas, // Already an array
        generatedAt: new Date(),
      });

      return overview;
    }),

  listAudioOverviews: protectedProcedure
    .input(z.object({ collectionId: z.number() }))
    .query(async ({ ctx, input }) => {
      const collection = await db.getResearchCollectionById(input.collectionId);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Collection not found",
        });
      }
      return await db.getResearchAudioOverviewsByCollectionId(input.collectionId);
    }),

  // ============================================================================
  // SEMANTIC SEARCH
  // ============================================================================

  searchDocuments: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        query: z.string().min(1),
        topK: z.number().min(1).max(20).optional().default(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const collection = await db.getResearchCollectionById(input.collectionId);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this collection",
        });
      }

      // Get all documents in collection
      const documents = await db.getResearchDocumentsByCollectionId(input.collectionId);

      if (documents.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No documents in collection",
        });
      }

      // Generate embeddings for documents that don't have them
      const vectorService = getVectorSearchService();
      const documentsWithEmbeddings = [];

      for (const doc of documents) {
        let embedding = doc.embedding;
        
        if (!embedding && doc.extractedText) {
          // Generate embedding if not exists
          embedding = await vectorService.generateEmbedding(doc.extractedText);
          // TODO: Update document with embedding in database
        }

        if (embedding && doc.extractedText) {
          documentsWithEmbeddings.push({
            documentId: doc.id,
            embedding,
            text: doc.extractedText,
            fileName: doc.fileName,
          });
        }
      }

      // Perform semantic search
      const results = await vectorService.searchDocuments(
        input.query,
        documentsWithEmbeddings,
        input.topK
      );

      return { results };
    }),
});
