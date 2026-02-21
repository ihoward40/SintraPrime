// clawdbot-integration/handlers/DeliveryHandler.ts
// Handles cross-platform delivery of task results to users.
// Determines the best delivery method based on file size and platform
// constraints (e.g., Telegram's 50MB limit).

import type { Platform, PlatformAdapter } from "../../src/connectors/platforms/types.js";

export interface DeliveryResult {
  delivered: boolean;
  method: "direct" | "link" | "error";
  error?: string;
}

const TELEGRAM_FILE_LIMIT = 50 * 1024 * 1024; // 50MB

export class DeliveryHandler {
  private adapters: Map<Platform, PlatformAdapter> = new Map();

  registerAdapter(adapter: PlatformAdapter): void {
    this.adapters.set(adapter.platform, adapter);
  }

  /**
   * Deliver a task result to a user on any platform.
   * Automatically chooses the best delivery method.
   */
  async deliverResult(
    platform: Platform,
    chatId: string,
    taskId: string,
    deliverableUrl: string,
    fileFormat: string,
    fileSize?: number
  ): Promise<DeliveryResult> {
    const adapter = this.adapters.get(platform);
    if (!adapter) {
      return {
        delivered: false,
        method: "error",
        error: `No adapter for platform: ${platform}`,
      };
    }

    try {
      const fileName = `deliverable_${taskId}.${fileFormat}`;

      // For Telegram, check file size limit
      if (platform === "telegram" && fileSize && fileSize >= TELEGRAM_FILE_LIMIT) {
        // Send a download link instead
        const signedUrl = await this.generateSignedUrl(deliverableUrl, 72);
        await adapter.sendMessage({
          platform,
          chatId,
          text:
            `Your order *${taskId}* is complete!\n\n` +
            `The file is too large for direct delivery. ` +
            `Please download it using this secure link (expires in 72 hours):\n\n` +
            `${signedUrl}`,
        });
        return { delivered: true, method: "link" };
      }

      // Direct file delivery
      await adapter.sendDocument(
        chatId,
        deliverableUrl,
        fileName,
        `Your order ${taskId} is complete!`
      );

      // Send completion message with action buttons
      await adapter.sendMessage({
        platform,
        chatId,
        text:
          `Order *${taskId}* delivered successfully!\n\n` +
          `If you have questions or need revisions, use /support.\n` +
          `Thank you for using IkeBot!`,
        buttons: [
          [
            { text: "Order Again", callbackData: "action:order" },
            { text: "View Services", callbackData: "action:services" },
          ],
          [{ text: "Leave Review", callbackData: "action:review" }],
        ],
      });

      return { delivered: true, method: "direct" };
    } catch (error: any) {
      return {
        delivered: false,
        method: "error",
        error: error.message,
      };
    }
  }

  /**
   * Generate a time-limited signed URL for file download.
   * In production, this would use AWS S3 pre-signed URLs or similar.
   */
  private async generateSignedUrl(
    originalUrl: string,
    expiryHours: number
  ): Promise<string> {
    // Placeholder: In production, use AWS SDK to generate pre-signed S3 URLs
    // or Google Drive sharing links with expiry.
    const expiry = new Date(
      Date.now() + expiryHours * 60 * 60 * 1000
    ).toISOString();
    return `${originalUrl}?expires=${encodeURIComponent(expiry)}`;
  }
}
