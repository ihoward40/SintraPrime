import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { BrowserSessionManager, ScrapingRule } from "./service";
import { TRPCError } from "@trpc/server";

// Global session manager
const sessionManager = new BrowserSessionManager();

// Cleanup on process exit
process.on('SIGINT', async () => {
  await sessionManager.closeAllSessions();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await sessionManager.closeAllSessions();
  process.exit(0);
});

export const browserAutomationRouter = router({
  /**
   * Create a new browser automation session
   */
  createSession: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        startRecording: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const session = await sessionManager.createSession(input.sessionId);

        // Socket.IO event forwarding will be handled by the websocket module

        if (input.startRecording) {
          await session.startRecording();
        }

        return {
          success: true,
          sessionId: input.sessionId,
          message: 'Browser session created successfully',
        };
      } catch (error) {
        console.error('[BrowserAutomation] Session creation error:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to create browser session',
        });
      }
    }),

  /**
   * Navigate to a URL
   */
  navigate: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        url: z.string().url(),
      })
    )
    .mutation(async ({ input }) => {
      const session = sessionManager.getSession(input.sessionId);
      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Browser session not found',
        });
      }

      try {
        await session.navigate(input.url);
        return {
          success: true,
          message: `Navigated to ${input.url}`,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Navigation failed',
        });
      }
    }),

  /**
   * Click an element
   */
  click: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        selector: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const session = sessionManager.getSession(input.sessionId);
      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Browser session not found',
        });
      }

      try {
        await session.click(input.selector);
        return {
          success: true,
          message: `Clicked element: ${input.selector}`,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Click action failed',
        });
      }
    }),

  /**
   * Type text into an element
   */
  type: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        selector: z.string(),
        text: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const session = sessionManager.getSession(input.sessionId);
      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Browser session not found',
        });
      }

      try {
        await session.type(input.selector, input.text);
        return {
          success: true,
          message: `Typed text into ${input.selector}`,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Type action failed',
        });
      }
    }),

  /**
   * Scroll the page
   */
  scroll: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        direction: z.enum(['up', 'down']),
        distance: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const session = sessionManager.getSession(input.sessionId);
      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Browser session not found',
        });
      }

      try {
        await session.scroll(input.direction, input.distance);
        return {
          success: true,
          message: `Scrolled ${input.direction}`,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Scroll action failed',
        });
      }
    }),

  /**
   * Extract data from the page
   */
  extract: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        rules: z.array(
          z.object({
            name: z.string(),
            selector: z.string(),
            attribute: z.string().optional(),
            multiple: z.boolean().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const session = sessionManager.getSession(input.sessionId);
      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Browser session not found',
        });
      }

      try {
        const data = await session.extract(input.rules as ScrapingRule[]);
        return {
          success: true,
          data,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Data extraction failed',
        });
      }
    }),

  /**
   * Get page content (HTML)
   */
  getPageContent: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const session = sessionManager.getSession(input.sessionId);
      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Browser session not found',
        });
      }

      try {
        const content = await session.getPageContent();
        return {
          success: true,
          content,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to get page content',
        });
      }
    }),

  /**
   * Take a screenshot
   */
  takeScreenshot: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const session = sessionManager.getSession(input.sessionId);
      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Browser session not found',
        });
      }

      try {
        const screenshot = await session.takeScreenshot();
        return {
          success: true,
          screenshot,
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Screenshot failed',
        });
      }
    }),

  /**
   * Get action history
   */
  getActions: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .query(async ({ input }) => {
      const session = sessionManager.getSession(input.sessionId);
      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Browser session not found',
        });
      }

      return {
        success: true,
        actions: session.getActions(),
      };
    }),

  /**
   * Start recording
   */
  startRecording: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const session = sessionManager.getSession(input.sessionId);
      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Browser session not found',
        });
      }

      try {
        await session.startRecording();
        return {
          success: true,
          message: 'Recording started',
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to start recording',
        });
      }
    }),

  /**
   * Stop recording
   */
  stopRecording: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const session = sessionManager.getSession(input.sessionId);
      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Browser session not found',
        });
      }

      try {
        const recordingPath = await session.stopRecording();
        return {
          success: true,
          recordingPath,
          message: 'Recording stopped',
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to stop recording',
        });
      }
    }),

  /**
   * Close a browser session
   */
  closeSession: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await sessionManager.closeSession(input.sessionId);
        return {
          success: true,
          message: 'Browser session closed',
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to close session',
        });
      }
    }),
});
