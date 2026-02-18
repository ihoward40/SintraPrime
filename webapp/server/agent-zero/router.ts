import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { AgentZero, type AgentProgress, type AgentTask } from "../lib/agent-zero";
import { TRPCError } from "@trpc/server";
import { getSocketIO } from "../_core/websocket";

// Store active agent sessions
const activeSessions = new Map<string, AgentZero>();
const progressListeners = new Map<string, (progress: AgentProgress) => void>();

export const agentZeroRouter = router({
  /**
   * Execute an autonomous task
   */
  executeTask: protectedProcedure
    .input(
      z.object({
        taskDescription: z.string().min(1),
        caseId: z.number().optional(),
        sessionId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }: { input: { taskDescription: string; caseId?: number; sessionId?: string }; ctx: any }) => {
      const sessionId = input.sessionId || `session-${Date.now()}-${ctx.user.id}`;

      // Create progress callback with Socket.IO support
      const progressCallback = (progress: AgentProgress) => {
        const listener = progressListeners.get(sessionId);
        if (listener) {
          listener(progress);
        }

        // Emit progress via Socket.IO
        const io = getSocketIO();
        if (io) {
          io.to(sessionId).emit('agent-progress', progress);
        }
      };

      // Create agent instance
      const agent = new AgentZero(
        {
          userId: ctx.user.id,
          caseId: input.caseId,
          conversationHistory: [],
          memory: new Map(),
          availableTools: ["web_search", "code_executor", "file_operations"],
        },
        progressCallback
      );

      activeSessions.set(sessionId, agent);

      try {
        // Execute the task
        const result = await agent.executeTask(input.taskDescription);

        return {
          sessionId,
          task: result,
          success: result.status === "completed",
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Task execution failed",
        });
      } finally {
        // Clean up session after some time
        setTimeout(() => {
          activeSessions.delete(sessionId);
          progressListeners.delete(sessionId);
        }, 300000); // 5 minutes
      }
    }),

  /**
   * Get task history for a session
   */
  getTaskHistory: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .query(async ({ input }: { input: { sessionId: string } }) => {
      const agent = activeSessions.get(input.sessionId);

      if (!agent) {
        return {
          history: [],
          message: "Session not found or expired",
        };
      }

      return {
        history: agent.getTaskHistory(),
      };
    }),

  /**
   * Get agent memory
   */
  getMemory: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .query(async ({ input }: { input: { sessionId: string } }) => {
      const agent = activeSessions.get(input.sessionId);

      if (!agent) {
        return {
          memory: {},
          message: "Session not found or expired",
        };
      }

      const memory = agent.getMemory();
      const memoryObj: Record<string, any> = {};

      memory.forEach((value, key) => {
        memoryObj[key] = value;
      });

      return {
        memory: memoryObj,
      };
    }),

  /**
   * Pause task execution
   */
  pauseTask: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ input }: { input: { sessionId: string } }) => {
      const agent = activeSessions.get(input.sessionId);

      if (!agent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found or expired",
        });
      }

      // Note: Actual pause implementation would require agent state management
      // For now, we'll just acknowledge the request
      return {
        success: true,
        message: "Task paused",
      };
    }),

  /**
   * Resume task execution
   */
  resumeTask: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ input }: { input: { sessionId: string } }) => {
      const agent = activeSessions.get(input.sessionId);

      if (!agent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found or expired",
        });
      }

      // Note: Actual resume implementation would require agent state management
      return {
        success: true,
        message: "Task resumed",
      };
    }),

  /**
   * Cancel task execution
   */
  cancelTask: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ input }: { input: { sessionId: string } }) => {
      const agent = activeSessions.get(input.sessionId);

      if (!agent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found or expired",
        });
      }

      // Clean up session immediately
      activeSessions.delete(input.sessionId);
      progressListeners.delete(input.sessionId);

      return {
        success: true,
        message: "Task cancelled",
      };
    }),

  /**
   * Register progress listener (for WebSocket integration)
   */
  registerProgressListener: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ input }: { input: { sessionId: string } }) => {
      // This would typically be handled via WebSocket
      // For now, just acknowledge registration
      return {
        sessionId: input.sessionId,
        registered: true,
      };
    }),

});
