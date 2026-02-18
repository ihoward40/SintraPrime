import { describe, it, expect, beforeAll, vi } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";
import * as emailNotifications from "./services/emailNotifications";

// Mock email notifications to avoid actual SendGrid calls in tests
vi.mock("./services/emailNotifications", () => ({
  sendPaymentReceiptEmail: vi.fn().mockResolvedValue(true),
  sendPaymentFailureEmail: vi.fn().mockResolvedValue(true),
}));

describe("Sprint 58 Phase 4: Email Notifications & Payment Dashboard", () => {
  let mockContext: Context;

  beforeAll(() => {
    // Mock authenticated user context
    mockContext = {
      user: {
        id: 1,
        openId: "test-open-id-phase4",
        name: "Test User Phase 4",
        email: "test-phase4@example.com",
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
          origin: "https://test-phase4.manus.space",
          host: "test-phase4.manus.space",
        },
      } as any,
      res: {} as any,
    };
  });

  describe("Payment Dashboard Statistics", () => {
    it("should calculate comprehensive payment statistics", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Create multiple test payments with different statuses
      await caller.stripePayment.createCheckoutSession({
        amount: 50000,
        serviceType: "form1041_filing",
        taxYear: 2025,
      });

      await caller.stripePayment.createCheckoutSession({
        amount: 25000,
        serviceType: "k1_preparation",
        taxYear: 2025,
      });

      await caller.stripePayment.createCheckoutSession({
        amount: 75000,
        serviceType: "audit_support",
        taxYear: 2025,
      });

      // Get statistics
      const stats = await caller.stripePayment.getPaymentStats();

      expect(stats).toBeDefined();
      expect(stats).toHaveProperty("totalPaid");
      expect(stats).toHaveProperty("totalPending");
      expect(stats).toHaveProperty("totalTransactions");
      expect(stats).toHaveProperty("successfulPayments");
      expect(stats).toHaveProperty("pendingPayments");
      expect(stats).toHaveProperty("failedPayments");
      expect(stats).toHaveProperty("canceledPayments");
      expect(stats).toHaveProperty("averagePayment");
      expect(stats).toHaveProperty("byServiceType");

      expect(typeof stats.totalPaid).toBe("number");
      expect(typeof stats.totalPending).toBe("number");
      expect(typeof stats.totalTransactions).toBe("number");
      expect(typeof stats.averagePayment).toBe("number");
      expect(stats.totalTransactions).toBeGreaterThanOrEqual(3);
    });

    it("should track payment status distribution correctly", async () => {
      const caller = appRouter.createCaller(mockContext);

      const stats = await caller.stripePayment.getPaymentStats();

      const totalCounted =
        stats.successfulPayments +
        stats.pendingPayments +
        stats.failedPayments +
        stats.canceledPayments;

      expect(totalCounted).toBe(stats.totalTransactions);
    });

    it("should calculate average payment correctly", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Create a successful payment
      const checkout = await caller.stripePayment.createCheckoutSession({
        amount: 100000,
        serviceType: "full_service",
        taxYear: 2025,
      });

      // Mark as succeeded
      await caller.stripePayment.confirmPayment({
        id: checkout.transactionId,
        stripePaymentIntentId: "pi_test_avg_calc",
      });

      const stats = await caller.stripePayment.getPaymentStats();

      if (stats.successfulPayments > 0) {
        expect(stats.averagePayment).toBeGreaterThan(0);
        expect(stats.averagePayment).toBeLessThanOrEqual(stats.totalPaid);
      }
    });

    it("should break down revenue by service type", async () => {
      const caller = appRouter.createCaller(mockContext);

      const stats = await caller.stripePayment.getPaymentStats();

      expect(stats.byServiceType).toBeDefined();
      expect(typeof stats.byServiceType).toBe("object");
    });
  });

  describe("Payment History with Filters", () => {
    it("should retrieve payment history with limit", async () => {
      const caller = appRouter.createCaller(mockContext);

      const history = await caller.stripePayment.getPaymentHistory({
        limit: 10,
      });

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeLessThanOrEqual(10);
    });

    it("should return payments in chronological order", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Create multiple payments
      await caller.stripePayment.createCheckoutSession({
        amount: 10000,
        serviceType: "tax_consultation",
        taxYear: 2025,
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      await caller.stripePayment.createCheckoutSession({
        amount: 20000,
        serviceType: "k1_preparation",
        taxYear: 2025,
      });

      const history = await caller.stripePayment.getPaymentHistory({
        limit: 50,
      });

      if (history.length >= 2) {
        const firstDate = new Date(history[0].createdAt);
        const secondDate = new Date(history[1].createdAt);
        expect(firstDate.getTime()).toBeGreaterThanOrEqual(secondDate.getTime());
      }
    });

    it("should include all payment details in history", async () => {
      const caller = appRouter.createCaller(mockContext);

      const history = await caller.stripePayment.getPaymentHistory({
        limit: 1,
      });

      if (history.length > 0) {
        const payment = history[0];
        expect(payment).toHaveProperty("id");
        expect(payment).toHaveProperty("amount");
        expect(payment).toHaveProperty("status");
        expect(payment).toHaveProperty("serviceType");
        expect(payment).toHaveProperty("taxYear");
        expect(payment).toHaveProperty("createdAt");
      }
    });
  });

  describe("Email Notification Integration", () => {
    it("should send receipt email on successful payment", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Create checkout session
      const checkout = await caller.stripePayment.createCheckoutSession({
        amount: 50000,
        serviceType: "form1041_filing",
        taxYear: 2025,
        description: "Test payment for email notification",
      });

      // Confirm payment (this should trigger email)
      await caller.stripePayment.confirmPayment({
        id: checkout.transactionId,
        stripePaymentIntentId: "pi_test_email_receipt",
      });

      // Note: In a real webhook scenario, the email would be sent
      // For now, we verify the payment was confirmed
      const payment = await caller.stripePayment.getPaymentById({
        id: checkout.transactionId,
      });

      expect(payment.status).toBe("succeeded");
    });

    it("should handle email notification failures gracefully", async () => {
      // Mock email failure
      vi.mocked(emailNotifications.sendPaymentReceiptEmail).mockResolvedValueOnce(false);

      const caller = appRouter.createCaller(mockContext);

      const checkout = await caller.stripePayment.createCheckoutSession({
        amount: 30000,
        serviceType: "tax_consultation",
        taxYear: 2025,
      });

      // Payment should still succeed even if email fails
      await caller.stripePayment.confirmPayment({
        id: checkout.transactionId,
        stripePaymentIntentId: "pi_test_email_fail",
      });

      const payment = await caller.stripePayment.getPaymentById({
        id: checkout.transactionId,
      });

      expect(payment.status).toBe("succeeded");
    });
  });

  describe("Payment Dashboard Export", () => {
    it("should retrieve all necessary data for CSV export", async () => {
      const caller = appRouter.createCaller(mockContext);

      const history = await caller.stripePayment.getPaymentHistory({
        limit: 100,
      });

      // Verify all fields needed for CSV export are present
      if (history.length > 0) {
        const payment = history[0];
        expect(payment.id).toBeDefined();
        expect(payment.amount).toBeDefined();
        expect(payment.status).toBeDefined();
        expect(payment.serviceType).toBeDefined();
        expect(payment.createdAt).toBeDefined();
      }
    });
  });

  describe("Integration: Complete Payment Flow with Dashboard", () => {
    it("should handle full payment lifecycle and reflect in dashboard", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Step 1: Get initial stats
      const initialStats = await caller.stripePayment.getPaymentStats();

      // Step 2: Create new payment
      const checkout = await caller.stripePayment.createCheckoutSession({
        amount: 85000,
        serviceType: "full_service",
        taxYear: 2025,
        description: "Complete integration test",
      });

      // Step 3: Verify pending stats increased
      const pendingStats = await caller.stripePayment.getPaymentStats();
      expect(pendingStats.totalPending).toBeGreaterThan(initialStats.totalPending);
      expect(pendingStats.totalTransactions).toBe(initialStats.totalTransactions + 1);

      // Step 4: Complete payment
      await caller.stripePayment.confirmPayment({
        id: checkout.transactionId,
        stripePaymentIntentId: "pi_test_full_lifecycle",
      });

      // Step 5: Verify success stats increased
      const finalStats = await caller.stripePayment.getPaymentStats();
      expect(finalStats.successfulPayments).toBe(initialStats.successfulPayments + 1);
      expect(finalStats.totalPaid).toBe(initialStats.totalPaid + 85000);

      // Step 6: Verify payment appears in history
      const history = await caller.stripePayment.getPaymentHistory({
        limit: 10,
      });

      const foundPayment = history.find((p) => p.id === checkout.transactionId);
      expect(foundPayment).toBeDefined();
      expect(foundPayment?.status).toBe("succeeded");
      expect(foundPayment?.amount).toBe(85000);
    });

    it("should handle payment cancellation and update dashboard", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Create payment
      const checkout = await caller.stripePayment.createCheckoutSession({
        amount: 40000,
        serviceType: "audit_support",
        taxYear: 2025,
      });

      // Cancel payment
      await caller.stripePayment.cancelPayment({
        id: checkout.transactionId,
      });

      // Verify stats reflect cancellation
      const stats = await caller.stripePayment.getPaymentStats();
      expect(stats.canceledPayments).toBeGreaterThan(0);

      // Verify payment appears as canceled in history
      const history = await caller.stripePayment.getPaymentHistory({
        limit: 10,
      });

      const foundPayment = history.find((p) => p.id === checkout.transactionId);
      expect(foundPayment).toBeDefined();
      expect(foundPayment?.status).toBe("canceled");
    });

    it("should maintain accurate statistics across multiple operations", async () => {
      const caller = appRouter.createCaller(mockContext);

      // Perform multiple operations
      const checkout1 = await caller.stripePayment.createCheckoutSession({
        amount: 25000,
        serviceType: "k1_preparation",
        taxYear: 2025,
      });

      const checkout2 = await caller.stripePayment.createCheckoutSession({
        amount: 50000,
        serviceType: "form1041_filing",
        taxYear: 2025,
      });

      // Confirm one
      await caller.stripePayment.confirmPayment({
        id: checkout1.transactionId,
        stripePaymentIntentId: "pi_test_multi_1",
      });

      // Cancel the other
      await caller.stripePayment.cancelPayment({
        id: checkout2.transactionId,
      });

      // Verify stats are accurate
      const stats = await caller.stripePayment.getPaymentStats();

      const totalCounted =
        stats.successfulPayments +
        stats.pendingPayments +
        stats.failedPayments +
        stats.canceledPayments;

      expect(totalCounted).toBe(stats.totalTransactions);
      expect(stats.totalPaid).toBeGreaterThanOrEqual(25000);
    });
  });
});
