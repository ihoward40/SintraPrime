import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as contractDb from "./db";
import { invokeLLM } from "../_core/llm";

export const contractRouter = router({
  // ============================================================================
  // CONTRACT TEMPLATES
  // ============================================================================

  // Get all contract templates
  getTemplates: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.user?.id;
    return await contractDb.getContractTemplates(userId);
  }),

  // Get template by ID
  getTemplateById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await contractDb.getContractTemplateById(input.id);
    }),

  // ============================================================================
  // CONTRACT DRAFTING
  // ============================================================================

  // Create contract from template
  createFromTemplate: protectedProcedure
    .input(
      z.object({
        templateId: z.number(),
        caseId: z.number().optional(),
        title: z.string(),
        parties: z.array(z.string()),
        placeholderValues: z.record(z.string(), z.string()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await contractDb.createContractFromTemplate({
        templateId: input.templateId,
        caseId: input.caseId,
        title: input.title,
        parties: input.parties,
        placeholderValues: input.placeholderValues as Record<string, string>,
        userId: ctx.user.id,
      });
    }),

  // Get AI suggestions for contract clauses
  suggestClauses: protectedProcedure
    .input(
      z.object({
        contractType: z.string(),
        context: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are a legal contract drafting assistant. Suggest relevant clauses for ${input.contractType} contracts based on the provided context. Return a JSON array of clauses with: title, content, category, riskLevel.`,
          },
          {
            role: "user",
            content: `Contract type: ${input.contractType}\n\nContext: ${input.context}\n\nSuggest 5-7 relevant clauses.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "clause_suggestions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                clauses: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      content: { type: "string" },
                      category: { type: "string" },
                      riskLevel: { type: "string", enum: ["low", "medium", "high"] },
                    },
                    required: ["title", "content", "category", "riskLevel"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["clauses"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      const result = JSON.parse(typeof content === 'string' ? content : '{}');
      return result.clauses || [];
    }),

  // ============================================================================
  // CONTRACT MANAGEMENT
  // ============================================================================

  // Get user's contracts
  getContracts: protectedProcedure.query(async ({ ctx }) => {
    return await contractDb.getContractsByUserId(ctx.user.id);
  }),

  // Get contract by ID
  getContractById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return await contractDb.getContractById(input.id);
    }),

  // Update contract
  updateContract: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        status: z.enum(["draft", "under_review", "negotiation", "executed", "terminated"]).optional(),
        effectiveDate: z.date().optional(),
        expirationDate: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await contractDb.updateContract(id, data);
    }),

  // ============================================================================
  // CONTRACT REVIEW
  // ============================================================================

  // Analyze contract with AI
  analyzeContract: protectedProcedure
    .input(
      z.object({
        contractId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const contract = await contractDb.getContractById(input.contractId);
      if (!contract) throw new Error("Contract not found");

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "You are a legal contract review assistant. Analyze the contract and provide: risk score (0-100), key obligations, potential risks, missing clauses, and recommendations.",
          },
          {
            role: "user",
            content: `Contract Title: ${contract.title}\nType: ${contract.contractType}\n\nContent:\n${contract.content}\n\nProvide detailed analysis.`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "contract_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                riskScore: { type: "number" },
                keyObligations: {
                  type: "array",
                  items: { type: "string" },
                },
                potentialRisks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      risk: { type: "string" },
                      severity: { type: "string", enum: ["low", "medium", "high"] },
                      recommendation: { type: "string" },
                    },
                    required: ["risk", "severity", "recommendation"],
                    additionalProperties: false,
                  },
                },
                missingClauses: {
                  type: "array",
                  items: { type: "string" },
                },
                recommendations: {
                  type: "array",
                  items: { type: "string" },
                },
              },
              required: ["riskScore", "keyObligations", "potentialRisks", "missingClauses", "recommendations"],
              additionalProperties: false,
            },
          },
        },
      });

      const content2 = response.choices[0].message.content;
      const analysis = JSON.parse(typeof content2 === 'string' ? content2 : '{}');

      // Update contract with risk score
      await contractDb.updateContract(input.contractId, {
        riskScore: analysis.riskScore,
      });

      return analysis;
    }),

  // ============================================================================
  // CONTRACT CLAUSES
  // ============================================================================

  // Get contract clauses
  getClauses: publicProcedure
    .input(z.object({ category: z.string().optional() }))
    .query(async ({ input }) => {
      return await contractDb.getContractClauses(input.category);
    }),

  // ============================================================================
  // CONTRACT NEGOTIATIONS
  // ============================================================================

  // Get contract negotiations
  getNegotiations: protectedProcedure
    .input(z.object({ contractId: z.number() }))
    .query(async ({ input }) => {
      return await contractDb.getContractNegotiations(input.contractId);
    }),

  // Create negotiation round
  createNegotiation: protectedProcedure
    .input(
      z.object({
        contractId: z.number(),
        version: z.number(),
        changes: z.array(
          z.object({
            section: z.string(),
            original: z.string(),
            proposed: z.string(),
            reason: z.string(),
          })
        ),
        changedBy: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await contractDb.createContractNegotiation({
        contractId: input.contractId,
        version: input.version,
        changedBy: input.changedBy,
        changes: input.changes as any,
        status: "pending",
        notes: input.notes,
        createdAt: new Date(),
      });
    }),

  // ============================================================================
  // CONTRACT OBLIGATIONS
  // ============================================================================

  // Get contract obligations
  getObligations: protectedProcedure
    .input(z.object({ contractId: z.number() }))
    .query(async ({ input }) => {
      return await contractDb.getContractObligations(input.contractId);
    }),

  // Create obligation
  createObligation: protectedProcedure
    .input(
      z.object({
        contractId: z.number(),
        title: z.string(),
        description: z.string(),
        responsibleParty: z.string(),
        dueDate: z.date().optional(),
        status: z.enum(["pending", "completed", "overdue"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await contractDb.createContractObligation({
        contractId: input.contractId,
        title: input.title,
        description: input.description,
        responsibleParty: input.responsibleParty,
        dueDate: input.dueDate,
        status: input.status || "pending",
        createdAt: new Date(),
      });
    }),

  // Update obligation
  updateObligation: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["pending", "completed", "overdue"]).optional(),
        completedAt: z.date().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      return await contractDb.updateContractObligation(id, data);
    }),

  // ============================================================================
  // CONTRACT REVIEW
  // ============================================================================

  // Review contract with AI analysis
  reviewContract: protectedProcedure
    .input(
      z.object({
        contractText: z.string(),
        contractType: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { contractText, contractType = "general" } = input;

      // Use LLM to analyze the contract
      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an expert contract lawyer. Analyze the provided contract and provide a comprehensive review including:
1. Overall risk assessment (score 0-100 and level: low/medium/high)
2. Summary of the contract
3. Identified risks with severity, description, and mitigation strategies
4. Key clauses extracted with type and category
5. Obligations for each party with deadlines if applicable
6. Recommendations for improvements

Provide your response in JSON format with the following structure:
{
  "riskScore": number,
  "riskLevel": "low" | "medium" | "high",
  "summary": string,
  "risks": [{"title": string, "severity": string, "description": string, "mitigation": string}],
  "clauses": [{"type": string, "category": string, "text": string}],
  "obligations": [{"title": string, "party": string, "description": string, "deadline": string}],
  "recommendations": string
}`,
          },
          {
            role: "user",
            content: `Contract Type: ${contractType}\n\nContract Text:\n${contractText}`,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "contract_review",
            strict: true,
            schema: {
              type: "object",
              properties: {
                riskScore: { type: "number" },
                riskLevel: { type: "string", enum: ["low", "medium", "high"] },
                summary: { type: "string" },
                risks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      severity: { type: "string" },
                      description: { type: "string" },
                      mitigation: { type: "string" },
                    },
                    required: ["title", "severity", "description", "mitigation"],
                    additionalProperties: false,
                  },
                },
                clauses: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string" },
                      category: { type: "string" },
                      text: { type: "string" },
                    },
                    required: ["type", "category", "text"],
                    additionalProperties: false,
                  },
                },
                obligations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      party: { type: "string" },
                      description: { type: "string" },
                      deadline: { type: "string" },
                    },
                    required: ["title", "party", "description", "deadline"],
                    additionalProperties: false,
                  },
                },
                recommendations: { type: "string" },
              },
              required: [
                "riskScore",
                "riskLevel",
                "summary",
                "risks",
                "clauses",
                "obligations",
                "recommendations",
              ],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      if (!content || typeof content !== 'string') {
        throw new Error("No response from LLM");
      }

      const analysis = JSON.parse(content);
      return analysis;
    }),
});
