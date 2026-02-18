import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

describe("Trust Accounting Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;
  let trustAccountId: number;

  beforeAll(() => {
    const mockContext: Context = {
      user: {
        id: 1,
        openId: "test-user",
        name: "Test User",
        email: "test@example.com",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        avatar: null,
        bio: null,
        timezone: null,
        lastLoginAt: null,
        isActive: true,
      },
      req: {} as any,
      res: {} as any,
    };

    caller = appRouter.createCaller(mockContext);
  });

  describe("createTrustAccount", () => {
    it("should create a new trust account with valid data", async () => {
      const result = await caller.trustAccounting.createTrustAccount({
        trustName: "Test Family Trust",
        ein: "12-3456789",
        taxYear: 2024,
        trustType: "complex",
        fiscalYearEnd: "12-31",
        beneficiaries: [
          {
            name: "John Doe",
            ssn: "123-45-6789",
            relationship: "Son",
            distributionPercentage: 50,
          },
          {
            name: "Jane Doe",
            ssn: "987-65-4321",
            relationship: "Daughter",
            distributionPercentage: 50,
          },
        ],
        fiduciaries: [
          {
            name: "Smith Law Firm",
            title: "Trustee",
            address: "123 Main St, City, State 12345",
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.trustAccountId).toBeGreaterThan(0);
      expect(result.message).toBe("Trust account created successfully");
      
      trustAccountId = result.trustAccountId;
    });

    it("should reject invalid EIN format", async () => {
      await expect(
        caller.trustAccounting.createTrustAccount({
          trustName: "Invalid Trust",
          ein: "123456789", // Missing hyphen
          taxYear: 2024,
          trustType: "simple",
        })
      ).rejects.toThrow();
    });

    it("should reject invalid tax year", async () => {
      await expect(
        caller.trustAccounting.createTrustAccount({
          trustName: "Invalid Trust",
          ein: "12-3456789",
          taxYear: 1800, // Too old
          trustType: "simple",
        })
      ).rejects.toThrow();
    });
  });

  describe("getTrustAccounts", () => {
    it("should retrieve trust accounts for user", async () => {
      const result = await caller.trustAccounting.getTrustAccounts({});
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("trustName");
      expect(result[0]).toHaveProperty("ein");
      expect(result[0]).toHaveProperty("taxYear");
    });

    it("should filter by tax year", async () => {
      const result = await caller.trustAccounting.getTrustAccounts({
        taxYear: 2024,
      });
      
      expect(Array.isArray(result)).toBe(true);
      result.forEach(account => {
        expect(account.taxYear).toBe(2024);
      });
    });

    it("should filter by status", async () => {
      const result = await caller.trustAccounting.getTrustAccounts({
        status: "active",
      });
      
      expect(Array.isArray(result)).toBe(true);
      result.forEach(account => {
        expect(account.status).toBe("active");
      });
    });
  });

  describe("getChartOfAccounts", () => {
    it("should retrieve default chart of accounts", async () => {
      const result = await caller.trustAccounting.getChartOfAccounts({
        trustAccountId,
      });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Check for default accounts
      const cashAccount = result.find(a => a.accountNumber === "1000");
      expect(cashAccount).toBeDefined();
      expect(cashAccount?.accountName).toBe("Cash - Operating");
      expect(cashAccount?.accountType).toBe("asset");
      
      const interestIncome = result.find(a => a.accountNumber === "4000");
      expect(interestIncome).toBeDefined();
      expect(interestIncome?.accountName).toBe("Interest Income");
      expect(interestIncome?.accountType).toBe("income");
    });
  });

  describe("createJournalEntry", () => {
    it("should create a balanced journal entry", async () => {
      const chartOfAccounts = await caller.trustAccounting.getChartOfAccounts({
        trustAccountId,
      });

      const cashAccount = chartOfAccounts.find(a => a.accountNumber === "1000");
      const interestAccount = chartOfAccounts.find(a => a.accountNumber === "4000");

      expect(cashAccount).toBeDefined();
      expect(interestAccount).toBeDefined();

      const result = await caller.trustAccounting.createJournalEntry({
        trustAccountId,
        entryDate: new Date("2024-01-15"),
        description: "Record interest income",
        reference: "Bank Statement 01/2024",
        basis: "both",
        lines: [
          {
            ledgerAccountId: cashAccount!.id,
            lineType: "debit",
            amountInCents: 50000, // $500.00
            memo: "Interest received",
          },
          {
            ledgerAccountId: interestAccount!.id,
            lineType: "credit",
            amountInCents: 50000, // $500.00
            memo: "Interest income",
          },
        ],
      });

      expect(result.success).toBe(true);
      expect(result.journalEntryId).toBeGreaterThan(0);
      expect(result.entryNumber).toMatch(/^JE-2024-\d{4}$/);
    });

    it("should reject unbalanced journal entry", async () => {
      const chartOfAccounts = await caller.trustAccounting.getChartOfAccounts({
        trustAccountId,
      });

      const cashAccount = chartOfAccounts.find(a => a.accountNumber === "1000");
      const interestAccount = chartOfAccounts.find(a => a.accountNumber === "4000");

      await expect(
        caller.trustAccounting.createJournalEntry({
          trustAccountId,
          entryDate: new Date(),
          description: "Unbalanced entry",
          basis: "both",
          lines: [
            {
              ledgerAccountId: cashAccount!.id,
              lineType: "debit",
              amountInCents: 50000,
              memo: "Debit",
            },
            {
              ledgerAccountId: interestAccount!.id,
              lineType: "credit",
              amountInCents: 30000, // Not equal!
              memo: "Credit",
            },
          ],
        })
      ).rejects.toThrow(/Debits.*must equal credits/);
    });

    it("should require at least 2 lines", async () => {
      const chartOfAccounts = await caller.trustAccounting.getChartOfAccounts({
        trustAccountId,
      });

      const cashAccount = chartOfAccounts.find(a => a.accountNumber === "1000");

      await expect(
        caller.trustAccounting.createJournalEntry({
          trustAccountId,
          entryDate: new Date(),
          description: "Single line entry",
          basis: "both",
          lines: [
            {
              ledgerAccountId: cashAccount!.id,
              lineType: "debit",
              amountInCents: 50000,
              memo: "Only one line",
            },
          ],
        })
      ).rejects.toThrow();
    });
  });

  describe("getJournalEntries", () => {
    it("should retrieve journal entries for trust account", async () => {
      const result = await caller.trustAccounting.getJournalEntries({
        trustAccountId,
      });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("entryNumber");
      expect(result[0]).toHaveProperty("description");
    });

    it("should filter by date range", async () => {
      const result = await caller.trustAccounting.getJournalEntries({
        trustAccountId,
        startDate: new Date("2024-01-01"),
        endDate: new Date("2024-12-31"),
      });
      
      expect(Array.isArray(result)).toBe(true);
      result.forEach(entry => {
        const entryDate = new Date(entry.entryDate);
        expect(entryDate >= new Date("2024-01-01")).toBe(true);
        expect(entryDate <= new Date("2024-12-31")).toBe(true);
      });
    });
  });

  describe("getTrialBalance", () => {
    it("should calculate trial balance", async () => {
      const result = await caller.trustAccounting.getTrialBalance({
        trustAccountId,
        asOfDate: new Date("2024-12-31"),
        basis: "both",
      });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Check that each account has balance fields
      result.forEach(account => {
        expect(account).toHaveProperty("debitBalance");
        expect(account).toHaveProperty("creditBalance");
        expect(account).toHaveProperty("netBalance");
      });
      
      // Verify debits = credits
      const totalDebits = result.reduce((sum, a: any) => sum + a.debitBalance, 0);
      const totalCredits = result.reduce((sum, a: any) => sum + a.creditBalance, 0);
      expect(totalDebits).toBe(totalCredits);
    });
  });

  describe("calculateDNI", () => {
    it("should calculate distributable net income", async () => {
      const result = await caller.trustAccounting.calculateDNI({
        trustAccountId,
        taxYear: 2024,
        interestIncome: 50000, // $500.00
        dividendIncome: 30000, // $300.00
        capitalGains: 20000, // $200.00
        ordinaryIncome: 10000, // $100.00
        otherIncome: 5000, // $50.00
        fiduciaryFees: 15000, // $150.00
        accountingFees: 10000, // $100.00
        legalFees: 5000, // $50.00
        otherDeductions: 2000, // $20.00
        actualDistributions: 80000, // $800.00
        has65DayElection: false,
        electionAmount: 0,
      });

      expect(result.success).toBe(true);
      expect(result.dniCalculationId).toBeGreaterThan(0);
      
      // Total income = $1,150
      expect(result.totalIncome).toBe(115000);
      
      // Total deductions = $320
      expect(result.totalDeductions).toBe(32000);
      
      // DNI = $1,150 - $320 = $830
      expect(result.distributableNetIncome).toBe(83000);
      
      // Distribution deduction = min(DNI, actual distributions) = min($830, $800) = $800
      expect(result.distributionDeduction).toBe(80000);
      
      // Taxable income = DNI - distribution deduction = $830 - $800 = $30
      expect(result.taxableIncome).toBe(3000);
    });

    it("should handle 65-day election", async () => {
      const result = await caller.trustAccounting.calculateDNI({
        trustAccountId,
        taxYear: 2024,
        interestIncome: 50000,
        dividendIncome: 30000,
        capitalGains: 0,
        ordinaryIncome: 0,
        otherIncome: 0,
        fiduciaryFees: 10000,
        accountingFees: 5000,
        legalFees: 0,
        otherDeductions: 0,
        actualDistributions: 50000,
        has65DayElection: true,
        electionAmount: 10000, // $100.00 elected
      });

      expect(result.success).toBe(true);
      expect(result.dniCalculationId).toBeGreaterThan(0);
    });
  });

  describe("getDNICalculations", () => {
    it("should retrieve DNI calculations for trust account", async () => {
      const result = await caller.trustAccounting.getDNICalculations({
        trustAccountId,
      });
      
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("totalIncome");
      expect(result[0]).toHaveProperty("totalDeductions");
      expect(result[0]).toHaveProperty("distributableNetIncome");
    });

    it("should filter by tax year", async () => {
      const result = await caller.trustAccounting.getDNICalculations({
        trustAccountId,
        taxYear: 2024,
      });
      
      expect(Array.isArray(result)).toBe(true);
      result.forEach(calc => {
        expect(calc.taxYear).toBe(2024);
      });
    });
  });
});
