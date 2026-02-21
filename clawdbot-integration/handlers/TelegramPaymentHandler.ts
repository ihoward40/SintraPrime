// clawdbot-integration/handlers/TelegramPaymentHandler.ts
// Handles the Telegram Payments API flow: invoice creation,
// pre-checkout validation, and successful payment processing.
// Integrates with the ManusSkill service catalog and task submission.

import {
  SERVICE_CATALOG,
  type ServiceKey,
  type TaskPayload,
  generateTaskId,
  getPriorityFromTier,
  getPrice,
  submitTask,
} from "../skills/ManusSkill.js";

/**
 * Telegram payment handler — designed to be registered with a Telegram bot framework
 * (e.g., grammY, node-telegram-bot-api, or Telegraf).
 *
 * Usage:
 *   const handler = new TelegramPaymentHandler();
 *   // Register with your bot framework:
 *   bot.on('pre_checkout_query', (ctx) => handler.handlePreCheckout(ctx));
 *   bot.on('message:successful_payment', (ctx) => handler.handleSuccessfulPayment(ctx));
 */
export class TelegramPaymentHandler {
  // In-memory session store for collecting user input before payment.
  // In production, use Redis or a database.
  private sessionInputs: Map<string, Record<string, string>> = new Map();
  private userTiers: Map<string, "free" | "pro" | "enterprise"> = new Map();

  /**
   * Store user input collected during the ordering conversation.
   */
  setSessionInput(userId: string, inputs: Record<string, string>): void {
    this.sessionInputs.set(userId, inputs);
  }

  /**
   * Get stored user input for task submission.
   */
  getSessionInput(userId: string): Record<string, string> {
    return this.sessionInputs.get(userId) || {};
  }

  /**
   * Set a user's subscription tier.
   */
  setUserTier(userId: string, tier: "free" | "pro" | "enterprise"): void {
    this.userTiers.set(userId, tier);
  }

  /**
   * Get a user's subscription tier.
   */
  getUserTier(userId: string): "free" | "pro" | "enterprise" {
    return this.userTiers.get(userId) || "free";
  }

  /**
   * Create a Telegram invoice payload for a given service.
   * Returns the parameters needed for bot.sendInvoice().
   */
  createInvoice(
    chatId: number,
    serviceKey: ServiceKey,
    userId: string
  ): {
    chat_id: number;
    title: string;
    description: string;
    payload: string;
    provider_token: string;
    currency: string;
    prices: Array<{ label: string; amount: number }>;
    need_name: boolean;
    need_email: boolean;
  } {
    const service = SERVICE_CATALOG[serviceKey];
    if (!service) {
      throw new Error(`Unknown service: ${serviceKey}`);
    }

    const tier = this.getUserTier(userId);
    const price = getPrice(serviceKey, tier);

    return {
      chat_id: chatId,
      title: service.name,
      description: `${service.name} — Estimated delivery: ${service.estimated_hours} hours. Deliverable format: .${service.deliverable_format}`,
      payload: serviceKey,
      provider_token: process.env.STRIPE_PROVIDER_TOKEN || "",
      currency: "USD",
      prices: [{ label: service.name, amount: price }],
      need_name: true,
      need_email: true,
    };
  }

  /**
   * Handle pre-checkout queries — MUST respond within 10 seconds.
   * Validates that the order is still available and the price is correct.
   */
  async handlePreCheckout(preCheckoutQuery: any): Promise<{
    ok: boolean;
    error_message?: string;
  }> {
    try {
      const serviceKey = preCheckoutQuery.invoice_payload as ServiceKey;
      const service = SERVICE_CATALOG[serviceKey];

      if (!service) {
        return { ok: false, error_message: "Service no longer available." };
      }

      return { ok: true };
    } catch (error: any) {
      return {
        ok: false,
        error_message: "Unable to process your order. Please try again.",
      };
    }
  }

  /**
   * Handle successful payment — submit the task to SintraPrime.
   */
  async handleSuccessfulPayment(
    payment: any,
    fromUserId: number,
    chatId: number
  ): Promise<{
    taskId: string;
    serviceName: string;
    estimatedHours: number;
  }> {
    const taskId = generateTaskId();
    const serviceKey = payment.invoice_payload as ServiceKey;
    const service = SERVICE_CATALOG[serviceKey];
    const userId = String(fromUserId);
    const tier = this.getUserTier(userId);

    const payload: TaskPayload = {
      task_id: taskId,
      service_key: serviceKey,
      user_id: userId,
      telegram_chat_id: chatId,
      subscription_tier: tier,
      payment_confirmed: true,
      stripe_payment_id: payment.provider_payment_charge_id || "",
      user_input: this.getSessionInput(userId),
      created_at: new Date().toISOString(),
      priority: getPriorityFromTier(tier),
    };

    await submitTask(payload);

    // Clean up session input after submission
    this.sessionInputs.delete(userId);

    return {
      taskId,
      serviceName: service?.name || serviceKey,
      estimatedHours: service?.estimated_hours || 24,
    };
  }
}
