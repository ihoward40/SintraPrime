import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { agentRouter } from "./agent/router";
import { contractRouter } from "./contracts/router";
import { trustRouter } from "./trusts/router";
import { workspaceBookmarkRouter } from "./workspace-bookmarks/router";
import { collectionRouter } from "./collections/router";
import { nanobotRouter } from "./nanobot/router";
import { aiChatRouter } from "./ai-chat/router";
import { documentComparisonRouter } from "./document-comparison/router";
import { agentZeroRouter } from "./agent-zero/router";
import { autonomousRouter } from "./autonomous/router";
import { slidesRouter } from "./slides/router";
import { digitalProductsRouter } from "./digital-products/router";
import { advancedAIRouter } from "./advanced-ai/router";
import { caseTemplatesRouter } from "./case-templates/router";
import { voiceRouter } from "./voice/router";
import { browserAutomationRouter } from "./browser-automation/router";
import { videoGenerationRouter } from "./video-generation/router";
import { workflowRouter } from "./workflow/router";
import { batchRouter } from "./batch/router";
import { automationResultsRouter } from "./automation-results-router";
import { pacerRouter } from "./pacer-router";
import { notebooklmRouter } from "./notebooklm-router";
import { aiOSRouter } from "./ai-os-router";
import { taxAnalysisRouter } from "./routers/taxAnalysis";
import { documentProcessingRouter } from "./routers/documentProcessing";
import { trustAccountingRouter } from "./routers/trustAccounting";
import { auditTrailRouter } from "./routers/auditTrail";
import { k1DistributionRouter } from "./routers/k1Distribution";
import { stripePaymentRouter } from "./routers/stripePayment";
import { cpaCollaborationRouter } from "./routers/cpaCollaboration";
import { irsEfileRouter } from "./routers/irsEfile";
import { irsConfigRouter } from "./routers/irsConfig";
import { disputeManagementRouter } from "./routers/disputeManagement";
import { subscriptionBillingRouter } from "./routers/subscriptionBilling";
import { governanceRouter } from "./routers/governance";
import { beneficiaryRouter } from "./routers/beneficiary";
import { notificationSettingsRouter } from "./routers/notificationSettings";
import { approvalsRouter } from "./routers/approvals";
import { governanceReportsRouter } from "./routers/governanceReports";
import { governanceSettingsRouter } from "./routers/governanceSettings";
import { timelineRouter } from "./routers/timeline";
import { ingestRouter } from "./routers/ingest";
import { webMonitoringRouter } from "./routers/webMonitoring";
import { workflowTriggersRouter } from "./routers/workflowTriggers";
import { triggerAlertsRouter } from "./routers/triggerAlerts";
import { sintraInfraRouter } from "./routers/sintraInfra";

import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { storagePut } from "./storage";
import { createCheckoutSession, createPortalSession, getPaymentHistory, getOrCreateCustomer } from "./stripe";
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from "./stripe-products";
import { getTierLimits, canAccessFeature, type TierKey } from "@shared/tierLimits";
import { TRPCError } from "@trpc/server";

// Helper functions for PDF generation
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function markdownToHtml(md: string): string {
  // Escape HTML entities first to prevent XSS
  let html = escapeHtml(md);
  // Headers
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Blockquotes
  html = html.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");
  // Unordered lists
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, "<li>$1</li>");
  // Line breaks to paragraphs
  html = html.replace(/\n\n/g, "</p><p>");
  html = html.replace(/\n/g, "<br>");
  // Wrap in paragraph if not already
  if (!html.startsWith("<")) html = `<p>${html}</p>`;
  return html;
}

