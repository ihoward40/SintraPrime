import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as bookmarkDb from "../db/workspace-bookmark-helpers";
import { TRPCError } from "@trpc/server";

// ============================================================================
// WORKSPACE BOOKMARK ROUTER
// ============================================================================

export const workspaceBookmarkRouter = router({
  // List all bookmarks for current user
  list: protectedProcedure.query(async ({ ctx }) => {
    return bookmarkDb.getBookmarksByUserId(ctx.user.id);
  }),

  // Get bookmarks by category
  getByCategory: protectedProcedure
    .input(z.object({ category: z.string() }))
    .query(async ({ input, ctx }) => {
      return bookmarkDb.getBookmarksByCategory(ctx.user.id, input.category);
    }),

  // Get bookmark by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const bookmark = await bookmarkDb.getBookmarkById(input.id);
      if (!bookmark) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Bookmark not found" });
      }
      // Verify ownership
      if (bookmark.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return bookmark;
    }),

  // Create new bookmark
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        url: z.string().url(),
        category: z.string().optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await bookmarkDb.createBookmark({
        ...input,
        userId: ctx.user.id,
      });
      return result;
    }),

  // Update bookmark
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().optional(),
        url: z.string().url().optional(),
        category: z.string().optional(),
        notes: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      // Verify ownership
      const bookmark = await bookmarkDb.getBookmarkById(id);
      if (!bookmark || bookmark.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return bookmarkDb.updateBookmark(id, data);
    }),

  // Delete bookmark
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const bookmark = await bookmarkDb.getBookmarkById(input.id);
      if (!bookmark || bookmark.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      await bookmarkDb.deleteBookmark(input.id);
      return { success: true };
    }),
});
