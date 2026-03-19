/**
 * SintraPrime Time Tracker & Billing Router
 * Full time tracking with billable hours, invoicing, and case-level billing summaries.
 */
import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { timeEntries, billingInvoices } from "../drizzle/schema-comprehensive-features";
import { eq, and, desc, sum, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";

export const timeTrackerRouter = router({
  // ── Time Entries ──────────────────────────────────────────────────────────

  /** List all time entries for the current user */
  listEntries: protectedProcedure
    .input(z.object({
      caseId: z.number().optional(),
      invoiced: z.boolean().optional(),
      limit: z.number().min(1).max(200).default(50),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const conditions = [eq(timeEntries.userId, ctx.user.id)];
      if (input.caseId !== undefined) conditions.push(eq(timeEntries.caseId, input.caseId));
      if (input.invoiced !== undefined) conditions.push(eq(timeEntries.invoiced, input.invoiced));
      return db
        .select()
        .from(timeEntries)
        .where(and(...conditions))
        .orderBy(desc(timeEntries.startTime))
        .limit(input.limit);
    }),

  /** Add a new time entry */
  addEntry: protectedProcedure
    .input(z.object({
      caseId: z.number().optional(),
      description: z.string().min(1).max(1000),
      category: z.enum(["research", "drafting", "court", "client_comm", "admin", "review", "other"]).default("other"),
      startTime: z.string(),
      endTime: z.string().optional(),
      durationMinutes: z.number().min(1).optional(),
      billable: z.boolean().default(true),
      hourlyRate: z.number().min(0).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const start = new Date(input.startTime);
      const end = input.endTime ? new Date(input.endTime) : undefined;
      const duration = input.durationMinutes ?? (end ? Math.round((end.getTime() - start.getTime()) / 60000) : undefined);

      const [result] = await db.insert(timeEntries).values({
        userId: ctx.user.id,
        caseId: input.caseId,
        description: input.description,
        category: input.category,
        startTime: start,
        endTime: end,
        durationMinutes: duration,
        billable: input.billable,
        hourlyRate: input.hourlyRate?.toString(),
        invoiced: false,
      });
      return { id: result.insertId };
    }),

  /** Update a time entry */
  updateEntry: protectedProcedure
    .input(z.object({
      id: z.number(),
      description: z.string().min(1).max(1000).optional(),
      category: z.enum(["research", "drafting", "court", "client_comm", "admin", "review", "other"]).optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      durationMinutes: z.number().min(1).optional(),
      billable: z.boolean().optional(),
      hourlyRate: z.number().min(0).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { id, ...updates } = input;
      const updateData: Record<string, any> = {};
      if (updates.description) updateData.description = updates.description;
      if (updates.category) updateData.category = updates.category;
      if (updates.startTime) updateData.startTime = new Date(updates.startTime);
      if (updates.endTime) updateData.endTime = new Date(updates.endTime);
      if (updates.durationMinutes) updateData.durationMinutes = updates.durationMinutes;
      if (updates.billable !== undefined) updateData.billable = updates.billable;
      if (updates.hourlyRate !== undefined) updateData.hourlyRate = updates.hourlyRate.toString();

      await db
        .update(timeEntries)
        .set(updateData)
        .where(and(eq(timeEntries.id, id), eq(timeEntries.userId, ctx.user.id)));
      return { success: true };
    }),

  /** Delete a time entry */
  deleteEntry: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db
        .delete(timeEntries)
        .where(and(eq(timeEntries.id, input.id), eq(timeEntries.userId, ctx.user.id)));
      return { success: true };
    }),

  /** Get billing summary for a case or all cases */
  getBillingSummary: protectedProcedure
    .input(z.object({ caseId: z.number().optional() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const conditions = [eq(timeEntries.userId, ctx.user.id), eq(timeEntries.billable, true)];
      if (input.caseId) conditions.push(eq(timeEntries.caseId, input.caseId));

      const entries = await db
        .select()
        .from(timeEntries)
        .where(and(...conditions));

      const totalMinutes = entries.reduce((acc, e) => acc + (e.durationMinutes ?? 0), 0);
      const totalHours = totalMinutes / 60;
      const unbilledMinutes = entries.filter(e => !e.invoiced).reduce((acc, e) => acc + (e.durationMinutes ?? 0), 0);
      const unbilledHours = unbilledMinutes / 60;
      const totalAmount = entries.reduce((acc, e) => {
        const rate = parseFloat(e.hourlyRate ?? "0");
        const hours = (e.durationMinutes ?? 0) / 60;
        return acc + rate * hours;
      }, 0);

      return {
        totalHours: Math.round(totalHours * 100) / 100,
        unbilledHours: Math.round(unbilledHours * 100) / 100,
        totalAmount: Math.round(totalAmount * 100) / 100,
        entryCount: entries.length,
        unbilledCount: entries.filter(e => !e.invoiced).length,
      };
    }),

  // ── Invoices ──────────────────────────────────────────────────────────────

  /** List invoices */
  listInvoices: protectedProcedure
    .input(z.object({
      status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const conditions = [eq(billingInvoices.userId, ctx.user.id)];
      if (input.status) conditions.push(eq(billingInvoices.status, input.status));
      return db
        .select()
        .from(billingInvoices)
        .where(and(...conditions))
        .orderBy(desc(billingInvoices.createdAt));
    }),

  /** Create an invoice from unbilled time entries */
  createInvoice: protectedProcedure
    .input(z.object({
      caseId: z.number().optional(),
      clientName: z.string().min(1),
      clientEmail: z.string().email().optional(),
      entryIds: z.array(z.number()).min(1),
      dueDate: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();

      // Fetch the selected entries
      const entries = await db
        .select()
        .from(timeEntries)
        .where(and(eq(timeEntries.userId, ctx.user.id)));

      const selectedEntries = entries.filter(e => input.entryIds.includes(e.id));
      if (selectedEntries.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No valid time entries found." });
      }

      const totalAmount = selectedEntries.reduce((acc, e) => {
        const rate = parseFloat(e.hourlyRate ?? "0");
        const hours = (e.durationMinutes ?? 0) / 60;
        return acc + rate * hours;
      }, 0);

      const invoiceNumber = `INV-${new Date().getFullYear()}-${nanoid(6).toUpperCase()}`;

      const [result] = await db.insert(billingInvoices).values({
        userId: ctx.user.id,
        caseId: input.caseId,
        invoiceNumber,
        clientName: input.clientName,
        clientEmail: input.clientEmail,
        totalAmount: totalAmount.toFixed(2),
        status: "draft",
        dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
        notes: input.notes,
      });

      // Mark entries as invoiced
      for (const entry of selectedEntries) {
        await db
          .update(timeEntries)
          .set({ invoiced: true, invoiceId: invoiceNumber })
          .where(eq(timeEntries.id, entry.id));
      }

      return { id: result.insertId, invoiceNumber, totalAmount };
    }),

  /** Update invoice status */
  updateInvoiceStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const updates: Record<string, any> = { status: input.status };
      if (input.status === "paid") updates.paidAt = new Date();

      await db
        .update(billingInvoices)
        .set(updates)
        .where(and(eq(billingInvoices.id, input.id), eq(billingInvoices.userId, ctx.user.id)));
      return { success: true };
    }),

  /** Delete invoice */
  deleteInvoice: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      await db
        .delete(billingInvoices)
        .where(and(eq(billingInvoices.id, input.id), eq(billingInvoices.userId, ctx.user.id)));
      return { success: true };
    }),
});
