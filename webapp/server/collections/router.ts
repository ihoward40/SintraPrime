import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as collectionDb from "../db/collection-helpers";
import { TRPCError } from "@trpc/server";

// ============================================================================
// BOOKMARK COLLECTION ROUTER
// ============================================================================

export const collectionRouter = router({
  // List all collections for current user (owned + shared)
  list: protectedProcedure.query(async ({ ctx }) => {
    return collectionDb.getCollectionsByUserId(ctx.user.id);
  }),

  // Get collection by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const collection = await collectionDb.getCollectionById(input.id);
      if (!collection) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found" });
      }
      // Verify access (owner or shared with)
      const collections = await collectionDb.getCollectionsByUserId(ctx.user.id);
      const hasAccess = collections.some(c => c.id === input.id);
      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return collection;
    }),

  // Create new collection
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        isPublic: z.boolean().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const result = await collectionDb.createCollection({
        ...input,
        userId: ctx.user.id,
      });
      return result;
    }),

  // Update collection
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        isPublic: z.boolean().optional(),
        color: z.string().optional(),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      // Verify ownership
      const collection = await collectionDb.getCollectionById(id);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return collectionDb.updateCollection(id, data);
    }),

  // Delete collection
  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const collection = await collectionDb.getCollectionById(input.id);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      await collectionDb.deleteCollection(input.id);
      return { success: true };
    }),

  // Add bookmark to collection
  addBookmark: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        bookmarkId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify access (owner or edit permission)
      const collection = await collectionDb.getCollectionById(input.collectionId);
      if (!collection) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found" });
      }
      
      const collections = await collectionDb.getCollectionsByUserId(ctx.user.id);
      const userCollection = collections.find(c => c.id === input.collectionId);
      
      if (!userCollection) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      
      // Check if user has edit permission (owner or shared with edit)
      const isOwner = collection.userId === ctx.user.id;
      const hasEditPermission = 'permission' in userCollection && userCollection.permission === "edit";
      
      if (!isOwner && !hasEditPermission) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Edit permission required" });
      }
      
      return collectionDb.addBookmarkToCollection(input.collectionId, input.bookmarkId);
    }),

  // Remove bookmark from collection
  removeBookmark: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        bookmarkId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify access (owner or edit permission)
      const collection = await collectionDb.getCollectionById(input.collectionId);
      if (!collection) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Collection not found" });
      }
      
      const collections = await collectionDb.getCollectionsByUserId(ctx.user.id);
      const userCollection = collections.find(c => c.id === input.collectionId);
      
      if (!userCollection) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      
      const isOwner = collection.userId === ctx.user.id;
      const hasEditPermission = 'permission' in userCollection && userCollection.permission === "edit";
      
      if (!isOwner && !hasEditPermission) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Edit permission required" });
      }
      
      await collectionDb.removeBookmarkFromCollection(input.collectionId, input.bookmarkId);
      return { success: true };
    }),

  // Get bookmarks in collection
  getBookmarks: protectedProcedure
    .input(z.object({ collectionId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Verify access
      const collections = await collectionDb.getCollectionsByUserId(ctx.user.id);
      const hasAccess = collections.some(c => c.id === input.collectionId);
      if (!hasAccess) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return collectionDb.getCollectionBookmarks(input.collectionId);
    }),

  // Share collection with another user
  share: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        sharedWithUserId: z.number(),
        permission: z.enum(["view", "edit"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const collection = await collectionDb.getCollectionById(input.collectionId);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owner can share collection" });
      }
      return collectionDb.shareCollection(input);
    }),

  // Unshare collection
  unshare: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        sharedWithUserId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const collection = await collectionDb.getCollectionById(input.collectionId);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owner can unshare collection" });
      }
      await collectionDb.unshareCollection(input.collectionId, input.sharedWithUserId);
      return { success: true };
    }),

  // Get collection shares
  getShares: protectedProcedure
    .input(z.object({ collectionId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Verify ownership
      const collection = await collectionDb.getCollectionById(input.collectionId);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owner can view shares" });
      }
      return collectionDb.getCollectionShares(input.collectionId);
    }),

  // Update share permission
  updatePermission: protectedProcedure
    .input(
      z.object({
        collectionId: z.number(),
        sharedWithUserId: z.number(),
        permission: z.enum(["view", "edit"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify ownership
      const collection = await collectionDb.getCollectionById(input.collectionId);
      if (!collection || collection.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owner can update permissions" });
      }
      await collectionDb.updateSharePermission(input.collectionId, input.sharedWithUserId, input.permission);
      return { success: true };
    }),
});
