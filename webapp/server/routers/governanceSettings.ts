import { z } from 'zod';
import { router, protectedProcedure } from '../_core/trpc';
import { getDb } from '../db';
import { governanceSettings } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const governanceSettingsRouter = router({
  /**
   * Get governance settings for current user
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    
    const settings = await db
      .select()
      .from(governanceSettings)
      .where(eq(governanceSettings.userId, ctx.user.id))
      .limit(1);
    
    if (settings.length === 0) {
      // Return default settings if none exist
      return {
        dailyLimit: '1000.00',
        weeklyLimit: '5000.00',
        monthlyLimit: '20000.00',
        approvalThreshold: '500.00',
        enableNotifications: true,
        enableAutoBlock: true,
      };
    }
    
    return settings[0];
  }),
  
  /**
   * Update governance settings
   */
  update: protectedProcedure
    .input(z.object({
      dailyLimit: z.string().regex(/^\d+(\.\d{1,2})?$/),
      weeklyLimit: z.string().regex(/^\d+(\.\d{1,2})?$/),
      monthlyLimit: z.string().regex(/^\d+(\.\d{1,2})?$/),
      approvalThreshold: z.string().regex(/^\d+(\.\d{1,2})?$/),
      enableNotifications: z.boolean(),
      enableAutoBlock: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      // Validation: Ensure limits are in ascending order
      const daily = parseFloat(input.dailyLimit);
      const weekly = parseFloat(input.weeklyLimit);
      const monthly = parseFloat(input.monthlyLimit);
      const threshold = parseFloat(input.approvalThreshold);
      
      if (daily < 0 || weekly < 0 || monthly < 0 || threshold < 0) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'All limits and thresholds must be positive numbers',
        });
      }
      
      if (weekly < daily) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Weekly limit must be greater than or equal to daily limit',
        });
      }
      
      if (monthly < weekly) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Monthly limit must be greater than or equal to weekly limit',
        });
      }
      
      // Check if settings exist
      const existing = await db
        .select()
        .from(governanceSettings)
        .where(eq(governanceSettings.userId, ctx.user.id))
        .limit(1);
      
      if (existing.length === 0) {
        // Insert new settings
        await db.insert(governanceSettings).values({
          userId: ctx.user.id,
          dailyLimit: input.dailyLimit,
          weeklyLimit: input.weeklyLimit,
          monthlyLimit: input.monthlyLimit,
          approvalThreshold: input.approvalThreshold,
          enableNotifications: input.enableNotifications,
          enableAutoBlock: input.enableAutoBlock,
        });
      } else {
        // Update existing settings
        await db
          .update(governanceSettings)
          .set({
            dailyLimit: input.dailyLimit,
            weeklyLimit: input.weeklyLimit,
            monthlyLimit: input.monthlyLimit,
            approvalThreshold: input.approvalThreshold,
            enableNotifications: input.enableNotifications,
            enableAutoBlock: input.enableAutoBlock,
          })
          .where(eq(governanceSettings.userId, ctx.user.id));
      }
      
      return { success: true };
    }),
});
