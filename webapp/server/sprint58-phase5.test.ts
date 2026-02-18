import { describe, it, expect, beforeAll, vi } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";
import * as refundNotifications from "./services/refundNotifications";

// Mock refund email notifications
vi.mock("./services/refundNotifications", () => ({
  sendRefundConfirmationEmail: vi.fn().mockResolvedValue(true),
}));

describe("Sprint 58 Phase 5: Payment Refund Feature", () => {
  let mockContext: Context;

  beforeAll(() => {
    mockContext = {
      user: {
        id: 1,
        openId: "test-open-id-refund",
        name: "Test User Refund",
        email: "test-refund@example.com",
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
          origin: "https://test-refund.manus.space",
          host: "test-refund.manus.space",
        },
      } as any,
      res: {} as any,
    };
  });

  describe("Full Refund Processing", () => {
    it("should process a full refund for a successful payment", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Create and confirm a payment
      const checkout = await caller.stripePayment.createCheckoutSession({
        amount: 50000,
        serviceType: "form1041_filing",
        taxYear: 2025,
      });

      await caller.stripePayment.confirmPayment({
        id: checkout.transactionId,
        stripePaymentIntentId: "pi_test_refund_full",
      });

      // Process full refund
      const refund = await caller.stripePayment.processRefund({
        transactionId: checkout.transactionId,
        reason: "Customer requested full refund",
      });

      expect(refund.success).toBe(true);
      expect(refund.isFullRefund).toBe(true);
      expect(refund.amount).toBe(50000);
      expect(refund.refundId).toBeDefined();
    });

    it("should update transaction status to refunded after full refund", async () => {
      const caller = appRouter.createCaller(mockContext);

      const checkout = await caller.stripePayment.createCheckoutSession({
        amount: 30000,
        serviceType: "k1_preparation",
        taxYear: 2025,
      });

      await caller.stripePayment.confirmPayment({
        id: checkout.transactionId,
        stripePaymentIntentId: "pi_test_refund_status",
      });

      await caller.stripePayment.processRefund({
        transactionId: checkout.transactionId,
      });

      const payment = await caller.stripePayment.getPaymentById({
        id: checkout.transactionId,
      });

      expect(payment.status).toBe("refunded");
    });

    it("should send refund confirmation email after successful refund", async () => {
      const caller = appRouter.createCaller(mockContext);

      const checkout = await caller.stripePayment.createCheckoutSession({
        amount: 25000,
        serviceType: "tax_consultation",
        taxYear: 2025,
      });

      await caller.stripePayment.confirmPayment({
        id: checkout.transactionId,
        stripePaymentIntentId: "pi_test_refund_email",
      });

      await caller.stripePayment.processRefund({
        transactionId: checkout.transactionId,
        reason: "Test refund email",
      });

      // Verify email was called (mocked)
      expect(refundNotifications.sendRefundConfirmationEmail).toHaveBeenCalled();
    });
  });

  describe("Partial Refund Processing", () => {
    it("should process a partial refund", async () => {
      const caller = appRouter.createCaller(mockContext);

      const checkout = await caller.stripePayment.createCheckoutSession({
        amount: 100000,
        serviceType: "full_service",
        taxYear: 2025,
      });

      await caller.stripePayment.confirmPayment({
        id: checkout.transactionId,
        stripePaymentIntentId: "pi_test_partial_refund",
      });

      const refund = await caller.stripePayment.processRefund({
        transactionId: checkout.transactionId,
        amount: 50000, // Partial refund
        reason: "Partial service refund",
      });

      expect(refund.success).toBe(true);
      expect(refund.isFullRefund).toBe(false);
      expect(refund.amount).toBe(50000);
    });

    it("should update transaction status to partially_refunded", async () => {
      const caller = appRouter.createCaller(mockContext);

      const checkout = await caller.stripePayment.createCheckoutSession({
        amount: 75000,
        serviceType: "audit_support",
        taxYear: 2025,
      });

      await caller.stripePayment.confirmPayment({
        id: checkout.transactionId,
        stripePaymentIntentId: "pi_test_partial_status",
      });

      await caller.stripePayment.processRefund({
        transactionId: checkout.transactionId,
        amount: 25000,
      });

      const payment = await caller.stripePayment.getPaymentById({
        id: checkout.transactionId,
      });

      expect(payment.status).toBe("partially_refunded");
    });
  });

  describe("Refund Validation", () => {
    it("should reject refund for non-succeeded payment", async () => {
      const caller = appRouter.createCaller(mockContext);

      const checkout = await caller.stripePayment.createCheckoutSession({
        amount: 40000,
        serviceType: "form1041_filing",
        taxYear: 2025,
      });

      // Don't confirm payment, leave it pending

      await expect(
        caller.stripePayment.processRefund({
          transactionId: checkout.transactionId,
        })
      ).rejects.toThrow("Only successful payments can be refunded");
    });

    it("should reject refund amount exceeding original payment", async () => {
      const caller = appRouter.createCaller(mockContext);

      const checkout = await caller.stripePayment.createCheckoutSession({
        amount: 50000,
        serviceType: "k1_preparation",
        taxYear: 2025,
      });

      await caller.stripePayment.confirmPayment({
        id: checkout.transactionId,
        stripePaymentIntentId: "pi_test_refund_exceed",
      });

      await expect(
        caller.stripePayment.processRefund({
          transactionId: checkout.transactionId,
          amount: 60000, // Exceeds original
        })
      ).rejects.toThrow("Refund amount cannot exceed original payment amount");
    });

    it("should reject refund with invalid amount", async () => {
      const caller = appRouter.createCaller(mockContext);

      const checkout = await caller.stripePayment.createCheckoutSession({
        amount: 30000,
        serviceType: "tax_consultation",
        taxYear: 2025,
      });

      await caller.stripePayment.confirmPayment({
        id: checkout.transactionId,
        stripePaymentIntentId: "pi_test_refund_invalid",
      });

      await expect(
        caller.stripePayment.processRefund({
          transactionId: checkout.transactionId,
          amount: 0,
        })
      ).rejects.toThrow("Refund amount must be at least $0.01");
    });

    it("should reject refund for non-existent transaction", async () => {
      const caller = appRouter.createCaller(mockContext);

      await expect(
        caller.stripePayment.processRefund({
          transactionId: 999999,
        })
      ).rejects.toThrow("Transaction not found");
    });
  });

  describe("Refund Details Retrieval", () => {
    it("should retrieve refund details for a transaction", async () => {
      const caller = appRouter.createCaller(mockContext);

      const checkout = await caller.stripePayment.createCheckoutSession({
        amount: 45000,
        serviceType: "audit_support",
        taxYear: 2025,
      });

      await caller.stripePayment.confirmPayment({
        id: checkout.transactionId,
        stripePaymentIntentId: "pi_test_refund_details",
      });

      await caller.stripePayment.processRefund({
        transactionId: checkout.transactionId,
        amount: 20000,
      });

      const refundDetails = await caller.stripePayment.getRefundDetails({
        transactionId: checkout.transactionId,
      });

      expect(refundDetails).toBeDefined();
      expect(refundDetails.refunds).toBeDefined();
      expect(Array.isArray(refundDetails.refunds)).toBe(true);
    });

    it("should return empty refunds for transaction without refunds", async () => {
      const caller = appRouter.createCaller(mockContext);

      const checkout = await caller.stripePayment.createCheckoutSession({
        amount: 35000,
        serviceType: "form1041_filing",
        taxYear: 2025,
      });

      await caller.stripePayment.confirmPayment({
        id: checkout.transactionId,
        stripePaymentIntentId: "pi_test_no_refunds",
      });

      const refundDetails = await caller.stripePayment.getRefundDetails({
        transactionId: checkout.transactionId,
      });

      expect(refundDetails.refunds).toHaveLength(0);
    });
  });

  describe("Integration: Complete Refund Workflow", () => {
    it("should handle full payment lifecycle with refund", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Step 1: Create payment
      const checkout = await caller.stripePayment.createCheckoutSession({
        amount: 85000,
        serviceType: "full_service",
        taxYear: 2025,
        description: "Complete refund workflow test",
      });

      // Step 2: Confirm payment
      await caller.stripePayment.confirmPayment({
        id: checkout.transactionId,
        stripePaymentIntentId: "pi_test_full_workflow",
      });

      // Step 3: Verify payment succeeded
      let payment = await caller.stripePayment.getPaymentById({
        id: checkout.transactionId,
      });
      expect(payment.status).toBe("succeeded");

      // Step 4: Process refund
      const refund = await caller.stripePayment.processRefund({
        transactionId: checkout.transactionId,
        reason: "Complete workflow test refund",
      });

      expect(refund.success).toBe(true);

      // Step 5: Verify payment status updated
      payment = await caller.stripePayment.getPaymentById({
        id: checkout.transactionId,
      });
      expect(payment.status).toBe("refunded");

      // Step 6: Verify refund details
      const refundDetails = await caller.stripePayment.getRefundDetails({
        transactionId: checkout.transactionId,
      });
      expect(refundDetails.refunds.length).toBeGreaterThan(0);
    });

    it("should handle multiple partial refunds", async () => {
      const caller = appRouter.createCaller(mockContext);

      const checkout = await caller.stripePayment.createCheckoutSession({
        amount: 100000,
        serviceType: "full_service",
        taxYear: 2025,
      });

      await caller.stripePayment.confirmPayment({
        id: checkout.transactionId,
        stripePaymentIntentId: "pi_test_multiple_refunds",
      });

      // First partial refund
      const refund1 = await caller.stripePayment.processRefund({
        transactionId: checkout.transactionId,
        amount: 30000,
        reason: "First partial refund",
      });

      expect(refund1.success).toBe(true);
      expect(refund1.amount).toBe(30000);

      // Second partial refund
      const refund2 = await caller.stripePayment.processRefund({
        transactionId: checkout.transactionId,
        amount: 20000,
        reason: "Second partial refund",
      });

      expect(refund2.success).toBe(true);
      expect(refund2.amount).toBe(20000);

      // Verify refund details shows both refunds
      const refundDetails = await caller.stripePayment.getRefundDetails({
        transactionId: checkout.transactionId,
      });

      expect(refundDetails.refunds.length).toBeGreaterThanOrEqual(2);
    });
  });
});
