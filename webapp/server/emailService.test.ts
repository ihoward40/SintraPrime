import { describe, it, expect } from "vitest";
import { verifyEmailService, sendEmail } from "./emailService";

describe("Email Service", () => {
  it("should verify email service configuration", async () => {
    const result = await verifyEmailService();
    expect(result).toBe(true);
  });

  it("should send test email successfully", async () => {
    const result = await sendEmail({
      to: "test@example.com",
      subject: "Test Email",
      text: "This is a test email from SintraPrime",
      html: "<p>This is a test email from SintraPrime</p>",
    });

    expect(result.success).toBe(true);
    expect(result.messageId).toBeDefined();
  });
});
