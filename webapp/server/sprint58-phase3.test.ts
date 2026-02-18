import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

describe("Sprint 58 Phase 3: Payment Success/Cancel Pages & Navigation", () => {
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

  describe("Payment Success Flow", () => {
    it("should create checkout session and retrieve by session ID", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Create checkout session
      const checkoutResult = await caller.stripePayment.createCheckoutSession({
        amount: 50000,
        serviceType: "form1041_filing",
        taxYear: 2025,
        description: "Test Form 1041 filing",
      });

      expect(checkoutResult).toBeDefined();
      expect(checkoutResult.sessionId).toBeDefined();
      expect(checkoutResult.transactionId).toBeDefined();

      // Retrieve payment by transaction ID
      const payment = await caller.stripePayment.getPaymentById({
        id: checkoutResult.transactionId,
      });

      expect(payment).toBeDefined();
      expect(payment.amount).toBe(50000);
      expect(payment.serviceType).toBe("form1041_filing");
      expect(payment.status).toBe("pending");
    });

    it("should handle payment retrieval with invalid session ID", async () => {
      const caller = appRouter.createCaller(mockContext);

      await expect(
        caller.stripePayment.getPaymentBySessionId({
          sessionId: "invalid_session_id",
        })
      ).rejects.toThrow("Payment transaction not found");
    });

    it("should return payment history for user", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Create a few test payments
      await caller.stripePayment.createCheckoutSession({
        amount: 25000,
        serviceType: "k1_preparation",
        taxYear: 2025,
      });

      await caller.stripePayment.createCheckoutSession({
        amount: 35000,
        serviceType: "tax_consultation",
        taxYear: 2025,
      });

      // Get payment history
      const history = await caller.stripePayment.getPaymentHistory({
        limit: 10,
      });

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThanOrEqual(2);
    });

    it("should calculate payment statistics correctly", async () => {
      const caller = appRouter.createCaller(mockContext);

      const stats = await caller.stripePayment.getPaymentStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("totalPaid");
      expect(stats).toHaveProperty("totalPending");
      expect(stats).toHaveProperty("totalTransactions");
      expect(stats).toHaveProperty("averagePayment");
      expect(typeof stats.totalPaid).toBe("number");
      expect(typeof stats.totalTransactions).toBe("number");
    });
  });

  describe("Payment Cancel Flow", () => {
    it("should allow canceling pending payments", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Create a payment
      const checkoutResult = await caller.stripePayment.createCheckoutSession({
        amount: 40000,
        serviceType: "audit_support",
        taxYear: 2025,
      });

      // Cancel the payment
      const result = await caller.stripePayment.cancelPayment({
        id: checkoutResult.transactionId,
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Verify status changed
      const payment = await caller.stripePayment.getPaymentById({
        id: checkoutResult.transactionId,
      });

      expect(payment.status).toBe("canceled");
    });

    it("should not allow canceling already succeeded payments", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Create a payment
      const checkoutResult = await caller.stripePayment.createCheckoutSession({
        amount: 30000,
        serviceType: "k1_preparation",
        taxYear: 2025,
      });

      // Manually update to succeeded status (simulating webhook)
      await caller.stripePayment.confirmPayment({
        id: checkoutResult.transactionId,
        stripePaymentIntentId: "pi_test_succeeded",
      });

      // Try to cancel
      await expect(
        caller.stripePayment.cancelPayment({
          id: checkoutResult.transactionId,
        })
      ).rejects.toThrow();
    });
  });

  describe("IRS Settings Navigation", () => {
    it("should retrieve IRS credentials status", async () => {
      const caller = appRouter.createCaller(mockContext);

      const credentials = await caller.irsConfig.getCredentials();

      expect(credentials).toBeDefined();
      expect(credentials).toHaveProperty("hasCredentials");
      expect(credentials).toHaveProperty("testMode");
      expect(typeof credentials.hasCredentials).toBe("boolean");
      expect(typeof credentials.testMode).toBe("boolean");
    });

    it("should save and retrieve IRS credentials", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Save credentials
      await caller.irsConfig.saveCredentials({
        transmitterControlCode: "TEST-TCC-PHASE3",
        electronicFilingIdentificationNumber: "TEST-EFIN-PHASE3",
        testMode: true,
      });

      // Retrieve status
      const credentials = await caller.irsConfig.getCredentials();

      expect(credentials.hasCredentials).toBe(true);
      expect(credentials.testMode).toBe(true);
      expect(credentials).not.toHaveProperty("transmitterControlCode");
      expect(credentials).not.toHaveProperty("electronicFilingIdentificationNumber");
    });
  });

  describe("Integration: Complete Payment Flow", () => {
    it("should handle complete payment lifecycle", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Step 1: Create checkout session
      const checkoutResult = await caller.stripePayment.createCheckoutSession({
        amount: 75000,
        serviceType: "full_service",
        taxYear: 2025,
        description: "Complete tax preparation service",
      });

      expect(checkoutResult.checkoutUrl).toBeDefined();
      expect(checkoutResult.sessionId).toBeDefined();

      // Step 2: Verify payment is pending
      let payment = await caller.stripePayment.getPaymentById({
        id: checkoutResult.transactionId,
      });

      expect(payment.status).toBe("pending");

      // Step 3: Simulate successful payment (webhook would do this)
      await caller.stripePayment.confirmPayment({
        id: checkoutResult.transactionId,
        stripePaymentIntentId: "pi_test_complete_flow",
      });

      // Step 4: Verify payment is succeeded
      payment = await caller.stripePayment.getPaymentById({
        id: checkoutResult.transactionId,
      });

      expect(payment.status).toBe("succeeded");

      // Step 5: Verify it appears in payment history
      const history = await caller.stripePayment.getPaymentHistory({
        limit: 10,
      });

      const foundPayment = history.find((p) => p.id === checkoutResult.transactionId);
      expect(foundPayment).toBeDefined();
      expect(foundPayment?.status).toBe("succeeded");

      // Step 6: Verify stats are updated
      const stats = await caller.stripePayment.getPaymentStats();
      expect(stats.totalPaid).toBeGreaterThan(0);
      expect(stats.totalTransactions).toBeGreaterThan(0);
    });

    it("should handle payment cancellation flow", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Step 1: Create checkout session
      const checkoutResult = await caller.stripePayment.createCheckoutSession({
        amount: 20000,
        serviceType: "tax_consultation",
        taxYear: 2025,
      });

      // Step 2: User cancels on Stripe checkout page
      await caller.stripePayment.cancelPayment({
        id: checkoutResult.transactionId,
      });

      // Step 3: Verify payment is canceled
      const payment = await caller.stripePayment.getPaymentById({
        id: checkoutResult.transactionId,
      });

      expect(payment.status).toBe("canceled");

      // Step 4: Verify canceled payment appears in history
      const history = await caller.stripePayment.getPaymentHistory({
        limit: 10,
      });

      const foundPayment = history.find((p) => p.id === checkoutResult.transactionId);
      expect(foundPayment).toBeDefined();
      expect(foundPayment?.status).toBe("canceled");
    });

    it("should handle payment with IRS credentials configured", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Configure IRS credentials
      await caller.irsConfig.saveCredentials({
        transmitterControlCode: "PROD-TCC-INTEGRATION",
        electronicFilingIdentificationNumber: "PROD-EFIN-INTEGRATION",
        testMode: false,
      });

      // Create payment for Form 1041 filing
      const checkoutResult = await caller.stripePayment.createCheckoutSession({
        amount: 100000,
        serviceType: "form1041_filing",
        taxYear: 2025,
        description: "Form 1041 with IRS credentials configured",
      });

      expect(checkoutResult).toBeDefined();

      // Verify IRS credentials are still configured
      const credentials = await caller.irsConfig.getCredentials();
      expect(credentials.hasCredentials).toBe(true);
      expect(credentials.testMode).toBe(false);

      // Complete payment
      await caller.stripePayment.confirmPayment({
        id: checkoutResult.transactionId,
        stripePaymentIntentId: "pi_test_with_irs_creds",
      });

      // Verify payment succeeded
      const payment = await caller.stripePayment.getPaymentById({
        id: checkoutResult.transactionId,
      });

      expect(payment.status).toBe("succeeded");
      expect(payment.serviceType).toBe("form1041_filing");
    });
  });
});
