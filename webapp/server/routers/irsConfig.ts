import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { irsCredentials } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * IRS Configuration Router
 * 
 * Handles IRS MeF credentials management:
 * - Storing TCC and EFIN securely
 * - Validating credentials
 * - Managing test/production modes
 */
export const irsConfigRouter = router({
  /**
   * Get IRS credentials for current user
   */
  getCredentials: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [credentials] = await db
      .select()
      .from(irsCredentials)
      .where(
        and(
          eq(irsCredentials.userId, ctx.user.id),
          eq(irsCredentials.isActive, true)
        )
      )
      .limit(1);

    if (!credentials) {
      return {
        hasCredentials: false,
        testMode: true,
      };
    }

    // Don't return actual credentials to frontend
    return {
      hasCredentials: true,
      testMode: credentials.testMode,
      lastValidated: credentials.lastValidated,
    };
  }),

  /**
   * Save or update IRS credentials
   */
  saveCredentials: protectedProcedure
    .input(
      z.object({
        transmitterControlCode: z.string().min(1),
        electronicFilingIdentificationNumber: z.string().min(1),
        testMode: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if credentials already exist
      const [existing] = await db
        .select()
        .from(irsCredentials)
        .where(
          and(
            eq(irsCredentials.userId, ctx.user.id),
            eq(irsCredentials.isActive, true)
          )
        )
        .limit(1);

      if (existing) {
        // Update existing credentials
        await db
          .update(irsCredentials)
          .set({
            transmitterControlCode: input.transmitterControlCode,
            electronicFilingIdentificationNumber: input.electronicFilingIdentificationNumber,
            testMode: input.testMode,
            updatedAt: new Date(),
          })
          .where(eq(irsCredentials.id, existing.id));

        return { success: true, message: "Credentials updated successfully" };
      } else {
        // Create new credentials
        await db.insert(irsCredentials).values({
          userId: ctx.user.id,
          transmitterControlCode: input.transmitterControlCode,
          electronicFilingIdentificationNumber: input.electronicFilingIdentificationNumber,
          testMode: input.testMode,
          isActive: true,
        });

        return { success: true, message: "Credentials saved successfully" };
      }
    }),

  /**
   * Delete IRS credentials
   */
  deleteCredentials: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .update(irsCredentials)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(irsCredentials.userId, ctx.user.id),
          eq(irsCredentials.isActive, true)
        )
      );

    return { success: true, message: "Credentials deleted successfully" };
  }),

  /**
   * Toggle test mode
   */
  toggleTestMode: protectedProcedure
    .input(
      z.object({
        testMode: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(irsCredentials)
        .set({
          testMode: input.testMode,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(irsCredentials.userId, ctx.user.id),
            eq(irsCredentials.isActive, true)
          )
        );

      return { success: true, testMode: input.testMode };
    }),

  /**
   * Validate IRS credentials
   * In production, this would make a test API call to IRS MeF
   */
  validateCredentials: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [credentials] = await db
      .select()
      .from(irsCredentials)
      .where(
        and(
          eq(irsCredentials.userId, ctx.user.id),
          eq(irsCredentials.isActive, true)
        )
      )
      .limit(1);

    if (!credentials) {
      throw new Error("No credentials found");
    }

    // In production, validate with IRS MeF API
    // For now, just mark as validated
    await db
      .update(irsCredentials)
      .set({
        lastValidated: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(irsCredentials.id, credentials.id));

    return {
      success: true,
      message: "Credentials validated successfully (simulated)",
      testMode: credentials.testMode,
    };
  }),
});
