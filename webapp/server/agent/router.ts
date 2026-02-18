import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { AgentOrchestrator } from "./orchestrator";
import { toolRegistry } from "./tools/registry";
import { vectorMemory } from "./services/vectorMemory";
import { approvalGate } from "./services/approvalGate";
import * as db from "../db";

// Initialize orchestrator with tools
const orchestrator = new AgentOrchestrator();
for (const tool of toolRegistry.getAll()) {
  orchestrator.registerTool(tool);
}

export const agentRouter = router({
  // Execute autonomous task
  executeTask: protectedProcedure
    .input(
      z.object({
        task: z.string().min(1).max(5000),
        caseId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await orchestrator.executeTask(input.task, {
        userId: ctx.user.id,
        caseId: input.caseId,
      });

      return result;
    }),

  // Get list of available tools
  getTools: publicProcedure.query(() => {
    return toolRegistry.getAll().map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }),

  // Execute single tool directly (for testing)
  executeTool: protectedProcedure
    .input(
      z.object({
        toolName: z.string(),
        params: z.any(),
        caseId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tool = toolRegistry.get(input.toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${input.toolName}`);
      }

      const result = await tool.execute(input.params, {
        userId: ctx.user.id,
        caseId: input.caseId,
      });

      return result;
    }),

  // Get execution history
  getHistory: protectedProcedure.query(() => {
    // TODO: Implement persistent history storage
    return {
      history: [],
      message: "History storage not yet implemented",
    };
  }),

  // Get pending approval requests
  getPendingApprovals: protectedProcedure.query(({ ctx }) => {
    return approvalGate.getPendingApprovals(ctx.user.id);
  }),

  // Respond to approval request
  respondToApproval: protectedProcedure
    .input(
      z.object({
        approvalId: z.string(),
        approved: z.boolean(),
        feedback: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const success = approvalGate.respond(
        input.approvalId,
        input.approved,
        input.feedback
      );

      if (!success) {
        throw new Error("Approval request not found or already processed");
      }

      return { success: true };
    }),

  // Get vector memory stats
  getMemoryStats: protectedProcedure.query(() => {
    return vectorMemory.getStats();
  }),

  // Clear user memory
  clearMemory: protectedProcedure.mutation(({ ctx }) => {
    const count = vectorMemory.clearUser(ctx.user.id);
    return { cleared: count };
  }),

  // Get approval statistics
  getApprovalStats: protectedProcedure.query(() => {
    return approvalGate.getStats();
  }),

  // ============================================================================
  // WORKFLOW TEMPLATES
  // ============================================================================

  // Get all workflow templates
  getWorkflowTemplates: publicProcedure.query(async () => {
    const { workflowTemplates } = await import("./workflows/templates");
    return workflowTemplates;
  }),

  // Get workflow template by ID
  getWorkflowTemplate: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const { getWorkflowTemplate } = await import("./workflows/templates");
      return getWorkflowTemplate(input.id);
    }),

  // Get workflows by category
  getWorkflowsByCategory: publicProcedure
    .input(z.object({ category: z.enum(["contract", "research", "filing", "discovery", "client"]) }))
    .query(async ({ input }) => {
      const { getWorkflowsByCategory } = await import("./workflows/templates");
      return getWorkflowsByCategory(input.category);
    }),

  // Get workflow categories
  getWorkflowCategories: publicProcedure.query(async () => {
    const { getWorkflowCategories } = await import("./workflows/templates");
    return getWorkflowCategories();
  }),

  // Execute workflow
  executeWorkflow: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        inputs: z.record(z.string(), z.any()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { getWorkflowTemplate } = await import("./workflows/templates");
      const template = getWorkflowTemplate(input.workflowId);

      if (!template) {
        throw new Error(`Workflow template not found: ${input.workflowId}`);
      }

      // Validate required inputs
      for (const requiredInput of template.requiredInputs) {
        if (requiredInput.required && !input.inputs[requiredInput.name]) {
          throw new Error(`Missing required input: ${requiredInput.name}`);
        }
      }

      // Build task description from workflow
      const taskDescription = `
Workflow: ${template.name}

Description: ${template.description}

Inputs:
${Object.entries(input.inputs)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

Steps to execute:
${template.steps
  .map(
    (step, idx) =>
      `${idx + 1}. ${step.name}: ${step.description} (Pattern: ${step.agentPattern}, Tools: ${step.tools.join(", ")})`
  )
  .join("\n")}

Expected output format: ${template.outputFormat}
`;

      // Execute the workflow as a task
      const result = await orchestrator.executeTask(taskDescription, {
        userId: ctx.user.id,
      });

      return result;
    }),
});