export const appRouter = router({
  system: systemRouter,
  agentZero: agentZeroRouter,
  autonomous: autonomousRouter,
  slides: slidesRouter,
  digitalProducts: digitalProductsRouter,
  advancedAI: advancedAIRouter,
  voice: voiceRouter,
  browserAutomation: browserAutomationRouter,
  videoGeneration: videoGenerationRouter,
  workflow: workflowRouter,
  batch: batchRouter,
  automationResults: automationResultsRouter,
  pacer: pacerRouter,
  notebooklm: notebooklmRouter,
  aiOS: aiOSRouter,
  taxAnalysis: taxAnalysisRouter,
  documentProcessing: documentProcessingRouter,
  trustAccounting: trustAccountingRouter,
  auditTrail: auditTrailRouter,
  k1Distribution: k1DistributionRouter,
  stripePayment: stripePaymentRouter,
  cpaCollaboration: cpaCollaborationRouter,
  irsEfile: irsEfileRouter,
  irsConfig: irsConfigRouter,
  disputeManagement: disputeManagementRouter,
  subscriptionBilling: subscriptionBillingRouter,
  governance: governanceRouter,
  beneficiary: beneficiaryRouter,
  notificationSettings: notificationSettingsRouter,
  approvals: approvalsRouter,
  governanceReports: governanceReportsRouter,
  governanceSettings: governanceSettingsRouter,
  timeline: timelineRouter,
  ingest: ingestRouter,
  webMonitoring: webMonitoringRouter,
  workflowTriggers: workflowTriggersRouter,
  triggerAlerts: triggerAlertsRouter,
  sintraInfra: sintraInfraRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ============================================================================
  // CASE MANAGEMENT
  // ============================================================================
  
  cases: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getCasesByUserId(ctx.user.id);
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getCaseById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(500),
        caseNumber: z.string().optional(),
        description: z.string().optional(),
        caseType: z.string().optional(),
        jurisdiction: z.string().optional(),
        court: z.string().optional(),
        filingDate: z.date().optional(),
        trialDate: z.date().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Tier enforcement: check case limit
        const tier = (ctx.user as any).subscriptionTier || "free";
        const limits = getTierLimits(tier);
        const currentCount = await db.countUserCases(ctx.user.id);
        if (currentCount >= limits.maxCases) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Your ${tier} plan allows up to ${limits.maxCases} cases. Upgrade to create more.`,
          });
        }
        const result = await db.createCase({
          ...input,
          userId: ctx.user.id,
        });
        // Auto-notification: new case created
        try {
          await db.createNotification({
            userId: ctx.user.id,
            type: "case_status_change",
            title: "New Case Created",
            message: `Case "${input.title}" has been created successfully.`,
            link: `/cases/${(result as any)[0]?.insertId || 0}`,
            priority: "low",
          });
        } catch (e) { /* notification failure should not block case creation */ }
        return result;
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).max(500).optional(),
        caseNumber: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["draft", "active", "pending", "won", "lost", "settled", "archived"]).optional(),
        caseType: z.string().optional(),
        jurisdiction: z.string().optional(),
        court: z.string().optional(),
        filingDate: z.date().optional(),
        trialDate: z.date().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        const result = await db.updateCase(id, updates);
        // Auto-notification: case status changed
        if (input.status) {
          try {
            await db.createNotification({
              userId: ctx.user.id,
              caseId: id,
              type: "case_status_change",
              title: "Case Status Updated",
              message: `Case #${id} status changed to ${input.status}.`,
              link: `/cases/${id}`,
              priority: input.status === "won" || input.status === "lost" ? "high" : "medium",
            });
          } catch (e) { /* non-blocking */ }
        }
        return result;
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteCase(input.id);
      }),

    bulkDelete: protectedProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input }) => {
        for (const id of input.ids) {
          await db.deleteCase(id);
        }
        return { success: true, count: input.ids.length };
      }),

    bulkUpdateStatus: protectedProcedure
      .input(z.object({ 
        ids: z.array(z.number()),
        status: z.enum(["draft", "active", "pending", "won", "lost", "settled", "archived"])
      }))
      .mutation(async ({ input }) => {
        for (const id of input.ids) {
          await db.updateCase(id, { status: input.status });
        }
        return { success: true, count: input.ids.length };
      }),

    bulkUpdatePriority: protectedProcedure
      .input(z.object({ 
        ids: z.array(z.number()),
        priority: z.enum(["low", "medium", "high", "critical"])
      }))
      .mutation(async ({ input }) => {
        for (const id of input.ids) {
          await db.updateCase(id, { priority: input.priority });
        }
        return { success: true, count: input.ids.length };
      }),

    clone: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Tier enforcement
        const tier = (ctx.user as any).subscriptionTier || "free";
        const limits = getTierLimits(tier);
        const currentCount = await db.countUserCases(ctx.user.id);
        if (currentCount >= limits.maxCases) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Your ${tier} plan allows up to ${limits.maxCases} cases. Upgrade to create more.`,
          });
        }
        // Get original case
        const original = await db.getCaseById(input.id);
        if (!original) throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        // Create cloned case
        const cloneResult = await db.createCase({
          userId: ctx.user.id,
          title: `Copy of ${original.title}`,
          caseNumber: original.caseNumber ? `${original.caseNumber}-COPY` : undefined,
          description: original.description || undefined,
          caseType: original.caseType || undefined,
          jurisdiction: original.jurisdiction || undefined,
          court: original.court || undefined,
          priority: (original.priority as any) || undefined,
          tags: original.tags ? (typeof original.tags === 'string' ? JSON.parse(original.tags) : original.tags) : undefined,
        });
        const newCaseId = (cloneResult as any)[0]?.insertId;
        if (!newCaseId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to clone case" });
        // Clone parties
        try {
          const parties = await db.getPartiesByCaseId(input.id);
          for (const p of parties) {
            await db.createParty({
              caseId: newCaseId,
              name: p.name,
              type: p.type,
              entityType: p.entityType || undefined,
              contactInfo: p.contactInfo || undefined,
              corporateInfo: p.corporateInfo || undefined,
              notes: p.notes || undefined,
            });
          }
        } catch (e) { /* non-blocking */ }
        // Clone notes
        try {
          const notes = await db.getCaseNotesByCaseId(input.id);
          for (const n of notes) {
            await db.createCaseNote({
              caseId: newCaseId,
              userId: ctx.user.id,
              content: n.content,
              noteType: n.noteType || undefined,
              isPinned: n.isPinned,
              tags: n.tags || undefined,
            });
          }
        } catch (e) { /* non-blocking */ }
        // Clone warfare strategies
        try {
          const strategies = await db.getWarfareStrategiesByCaseId(input.id);
          for (const s of strategies) {
            await db.createWarfareStrategy({
              caseId: newCaseId,
              userId: ctx.user.id,
              front: s.front,
              strategyName: s.strategyName,
              description: s.description || undefined,
              status: "planned",
              priority: (s.priority as any) || undefined,
            });
          }
        } catch (e) { /* non-blocking */ }
        // Auto-notification
        try {
          await db.createNotification({
            userId: ctx.user.id,
            type: "case_status_change",
            title: "Case Cloned",
            message: `Case "${original.title}" has been cloned as "Copy of ${original.title}".`,
            link: `/cases/${newCaseId}`,
            priority: "low",
          });
        } catch (e) { /* non-blocking */ }
        return { id: newCaseId, title: `Copy of ${original.title}` };
      }),
  }),

  // ============================================================================
  // PARTIES
  // ============================================================================
  
  parties: router({
    list: protectedProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input }) => {
        return await db.getPartiesByCaseId(input.caseId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        caseId: z.number(),
        name: z.string().min(1).max(300),
        type: z.enum(["plaintiff", "defendant", "creditor", "attorney", "witness", "other"]),
        entityType: z.enum(["individual", "corporation", "llc", "partnership", "government", "other"]).optional(),
        contactInfo: z.object({
          email: z.string().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          registeredAgent: z.string().optional(),
        }).optional(),
        corporateInfo: z.object({
          ein: z.string().optional(),
          secStatus: z.string().optional(),
          stateOfIncorporation: z.string().optional(),
          businessAddress: z.string().optional(),
        }).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createParty(input);
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(300).optional(),
        type: z.enum(["plaintiff", "defendant", "creditor", "attorney", "witness", "other"]).optional(),
        entityType: z.enum(["individual", "corporation", "llc", "partnership", "government", "other"]).optional(),
        contactInfo: z.any().optional(),
        corporateInfo: z.any().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        return await db.updateParty(id, updates);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteParty(input.id);
      }),
  }),

  // ============================================================================
  // DOCUMENTS
  // ============================================================================
  
  documents: router({
    list: protectedProcedure
      .input(z.object({ caseId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        if (input.caseId) {
          return await db.getDocumentsByCaseId(input.caseId);
        }
        return await db.getDocumentsByUserId(ctx.user.id);
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getDocumentById(input.id);
      }),
    
    templates: protectedProcedure
      .input(z.object({ category: z.string().optional() }))
      .query(async ({ input }) => {
        return await db.getTemplates(input.category);
      }),
    
    create: protectedProcedure
      .input(z.object({
        caseId: z.number().optional(),
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        documentType: z.string().optional(),
        fileUrl: z.string().optional(),
        fileKey: z.string().optional(),
        fileName: z.string().optional(),
        mimeType: z.string().optional(),
        fileSize: z.number().optional(),
        content: z.string().optional(),
        isTemplate: z.boolean().optional(),
        templateCategory: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createDocument({
          ...input,
          userId: ctx.user.id,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        content: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        return await db.updateDocument(id, updates);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteDocument(input.id);
      }),
  }),

  // ============================================================================
  // EVIDENCE
  // ============================================================================
  
  evidence: router({
    list: protectedProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEvidenceByCaseId(input.caseId);
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getEvidenceById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        caseId: z.number(),
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        evidenceType: z.string().optional(),
        fileUrl: z.string(),
        fileKey: z.string(),
        fileName: z.string().optional(),
        mimeType: z.string().optional(),
        fileSize: z.number().optional(),
        sourceUrl: z.string().optional(),
        captureMethod: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createEvidence({
          ...input,
          userId: ctx.user.id,
          chainOfCustody: [{
            timestamp: new Date().toISOString(),
            action: "Created",
            userId: ctx.user.id,
            userName: ctx.user.name || "Unknown",
          }],
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        tags: z.array(z.string()).optional(),
        blockchainHash: z.string().optional(),
        blockchainTimestamp: z.date().optional(),
        blockchainVerified: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        return await db.updateEvidence(id, updates);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteEvidence(input.id);
      }),
  }),

  // ============================================================================
  // CASE EVENTS
  // ============================================================================
  
  caseEvents: router({
    list: protectedProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCaseEventsByCaseId(input.caseId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        caseId: z.number(),
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        eventType: z.string().optional(),
        eventDate: z.date(),
        dueDate: z.date().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createCaseEvent({
          ...input,
          userId: ctx.user.id,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        eventDate: z.date().optional(),
        dueDate: z.date().optional(),
        completed: z.boolean().optional(),
        completedAt: z.date().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        return await db.updateCaseEvent(id, updates);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteCaseEvent(input.id);
      }),
  }),

  // ============================================================================
  // CASE NOTES
  // ============================================================================
  
  caseNotes: router({
    list: protectedProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCaseNotesByCaseId(input.caseId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        caseId: z.number(),
        content: z.string().min(1),
        noteType: z.string().optional(),
        isPinned: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createCaseNote({
          ...input,
          userId: ctx.user.id,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        content: z.string().optional(),
        isPinned: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        return await db.updateCaseNote(id, updates);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteCaseNote(input.id);
      }),
  }),

  // ============================================================================
  // AI CHAT
  // ============================================================================
  
  ai: router({
    chat: protectedProcedure
      .input(z.object({
        sessionId: z.string(),
        caseId: z.number().optional(),
        message: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        // Tier enforcement: check daily AI message limit
        const tier = (ctx.user as any).subscriptionTier || "free";
        const limits = getTierLimits(tier);
        const todayCount = await db.countUserAiMessagesToday(ctx.user.id);
        if (todayCount >= limits.maxAiMessagesPerDay) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `You've reached your daily AI message limit (${limits.maxAiMessagesPerDay}). Upgrade for unlimited access.`,
          });
        }
        const { invokeLLM } = await import("./_core/llm");
        
        // Save user message
        await db.createAiChat({
          userId: ctx.user.id,
          caseId: input.caseId,
          sessionId: input.sessionId,
          role: "user",
          content: input.message,
        });
        
        // Get conversation history
        const history = await db.getAiChatsBySessionId(input.sessionId);
        
        const systemPrompt = `You are SintraPrime AI — a powerful legal research and strategy assistant built into the SintraPrime Legal Warfare Platform. You assist legal professionals, paralegals, and pro se litigants with case research, document analysis, strategy development, and legal intelligence.

CRITICAL RULES:
1. You are a TOOL, NOT a lawyer. You do NOT provide legal advice or representation.
2. Always include a disclaimer when providing legal information: "This is for informational purposes only and does not constitute legal advice. Consult a licensed attorney for advice specific to your situation."
3. You help with: legal research, case strategy analysis, document drafting assistance, statute/regulation lookup, procedural guidance, filing deadline calculations, and evidence organization.
4. You are knowledgeable about: FDCPA, FCRA, TILA, RESPA, RICO, antitrust law, SEC regulations, UCC, trust law, consumer protection, debt collection practices, credit reporting, and civil procedure.
5. Be thorough, precise, and cite specific statutes, case law, and regulations when possible.
6. When discussing warfare strategies, frame them as legal advocacy strategies within the bounds of law.
7. Be welcoming, supportive, and empowering. Help users understand their rights and options.
8. Format responses with clear headings, bullet points, and organized sections for readability.`;
        
        // Build messages array from history
        const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
          { role: "system", content: systemPrompt },
        ];
        
        for (const msg of history) {
          if (msg.role === "user" || msg.role === "assistant") {
            messages.push({ role: msg.role as "user" | "assistant", content: msg.content });
          }
        }
        
        // Add current message
        messages.push({ role: "user", content: input.message });
        
        let assistantResponse: string;
        try {
          const result = await invokeLLM({ messages });
          const content = result.choices[0]?.message?.content;
          assistantResponse = typeof content === "string" ? content : JSON.stringify(content);
        } catch (error: any) {
          console.error("LLM error:", error);
          assistantResponse = "I apologize, but I encountered an error processing your request. Please try again in a moment.\n\n*Note: This is for informational purposes only and does not constitute legal advice.*";
        }
        
        await db.createAiChat({
          userId: ctx.user.id,
          caseId: input.caseId,
          sessionId: input.sessionId,
          role: "assistant",
          content: assistantResponse,
        });
        
        return { response: assistantResponse };
      }),
    
    history: protectedProcedure
      .input(z.object({ sessionId: z.string() }))
      .query(async ({ input }) => {
        return await db.getAiChatsBySessionId(input.sessionId);
      }),
    
    caseHistory: protectedProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAiChatsByCaseId(input.caseId);
      }),
    
    // Legal AI Agents
    analyzeContract: protectedProcedure
      .input(z.object({
        contractText: z.string(),
        caseId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("./_core/llm");
        
        let caseContext = "";
        if (input.caseId) {
          const caseData = await db.getCaseById(input.caseId);
          if (caseData) {
            caseContext = `\n\nCase Context: ${caseData.title} (${caseData.caseType || 'N/A'})\nDescription: ${caseData.description || 'N/A'}`;
          }
        }
        
        const systemPrompt = `You are a Contract Review Assistant. Analyze contracts for:
1. Key obligations and responsibilities
2. Potential risks and liabilities
3. Unusual or non-standard clauses
4. Missing protections or clauses
5. Ambiguous language that could cause disputes
6. Recommendations for negotiation or amendment

Provide a structured analysis with clear sections. Always include a disclaimer that this is not legal advice.${caseContext}`;
        
        const result = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Please analyze this contract:\n\n${input.contractText}` },
          ],
        });
        
        const analysis = result.choices[0]?.message?.content || "Analysis failed";
        return { analysis: typeof analysis === "string" ? analysis : JSON.stringify(analysis) };
      }),
    
    researchLaw: protectedProcedure
      .input(z.object({
        query: z.string(),
        caseId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("./_core/llm");
        
        let caseContext = "";
        if (input.caseId) {
          const caseData = await db.getCaseById(input.caseId);
          if (caseData) {
            caseContext = `\n\nCase Context: ${caseData.title} (${caseData.caseType || 'N/A'})\nJurisdiction: ${caseData.jurisdiction || 'N/A'}`;
          }
        }
        
        const systemPrompt = `You are a Legal Research Agent. Help find relevant:
1. Case law and precedents
2. Statutes and regulations
3. Legal principles and doctrines
4. Procedural rules
5. Citation formats

Provide specific citations, case names, and statute numbers when possible. Explain how they apply to the query. Include a disclaimer about not providing legal advice.${caseContext}`;
        
        const result = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.query },
          ],
        });
        
        const analysis = result.choices[0]?.message?.content || "Research failed";
        return { result: typeof analysis === "string" ? analysis : JSON.stringify(analysis) };
      }),
    
    generateBrief: protectedProcedure
      .input(z.object({
        briefType: z.string(),
        caseId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("./_core/llm");
        
        let caseContext = "";
        if (input.caseId) {
          const caseData = await db.getCaseById(input.caseId);
          if (caseData) {
            caseContext = `\n\nCase Context: ${caseData.title}\nCase Number: ${caseData.caseNumber || 'N/A'}\nCourt: ${caseData.court || 'N/A'}\nDescription: ${caseData.description || 'N/A'}`;
          }
        }
        
        const systemPrompt = `You are a Brief Writing Helper. Generate legal briefs with:
1. Proper legal formatting and structure
2. Clear statement of facts
3. Legal arguments with citations
4. Conclusion and prayer for relief
5. Professional legal writing style

Use standard legal brief format. Include placeholders for case-specific details. Add a disclaimer about reviewing with an attorney.${caseContext}`;
        
        const result = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Generate a ${input.briefType}` },
          ],
        });
        
        const analysis = result.choices[0]?.message?.content || "Brief generation failed";
        return { result: typeof analysis === "string" ? analysis : JSON.stringify(analysis) };
      }),
    
    prepDeposition: protectedProcedure
      .input(z.object({
        scenario: z.string(),
        caseId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { invokeLLM } = await import("./_core/llm");
        
        let caseContext = "";
        if (input.caseId) {
          const caseData = await db.getCaseById(input.caseId);
          if (caseData) {
            caseContext = `\n\nCase Context: ${caseData.title} (${caseData.caseType || 'N/A'})\nDescription: ${caseData.description || 'N/A'}`;
          }
        }
        
        const systemPrompt = `You are a Deposition Prep Assistant. Help prepare:
1. Strategic deposition questions
2. Follow-up questions for key topics
3. Questions to establish foundation
4. Impeachment questions
5. Document reference questions
6. Strategy notes and tips

Organize questions by topic. Include rationale for each line of questioning. Add a disclaimer about attorney review.${caseContext}`;
        
        const result = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Prepare deposition strategy for: ${input.scenario}` },
          ],
        });
        
        const analysis = result.choices[0]?.message?.content || "Deposition prep failed";
        return { result: typeof analysis === "string" ? analysis : JSON.stringify(analysis) };
      }),
  }),

  // ============================================================================
  // COALITIONS
  // ============================================================================
  
  coalitions: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getCoalitionsByUserId(ctx.user.id);
    }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getCoalitionById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(300),
        description: z.string().optional(),
        isPublic: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Tier enforcement: check coalition access
        const tier = (ctx.user as any).subscriptionTier || "free";
        if (!canAccessFeature(tier, "coalitions")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Coalition features require a Coalition plan or higher. Upgrade to unlock.",
          });
        }
        const result = await db.createCoalition({
          ...input,
          creatorId: ctx.user.id,
        });
        
        // Add creator as owner
        const coalitionId = result[0].insertId;
        await db.addCoalitionMember({
          coalitionId,
          userId: ctx.user.id,
          role: "owner",
        });
        
        return result;
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        isPublic: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        return await db.updateCoalition(id, updates);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteCoalition(input.id);
      }),
    
    members: protectedProcedure
      .input(z.object({ coalitionId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCoalitionMembers(input.coalitionId);
      }),
    
    addMember: protectedProcedure
      .input(z.object({
        coalitionId: z.number(),
        userId: z.number(),
        role: z.enum(["owner", "admin", "member"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const result = await db.addCoalitionMember(input);
        // Auto-notification: new coalition member
        try {
          await db.createNotification({
            userId: ctx.user.id,
            type: "coalition_activity",
            title: "Coalition Member Added",
            message: `A new member has been added to coalition #${input.coalitionId}.`,
            link: "/coalitions",
            priority: "low",
          });
        } catch (e) { /* non-blocking */ }
        return result;
      }),
    
    removeMember: protectedProcedure
      .input(z.object({
        coalitionId: z.number(),
        userId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await db.removeCoalitionMember(input.coalitionId, input.userId);
      }),
  }),

  // ============================================================================
  // LEGAL ALERTS
  // ============================================================================
  
  legalAlerts: router({
    list: protectedProcedure
      .input(z.object({ caseId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        if (input.caseId) {
          return await db.getLegalAlertsByCaseId(input.caseId);
        }
        return await db.getLegalAlertsByUserId(ctx.user.id);
      }),
    
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.markAlertAsRead(input.id);
      }),
  }),

  // ============================================================================
  // WARFARE STRATEGIES
  // ============================================================================
  
  warfareStrategies: router({
    list: protectedProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input }) => {
        return await db.getWarfareStrategiesByCaseId(input.caseId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        caseId: z.number(),
        strategyName: z.string().min(1).max(300),
        front: z.enum(["legal", "regulatory", "technical", "information", "financial", "political", "unconventional"]),
        description: z.string().optional(),
        tactics: z.array(z.object({
          name: z.string(),
          description: z.string(),
          status: z.string(),
          deadline: z.string().optional(),
        })).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Tier enforcement: check warfare strategies access
        const tier = (ctx.user as any).subscriptionTier || "free";
        if (!canAccessFeature(tier, "warfareStrategies")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Warfare Strategy tools require a Pro plan or higher. Upgrade to unlock.",
          });
        }
        return await db.createWarfareStrategy({
          ...input,
          userId: ctx.user.id,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        strategyName: z.string().optional(),
        description: z.string().optional(),
        tactics: z.any().optional(),
        status: z.enum(["planned", "active", "completed", "abandoned"]).optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        return await db.updateWarfareStrategy(id, updates);
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteWarfareStrategy(input.id);
      }),
  }),

  // ============================================================================
  // BOOKMARKS
  // ============================================================================
  
  bookmarks: router({
    list: protectedProcedure
      .input(z.object({ caseId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        if (input.caseId) {
          return await db.getBookmarksByCaseId(input.caseId);
        }
        return await db.getBookmarksByUserId(ctx.user.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        caseId: z.number().optional(),
        url: z.string().url(),
        title: z.string().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        screenshotUrl: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createBookmark({
          ...input,
          userId: ctx.user.id,
        });
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await db.deleteBookmark(input.id);
      }),
  }),

  // ============================================================================
  // FILE UPLOAD
  // ============================================================================
  
  upload: router({
    file: protectedProcedure
      .input(z.object({
        fileName: z.string().min(1),
        mimeType: z.string().min(1),
        base64Data: z.string().min(1),
        context: z.enum(["document", "evidence"]),
        caseId: z.number().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        documentType: z.string().optional(),
        evidenceType: z.string().optional(),
        sourceUrl: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Tier enforcement: check file upload access
        const tier = (ctx.user as any).subscriptionTier || "free";
        if (!canAccessFeature(tier, "fileUploads")) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "File uploads require a Pro plan or higher. Upgrade to unlock this feature.",
          });
        }
        // Decode base64 to buffer
        const buffer = Buffer.from(input.base64Data, "base64");
        const fileSize = buffer.length;
        
        // Generate unique file key
        const randomSuffix = Math.random().toString(36).substring(2, 10);
        const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
        const fileKey = `${ctx.user.id}-files/${Date.now()}-${randomSuffix}-${safeFileName}`;
        
        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        if (input.context === "document") {
          // Create document record
          const result = await db.createDocument({
            userId: ctx.user.id,
            caseId: input.caseId,
            title: input.title || input.fileName,
            description: input.description,
            documentType: input.documentType || "uploaded",
            fileUrl: url,
            fileKey,
            fileName: input.fileName,
            mimeType: input.mimeType,
            fileSize,
            tags: input.tags,
          });
          const recordId = (result as any)?.id || (result as any)?.[0]?.insertId || 0;
          return { success: true, url, fileKey, recordId };
        } else {
          // Create evidence record
          if (!input.caseId) {
            throw new Error("caseId is required for evidence uploads");
          }
          const result = await db.createEvidence({
            caseId: input.caseId,
            userId: ctx.user.id,
            title: input.title || input.fileName,
            description: input.description,
            evidenceType: input.evidenceType || "document",
            fileUrl: url,
            fileKey,
            fileName: input.fileName,
            mimeType: input.mimeType,
            fileSize,
            sourceUrl: input.sourceUrl,
            captureMethod: "manual_upload",
            chainOfCustody: [{
              timestamp: new Date().toISOString(),
              action: "Uploaded",
              userId: ctx.user.id,
              userName: ctx.user.name || "Unknown",
            }],
            tags: input.tags,
          });
          const recordId = (result as any)?.id || (result as any)?.[0]?.insertId || 0;
          return { success: true, url, fileKey, recordId };
        }
      }),
  }),

  // ============================================================================
  // DEADLINE CALCULATOR
  // ============================================================================
  
  deadlines: router({
    calculate: publicProcedure
      .input(z.object({
        triggerDate: z.string(), // ISO date string
        ruleType: z.string(), // e.g., "fdcpa_validation", "fcra_dispute", etc.
        state: z.string().optional(), // US state code for SOL
      }))
      .query(({ input }) => {
        const trigger = new Date(input.triggerDate);
        
        // Federal deadline rules
        const FEDERAL_RULES: Record<string, { name: string; days: number; description: string; statute: string }> = {
          fdcpa_validation: {
            name: "FDCPA Debt Validation Period",
            days: 30,
            description: "Consumer must dispute debt within 30 days of initial communication",
            statute: "15 U.S.C. § 1692g(a)(3)",
          },
          fdcpa_lawsuit: {
            name: "FDCPA Statute of Limitations",
            days: 365,
            description: "Action must be brought within one year from the date of the violation",
            statute: "15 U.S.C. § 1692k(d)",
          },
          fcra_dispute_response: {
            name: "FCRA Investigation Period",
            days: 30,
            description: "CRA must complete investigation within 30 days of receiving dispute",
            statute: "15 U.S.C. § 1681i(a)(1)(A)",
          },
          fcra_dispute_extended: {
            name: "FCRA Extended Investigation",
            days: 45,
            description: "Extended to 45 days if consumer provides additional info during 30-day period",
            statute: "15 U.S.C. § 1681i(a)(1)(B)",
          },
          fcra_lawsuit: {
            name: "FCRA Statute of Limitations",
            days: 730,
            description: "Action must be brought within 2 years after discovery of violation (max 5 years after violation)",
            statute: "15 U.S.C. § 1681p",
          },
          tila_rescission: {
            name: "TILA Right of Rescission",
            days: 3,
            description: "Consumer has 3 business days to rescind certain credit transactions",
            statute: "15 U.S.C. § 1635(a)",
          },
          tila_lawsuit: {
            name: "TILA Statute of Limitations",
            days: 365,
            description: "Action must be brought within 1 year from the date of the violation",
            statute: "15 U.S.C. § 1640(e)",
          },
          respa_lawsuit: {
            name: "RESPA Statute of Limitations",
            days: 1095,
            description: "Action must be brought within 3 years of the violation",
            statute: "12 U.S.C. § 2614",
          },
          cfpb_complaint: {
            name: "CFPB Company Response Period",
            days: 15,
            description: "Company must respond to CFPB complaint within 15 days",
            statute: "12 U.S.C. § 5534",
          },
          ftc_complaint: {
            name: "FTC Complaint Review",
            days: 30,
            description: "Typical FTC complaint review and acknowledgment period",
            statute: "FTC Act § 5",
          },
          state_ag_complaint: {
            name: "State AG Complaint Review",
            days: 30,
            description: "Typical state attorney general complaint review period",
            statute: "Varies by state",
          },
          answer_complaint: {
            name: "Answer to Complaint (Federal)",
            days: 21,
            description: "Defendant must answer complaint within 21 days of service",
            statute: "Fed. R. Civ. P. 12(a)(1)(A)(i)",
          },
          motion_to_dismiss: {
            name: "Motion to Dismiss Deadline",
            days: 21,
            description: "Motion to dismiss must be filed before answer deadline",
            statute: "Fed. R. Civ. P. 12(b)",
          },
          discovery_response: {
            name: "Discovery Response Period",
            days: 30,
            description: "Party must respond to discovery requests within 30 days",
            statute: "Fed. R. Civ. P. 33(b)(2), 34(b)(2)(A)",
          },
          appeal_notice: {
            name: "Notice of Appeal (Federal)",
            days: 30,
            description: "Notice of appeal must be filed within 30 days of judgment",
            statute: "Fed. R. App. P. 4(a)(1)(A)",
          },
        };
        
        // State statute of limitations for debt collection (in years)
        const STATE_SOL: Record<string, { writtenContract: number; oralContract: number; promissoryNote: number; openAccount: number }> = {
          AL: { writtenContract: 6, oralContract: 6, promissoryNote: 6, openAccount: 3 },
          AK: { writtenContract: 3, oralContract: 3, promissoryNote: 3, openAccount: 3 },
          AZ: { writtenContract: 6, oralContract: 3, promissoryNote: 6, openAccount: 3 },
          AR: { writtenContract: 5, oralContract: 3, promissoryNote: 5, openAccount: 3 },
          CA: { writtenContract: 4, oralContract: 2, promissoryNote: 4, openAccount: 4 },
          CO: { writtenContract: 6, oralContract: 6, promissoryNote: 6, openAccount: 6 },
          CT: { writtenContract: 6, oralContract: 3, promissoryNote: 6, openAccount: 6 },
          DE: { writtenContract: 3, oralContract: 3, promissoryNote: 3, openAccount: 3 },
          FL: { writtenContract: 5, oralContract: 4, promissoryNote: 5, openAccount: 4 },
          GA: { writtenContract: 6, oralContract: 4, promissoryNote: 6, openAccount: 4 },
          HI: { writtenContract: 6, oralContract: 6, promissoryNote: 6, openAccount: 6 },
          ID: { writtenContract: 5, oralContract: 4, promissoryNote: 5, openAccount: 4 },
          IL: { writtenContract: 10, oralContract: 5, promissoryNote: 10, openAccount: 5 },
          IN: { writtenContract: 10, oralContract: 6, promissoryNote: 10, openAccount: 6 },
          IA: { writtenContract: 10, oralContract: 5, promissoryNote: 5, openAccount: 5 },
          KS: { writtenContract: 5, oralContract: 3, promissoryNote: 5, openAccount: 3 },
          KY: { writtenContract: 15, oralContract: 5, promissoryNote: 15, openAccount: 5 },
          LA: { writtenContract: 10, oralContract: 10, promissoryNote: 10, openAccount: 3 },
          ME: { writtenContract: 6, oralContract: 6, promissoryNote: 6, openAccount: 6 },
          MD: { writtenContract: 3, oralContract: 3, promissoryNote: 3, openAccount: 3 },
          MA: { writtenContract: 6, oralContract: 6, promissoryNote: 6, openAccount: 6 },
          MI: { writtenContract: 6, oralContract: 6, promissoryNote: 6, openAccount: 6 },
          MN: { writtenContract: 6, oralContract: 6, promissoryNote: 6, openAccount: 6 },
          MS: { writtenContract: 3, oralContract: 3, promissoryNote: 3, openAccount: 3 },
          MO: { writtenContract: 10, oralContract: 5, promissoryNote: 10, openAccount: 5 },
          MT: { writtenContract: 8, oralContract: 5, promissoryNote: 8, openAccount: 5 },
          NE: { writtenContract: 5, oralContract: 4, promissoryNote: 5, openAccount: 4 },
          NV: { writtenContract: 6, oralContract: 4, promissoryNote: 6, openAccount: 4 },
          NH: { writtenContract: 3, oralContract: 3, promissoryNote: 3, openAccount: 3 },
          NJ: { writtenContract: 6, oralContract: 6, promissoryNote: 6, openAccount: 6 },
          NM: { writtenContract: 6, oralContract: 4, promissoryNote: 6, openAccount: 4 },
          NY: { writtenContract: 6, oralContract: 6, promissoryNote: 6, openAccount: 6 },
          NC: { writtenContract: 3, oralContract: 3, promissoryNote: 3, openAccount: 3 },
          ND: { writtenContract: 6, oralContract: 6, promissoryNote: 6, openAccount: 6 },
          OH: { writtenContract: 8, oralContract: 6, promissoryNote: 8, openAccount: 6 },
          OK: { writtenContract: 5, oralContract: 3, promissoryNote: 5, openAccount: 3 },
          OR: { writtenContract: 6, oralContract: 6, promissoryNote: 6, openAccount: 6 },
          PA: { writtenContract: 4, oralContract: 4, promissoryNote: 4, openAccount: 4 },
          RI: { writtenContract: 10, oralContract: 10, promissoryNote: 10, openAccount: 10 },
          SC: { writtenContract: 3, oralContract: 3, promissoryNote: 3, openAccount: 3 },
          SD: { writtenContract: 6, oralContract: 6, promissoryNote: 6, openAccount: 6 },
          TN: { writtenContract: 6, oralContract: 6, promissoryNote: 6, openAccount: 6 },
          TX: { writtenContract: 4, oralContract: 4, promissoryNote: 4, openAccount: 4 },
          UT: { writtenContract: 6, oralContract: 4, promissoryNote: 6, openAccount: 4 },
          VT: { writtenContract: 6, oralContract: 6, promissoryNote: 6, openAccount: 6 },
          VA: { writtenContract: 5, oralContract: 3, promissoryNote: 5, openAccount: 3 },
          WA: { writtenContract: 6, oralContract: 3, promissoryNote: 6, openAccount: 3 },
          WV: { writtenContract: 10, oralContract: 5, promissoryNote: 10, openAccount: 5 },
          WI: { writtenContract: 6, oralContract: 6, promissoryNote: 10, openAccount: 6 },
          WY: { writtenContract: 10, oralContract: 8, promissoryNote: 10, openAccount: 8 },
          DC: { writtenContract: 3, oralContract: 3, promissoryNote: 3, openAccount: 3 },
        };
        
        const results: Array<{
          name: string;
          deadline: string;
          daysRemaining: number;
          isPast: boolean;
          description: string;
          statute: string;
        }> = [];
        
        if (input.ruleType === "state_sol" && input.state) {
          const sol = STATE_SOL[input.state.toUpperCase()];
          if (sol) {
            const types = [
              { key: "writtenContract", name: "Written Contract" },
              { key: "oralContract", name: "Oral Contract" },
              { key: "promissoryNote", name: "Promissory Note" },
              { key: "openAccount", name: "Open Account (Credit Card)" },
            ] as const;
            
            for (const t of types) {
              const years = sol[t.key];
              const deadline = new Date(trigger);
              deadline.setFullYear(deadline.getFullYear() + years);
              const now = new Date();
              const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              
              results.push({
                name: `${t.name} SOL (${input.state.toUpperCase()})`,
                deadline: deadline.toISOString().split("T")[0],
                daysRemaining,
                isPast: daysRemaining < 0,
                description: `${years}-year statute of limitations for ${t.name.toLowerCase()} in ${input.state.toUpperCase()}`,
                statute: `${input.state.toUpperCase()} State Law`,
              });
            }
          }
        } else if (input.ruleType === "all_federal") {
          for (const [, rule] of Object.entries(FEDERAL_RULES)) {
            const deadline = new Date(trigger);
            deadline.setDate(deadline.getDate() + rule.days);
            const now = new Date();
            const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            results.push({
              name: rule.name,
              deadline: deadline.toISOString().split("T")[0],
              daysRemaining,
              isPast: daysRemaining < 0,
              description: rule.description,
              statute: rule.statute,
            });
          }
        } else {
          const rule = FEDERAL_RULES[input.ruleType];
          if (rule) {
            const deadline = new Date(trigger);
            deadline.setDate(deadline.getDate() + rule.days);
            const now = new Date();
            const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            results.push({
              name: rule.name,
              deadline: deadline.toISOString().split("T")[0],
              daysRemaining,
              isPast: daysRemaining < 0,
              description: rule.description,
              statute: rule.statute,
            });
          }
        }
        
        return {
          triggerDate: input.triggerDate,
          ruleType: input.ruleType,
          state: input.state,
          results,
          disclaimer: "Deadline calculations are for informational purposes only. Court rules, holidays, and specific circumstances may affect actual deadlines. Always verify with applicable rules and consult a licensed attorney.",
        };
      }),
    
    rules: publicProcedure.query(() => {
      return {
        federal: [
          { key: "fdcpa_validation", name: "FDCPA Debt Validation (30 days)", category: "FDCPA" },
          { key: "fdcpa_lawsuit", name: "FDCPA Statute of Limitations (1 year)", category: "FDCPA" },
          { key: "fcra_dispute_response", name: "FCRA Investigation Period (30 days)", category: "FCRA" },
          { key: "fcra_dispute_extended", name: "FCRA Extended Investigation (45 days)", category: "FCRA" },
          { key: "fcra_lawsuit", name: "FCRA Statute of Limitations (2 years)", category: "FCRA" },
          { key: "tila_rescission", name: "TILA Right of Rescission (3 days)", category: "TILA" },
          { key: "tila_lawsuit", name: "TILA Statute of Limitations (1 year)", category: "TILA" },
          { key: "respa_lawsuit", name: "RESPA Statute of Limitations (3 years)", category: "RESPA" },
          { key: "cfpb_complaint", name: "CFPB Company Response (15 days)", category: "CFPB" },
          { key: "ftc_complaint", name: "FTC Complaint Review (30 days)", category: "FTC" },
          { key: "state_ag_complaint", name: "State AG Complaint Review (30 days)", category: "State" },
          { key: "answer_complaint", name: "Answer to Complaint - Federal (21 days)", category: "Civil Procedure" },
          { key: "motion_to_dismiss", name: "Motion to Dismiss (21 days)", category: "Civil Procedure" },
          { key: "discovery_response", name: "Discovery Response (30 days)", category: "Civil Procedure" },
          { key: "appeal_notice", name: "Notice of Appeal - Federal (30 days)", category: "Civil Procedure" },
          { key: "all_federal", name: "Calculate All Federal Deadlines", category: "All" },
        ],
        stateSOL: { key: "state_sol", name: "State Statute of Limitations", category: "State" },
        states: [
          "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL",
          "GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
          "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH",
          "NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI",
          "SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"
        ],
      };
    }),
  }),

  // ============================================================================
  // STRIPE SUBSCRIPTION
  // ============================================================================

  subscription: router({
    status: protectedProcedure.query(async ({ ctx }) => {
      return {
        tier: (ctx.user as any).subscriptionTier || "free",
        stripeCustomerId: (ctx.user as any).stripeCustomerId || null,
        stripeSubscriptionId: (ctx.user as any).stripeSubscriptionId || null,
      };
    }),

    checkout: protectedProcedure
      .input(z.object({
        tier: z.enum(["pro", "coalition", "enterprise"]),
        origin: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = ctx.user;
        const url = await createCheckoutSession({
          userId: user.id,
          email: user.email || "",
          name: user.name,
          tier: input.tier as SubscriptionTier,
          origin: input.origin,
          customerId: (user as any).stripeCustomerId,
        });
        if (!url) throw new Error("Failed to create checkout session. Stripe may not be configured.");
        return { url };
      }),

    portal: protectedProcedure
      .input(z.object({ origin: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const customerId = (ctx.user as any).stripeCustomerId;
        if (!customerId) throw new Error("No active subscription found");
        const url = await createPortalSession(customerId, input.origin);
        if (!url) throw new Error("Failed to create portal session");
        return { url };
      }),

    payments: protectedProcedure.query(async ({ ctx }) => {
      const customerId = (ctx.user as any).stripeCustomerId;
      if (!customerId) return [];
      return await getPaymentHistory(customerId);
    }),

    tierLimits: protectedProcedure.query(async ({ ctx }) => {
      const tier = ((ctx.user as any).subscriptionTier || "free") as TierKey;
      const limits = getTierLimits(tier);
      const caseCount = await db.countUserCases(ctx.user.id);
      const aiMsgCount = await db.countUserAiMessagesToday(ctx.user.id);
      return {
        tier,
        limits,
        usage: {
          cases: caseCount,
          aiMessagesToday: aiMsgCount,
        },
      };
    }),
  }),

  // ============================================================================
  // ONBOARDING
  // ============================================================================

  onboarding: router({
    status: protectedProcedure.query(async ({ ctx }) => {
      return {
        complete: (ctx.user as any).onboardingComplete || false,
      };
    }),

    complete: protectedProcedure.mutation(async ({ ctx }) => {
      await db.updateUserOnboardingComplete(ctx.user.id);
      return { success: true };
    }),
  }),

  // ============================================================================
  // NOTIFICATIONS
  // ============================================================================

  notifications: router({
    list: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(100).optional() }).optional())
      .query(async ({ ctx, input }) => {
        return await db.getNotificationsByUserId(ctx.user.id, input?.limit || 50);
      }),

    unreadCount: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUnreadNotificationCount(ctx.user.id);
    }),

    markRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.markNotificationRead(input.notificationId, ctx.user.id);
        return { success: true };
      }),

    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await db.markAllNotificationsRead(ctx.user.id);
      return { success: true };
    }),

    delete: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteNotification(input.notificationId, ctx.user.id);
        return { success: true };
      }),

    // Create notification (for testing / internal use)
    create: protectedProcedure
      .input(z.object({
        type: z.string().min(1),
        title: z.string().min(1),
        message: z.string().min(1),
        caseId: z.number().optional(),
        link: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "critical"]).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createNotification({
          userId: ctx.user.id,
          ...input,
        });
      }),
  }),

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  analytics: router({
    caseOverview: protectedProcedure.query(async ({ ctx }) => {
      return await db.getCaseAnalytics(ctx.user.id);
    }),
  }),

  // ============================================================================
  // CASE TIMELINE
  // ============================================================================

  timeline: router({
    get: protectedProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input }) => {
        const events = await db.getCaseEventsByCaseId(input.caseId);
        const docs = await db.getDocumentsByCaseId(input.caseId);
        const evidenceItems = await db.getEvidenceByCaseId(input.caseId);
        const caseData = await db.getCaseById(input.caseId);

        // Merge all items into a unified timeline
        const timelineItems: Array<{
          id: string;
          date: string;
          title: string;
          description: string;
          type: "event" | "document" | "evidence" | "milestone";
          category: string;
          metadata?: Record<string, any>;
        }> = [];

        // Add case events
        for (const ev of events) {
          timelineItems.push({
            id: `event-${ev.id}`,
            date: (ev.eventDate || ev.createdAt)?.toISOString?.() || new Date(ev.eventDate || ev.createdAt).toISOString(),
            title: ev.title,
            description: ev.description || "",
            type: "event",
            category: ev.eventType || "general",
          });
        }

        // Add documents
        for (const doc of docs) {
          timelineItems.push({
            id: `doc-${doc.id}`,
            date: doc.createdAt?.toISOString?.() || new Date(doc.createdAt).toISOString(),
            title: `Document: ${doc.title}`,
            description: doc.description || "",
            type: "document",
            category: doc.documentType || "document",
          });
        }

        // Add evidence
        for (const ev of evidenceItems) {
          timelineItems.push({
            id: `evidence-${ev.id}`,
            date: ev.createdAt?.toISOString?.() || new Date(ev.createdAt).toISOString(),
            title: `Evidence: ${ev.title}`,
            description: ev.description || "",
            type: "evidence",
            category: ev.evidenceType || "evidence",
          });
        }

        // Add milestones from case data
        if (caseData) {
          if (caseData.filingDate) {
            timelineItems.push({
              id: "milestone-filing",
              date: new Date(caseData.filingDate).toISOString(),
              title: "Case Filed",
              description: `Case filed${caseData.court ? " at " + caseData.court : ""}`,
              type: "milestone",
              category: "milestone",
            });
          }
          if (caseData.trialDate) {
            timelineItems.push({
              id: "milestone-trial",
              date: new Date(caseData.trialDate).toISOString(),
              title: "Trial Date",
              description: `Scheduled trial${caseData.court ? " at " + caseData.court : ""}`,
              type: "milestone",
              category: "milestone",
            });
          }
        }

        // Sort by date
        timelineItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return { items: timelineItems, caseTitle: caseData?.title || "" };
      }),
  }),

  // ============================================================================
  // PDF EXPORT
  // ============================================================================

  pdf: router({
    generate: protectedProcedure
      .input(z.object({
        documentId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const doc = await db.getDocumentById(input.documentId);
        if (!doc) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
        }

        // Build HTML for PDF
        const content = doc.content || "";
        const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { margin: 1in; size: letter; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; color: #000; }
    h1 { font-size: 16pt; text-align: center; margin-bottom: 0.5in; font-weight: bold; text-transform: uppercase; }
    h2 { font-size: 14pt; margin-top: 0.3in; font-weight: bold; }
    h3 { font-size: 12pt; margin-top: 0.2in; font-weight: bold; }
    p { margin: 0.1in 0; text-align: justify; }
    .header { text-align: center; margin-bottom: 0.5in; border-bottom: 2px solid #000; padding-bottom: 0.2in; }
    .header .title { font-size: 18pt; font-weight: bold; text-transform: uppercase; }
    .header .subtitle { font-size: 10pt; color: #555; margin-top: 4pt; }
    .footer { text-align: center; font-size: 9pt; color: #777; margin-top: 0.5in; border-top: 1px solid #ccc; padding-top: 0.1in; }
    .meta { font-size: 10pt; color: #555; margin-bottom: 0.3in; }
    .disclaimer { font-size: 9pt; color: #888; font-style: italic; margin-top: 0.5in; border-top: 1px solid #ddd; padding-top: 0.1in; }
    ul, ol { margin: 0.1in 0 0.1in 0.3in; }
    li { margin: 2pt 0; }
    strong { font-weight: bold; }
    em { font-style: italic; }
    blockquote { margin: 0.1in 0.3in; padding-left: 0.2in; border-left: 3px solid #ccc; font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">${escapeHtml(doc.title)}</div>
    <div class="subtitle">Generated by SintraPrime Legal Warfare Platform</div>
  </div>
  <div class="meta">
    <strong>Document Type:</strong> ${escapeHtml(doc.documentType || "General")}<br>
    <strong>Date:</strong> ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}<br>
    ${doc.tags && (doc.tags as string[]).length > 0 ? `<strong>Tags:</strong> ${(doc.tags as string[]).join(", ")}` : ""}
  </div>
  <div class="content">
    ${markdownToHtml(content)}
  </div>
  <div class="disclaimer">
    This document was generated using SintraPrime, a legal research and strategy tool. 
    SintraPrime is not a law firm and does not provide legal advice or representation. 
    This document should be reviewed by a licensed attorney before use in any legal proceeding.
  </div>
  <div class="footer">
    SintraPrime &mdash; Legal Warfare Platform &mdash; ${new Date().getFullYear()}
  </div>
</body>
</html>`;

        // Upload HTML as a file to S3 for reference, then return the HTML for client-side rendering
        const fileKey = `pdf-exports/${doc.id}-${Date.now()}.html`;
        const { url } = await storagePut(fileKey, html, "text/html");

        return {
          html,
          url,
          title: doc.title,
          documentType: doc.documentType,
        };
      }),
  }),
  // ============================================================================
  // GLOBAL SEARCH
  // ============================================================================
  search: router({
    global: protectedProcedure
      .input(z.object({ query: z.string().min(1).max(200) }))
      .query(async ({ ctx, input }) => {
        return db.globalSearch(ctx.user.id, input.query);
      }),
  }),

  // ============================================================================
  // CASE EMAILS
  // ============================================================================
  emails: router({
    list: protectedProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input }) => {
        return db.getCaseEmailsByCaseId(input.caseId);
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getCaseEmailById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        caseId: z.number(),
        direction: z.enum(["inbound", "outbound"]),
        fromAddress: z.string().optional(),
        toAddress: z.string().optional(),
        subject: z.string().min(1),
        body: z.string().min(1),
        htmlBody: z.string().optional(),
        threadId: z.string().optional(),
        attachments: z.array(z.object({
          fileName: z.string(),
          fileUrl: z.string(),
          mimeType: z.string(),
          fileSize: z.number(),
        })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createCaseEmail({
          ...input,
          userId: ctx.user.id,
          sentAt: input.direction === "outbound" ? new Date() : undefined,
          receivedAt: input.direction === "inbound" ? new Date() : undefined,
        });
      }),
    toggleStar: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.toggleEmailStar(input.id);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCaseEmail(input.id);
        return { success: true };
      }),
  }),

  // ============================================================================
  // FILING CHECKLISTS
  // ============================================================================
  filingChecklists: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getFilingChecklistsByUserId(ctx.user.id);
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getFilingChecklistById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        caseId: z.number().optional(),
        title: z.string().min(1),
        caseType: z.string().min(1),
        jurisdiction: z.string().min(1),
        court: z.string().optional(),
        items: z.array(z.object({
          id: z.string(),
          step: z.number(),
          title: z.string(),
          description: z.string(),
          category: z.string(),
          isRequired: z.boolean(),
          isCompleted: z.boolean(),
          completedAt: z.string().optional(),
          dueDate: z.string().optional(),
          estimatedFee: z.string().optional(),
          notes: z.string().optional(),
          links: z.array(z.object({ title: z.string(), url: z.string() })).optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createFilingChecklist({
          ...input,
          userId: ctx.user.id,
          progress: 0,
          status: "draft",
        });
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        items: z.array(z.object({
          id: z.string(),
          step: z.number(),
          title: z.string(),
          description: z.string(),
          category: z.string(),
          isRequired: z.boolean(),
          isCompleted: z.boolean(),
          completedAt: z.string().optional(),
          dueDate: z.string().optional(),
          estimatedFee: z.string().optional(),
          notes: z.string().optional(),
          links: z.array(z.object({ title: z.string(), url: z.string() })).optional(),
        })),
        progress: z.number().min(0).max(100).optional(),
        status: z.enum(["draft", "in_progress", "completed"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updateFilingChecklist(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteFilingChecklist(input.id);
        return { success: true };
      }),
    generate: protectedProcedure
      .input(z.object({
        caseType: z.string().min(1),
        jurisdiction: z.string().min(1),
        court: z.string().optional(),
        caseId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Generate checklist items based on case type and jurisdiction
        const items = generateChecklistItems(input.caseType, input.jurisdiction, input.court);
        const title = `${input.caseType} Filing Checklist - ${input.jurisdiction}`;
        return db.createFilingChecklist({
          ...input,
          title,
          userId: ctx.user.id,
          items,
          progress: 0,
          status: "draft",
        });
      }),
  }),

  // ============================================================================
  // CASE EXPORT / REPORT GENERATOR
  // ============================================================================
  caseExport: router({
    generateReport: protectedProcedure
      .input(z.object({ caseId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const fullCase = await db.getFullCaseData(input.caseId);
        if (!fullCase) throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        if (fullCase.case.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        const c = fullCase.case;
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
          body{font-family:'Times New Roman',serif;margin:40px 60px;color:#1a1a1a;line-height:1.6}
          h1{text-align:center;font-size:24px;border-bottom:3px double #333;padding-bottom:10px}
          h2{font-size:18px;color:#1a365d;border-bottom:1px solid #ccc;padding-bottom:5px;margin-top:30px}
          h3{font-size:15px;color:#2d3748;margin-top:20px}
          .header{text-align:center;margin-bottom:30px}
          .header .brand{font-size:12px;color:#666;letter-spacing:2px;text-transform:uppercase}
          .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#f7fafc;padding:15px;border-radius:4px;margin:15px 0}
          .meta-item{font-size:13px}.meta-label{font-weight:bold;color:#4a5568}
          table{width:100%;border-collapse:collapse;margin:10px 0;font-size:13px}
          th{background:#edf2f7;text-align:left;padding:8px;border:1px solid #e2e8f0;font-weight:600}
          td{padding:8px;border:1px solid #e2e8f0}
          .footer{margin-top:40px;padding-top:15px;border-top:2px solid #333;text-align:center;font-size:11px;color:#666}
          .section-empty{color:#999;font-style:italic;font-size:13px}
          .badge{display:inline-block;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:600}
          .confidential{text-align:center;color:#c53030;font-weight:bold;font-size:14px;margin:10px 0;letter-spacing:1px}
        </style></head><body>
        <div class="header">
          <div class="brand">SintraPrime Legal Warfare Platform</div>
          <h1>Case Report: ${escapeHtml(c.title)}</h1>
          <div class="confidential">CONFIDENTIAL - ATTORNEY WORK PRODUCT</div>
        </div>
        <div class="meta">
          <div class="meta-item"><span class="meta-label">Case Number:</span> #${c.id}</div>
          <div class="meta-item"><span class="meta-label">Status:</span> ${c.status}</div>
          <div class="meta-item"><span class="meta-label">Type:</span> ${c.caseType || 'N/A'}</div>
          <div class="meta-item"><span class="meta-label">Priority:</span> ${c.priority || 'N/A'}</div>
          <div class="meta-item"><span class="meta-label">Created:</span> ${c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A'}</div>
          <div class="meta-item"><span class="meta-label">Generated:</span> ${new Date().toLocaleDateString()}</div>
        </div>
        ${c.description ? `<h2>Case Description</h2><p>${escapeHtml(c.description)}</p>` : ''}
        <h2>Parties (${fullCase.parties.length})</h2>
        ${fullCase.parties.length > 0 ? `<table><tr><th>Name</th><th>Type</th><th>Role</th><th>Contact</th></tr>
          ${fullCase.parties.map(p => `<tr><td>${escapeHtml(p.name)}</td><td>${p.type || ''}</td><td>${p.entityType || ''}</td><td>${p.contactInfo?.email || p.contactInfo?.phone || ''}</td></tr>`).join('')}</table>` : '<p class="section-empty">No parties recorded.</p>'}
        <h2>Documents (${fullCase.documents.length})</h2>
        ${fullCase.documents.length > 0 ? `<table><tr><th>Title</th><th>Type</th><th>Status</th><th>Created</th></tr>
          ${fullCase.documents.map(d => `<tr><td>${escapeHtml(d.title)}</td><td>${d.documentType || ''}</td><td>v${d.version}</td><td>${d.createdAt ? new Date(d.createdAt).toLocaleDateString() : ''}</td></tr>`).join('')}</table>` : '<p class="section-empty">No documents recorded.</p>'}
        <h2>Evidence (${fullCase.evidence.length})</h2>
        ${fullCase.evidence.length > 0 ? `<table><tr><th>Title</th><th>Type</th><th>Source</th><th>Collected</th></tr>
          ${fullCase.evidence.map(e => `<tr><td>${escapeHtml(e.title)}</td><td>${e.evidenceType || ''}</td><td>${e.sourceUrl || ''}</td><td>${e.createdAt ? new Date(e.createdAt).toLocaleDateString() : ''}</td></tr>`).join('')}</table>` : '<p class="section-empty">No evidence recorded.</p>'}
        <h2>Timeline (${fullCase.timeline.length})</h2>
        ${fullCase.timeline.length > 0 ? `<table><tr><th>Date</th><th>Type</th><th>Title</th><th>Description</th></tr>
          ${fullCase.timeline.map(t => `<tr><td>${t.eventDate || ''}</td><td>${t.eventType || ''}</td><td>${escapeHtml(t.title)}</td><td>${t.description ? escapeHtml(t.description).substring(0, 100) : ''}</td></tr>`).join('')}</table>` : '<p class="section-empty">No timeline events recorded.</p>'}
        <h2>Notes (${fullCase.notes.length})</h2>
        ${fullCase.notes.length > 0 ? fullCase.notes.map(n => `<h3>${n.noteType || 'Note'}</h3><p>${n.content ? escapeHtml(n.content).substring(0, 500) : ''}</p>`).join('') : '<p class="section-empty">No notes recorded.</p>'}
        <h2>Warfare Strategies (${fullCase.strategies.length})</h2>
        ${fullCase.strategies.length > 0 ? `<table><tr><th>Front</th><th>Title</th><th>Status</th><th>Priority</th></tr>
          ${fullCase.strategies.map(s => `<tr><td>${s.front || ''}</td><td>${escapeHtml(s.strategyName)}</td><td>${s.status || ''}</td><td>${s.priority || ''}</td></tr>`).join('')}</table>` : '<p class="section-empty">No strategies recorded.</p>'}
        <div class="footer">
          <p>Generated by SintraPrime Legal Warfare Platform on ${new Date().toLocaleString()}</p>
          <p>This document is for informational purposes only and does not constitute legal advice.</p>
        </div></body></html>`;
        return { html, title: c.title, caseId: c.id };
      }),
  }),

  // ============================================================================
  // LEGAL RESEARCH LIBRARY
  // ============================================================================
  research: router({
    list: protectedProcedure
      .input(z.object({ category: z.string().optional(), query: z.string().optional() }).optional())
      .query(async ({ input }) => {
        if (input?.query) return db.searchLegalResearch(input.query, input.category);
        return db.getAllLegalResearch();
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getLegalResearchById(input.id);
      }),
    seed: protectedProcedure.mutation(async () => {
      // Seed the library with common legal statutes
      const statutes = [
        { title: "Fair Debt Collection Practices Act (FDCPA)", category: "federal_statute" as const, citation: "15 U.S.C. §§ 1692-1692p", subcategory: "Consumer Protection", jurisdiction: "Federal", tags: ["debt", "collection", "consumer"], summary: "Prohibits abusive, deceptive, and unfair debt collection practices by third-party debt collectors.", content: "The FDCPA regulates the conduct of third-party debt collectors. Key provisions include:\n\n**§1692c** - Communication practices: Collectors cannot contact consumers at unusual times (before 8am or after 9pm), at their workplace if the employer disapproves, or after the consumer requests cessation of contact.\n\n**§1692d** - Harassment or abuse: Prohibits threats of violence, obscene language, repeated phone calls intended to annoy, and publishing lists of debtors.\n\n**§1692e** - False or misleading representations: Prohibits misrepresenting the amount of debt, falsely implying attorney involvement, threatening legal action not intended to be taken.\n\n**§1692f** - Unfair practices: Prohibits collecting unauthorized amounts, depositing post-dated checks prematurely, and taking property without legal authority.\n\n**§1692g** - Validation of debts: Within 5 days of initial communication, collector must send written notice with amount of debt, name of creditor, and statement of consumer's right to dispute.\n\n**Statute of Limitations:** 1 year from the date of violation.\n**Damages:** Actual damages + statutory damages up to $1,000 per action + attorney fees." },
        { title: "Fair Credit Reporting Act (FCRA)", category: "federal_statute" as const, citation: "15 U.S.C. §§ 1681-1681x", subcategory: "Consumer Protection", jurisdiction: "Federal", tags: ["credit", "reporting", "consumer"], summary: "Regulates the collection, dissemination, and use of consumer credit information.", content: "The FCRA promotes accuracy, fairness, and privacy of consumer information in credit reporting.\n\n**§1681b** - Permissible purposes: Credit reports can only be obtained for legitimate business purposes including credit transactions, employment screening (with consent), insurance underwriting, and government licensing.\n\n**§1681c** - Obsolete information: Most negative information must be removed after 7 years. Bankruptcies after 10 years.\n\n**§1681e** - Accuracy requirements: CRAs must follow reasonable procedures to ensure maximum possible accuracy.\n\n**§1681i** - Dispute procedure: Consumers can dispute inaccurate information. CRAs must investigate within 30 days, forward disputes to furnishers, and delete or modify unverifiable information.\n\n**§1681s-2** - Furnisher responsibilities: Data furnishers must investigate disputes forwarded by CRAs and report accurate information.\n\n**Statute of Limitations:** 2 years from discovery of violation, 5 years from date of violation.\n**Damages:** Actual damages or $100-$1,000 statutory damages per violation + punitive damages + attorney fees." },
        { title: "Truth in Lending Act (TILA)", category: "federal_statute" as const, citation: "15 U.S.C. §§ 1601-1667f", subcategory: "Consumer Protection", jurisdiction: "Federal", tags: ["lending", "disclosure", "consumer"], summary: "Requires clear disclosure of key terms of lending arrangements and all costs to consumers.", content: "TILA promotes the informed use of consumer credit by requiring disclosures about its terms and cost.\n\n**Key Disclosures Required:** Annual Percentage Rate (APR), finance charge, amount financed, total of payments, payment schedule.\n\n**§1635** - Right of rescission: For certain home-secured loans, borrowers have 3 business days to cancel. If required disclosures were not made, right extends to 3 years.\n\n**Regulation Z** implements TILA and covers: open-end credit (credit cards), closed-end credit (mortgages, auto loans), and special rules for high-cost mortgages.\n\n**Statute of Limitations:** 1 year for damages actions, 3 years for rescission.\n**Damages:** Actual damages + statutory damages (twice the finance charge for closed-end, $500-$5,000 for open-end) + attorney fees." },
        { title: "Real Estate Settlement Procedures Act (RESPA)", category: "federal_statute" as const, citation: "12 U.S.C. §§ 2601-2617", subcategory: "Real Estate", jurisdiction: "Federal", tags: ["real estate", "mortgage", "settlement"], summary: "Requires lenders to provide borrowers with disclosures regarding real estate settlement costs.", content: "RESPA protects consumers during the home buying and mortgage process.\n\n**§2603** - Good Faith Estimate: Lenders must provide estimated settlement costs within 3 business days of loan application.\n\n**§2604** - Special information booklet: HUD settlement cost booklet must be provided to applicants.\n\n**§2607** - Kickback prohibition: Prohibits giving or accepting fees, kickbacks, or things of value for referrals of settlement service business.\n\n**§2608** - Title insurance: Prohibits sellers from requiring buyers to use a particular title insurance company.\n\n**§2609** - Escrow accounts: Limits the amount lenders can require in escrow accounts.\n\n**Statute of Limitations:** 1-3 years depending on violation type.\n**Damages:** Actual damages + statutory damages up to 3x for kickback violations + attorney fees." },
        { title: "Telephone Consumer Protection Act (TCPA)", category: "federal_statute" as const, citation: "47 U.S.C. § 227", subcategory: "Consumer Protection", jurisdiction: "Federal", tags: ["telephone", "robocall", "consumer"], summary: "Restricts telephone solicitations and the use of automated telephone equipment.", content: "The TCPA restricts telemarketing calls, auto-dialed calls, prerecorded calls, text messages, and unsolicited faxes.\n\n**Key Provisions:** Prohibits calls using automatic telephone dialing systems (ATDS) or prerecorded voices to cell phones without prior express consent. Requires telemarketers to maintain do-not-call lists.\n\n**Damages:** $500 per violation, trebled to $1,500 for willful violations.\n**No cap on damages** - each call/text is a separate violation." },
        { title: "Federal Rules of Civil Procedure - Rule 12", category: "procedural_rule" as const, citation: "Fed. R. Civ. P. 12", subcategory: "Federal Procedure", jurisdiction: "Federal", tags: ["procedure", "motion", "dismiss"], summary: "Governs defenses and objections, including motions to dismiss.", content: "Rule 12 covers how and when defenses and objections must be presented.\n\n**Rule 12(a)** - Time to serve a responsive pleading: 21 days after service of summons and complaint (60 days if waiver of service).\n\n**Rule 12(b)** - Defenses that may be raised by motion: (1) lack of subject-matter jurisdiction, (2) lack of personal jurisdiction, (3) improper venue, (4) insufficient process, (5) insufficient service of process, (6) failure to state a claim, (7) failure to join a required party.\n\n**Rule 12(e)** - Motion for a more definite statement.\n**Rule 12(f)** - Motion to strike." },
        { title: "Federal Rules of Civil Procedure - Rule 26", category: "procedural_rule" as const, citation: "Fed. R. Civ. P. 26", subcategory: "Federal Procedure", jurisdiction: "Federal", tags: ["procedure", "discovery", "disclosure"], summary: "Governs general provisions for discovery, including required initial disclosures.", content: "Rule 26 establishes the framework for discovery in federal civil cases.\n\n**Rule 26(a)(1)** - Required initial disclosures: Within 14 days of the Rule 26(f) conference, parties must disclose names and contact info of individuals with discoverable information, copies of documents, computation of damages, and insurance agreements.\n\n**Rule 26(b)(1)** - Scope of discovery: Parties may obtain discovery regarding any nonprivileged matter that is relevant to any party's claim or defense and proportional to the needs of the case.\n\n**Rule 26(f)** - Conference of parties: At least 21 days before scheduling conference, parties must confer to discuss claims, defenses, settlement, and develop a discovery plan." },
        { title: "Debt Validation Letter Guide", category: "legal_guide" as const, citation: "N/A", subcategory: "Consumer Protection", jurisdiction: "Federal", tags: ["debt", "validation", "template", "guide"], summary: "Step-by-step guide for sending debt validation letters under the FDCPA.", content: "A debt validation letter is your first line of defense when contacted by a debt collector.\n\n**When to Send:** Within 30 days of receiving the initial collection notice. Sending within this window triggers the collector's obligation to verify the debt.\n\n**What to Include:**\n1. Your name and address\n2. Reference to the debt (account number if known)\n3. Statement that you dispute the debt\n4. Request for validation including: original creditor name, original account number, amount owed with itemization, proof the collector is licensed in your state, copy of the original signed agreement\n\n**What Happens Next:** The collector must cease collection activity until they provide adequate validation. If they cannot validate, they must cease collection entirely.\n\n**Key Tips:** Send via certified mail with return receipt. Keep copies of everything. Do not admit the debt is yours. Do not make any payment promises." },
        { title: "Equal Credit Opportunity Act (ECOA)", category: "federal_statute" as const, citation: "15 U.S.C. §§ 1691-1691f", subcategory: "Consumer Protection", jurisdiction: "Federal", tags: ["credit", "discrimination", "consumer"], summary: "Prohibits creditors from discriminating against credit applicants on the basis of race, color, religion, national origin, sex, marital status, or age.", content: "ECOA ensures equal access to credit for all consumers.\n\n**Prohibited Bases for Discrimination:** Race, color, religion, national origin, sex, marital status, age (if applicant has capacity to contract), receipt of public assistance income, exercise of rights under the Consumer Credit Protection Act.\n\n**Key Requirements:**\n- Creditors must notify applicants of action taken within 30 days\n- Must provide specific reasons for adverse action or right to request reasons\n- Cannot discourage applications on prohibited bases\n- Cannot ask about marital status on individual unsecured credit applications\n\n**Regulation B** implements ECOA with detailed rules on application procedures, evaluation, and notifications.\n\n**Statute of Limitations:** 2 years from date of violation (5 years for government enforcement).\n**Damages:** Actual damages + punitive damages up to $10,000 individual / $500,000 class action + attorney fees." },
        { title: "Servicemembers Civil Relief Act (SCRA)", category: "federal_statute" as const, citation: "50 U.S.C. §§ 3901-4043", subcategory: "Military Protection", jurisdiction: "Federal", tags: ["military", "servicemember", "protection"], summary: "Provides protections for military members as they enter active duty, including interest rate caps and eviction protections.", content: "The SCRA provides a wide range of protections for active-duty servicemembers.\n\n**§3937 - Interest Rate Cap:** Pre-service debts are capped at 6% interest during active duty. Creditor must forgive (not defer) the excess interest.\n\n**§3951 - Eviction Protection:** Landlords cannot evict servicemembers or their dependents from rental housing during military service without a court order (applies to rent under certain thresholds).\n\n**§3931 - Stay of Proceedings:** Courts must grant a minimum 90-day stay of civil proceedings when a servicemember's military duty materially affects their ability to appear.\n\n**§3953 - Mortgage Protections:** Foreclosure protections during service and up to 1 year after.\n\n**Damages:** Varies by provision. Willful violations may result in criminal penalties." },
        { title: "Consumer Financial Protection Bureau (CFPB) Complaint Process", category: "legal_guide" as const, citation: "12 U.S.C. § 5534", subcategory: "Consumer Protection", jurisdiction: "Federal", tags: ["cfpb", "complaint", "consumer", "guide"], summary: "Guide to filing effective complaints with the CFPB against financial institutions.", content: "The CFPB accepts complaints about consumer financial products and services.\n\n**Products Covered:** Credit cards, mortgages, bank accounts, student loans, auto loans, payday loans, credit reporting, debt collection, money transfers.\n\n**How to File:**\n1. Go to consumerfinance.gov/complaint\n2. Select the product type\n3. Describe the issue in detail\n4. Include dates, amounts, and names\n5. Attach supporting documents\n6. State your desired resolution\n\n**What Happens Next:**\n- CFPB forwards complaint to the company\n- Company has 15 days to respond\n- Company has 60 days to close the complaint\n- CFPB publishes complaint data in its public database\n\n**Tips:** Be specific and factual. Reference specific laws violated. Include account numbers. Request specific relief." },
        { title: "Federal Rules of Civil Procedure - Rule 56", category: "procedural_rule" as const, citation: "Fed. R. Civ. P. 56", subcategory: "Federal Procedure", jurisdiction: "Federal", tags: ["procedure", "summary judgment", "motion"], summary: "Governs motions for summary judgment in federal civil cases.", content: "Rule 56 allows a party to move for summary judgment on all or part of a claim or defense.\n\n**Standard:** The court shall grant summary judgment if the movant shows that there is no genuine dispute as to any material fact and the movant is entitled to judgment as a matter of law.\n\n**Rule 56(a)** - Motion: A party may move for summary judgment at any time until 30 days after close of discovery.\n\n**Rule 56(c)** - Supporting facts: A party asserting a fact must support it with citations to depositions, documents, affidavits, or other materials.\n\n**Rule 56(d)** - If nonmovant shows by affidavit that it cannot present essential facts to justify opposition, court may defer or deny the motion, allow discovery, or issue other appropriate order.\n\n**Rule 56(e)** - If a party fails to properly address another party's assertion of fact, the court may consider the fact undisputed." },
        { title: "Federal Rules of Civil Procedure - Rule 33", category: "procedural_rule" as const, citation: "Fed. R. Civ. P. 33", subcategory: "Federal Procedure", jurisdiction: "Federal", tags: ["procedure", "discovery", "interrogatories"], summary: "Governs interrogatories to parties in federal civil cases.", content: "Rule 33 allows parties to serve written interrogatories on other parties.\n\n**Rule 33(a)(1)** - Number: Unless otherwise stipulated or ordered, a party may serve no more than 25 written interrogatories, including all discrete subparts.\n\n**Rule 33(b)(2)** - Time to respond: The responding party must serve answers and objections within 30 days after being served.\n\n**Rule 33(b)(3)** - Each interrogatory must be answered separately and fully in writing under oath.\n\n**Rule 33(d)** - Business records option: If the answer can be determined from business records and the burden of deriving the answer is substantially the same for either party, the responding party may specify the records to be examined." },
        { title: "Federal Rules of Civil Procedure - Rule 34", category: "procedural_rule" as const, citation: "Fed. R. Civ. P. 34", subcategory: "Federal Procedure", jurisdiction: "Federal", tags: ["procedure", "discovery", "documents", "production"], summary: "Governs requests for production of documents, electronically stored information, and tangible things.", content: "Rule 34 allows parties to request production of documents and other materials.\n\n**Rule 34(a)** - Scope: A party may serve a request to produce documents, electronically stored information (ESI), or tangible things within the scope of Rule 26(b).\n\n**Rule 34(b)(2)(A)** - Time to respond: The party to whom the request is directed must respond in writing within 30 days after being served.\n\n**Rule 34(b)(2)(B)** - For each item, the response must either state that inspection is permitted or state an objection with specificity.\n\n**Rule 34(b)(2)(E)** - Producing documents: A party must produce documents as they are kept in the usual course of business or organize and label them to correspond to the categories in the request." },
        { title: "Federal Rules of Civil Procedure - Rule 30", category: "procedural_rule" as const, citation: "Fed. R. Civ. P. 30", subcategory: "Federal Procedure", jurisdiction: "Federal", tags: ["procedure", "discovery", "deposition"], summary: "Governs depositions by oral examination in federal civil cases.", content: "Rule 30 establishes procedures for taking depositions by oral examination.\n\n**Rule 30(a)(1)** - A party may depose any person, including a party, without leave of court except as provided in Rule 30(a)(2).\n\n**Rule 30(a)(2)** - Leave of court required if: parties have not stipulated and the deposition would result in more than 10 depositions per side, the deponent has already been deposed, or the party seeks to take before the Rule 26(d) discovery period.\n\n**Rule 30(b)(1)** - Notice: Reasonable written notice must be given to every other party, stating time and place and name/address of deponent.\n\n**Rule 30(d)(1)** - Duration: Unless otherwise stipulated or ordered, a deposition is limited to 1 day of 7 hours.\n\n**Rule 30(d)(2)** - Court may impose sanctions on person who impedes, delays, or frustrates the fair examination of the deponent." },
        { title: "FDCPA - Cease and Desist Rights", category: "legal_guide" as const, citation: "15 U.S.C. § 1692c(c)", subcategory: "Consumer Protection", jurisdiction: "Federal", tags: ["debt", "cease", "desist", "guide"], summary: "Guide to exercising your right to stop debt collector communications under the FDCPA.", content: "Under §1692c(c), you have the right to demand a debt collector stop contacting you.\n\n**How It Works:**\n1. Send a written notice to the collector stating you refuse to pay the debt or that you want the collector to cease further communication\n2. After receiving your letter, the collector may only contact you to: advise that collection efforts are being terminated, notify you of specific remedies the collector may invoke\n\n**Important Considerations:**\n- This does NOT eliminate the debt\n- The collector can still sue you\n- Send via certified mail with return receipt requested\n- Keep a copy for your records\n\n**Template Language:** 'I am writing to exercise my rights under 15 U.S.C. § 1692c(c). I demand that you cease all further communication with me regarding the alleged debt referenced above. Any further communication, except as specifically permitted by law, will be considered a violation of the FDCPA.'" },
        { title: "FCRA - 623 Dispute Process (Direct Furnisher Disputes)", category: "legal_guide" as const, citation: "15 U.S.C. § 1681s-2(b)", subcategory: "Consumer Protection", jurisdiction: "Federal", tags: ["credit", "dispute", "furnisher", "guide"], summary: "Guide to disputing inaccurate credit information directly with data furnishers under FCRA Section 623.", content: "Section 623 of the FCRA creates obligations for companies that furnish information to credit bureaus.\n\n**Two-Step Process:**\n\n**Step 1 - Dispute with CRA (Required First):**\nFile a dispute with the credit reporting agency (Equifax, Experian, TransUnion). This triggers the CRA's duty to investigate under §1681i.\n\n**Step 2 - Furnisher Investigation:**\nOnce the CRA forwards your dispute, the furnisher must:\n- Conduct an investigation\n- Review all relevant information provided by the CRA\n- Report results to the CRA\n- If information is inaccurate, report the correction to all CRAs\n\n**Key Point:** You cannot sue a furnisher under §1681s-2(b) unless you first disputed through a CRA. Direct disputes to the furnisher under §1681s-2(a) do not create a private right of action.\n\n**Damages:** Actual damages, statutory damages $100-$1,000, punitive damages, and attorney fees." },
        { title: "Small Claims Court Guide", category: "legal_guide" as const, citation: "N/A", subcategory: "Procedure", jurisdiction: "State", tags: ["small claims", "court", "guide", "pro se"], summary: "Comprehensive guide to filing and winning in small claims court as a pro se litigant.", content: "Small claims court is designed for individuals to resolve disputes without attorneys.\n\n**Typical Limits:** $2,500 to $25,000 depending on state (most common: $5,000-$10,000).\n\n**Steps to File:**\n1. Determine the correct court (where defendant lives or where incident occurred)\n2. Complete the claim form with defendant's full legal name and address\n3. Pay the filing fee ($30-$100 typically)\n4. Serve the defendant (usually by certified mail or process server)\n5. Prepare your evidence and organize chronologically\n6. Attend the hearing\n\n**Preparation Tips:**\n- Bring 3 copies of all documents (judge, defendant, yourself)\n- Organize evidence chronologically\n- Prepare a brief opening statement (2-3 minutes)\n- Practice explaining your case clearly and concisely\n- Bring witnesses if possible\n- Dress professionally\n\n**After Judgment:** If you win, the defendant typically has 30 days to pay or appeal. If they don't pay, you may need to pursue collection through garnishment or liens." },
        { title: "Unfair and Deceptive Acts and Practices (UDAP)", category: "federal_statute" as const, citation: "15 U.S.C. § 45(a)", subcategory: "Consumer Protection", jurisdiction: "Federal/State", tags: ["udap", "unfair", "deceptive", "consumer"], summary: "Overview of federal and state UDAP laws that prohibit unfair or deceptive business practices.", content: "UDAP laws exist at both federal and state levels to protect consumers from unfair business practices.\n\n**Federal (FTC Act § 5):** Prohibits unfair or deceptive acts or practices in commerce. Enforced by the FTC (no private right of action under federal law).\n\n**State UDAP Laws:** Every state has its own UDAP statute (often called 'consumer protection act' or 'deceptive trade practices act'). Most state laws DO provide a private right of action.\n\n**What Makes an Act 'Unfair':**\n- Causes substantial injury to consumers\n- Not reasonably avoidable by consumers\n- Not outweighed by countervailing benefits\n\n**What Makes an Act 'Deceptive':**\n- A representation, omission, or practice misleads or is likely to mislead the consumer\n- The consumer's interpretation is reasonable under the circumstances\n- The misleading representation is material\n\n**State Damages:** Many states provide treble (3x) damages, minimum statutory damages, and attorney fees. Some states require a demand letter before filing suit." },
        { title: "Statute of Limitations Quick Reference", category: "legal_guide" as const, citation: "N/A", subcategory: "Procedure", jurisdiction: "Federal/State", tags: ["statute of limitations", "deadlines", "guide"], summary: "Quick reference guide for common statute of limitations periods in consumer law cases.", content: "**Federal Consumer Statutes:**\n- FDCPA: 1 year from violation\n- FCRA: 2 years from discovery, 5 years from violation\n- TILA: 1 year for damages, 3 years for rescission\n- RESPA: 1-3 years depending on violation\n- TCPA: 4 years (federal) or state SOL\n- ECOA: 2 years from violation\n\n**State Debt Collection SOL (Common):**\n- Written contracts: 3-10 years (varies by state)\n- Oral contracts: 2-6 years\n- Promissory notes: 3-15 years\n- Open accounts (credit cards): 3-10 years\n\n**Important Notes:**\n- SOL may be tolled (paused) for various reasons\n- Making a payment can restart the SOL in many states\n- Acknowledging the debt in writing may restart the SOL\n- The SOL for the underlying debt is different from the SOL for suing under consumer protection statutes\n- Always check your specific state's laws" },
        { title: "How to File a CFPB Complaint Effectively", category: "legal_guide" as const, citation: "N/A", subcategory: "Consumer Protection", jurisdiction: "Federal", tags: ["cfpb", "complaint", "strategy", "guide"], summary: "Strategic guide to filing CFPB complaints that get results.", content: "Filing an effective CFPB complaint requires strategy and documentation.\n\n**Before Filing:**\n1. Gather all relevant documents (statements, letters, call logs)\n2. Create a timeline of events\n3. Identify specific laws that were violated\n4. Document your attempts to resolve the issue directly\n\n**Writing the Complaint:**\n- Lead with the most serious violation\n- Be specific: include dates, amounts, names\n- Reference specific laws (e.g., 'This violates 15 U.S.C. § 1692e')\n- Describe the harm you've suffered\n- State exactly what resolution you want\n\n**After Filing:**\n- Monitor your complaint status online\n- Respond promptly to any company responses\n- If unsatisfied, dispute the company's response\n- Consider filing with your state attorney general simultaneously\n\n**Pro Tip:** Companies take CFPB complaints seriously because they affect their regulatory standing. A well-documented complaint often gets better results than phone calls." },
        { title: "Federal Rules of Evidence - Rule 801-803 (Hearsay)", category: "procedural_rule" as const, citation: "Fed. R. Evid. 801-803", subcategory: "Evidence Rules", jurisdiction: "Federal", tags: ["evidence", "hearsay", "rules"], summary: "Key hearsay rules and exceptions for federal court proceedings.", content: "Understanding hearsay is critical for evidence presentation in court.\n\n**Rule 801 - Definition:** Hearsay is a statement that (1) the declarant does not make while testifying at the current trial or hearing, and (2) a party offers in evidence to prove the truth of the matter asserted.\n\n**Rule 801(d) - Not Hearsay:**\n- Prior inconsistent statements given under oath\n- Prior consistent statements offered to rebut charge of fabrication\n- Statements of identification\n- Opposing party's statements (admissions)\n\n**Rule 803 - Exceptions (regardless of declarant availability):**\n- Present sense impression\n- Excited utterance\n- Then-existing mental, emotional, or physical condition\n- Statements for medical diagnosis\n- Recorded recollection\n- Business records (803(6))\n- Public records (803(8))\n- Learned treatises\n\n**Business Records Exception (803(6)):** Most commonly used. Requires: made at or near the time, by someone with knowledge, kept in the regular course of business, as a regular practice. Foundation typically established through a custodian of records." },
        { title: "Motion to Compel Discovery Guide", category: "legal_guide" as const, citation: "Fed. R. Civ. P. 37", subcategory: "Federal Procedure", jurisdiction: "Federal", tags: ["discovery", "motion", "compel", "guide"], summary: "Step-by-step guide to filing a motion to compel when the opposing party fails to respond to discovery.", content: "When the opposing party fails to adequately respond to discovery requests, you may need to file a motion to compel.\n\n**Before Filing (Meet and Confer):**\nRule 37(a)(1) requires that the motion include a certification that the movant has in good faith conferred or attempted to confer with the party failing to respond. Many courts require a formal meet-and-confer letter.\n\n**Steps:**\n1. Send a detailed meet-and-confer letter identifying each deficiency\n2. Allow reasonable time for response (typically 10-14 days)\n3. If unresolved, draft the motion\n4. Include: specific requests at issue, responses received, why responses are inadequate, relevance of requested information\n5. Attach the discovery requests, responses, and meet-and-confer correspondence\n\n**Sanctions (Rule 37(a)(5)):** If the motion is granted, the court must require the party whose conduct necessitated the motion to pay the movant's reasonable expenses including attorney fees, unless the opposing party's position was substantially justified.\n\n**Pro Se Tip:** Courts are generally sympathetic to pro se litigants on discovery motions. Be organized and specific about what you need and why." },
      ];
      const results = [];
      for (const s of statutes) {
        results.push(await db.createLegalResearch(s));
      }
      return { seeded: results.length };
    }),
    bookmarks: router({
      list: protectedProcedure.query(async ({ ctx }) => {
        return db.getResearchBookmarksByUserId(ctx.user.id);
      }),
      create: protectedProcedure
        .input(z.object({ researchId: z.number(), caseId: z.number().optional(), notes: z.string().optional() }))
        .mutation(async ({ ctx, input }) => {
          return db.createResearchBookmark({ ...input, userId: ctx.user.id });
        }),
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await db.deleteResearchBookmark(input.id);
          return { success: true };
        }),
    }),
  }),

  // ============================================================================
  // CALENDAR EXPORT (ICS)
  // ============================================================================
  calendar: router({
    generateIcs: protectedProcedure
      .input(z.object({
        events: z.array(z.object({
          title: z.string(),
          description: z.string().optional(),
          startDate: z.string(),
          endDate: z.string().optional(),
          location: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        const lines: string[] = [
          "BEGIN:VCALENDAR",
          "VERSION:2.0",
          "PRODID:-//SintraPrime//Legal Warfare Platform//EN",
          "CALSCALE:GREGORIAN",
          "METHOD:PUBLISH",
        ];
        for (const event of input.events) {
          const uid = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}@sintraprime`;
          const dtStart = event.startDate.replace(/[-:]/g, "").replace("T", "T").split(".")[0];
          const dtEnd = event.endDate ? event.endDate.replace(/[-:]/g, "").replace("T", "T").split(".")[0] : dtStart;
          lines.push(
            "BEGIN:VEVENT",
            `UID:${uid}`,
            `DTSTART:${dtStart}`,
            `DTEND:${dtEnd}`,
            `SUMMARY:${event.title.replace(/[\n,;]/g, " ")}`,
            event.description ? `DESCRIPTION:${event.description.replace(/\n/g, "\\n").replace(/[,;]/g, " ")}` : "",
            event.location ? `LOCATION:${event.location}` : "",
            `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
            "BEGIN:VALARM",
            "TRIGGER:-P1D",
            "ACTION:DISPLAY",
            `DESCRIPTION:Reminder: ${event.title}`,
            "END:VALARM",
            "BEGIN:VALARM",
            "TRIGGER:-P3D",
            "ACTION:DISPLAY",
            `DESCRIPTION:3 days until: ${event.title}`,
            "END:VALARM",
            "END:VEVENT",
          );
        }
        lines.push("END:VCALENDAR");
        return { icsContent: lines.filter(l => l !== "").join("\r\n") };
      }),
  }),

  // Document version history
  documentVersions: router({
    list: protectedProcedure
      .input(z.object({ documentId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDocumentVersions(input.documentId);
      }),
    create: protectedProcedure
      .input(z.object({
        documentId: z.number(),
        content: z.string(),
        changeSummary: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const versions = await db.getDocumentVersions(input.documentId);
        const versionNumber = versions.length + 1;
        const version = await db.createDocumentVersion({
          documentId: input.documentId,
          userId: ctx.user.id,
          versionNumber,
          content: input.content,
          changeSummary: input.changeSummary,
        });
        return version;
      }),
    restore: protectedProcedure
      .input(z.object({ versionId: z.number(), documentId: z.number() }))
      .mutation(async ({ input }) => {
        const version = await db.getDocumentVersionById(input.versionId);
        if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
        const updated = await db.updateDocument(input.documentId, { content: version.content });
        return updated;
      }),
  }),

  // Case activity feed
  caseActivity: router({
    list: protectedProcedure
      .input(z.object({ caseId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return await db.getCaseActivities(input.caseId, input.limit);
      }),
    create: protectedProcedure
      .input(z.object({
        caseId: z.number(),
        activityType: z.enum([
          "case_created",
          "case_updated",
          "status_changed",
          "document_added",
          "document_updated",
          "evidence_added",
          "note_added",
          "party_added",
          "strategy_added",
          "member_joined",
          "deadline_added",
        ]),
        description: z.string(),
        metadata: z.any().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createCaseActivity({
          caseId: input.caseId,
          userId: ctx.user.id,
          activityType: input.activityType,
          description: input.description,
          metadata: input.metadata,
        });
        return { success: true };
      }),
  }),

  // Bulk case import
  bulkImport: router({
    parseCsv: protectedProcedure
      .input(z.object({ csvContent: z.string() }))
      .mutation(async ({ input }) => {
        const lines = input.csvContent.split("\n").filter(l => l.trim());
        if (lines.length < 2) throw new TRPCError({ code: "BAD_REQUEST", message: "CSV must have headers and at least one row" });
        
        const headers = lines[0].split(",").map(h => h.trim());
        const rows = lines.slice(1).map(line => {
          const values = line.split(",").map(v => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((h, i) => { row[h] = values[i] || ""; });
          return row;
        });
        
        return { headers, rows, count: rows.length };
      }),
    import: protectedProcedure
      .input(z.object({
        cases: z.array(z.object({
          title: z.string(),
          caseNumber: z.string().optional(),
          description: z.string().optional(),
          status: z.enum(["draft", "active", "pending", "won", "lost", "settled", "archived"]).optional(),
          caseType: z.string().optional(),
          priority: z.enum(["low", "medium", "high", "critical"]).optional(),
          jurisdiction: z.string().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const imported = [];
        for (const caseData of input.cases) {
          const caseId = await db.createCase({
            userId: ctx.user.id,
            title: caseData.title,
            caseNumber: caseData.caseNumber,
            description: caseData.description,
            status: caseData.status || "draft",
            caseType: caseData.caseType,
            priority: caseData.priority || "medium",
            jurisdiction: caseData.jurisdiction,
          });
          imported.push(caseId);
        }
        return { success: true, count: imported.length, caseIds: imported };
      }),
  }),

  // ============================================================================
  // WORKSPACES & TEAM COLLABORATION
  // ============================================================================
  
  // ============================================================================
  // AUTONOMOUS AGENT SYSTEM
  // ============================================================================
  
  agent: agentRouter,
  contracts: contractRouter,
  trusts: trustRouter,
  workspaceBookmarks: workspaceBookmarkRouter,
  collections: collectionRouter,
  nanobot: nanobotRouter,
  aiChat: aiChatRouter,
  documentComparison: documentComparisonRouter,
  caseTemplates: caseTemplatesRouter,
  
  // ============================================================================
  // WORKSPACE MANAGEMENT
  // ============================================================================
  
  workspaces: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        return await db.getWorkspacesByUserId(ctx.user.id);
      }),
    
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getWorkspaceById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.createWorkspace({
          name: input.name,
          description: input.description || null,
          ownerId: ctx.user.id,
        });
        return { success: true };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateWorkspace(input.id, {
          name: input.name,
          description: input.description,
        });
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteWorkspace(input.id);
        return { success: true };
      }),
    
    // Team members
    members: router({
      list: protectedProcedure
        .input(z.object({ workspaceId: z.number() }))
        .query(async ({ input }) => {
          return await db.getTeamMembersByWorkspaceId(input.workspaceId);
        }),
      
      add: protectedProcedure
        .input(z.object({
          workspaceId: z.number(),
          userId: z.number(),
          role: z.enum(["owner", "attorney", "paralegal", "client"]),
          permissions: z.array(z.string()).optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          await db.addTeamMember({
            workspaceId: input.workspaceId,
            userId: input.userId,
            role: input.role,
            permissions: input.permissions || null,
            invitedBy: ctx.user.id,
          });
          return { success: true };
        }),
      
      updateRole: protectedProcedure
        .input(z.object({
          id: z.number(),
          role: z.string(),
          permissions: z.array(z.string()).optional(),
        }))
        .mutation(async ({ input }) => {
          await db.updateTeamMemberRole(input.id, input.role, input.permissions);
          return { success: true };
        }),
      
      remove: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          await db.removeTeamMember(input.id);
          return { success: true };
        }),
    }),
    
    // Workspace cases
    cases: router({
      list: protectedProcedure
        .input(z.object({ workspaceId: z.number() }))
        .query(async ({ input }) => {
          return await db.getWorkspaceCases(input.workspaceId);
        }),
      
      add: protectedProcedure
        .input(z.object({
          workspaceId: z.number(),
          caseId: z.number(),
        }))
        .mutation(async ({ input, ctx }) => {
          await db.addCaseToWorkspace({
            workspaceId: input.workspaceId,
            caseId: input.caseId,
            addedBy: ctx.user.id,
          });
          return { success: true };
        }),
      
      remove: protectedProcedure
        .input(z.object({
          workspaceId: z.number(),
          caseId: z.number(),
        }))
        .mutation(async ({ input }) => {
          await db.removeCaseFromWorkspace(input.workspaceId, input.caseId);
          return { success: true };
        }),
    }),
  }),

  // ============================================================================
  // TERMINAL
  // ============================================================================
  
  terminal: router({
    execute: protectedProcedure
      .input(z.object({ command: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const cmd = input.command.trim().toLowerCase();
        const args = input.command.trim().split(" ").slice(1);

        try {
          // Parse command
          if (cmd === "help" || cmd === "?") {
            return {
              success: true,
              output: `Available Commands:\n\nCase Management:\n  cases list              - List all your cases\n  cases show <id>         - Show details of a specific case\n  cases create <title>    - Create a new case\n  cases delete <id>       - Delete a case\n\nDocument Management:\n  documents list          - List all documents\n  documents show <id>     - Show document details\n  documents search <term> - Search documents\n\nEvidence Management:\n  evidence list           - List all evidence\n  evidence show <id>      - Show evidence details\n\nSystem:\n  stats                   - Show system statistics\n  whoami                  - Show current user info\n  clear                   - Clear terminal (client-side)\n  help                    - Show this help message`,
            };
          }

          if (cmd === "whoami") {
            return {
              success: true,
              output: `User: ${ctx.user.name}\nEmail: ${ctx.user.email}\nID: ${ctx.user.id}\nRole: ${ctx.user.role}`,
            };
          }

          if (cmd === "stats") {
            const cases = await db.getCasesByUserId(ctx.user.id);
            const documents = await db.getDocumentsByUserId(ctx.user.id);
            const evidence = await db.getEvidenceByUserId(ctx.user.id);
            return {
              success: true,
              output: `System Statistics:\n\nCases: ${cases.length}\nDocuments: ${documents.length}\nEvidence: ${evidence.length}\n\nLast Login: ${new Date().toLocaleString()}`,
            };
          }

          if (cmd.startsWith("cases")) {
            const subCmd = args[0];
            
            if (subCmd === "list" || !subCmd) {
              const cases = await db.getCasesByUserId(ctx.user.id);
              if (cases.length === 0) {
                return { success: true, output: "No cases found. Use 'cases create <title>' to create one." };
              }
              const output = cases.map(c => 
                `[${c.id}] ${c.title} (${c.status}) - ${c.caseType}`
              ).join("\n");
              return { success: true, output: `Cases (${cases.length}):\n\n${output}` };
            }

            if (subCmd === "show") {
              const id = parseInt(args[1]);
              if (isNaN(id)) {
                return { success: false, output: "Error: Invalid case ID. Usage: cases show <id>" };
              }
              const caseData = await db.getCaseById(id);
              if (!caseData || caseData.userId !== ctx.user.id) {
                return { success: false, output: `Error: Case #${id} not found.` };
              }
              return {
                success: true,
                output: `Case #${caseData.id}: ${caseData.title}\n\nStatus: ${caseData.status}\nType: ${caseData.caseType}\nPriority: ${caseData.priority}\nJurisdiction: ${caseData.jurisdiction || "N/A"}\nCase Number: ${caseData.caseNumber || "N/A"}\n\nDescription:\n${caseData.description || "No description"}`,
              };
            }

            if (subCmd === "create") {
              const title = args.slice(1).join(" ");
              if (!title) {
                return { success: false, output: "Error: Title required. Usage: cases create <title>" };
              }
              const caseId = await db.createCase({
                userId: ctx.user.id,
                title,
                status: "draft",
                caseType: "consumer_protection",
                priority: "medium",
              });
              return { success: true, output: `✓ Case #${caseId} created: ${title}` };
            }

            if (subCmd === "delete") {
              const id = parseInt(args[1]);
              if (isNaN(id)) {
                return { success: false, output: "Error: Invalid case ID. Usage: cases delete <id>" };
              }
              const caseData = await db.getCaseById(id);
              if (!caseData || caseData.userId !== ctx.user.id) {
                return { success: false, output: `Error: Case #${id} not found.` };
              }
              await db.deleteCase(id);
              return { success: true, output: `✓ Case #${id} deleted.` };
            }

            return { success: false, output: `Error: Unknown subcommand '${subCmd}'. Try 'help' for available commands.` };
          }

          if (cmd.startsWith("documents")) {
            const subCmd = args[0];
            
            if (subCmd === "list" || !subCmd) {
              const docs = await db.getDocumentsByUserId(ctx.user.id);
              if (docs.length === 0) {
                return { success: true, output: "No documents found." };
              }
              const output = docs.map(d => 
                `[${d.id}] ${d.title} (${d.documentType}) - ${new Date(d.createdAt).toLocaleDateString()}`
              ).join("\n");
              return { success: true, output: `Documents (${docs.length}):\n\n${output}` };
            }

            if (subCmd === "show") {
              const id = parseInt(args[1]);
              if (isNaN(id)) {
                return { success: false, output: "Error: Invalid document ID. Usage: documents show <id>" };
              }
              const doc = await db.getDocumentById(id);
              if (!doc || doc.userId !== ctx.user.id) {
                return { success: false, output: `Error: Document #${id} not found.` };
              }
              const contentPreview = doc.content ? doc.content.substring(0, 200) : "";
              return {
                success: true,
                output: `Document #${doc.id}: ${doc.title}\n\nType: ${doc.documentType}\nCreated: ${new Date(doc.createdAt).toLocaleString()}\nCase ID: ${doc.caseId || "N/A"}\n\nContent Preview:\n${contentPreview}${doc.content && doc.content.length > 200 ? "..." : ""}`,
              };
            }

            if (subCmd === "search") {
              const term = args.slice(1).join(" ");
              if (!term) {
                return { success: false, output: "Error: Search term required. Usage: documents search <term>" };
              }
              const docs = await db.getDocumentsByUserId(ctx.user.id);
              const results = docs.filter(d => 
                d.title.toLowerCase().includes(term.toLowerCase()) ||
                (d.content && d.content.toLowerCase().includes(term.toLowerCase()))
              );
              if (results.length === 0) {
                return { success: true, output: `No documents found matching '${term}'.` };
              }
              const output = results.map(d => 
                `[${d.id}] ${d.title} (${d.documentType})`
              ).join("\n");
              return { success: true, output: `Search Results (${results.length}):\n\n${output}` };
            }

            return { success: false, output: `Error: Unknown subcommand '${subCmd}'. Try 'help' for available commands.` };
          }

          if (cmd.startsWith("evidence")) {
            const subCmd = args[0];
            
            if (subCmd === "list" || !subCmd) {
              const evidence = await db.getEvidenceByUserId(ctx.user.id);
              if (evidence.length === 0) {
                return { success: true, output: "No evidence found." };
              }
              const output = evidence.map((e: any) => 
                `[${e.id}] ${e.title} (${e.evidenceType}) - ${new Date(e.createdAt).toLocaleDateString()}`
              ).join("\n");
              return { success: true, output: `Evidence (${evidence.length}):\n\n${output}` };
            }

            if (subCmd === "show") {
              const id = parseInt(args[1]);
              if (isNaN(id)) {
                return { success: false, output: "Error: Invalid evidence ID. Usage: evidence show <id>" };
              }
              const ev = await db.getEvidenceById(id);
              if (!ev || ev.userId !== ctx.user.id) {
                return { success: false, output: `Error: Evidence #${id} not found.` };
              }
              return {
                success: true,
                output: `Evidence #${ev.id}: ${ev.title}\n\nType: ${ev.evidenceType}\nCreated: ${new Date(ev.createdAt).toLocaleString()}\nCase ID: ${ev.caseId}\nFile: ${ev.fileUrl || "N/A"}\n\nDescription:\n${ev.description || "No description"}`,
              };
            }

            return { success: false, output: `Error: Unknown subcommand '${subCmd}'. Try 'help' for available commands.` };
          }

          // Unknown command
          return {
            success: false,
            output: `Error: Unknown command '${cmd}'. Type 'help' for available commands.`,
          };
        } catch (error) {
          const errorOutput = `Error: ${error instanceof Error ? error.message : "Unknown error occurred"}`;
          // Save to history
          await db.saveTerminalCommand({
            userId: ctx.user.id,
            command: input.command,
            output: errorOutput,
            success: false,
          });
          return {
            success: false,
            output: errorOutput,
          };
        } finally {
          // Save successful commands to history (if not already saved in error handler)
          // This is a simplified approach - in production you'd want to save after each command
        }
      }),
    history: protectedProcedure
      .input(z.object({ limit: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        return await db.getTerminalHistory(ctx.user.id, input.limit);
      }),
    search: protectedProcedure
      .input(z.object({ term: z.string(), limit: z.number().optional() }))
      .query(async ({ input, ctx }) => {
        return await db.searchTerminalHistory(ctx.user.id, input.term, input.limit);
      }),
    clear: protectedProcedure
      .mutation(async ({ ctx }) => {
        await db.clearTerminalHistory(ctx.user.id);
        return { success: true };
      }),
  }),
});
export type AppRouter = typeof appRouter;

// ============================================================================
// FILING CHECKLIST GENERATOR
// ============================================================================

function generateChecklistItems(caseType: string, jurisdiction: string, court?: string) {
  const items: Array<{
    id: string; step: number; title: string; description: string;
    category: string; isRequired: boolean; isCompleted: boolean;
    estimatedFee?: string; notes?: string;
    links?: Array<{ title: string; url: string }>;
  }> = [];
  let step = 1;

  const addItem = (title: string, description: string, category: string, isRequired: boolean, opts?: { fee?: string; notes?: string; links?: Array<{ title: string; url: string }> }) => {
    items.push({
      id: `item-${step}`,
      step,
      title,
      description,
      category,
      isRequired,
      isCompleted: false,
      estimatedFee: opts?.fee,
      notes: opts?.notes,
      links: opts?.links,
    });
    step++;
  };

  // Common pre-filing steps
  addItem("Research applicable laws", `Research ${caseType} statutes and regulations applicable in ${jurisdiction}`, "research", true);
  addItem("Gather evidence", "Collect all relevant documents, correspondence, and records", "documents", true);
  addItem("Identify correct court", `Determine the correct ${court || "court"} for filing in ${jurisdiction}`, "procedures", true);

  // Case-type specific items
  switch (caseType.toUpperCase()) {
    case "FDCPA":
      addItem("Send Debt Validation Letter", "Send a written request for debt validation within 30 days of initial contact", "documents", true, {
        notes: "Must be sent within 30 days of first communication from debt collector",
        links: [{ title: "FDCPA Text", url: "https://www.ftc.gov/legal-library/browse/statutes/fair-debt-collection-practices-act" }],
      });
      addItem("Document all collector communications", "Log dates, times, and content of all communications with debt collector", "documents", true);
      addItem("Obtain credit reports", "Pull credit reports from all three bureaus to document reported debts", "documents", true, {
        links: [{ title: "AnnualCreditReport.com", url: "https://www.annualcreditreport.com" }],
      });
      addItem("Calculate damages", "Document actual damages, statutory damages (up to $1,000), and attorney fees", "research", true, {
        notes: "FDCPA allows up to $1,000 in statutory damages per lawsuit",
      });
      addItem("Draft complaint", "Prepare the complaint citing specific FDCPA violations (15 U.S.C. § 1692)", "documents", true);
      addItem("File complaint with court", `File the complaint with ${court || "the appropriate court"} in ${jurisdiction}`, "procedures", true, {
        fee: jurisdiction.toLowerCase().includes("federal") ? "$405" : "$75-$300",
      });
      addItem("Serve the defendant", "Arrange for proper service of process on the debt collector", "procedures", true, {
        fee: "$50-$150",
      });
      addItem("File CFPB complaint", "Submit a complaint to the Consumer Financial Protection Bureau", "procedures", false, {
        links: [{ title: "CFPB Complaint Portal", url: "https://www.consumerfinance.gov/complaint/" }],
      });
      addItem("File FTC complaint", "Submit a complaint to the Federal Trade Commission", "procedures", false, {
        links: [{ title: "FTC Complaint Assistant", url: "https://reportfraud.ftc.gov/" }],
      });
      addItem("File state AG complaint", `File a complaint with the ${jurisdiction} Attorney General's office`, "procedures", false);
      break;

    case "FCRA":
      addItem("Obtain credit reports", "Request credit reports from Equifax, Experian, and TransUnion", "documents", true, {
        links: [{ title: "AnnualCreditReport.com", url: "https://www.annualcreditreport.com" }],
      });
      addItem("Identify inaccuracies", "Document all inaccurate, incomplete, or unverifiable information", "documents", true);
      addItem("Send dispute letters to CRAs", "Send written disputes to each credit reporting agency with inaccurate information", "documents", true, {
        notes: "CRAs have 30 days to investigate (45 if you provide additional info)",
      });
      addItem("Send dispute to data furnisher", "Send a direct dispute to the company furnishing the inaccurate information", "documents", true);
      addItem("Wait for investigation results", "Allow 30-45 days for investigation and response", "procedures", true);
      addItem("Document failure to correct", "If errors persist, document the failure to investigate or correct", "documents", true);
      addItem("Calculate damages", "Document actual damages and potential statutory damages ($100-$1,000 per violation)", "research", true);
      addItem("Draft complaint", "Prepare complaint citing FCRA violations (15 U.S.C. § 1681)", "documents", true);
      addItem("File complaint with court", `File the complaint with ${court || "the appropriate court"} in ${jurisdiction}`, "procedures", true, {
        fee: jurisdiction.toLowerCase().includes("federal") ? "$405" : "$75-$300",
      });
      addItem("Serve defendants", "Serve both the CRA and data furnisher", "procedures", true, { fee: "$50-$150 per defendant" });
      addItem("File CFPB complaint", "Submit a complaint to the CFPB", "procedures", false, {
        links: [{ title: "CFPB Complaint Portal", url: "https://www.consumerfinance.gov/complaint/" }],
      });
      break;

    case "TILA":
      addItem("Obtain loan documents", "Gather all loan agreements, disclosures, and closing documents", "documents", true);
      addItem("Review disclosure requirements", "Check if all required TILA disclosures were provided", "research", true, {
        links: [{ title: "TILA Requirements", url: "https://www.consumerfinance.gov/rules-policy/regulations/1026/" }],
      });
      addItem("Check rescission rights", "Determine if the 3-day right of rescission applies and was properly disclosed", "research", true, {
        notes: "Right of rescission extends to 3 years if not properly disclosed",
      });
      addItem("Calculate APR accuracy", "Verify the disclosed APR is within tolerance (1/8 of 1% for regular, 1/4 for irregular)", "research", true);
      addItem("Document TILA violations", "List all specific TILA violations found", "documents", true);
      addItem("Send rescission notice (if applicable)", "Send written notice of rescission to the creditor", "documents", false);
      addItem("Draft complaint", "Prepare complaint citing specific TILA violations (15 U.S.C. § 1601)", "documents", true);
      addItem("File complaint with court", `File the complaint with ${court || "the appropriate court"} in ${jurisdiction}`, "procedures", true, {
        fee: jurisdiction.toLowerCase().includes("federal") ? "$405" : "$75-$300",
      });
      addItem("Serve the defendant", "Arrange for proper service of process", "procedures", true, { fee: "$50-$150" });
      break;

    case "RESPA":
      addItem("Gather mortgage documents", "Collect all mortgage-related documents, including GFE, HUD-1, and servicing records", "documents", true);
      addItem("Review settlement statement", "Compare Good Faith Estimate with final HUD-1 settlement statement", "research", true);
      addItem("Check for kickbacks", "Investigate potential kickback or fee-splitting arrangements", "research", true);
      addItem("Review escrow account", "Verify proper escrow account management and annual statements", "research", true);
      addItem("Send Qualified Written Request", "Send a QWR to the loan servicer requesting account information", "documents", true, {
        notes: "Servicer must acknowledge within 5 business days and respond within 30",
      });
      addItem("Document RESPA violations", "List all specific RESPA violations found", "documents", true);
      addItem("Draft complaint", "Prepare complaint citing RESPA violations (12 U.S.C. § 2601)", "documents", true);
      addItem("File complaint with court", `File the complaint in ${jurisdiction}`, "procedures", true, {
        fee: jurisdiction.toLowerCase().includes("federal") ? "$405" : "$75-$300",
      });
      addItem("Serve the defendant", "Arrange for proper service of process", "procedures", true, { fee: "$50-$150" });
      addItem("File HUD complaint", "Submit a complaint to HUD", "procedures", false, {
        links: [{ title: "HUD Complaint", url: "https://www.hud.gov/program_offices/housing/sfh/res/rescomplaints" }],
      });
      break;

    default:
      // Generic civil litigation checklist
      addItem("Consult with attorney", "Discuss your case with a licensed attorney to evaluate merits", "research", true);
      addItem("Gather all relevant documents", "Collect contracts, correspondence, receipts, and other evidence", "documents", true);
      addItem("Identify all parties", "Determine all potential defendants and their correct legal names", "research", true);
      addItem("Check statute of limitations", `Verify the statute of limitations for your claim in ${jurisdiction}`, "research", true);
      addItem("Draft complaint/petition", "Prepare the initial pleading document", "documents", true);
      addItem("Calculate filing fees", `Determine filing fees for ${court || "the court"} in ${jurisdiction}`, "fees", true, {
        fee: "$75-$500 depending on jurisdiction and claim amount",
      });
      addItem("File with the court", `File the complaint with ${court || "the appropriate court"}`, "procedures", true);
      addItem("Serve the defendant", "Arrange for proper service of process within the required timeframe", "procedures", true, { fee: "$50-$150" });
      addItem("Prepare for defendant's response", "Be ready to respond to motions to dismiss or answers within 21 days", "procedures", true);
      addItem("Plan discovery strategy", "Prepare interrogatories, document requests, and deposition notices", "research", false);
      break;
  }

  // Common post-filing steps
  addItem("Track all deadlines", "Use the SintraPrime Deadline Calculator to track all filing and response deadlines", "procedures", true);
  addItem("Maintain case file", "Keep organized records of all filings, correspondence, and evidence", "documents", true);

  return items;
}

// Add new routers to appRouter
// Note: Agent router is added below
