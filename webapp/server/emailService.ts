import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// Email service configuration
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@sintraprime.com";
const FROM_NAME = process.env.FROM_NAME || "SintraPrime Tax Services";

// Create transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    if (SENDGRID_API_KEY) {
      // SendGrid SMTP configuration
      transporter = nodemailer.createTransport({
        host: "smtp.sendgrid.net",
        port: 587,
        secure: false,
        auth: {
          user: "apikey",
          pass: SENDGRID_API_KEY,
        },
      });
    } else {
      // Fallback to console logging for development
      console.warn("[EmailService] No SENDGRID_API_KEY found, emails will be logged to console");
      transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: "unix",
        buffer: true,
      });
    }
  }
  return transporter;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
  }>;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using SendGrid SMTP
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  try {
    const transport = getTransporter();

    const mailOptions = {
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      attachments: options.attachments,
    };

    // If using stream transport (development), log to console
    if (!SENDGRID_API_KEY) {
      console.log("[EmailService] Development mode - Email would be sent:");
      console.log(JSON.stringify(mailOptions, null, 2));
      return {
        success: true,
        messageId: `dev-${Date.now()}`,
      };
    }

    const info = await transport.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("[EmailService] Failed to send email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send K-1 form to beneficiary with PDF attachment
 */
export async function sendK1Email(
  beneficiaryEmail: string,
  beneficiaryName: string,
  trustName: string,
  taxYear: number,
  pdfBuffer: Buffer,
  customMessage?: string
): Promise<EmailResult> {
  const defaultMessage = `Dear ${beneficiaryName},

Please find attached your Schedule K-1 (Form 1041) for ${trustName} for the tax year ${taxYear}.

This form reports your share of the trust's income, deductions, and credits. You will need this information to complete your personal income tax return.

If you have any questions about this form, please contact your tax advisor or the trust administrator.

Best regards,
Trust Administration`;

  const html = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">Schedule K-1 (Form 1041)</h2>
          <p>${(customMessage || defaultMessage).replace(/\n/g, "<br>")}</p>
          <div style="margin-top: 30px; padding: 15px; background-color: #f3f4f6; border-left: 4px solid #2563eb;">
            <p style="margin: 0;"><strong>Trust:</strong> ${trustName}</p>
            <p style="margin: 5px 0 0 0;"><strong>Tax Year:</strong> ${taxYear}</p>
          </div>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">
            This is an automated message from SintraPrime Tax Services. Please do not reply to this email.
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: beneficiaryEmail,
    subject: `Schedule K-1 (Form 1041) - ${trustName} - Tax Year ${taxYear}`,
    text: customMessage || defaultMessage,
    html,
    attachments: [
      {
        filename: `K1_${trustName.replace(/\s+/g, "_")}_${taxYear}.pdf`,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

/**
 * Verify email service configuration
 */
export async function verifyEmailService(): Promise<boolean> {
  try {
    const transport = getTransporter();
    if (!SENDGRID_API_KEY) {
      console.log("[EmailService] Running in development mode (no SENDGRID_API_KEY)");
      return true;
    }
    await transport.verify();
    console.log("[EmailService] SMTP connection verified successfully");
    return true;
  } catch (error) {
    console.error("[EmailService] SMTP verification failed:", error);
    return false;
  }
}
