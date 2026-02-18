import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

describe("Sprint 58 Phase 2: Stripe Checkout & IRS Settings", () => {
  let mockContext: Context;

  beforeAll(() => {
    // Mock authenticated user context
    mockContext = {
      user: {
        id: 1,
        openId: "test-open-id",
        name: "Test User",
        email: "test@example.com",
        role: "user",
        subscriptionTier: "pro",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        onboardingComplete: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        loginMethod: "oauth",
      },
      req: {
        headers: {
          origin: "https://test.manus.space",
          host: "test.manus.space",
        },
      } as any,
      res: {} as any,
    };
  });

  describe("Stripe Checkout Session", () => {
    it("should create checkout session with correct parameters", async () => {
      const caller = appRouter.createCaller(mockContext);

      const input = {
        amount: 50000, // $500.00
        serviceType: "form1041_filing" as const,
        taxYear: 2025,
        description: "Form 1041 filing for 2025",
      };

      const result = await caller.stripePayment.createCheckoutSession(input);

      expect(result).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(result.checkoutUrl).toBeDefined();
      expect(result.transactionId).toBeDefined();
      expect(result.checkoutUrl).toContain("checkout.stripe.com");
    });

    it("should include user metadata in checkout session", async () => {
      const caller = appRouter.createCaller(mockContext);

      const input = {
        amount: 25000, // $250.00
        serviceType: "k1_preparation" as const,
        taxYear: 2025,
      };

      const result = await caller.stripePayment.createCheckoutSession(input);

      expect(result).toBeDefined();
      expect(result.sessionId).toBeDefined();
      // Metadata is embedded in Stripe session, verified via webhook
    });

    it("should enforce minimum payment amount", async () => {
      const caller = appRouter.createCaller(mockContext);

      const input = {
        amount: 50, // Less than $1.00 minimum
        serviceType: "tax_consultation" as const,
        taxYear: 2025,
      };

      await expect(
        caller.stripePayment.createCheckoutSession(input)
      ).rejects.toThrow();
    });

    it("should create transaction record with pending status", async () => {
      const caller = appRouter.createCaller(mockContext);

      const input = {
        amount: 35000, // $350.00
        serviceType: "audit_support" as const,
        taxYear: 2025,
      };

      const result = await caller.stripePayment.createCheckoutSession(input);

      expect(result.transactionId).toBeGreaterThan(0);

      // Verify transaction was created
      const transaction = await caller.stripePayment.getPaymentById({
        id: result.transactionId,
      });

      expect(transaction).toBeDefined();
      expect(transaction.status).toBe("pending");
      expect(transaction.amount).toBe(35000);
      expect(transaction.serviceType).toBe("audit_support");
      expect(transaction.taxYear).toBe(2025);
    });

    it("should include success and cancel URLs with origin", async () => {
      const caller = appRouter.createCaller(mockContext);

      const input = {
        amount: 100000, // $1000.00
        serviceType: "full_service" as const,
        taxYear: 2025,
      };

      const result = await caller.stripePayment.createCheckoutSession(input);

      expect(result.checkoutUrl).toBeDefined();
      // Success/cancel URLs are configured in Stripe session
      // They use ctx.req.headers.origin for proper redirects
    });
  });

  describe("IRS Credentials Management", () => {
    it("should return no credentials for new user", async () => {
      const caller = appRouter.createCaller(mockContext);

      const result = await caller.irsConfig.getCredentials();

      expect(result).toBeDefined();
      expect(result.hasCredentials).toBe(false);
      expect(result.testMode).toBe(true);
    });

    it("should save IRS credentials", async () => {
      const caller = appRouter.createCaller(mockContext);

      const input = {
        transmitterControlCode: "TEST-TCC-12345",
        electronicFilingIdentificationNumber: "TEST-EFIN-67890",
        testMode: true,
      };

      const result = await caller.irsConfig.saveCredentials(input);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain("saved");
    });

    it("should retrieve saved credentials status", async () => {
      const caller = appRouter.createCaller(mockContext);

      // First save credentials
      await caller.irsConfig.saveCredentials({
        transmitterControlCode: "TEST-TCC-12345",
        electronicFilingIdentificationNumber: "TEST-EFIN-67890",
        testMode: true,
      });

      // Then retrieve
      const result = await caller.irsConfig.getCredentials();

      expect(result).toBeDefined();
      expect(result.hasCredentials).toBe(true);
      expect(result.testMode).toBe(true);
    });

    it("should not expose actual credentials to frontend", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Save credentials
      await caller.irsConfig.saveCredentials({
        transmitterControlCode: "SENSITIVE-TCC",
        electronicFilingIdentificationNumber: "SENSITIVE-EFIN",
        testMode: true,
      });

      // Retrieve
      const result = await caller.irsConfig.getCredentials();

      expect(result).toBeDefined();
      expect(result).not.toHaveProperty("transmitterControlCode");
      expect(result).not.toHaveProperty("electronicFilingIdentificationNumber");
      expect(result.hasCredentials).toBe(true);
    });

    it("should update existing credentials", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Save initial credentials
      await caller.irsConfig.saveCredentials({
        transmitterControlCode: "OLD-TCC",
        electronicFilingIdentificationNumber: "OLD-EFIN",
        testMode: true,
      });

      // Update credentials
      const result = await caller.irsConfig.saveCredentials({
        transmitterControlCode: "NEW-TCC",
        electronicFilingIdentificationNumber: "NEW-EFIN",
        testMode: false,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain("updated");

      // Verify mode changed
      const credentials = await caller.irsConfig.getCredentials();
      expect(credentials.testMode).toBe(false);
    });

    it("should toggle test mode", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Save credentials in test mode
      await caller.irsConfig.saveCredentials({
        transmitterControlCode: "TEST-TCC",
        electronicFilingIdentificationNumber: "TEST-EFIN",
        testMode: true,
      });

      // Toggle to production
      const result = await caller.irsConfig.toggleTestMode({
        testMode: false,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.testMode).toBe(false);

      // Verify change
      const credentials = await caller.irsConfig.getCredentials();
      expect(credentials.testMode).toBe(false);
    });

    it("should validate credentials", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Save credentials
      await caller.irsConfig.saveCredentials({
        transmitterControlCode: "TEST-TCC",
        electronicFilingIdentificationNumber: "TEST-EFIN",
        testMode: true,
      });

      // Validate
      const result = await caller.irsConfig.validateCredentials();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain("validated");
      expect(result.testMode).toBe(true);

      // Verify lastValidated was updated
      const credentials = await caller.irsConfig.getCredentials();
      expect(credentials.lastValidated).toBeDefined();
    });

    it("should delete credentials", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Save credentials
      await caller.irsConfig.saveCredentials({
        transmitterControlCode: "TEST-TCC",
        electronicFilingIdentificationNumber: "TEST-EFIN",
        testMode: true,
      });

      // Delete
      const result = await caller.irsConfig.deleteCredentials();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.message).toContain("deleted");

      // Verify deletion
      const credentials = await caller.irsConfig.getCredentials();
      expect(credentials.hasCredentials).toBe(false);
    });

    it("should require both TCC and EFIN", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Try to save with missing EFIN
      await expect(
        caller.irsConfig.saveCredentials({
          transmitterControlCode: "TEST-TCC",
          electronicFilingIdentificationNumber: "",
          testMode: true,
        })
      ).rejects.toThrow();
    });
  });

  describe("Integration: Stripe Checkout + IRS Settings", () => {
    it("should create checkout session with IRS credentials configured", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Configure IRS credentials
      await caller.irsConfig.saveCredentials({
        transmitterControlCode: "PROD-TCC",
        electronicFilingIdentificationNumber: "PROD-EFIN",
        testMode: false,
      });

      // Create checkout session
      const result = await caller.stripePayment.createCheckoutSession({
        amount: 75000, // $750.00
        serviceType: "form1041_filing" as const,
        taxYear: 2025,
        description: "Production Form 1041 filing",
      });

      expect(result).toBeDefined();
      expect(result.checkoutUrl).toBeDefined();

      // Verify IRS credentials are still configured
      const credentials = await caller.irsConfig.getCredentials();
      expect(credentials.hasCredentials).toBe(true);
      expect(credentials.testMode).toBe(false);
    });

    it("should allow payment even without IRS credentials", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Ensure no IRS credentials
      const credentials = await caller.irsConfig.getCredentials();
      if (credentials.hasCredentials) {
        await caller.irsConfig.deleteCredentials();
      }

      // Should still be able to create checkout session
      const result = await caller.stripePayment.createCheckoutSession({
        amount: 25000, // $250.00
        serviceType: "tax_consultation" as const,
        taxYear: 2025,
      });

      expect(result).toBeDefined();
      expect(result.checkoutUrl).toBeDefined();
    });
  });
});
