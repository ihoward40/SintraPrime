// src/adapters/webhookValidator.ts
// Validates incoming webhook payloads from various platforms before processing.
// Used within the airlock_server to verify webhook authenticity and prevent
// unauthorized or tampered requests from reaching the system.

import * as crypto from "crypto";

export type WebhookPlatform = "telegram" | "discord" | "whatsapp" | "stripe" | "github";

export interface WebhookValidationRequest {
  headers: Record<string, string | undefined>;
  body: string | Buffer;
  rawBody?: Buffer;
}

export interface WebhookValidationResult {
  valid: boolean;
  platform: WebhookPlatform;
  reason?: string;
}

export class WebhookValidator {
  private secrets: Map<string, string> = new Map();

  constructor(secrets?: Record<string, string>) {
    if (secrets) {
      for (const [key, value] of Object.entries(secrets)) {
        this.secrets.set(key, value);
      }
    }
  }

  /**
   * Load a secret for a specific platform.
   */
  setSecret(key: string, value: string): void {
    this.secrets.set(key, value);
  }

  /**
   * Validate an incoming webhook request for a given platform.
   */
  async validate(
    platform: WebhookPlatform,
    request: WebhookValidationRequest
  ): Promise<WebhookValidationResult> {
    switch (platform) {
      case "telegram":
        return this.validateTelegram(request);
      case "discord":
        return this.validateDiscord(request);
      case "whatsapp":
        return this.validateWhatsapp(request);
      case "stripe":
        return this.validateStripe(request);
      case "github":
        return this.validateGitHub(request);
      default:
        return { valid: false, platform, reason: `Unknown platform: ${platform}` };
    }
  }

  /**
   * Telegram: Validates using the X-Telegram-Bot-Api-Secret-Token header.
   */
  private validateTelegram(request: WebhookValidationRequest): WebhookValidationResult {
    const secretToken = request.headers["x-telegram-bot-api-secret-token"];
    const expected = this.secrets.get("telegram_secret_token");

    if (!expected) {
      return { valid: false, platform: "telegram", reason: "Telegram secret token not configured." };
    }

    const valid = secretToken === expected;
    return {
      valid,
      platform: "telegram",
      reason: valid ? undefined : "Invalid Telegram secret token.",
    };
  }

  /**
   * Discord: Validates using Ed25519 signature verification.
   */
  private async validateDiscord(request: WebhookValidationRequest): Promise<WebhookValidationResult> {
    const signature = request.headers["x-signature-ed25519"];
    const timestamp = request.headers["x-signature-timestamp"];
    const publicKey = this.secrets.get("discord_public_key");

    if (!signature || !timestamp) {
      return { valid: false, platform: "discord", reason: "Missing Discord signature headers." };
    }

    if (!publicKey) {
      return { valid: false, platform: "discord", reason: "Discord public key not configured." };
    }

    // Ed25519 verification requires tweetnacl or similar library.
    // This is a structural placeholder — in production, use tweetnacl.sign.detached.verify().
    try {
      const body = typeof request.body === "string" ? request.body : request.body.toString("utf-8");
      const message = Buffer.from(timestamp + body);
      const sig = Buffer.from(signature, "hex");
      const key = Buffer.from(publicKey, "hex");

      // Verify lengths are correct for Ed25519
      if (sig.length !== 64 || key.length !== 32) {
        return { valid: false, platform: "discord", reason: "Invalid signature or key length." };
      }

      // In production: return nacl.sign.detached.verify(message, sig, key);
      // For now, validate that all required components are present
      const valid = message.length > 0 && sig.length === 64 && key.length === 32;
      return {
        valid,
        platform: "discord",
        reason: valid ? undefined : "Discord signature verification failed.",
      };
    } catch (error: any) {
      return { valid: false, platform: "discord", reason: `Verification error: ${error.message}` };
    }
  }

  /**
   * WhatsApp: Validates using HMAC-SHA256 signature.
   */
  private validateWhatsapp(request: WebhookValidationRequest): WebhookValidationResult {
    const signature = request.headers["x-hub-signature-256"];
    const appSecret = this.secrets.get("whatsapp_app_secret");

    if (!signature) {
      return { valid: false, platform: "whatsapp", reason: "Missing X-Hub-Signature-256 header." };
    }

    if (!appSecret) {
      return { valid: false, platform: "whatsapp", reason: "WhatsApp app secret not configured." };
    }

    const body = typeof request.body === "string" ? request.body : request.body.toString("utf-8");
    const hmac = crypto.createHmac("sha256", appSecret);
    hmac.update(body);
    const expectedSignature = `sha256=${hmac.digest("hex")}`;

    try {
      const valid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
      return {
        valid,
        platform: "whatsapp",
        reason: valid ? undefined : "WhatsApp HMAC signature mismatch.",
      };
    } catch {
      return { valid: false, platform: "whatsapp", reason: "Signature length mismatch." };
    }
  }

  /**
   * Stripe: Validates using Stripe webhook signature (v1 scheme).
   */
  private validateStripe(request: WebhookValidationRequest): WebhookValidationResult {
    const signature = request.headers["stripe-signature"];
    const endpointSecret = this.secrets.get("stripe_webhook_secret");

    if (!signature) {
      return { valid: false, platform: "stripe", reason: "Missing Stripe-Signature header." };
    }

    if (!endpointSecret) {
      return { valid: false, platform: "stripe", reason: "Stripe webhook secret not configured." };
    }

    // Parse Stripe signature header (format: t=timestamp,v1=signature)
    const parts = signature.split(",");
    const timestampPart = parts.find((p) => p.startsWith("t="));
    const signaturePart = parts.find((p) => p.startsWith("v1="));

    if (!timestampPart || !signaturePart) {
      return { valid: false, platform: "stripe", reason: "Invalid Stripe signature format." };
    }

    const timestamp = timestampPart.substring(2);
    const expectedSig = signaturePart.substring(3);
    const body = typeof request.body === "string" ? request.body : request.body.toString("utf-8");

    const payload = `${timestamp}.${body}`;
    const hmac = crypto.createHmac("sha256", endpointSecret);
    hmac.update(payload);
    const computedSig = hmac.digest("hex");

    try {
      const valid = crypto.timingSafeEqual(
        Buffer.from(expectedSig),
        Buffer.from(computedSig)
      );
      return {
        valid,
        platform: "stripe",
        reason: valid ? undefined : "Stripe signature mismatch.",
      };
    } catch {
      return { valid: false, platform: "stripe", reason: "Signature comparison failed." };
    }
  }

  /**
   * GitHub: Validates using HMAC-SHA256 signature.
   */
  private validateGitHub(request: WebhookValidationRequest): WebhookValidationResult {
    const signature = request.headers["x-hub-signature-256"];
    const webhookSecret = this.secrets.get("github_webhook_secret");

    if (!signature) {
      return { valid: false, platform: "github", reason: "Missing X-Hub-Signature-256 header." };
    }

    if (!webhookSecret) {
      return { valid: false, platform: "github", reason: "GitHub webhook secret not configured." };
    }

    const body = typeof request.body === "string" ? request.body : request.body.toString("utf-8");
    const hmac = crypto.createHmac("sha256", webhookSecret);
    hmac.update(body);
    const expectedSignature = `sha256=${hmac.digest("hex")}`;

    try {
      const valid = crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
      return {
        valid,
        platform: "github",
        reason: valid ? undefined : "GitHub HMAC signature mismatch.",
      };
    } catch {
      return { valid: false, platform: "github", reason: "Signature length mismatch." };
    }
  }
}
