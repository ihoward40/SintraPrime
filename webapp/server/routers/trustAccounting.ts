import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import * as db from "../db";

/**
 * Trust Accounting Router
 * Handles fiduciary accounting, journal entries, and DNI calculations for Form 1041
 */

export const trustAccountingRouter = router({
  // Create a new trust account
  createTrustAccount: protectedProcedure
    .input(
      z.object({
        trustName: z.string().min(1).max(500),
        ein: z.string().regex(/^\d{2}-\d{7}$/, "EIN must be in format XX-XXXXXXX"),
        taxYear: z.number().int().min(2000).max(2100),
        trustType: z.enum(["simple", "complex", "grantor", "estate"]),
        fiscalYearEnd: z.string().regex(/^\d{2}-\d{2}$/, "Fiscal year end must be in format MM-DD").optional(),
        beneficiaries: z.array(z.object({
          name: z.string(),
          ssn: z.string().optional(),
          relationship: z.string(),
          distributionPercentage: z.number().min(0).max(100),
        })).optional(),
        fiduciaries: z.array(z.object({
          name: z.string(),
          title: z.string(),
          address: z.string(),
        })).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const trustAccount = await db.createTrustAccount({
        userId: ctx.user.id,
        trustName: input.trustName,
        ein: input.ein,
        taxYear: input.taxYear,
        trustType: input.trustType,
        fiscalYearEnd: input.fiscalYearEnd,
        status: "active",
        metadata: {
          beneficiaries: input.beneficiaries,
          fiduciaries: input.fiduciaries,
        },
      });

      if (!trustAccount) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create trust account",
        });
      }

      // Create default chart of accounts
      await db.createDefaultChartOfAccounts(trustAccount.id);

      return {
        success: true,
        trustAccountId: trustAccount.id,
        message: "Trust account created successfully",
      };
    }),

  // Get trust accounts for user
  getTrustAccounts: protectedProcedure
    .input(
      z.object({
        taxYear: z.number().int().optional(),
        status: z.enum(["active", "terminated", "archived"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await db.getTrustAccountsByUserId(ctx.user.id, input.taxYear, input.status);
    }),

  // Get trust account by ID
  getTrustAccount: protectedProcedure
    .input(z.object({ trustAccountId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const trustAccount = await db.getTrustAccountById(input.trustAccountId);
      
      if (!trustAccount) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Trust account not found",
        });
      }

      if (trustAccount.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this trust account",
        });
      }

      return trustAccount;
    }),

  // Get chart of accounts
  getChartOfAccounts: protectedProcedure
    .input(z.object({ trustAccountId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      // Verify access
      const trustAccount = await db.getTrustAccountById(input.trustAccountId);
      if (!trustAccount || trustAccount.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return await db.getLedgerAccountsByTrustId(input.trustAccountId);
    }),

  // Create journal entry
  createJournalEntry: protectedProcedure
    .input(
      z.object({
        trustAccountId: z.number().int(),
        entryDate: z.date(),
        description: z.string().min(1),
        reference: z.string().optional(),
        basis: z.enum(["book", "tax", "both"]).default("both"),
        lines: z.array(z.object({
          ledgerAccountId: z.number().int(),
          lineType: z.enum(["debit", "credit"]),
          amountInCents: z.number().int().positive(),
          memo: z.string().optional(),
        })).min(2, "Journal entry must have at least 2 lines"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify access
      const trustAccount = await db.getTrustAccountById(input.trustAccountId);
      if (!trustAccount || trustAccount.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      // Validate debits = credits
      const totalDebits = input.lines
        .filter(l => l.lineType === "debit")
        .reduce((sum, l) => sum + l.amountInCents, 0);
      const totalCredits = input.lines
        .filter(l => l.lineType === "credit")
        .reduce((sum, l) => sum + l.amountInCents, 0);

      if (totalDebits !== totalCredits) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Debits ($${(totalDebits / 100).toFixed(2)}) must equal credits ($${(totalCredits / 100).toFixed(2)})`,
        });
      }

      // Generate entry number
      const entryCount = await db.getJournalEntryCountByTrustId(input.trustAccountId);
      const entryNumber = `JE-${trustAccount.taxYear}-${String(entryCount + 1).padStart(4, "0")}`;

      // Create journal entry
      const journalEntry = await db.createJournalEntry({
        trustAccountId: input.trustAccountId,
        entryNumber,
        entryDate: input.entryDate,
        entryType: "standard",
        basis: input.basis,
        description: input.description,
        reference: input.reference,
        isPosted: false,
      });

      if (!journalEntry) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create journal entry",
        });
      }

      // Create journal entry lines
      for (const line of input.lines) {
        await db.createJournalEntryLine({
          journalEntryId: journalEntry.id,
          ledgerAccountId: line.ledgerAccountId,
          lineType: line.lineType,
          amountInCents: line.amountInCents,
          memo: line.memo,
        });
      }

      return {
        success: true,
        journalEntryId: journalEntry.id,
        entryNumber,
        message: "Journal entry created successfully",
      };
    }),

  // Get journal entries
  getJournalEntries: protectedProcedure
    .input(
      z.object({
        trustAccountId: z.number().int(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        isPosted: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify access
      const trustAccount = await db.getTrustAccountById(input.trustAccountId);
      if (!trustAccount || trustAccount.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return await db.getJournalEntriesByTrustId(
        input.trustAccountId,
        input.startDate,
        input.endDate,
        input.isPosted
      );
    }),

  // Get trial balance
  getTrialBalance: protectedProcedure
    .input(
      z.object({
        trustAccountId: z.number().int(),
        asOfDate: z.date(),
        basis: z.enum(["book", "tax", "both"]).default("both"),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify access
      const trustAccount = await db.getTrustAccountById(input.trustAccountId);
      if (!trustAccount || trustAccount.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return await db.calculateTrialBalance(
        input.trustAccountId,
        input.asOfDate,
        input.basis
      );
    }),

  // Calculate DNI
  calculateDNI: protectedProcedure
    .input(
      z.object({
        trustAccountId: z.number().int(),
        taxYear: z.number().int(),
        interestIncome: z.number().int().default(0),
        dividendIncome: z.number().int().default(0),
        capitalGains: z.number().int().default(0),
        ordinaryIncome: z.number().int().default(0),
        otherIncome: z.number().int().default(0),
        fiduciaryFees: z.number().int().default(0),
        accountingFees: z.number().int().default(0),
        legalFees: z.number().int().default(0),
        otherDeductions: z.number().int().default(0),
        actualDistributions: z.number().int().default(0),
        has65DayElection: z.boolean().default(false),
        electionAmount: z.number().int().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify access
      const trustAccount = await db.getTrustAccountById(input.trustAccountId);
      if (!trustAccount || trustAccount.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      // Calculate totals
      const totalIncome =
        input.interestIncome +
        input.dividendIncome +
        input.capitalGains +
        input.ordinaryIncome +
        input.otherIncome;

      const totalDeductions =
        input.fiduciaryFees +
        input.accountingFees +
        input.legalFees +
        input.otherDeductions;

      // DNI = Total Income - Total Deductions (excluding capital gains for simple trusts)
      const distributableNetIncome = totalIncome - totalDeductions;

      // Distribution deduction = lesser of DNI or actual distributions
      const distributionDeduction = Math.min(
        distributableNetIncome,
        input.actualDistributions
      );

      // Save calculation
      const dniCalc = await db.createDNICalculation({
        trustAccountId: input.trustAccountId,
        taxYear: input.taxYear,
        interestIncome: input.interestIncome,
        dividendIncome: input.dividendIncome,
        capitalGains: input.capitalGains,
        ordinaryIncome: input.ordinaryIncome,
        otherIncome: input.otherIncome,
        fiduciaryFees: input.fiduciaryFees,
        accountingFees: input.accountingFees,
        legalFees: input.legalFees,
        otherDeductions: input.otherDeductions,
        totalIncome,
        totalDeductions,
        distributableNetIncome,
        actualDistributions: input.actualDistributions,
        distributionDeduction,
        has65DayElection: input.has65DayElection,
        electionAmount: input.electionAmount,
      });

      if (!dniCalc) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save DNI calculation",
        });
      }

      return {
        success: true,
        dniCalculationId: dniCalc.id,
        totalIncome,
        totalDeductions,
        distributableNetIncome,
        distributionDeduction,
        taxableIncome: distributableNetIncome - distributionDeduction,
      };
    }),

  // Get DNI calculations
  getDNICalculations: protectedProcedure
    .input(
      z.object({
        trustAccountId: z.number().int(),
        taxYear: z.number().int().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify access
      const trustAccount = await db.getTrustAccountById(input.trustAccountId);
      if (!trustAccount || trustAccount.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return await db.getDNICalculationsByTrustId(input.trustAccountId, input.taxYear);
    }),
});
