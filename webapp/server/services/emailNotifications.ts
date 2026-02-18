import sgMail from "@sendgrid/mail";

// Initialize SendGrid with API key
const sendGridApiKey = process.env.SENDGRID_API_KEY;
if (sendGridApiKey && sendGridApiKey.trim().length > 0) {
  try {
    sgMail.setApiKey(sendGridApiKey);
  } catch (err: any) {
    console.warn(
      `[SendGrid] Email notifications disabled (invalid SENDGRID_API_KEY): ${err?.message ?? err}`
    );
  }
} else {
  console.warn("[SendGrid] Email notifications disabled (SENDGRID_API_KEY not set)");
}

const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@manus.space";
const FROM_NAME = process.env.FROM_NAME || "SintraPrime";

export interface PaymentReceiptData {
  recipientEmail: string;
  recipientName: string;
  transactionId: number;
  amount: number;
  serviceType: string;
  taxYear: number;
  description?: string;
  paymentDate: Date;
  receiptUrl?: string;
  stripePaymentIntentId: string;
}

export interface PaymentFailureData {
  recipientEmail: string;
  recipientName: string;
  amount: number;
  serviceType: string;
  failureReason?: string;
  retryUrl: string;
}

/**
 * Format currency amount in cents to USD string
 */
function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/**
 * Get human-readable service type label
 */
function getServiceLabel(serviceType: string): string {
  const labels: Record<string, string> = {
    form1041_filing: "Form 1041 Filing",
    k1_preparation: "Schedule K-1 Preparation",
    tax_consultation: "Tax Consultation",
    audit_support: "Audit Support",
    full_service: "Full Service Package",
  };
  return labels[serviceType] || serviceType;
}

/**
 * Send payment receipt email to user
 */
export async function sendPaymentReceiptEmail(data: PaymentReceiptData): Promise<boolean> {
  try {
    const serviceLabel = getServiceLabel(data.serviceType);
    const amountFormatted = formatCurrency(data.amount);
    const dateFormatted = data.paymentDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #0066cc;
    }
    .header h1 {
      color: #0066cc;
      margin: 0;
      font-size: 28px;
    }
    .success-icon {
      font-size: 48px;
      color: #10b981;
      margin-bottom: 10px;
    }
    .details {
      background-color: #f9fafb;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #6b7280;
    }
    .detail-value {
      color: #111827;
      font-weight: 500;
    }
    .amount {
      font-size: 24px;
      color: #0066cc;
      font-weight: bold;
    }
    .button {
      display: inline-block;
      background-color: #0066cc;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
    .next-steps {
      background-color: #eff6ff;
      border-left: 4px solid #0066cc;
      padding: 15px;
      margin: 20px 0;
    }
    .next-steps h3 {
      margin-top: 0;
      color: #0066cc;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="success-icon">✓</div>
      <h1>Payment Successful</h1>
      <p>Thank you for your payment</p>
    </div>

    <p>Dear ${data.recipientName},</p>
    
    <p>Your payment has been successfully processed. Here are the details of your transaction:</p>

    <div class="details">
      <div class="detail-row">
        <span class="detail-label">Transaction ID:</span>
        <span class="detail-value">#${data.transactionId}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Service:</span>
        <span class="detail-value">${serviceLabel}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Tax Year:</span>
        <span class="detail-value">${data.taxYear}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Payment Date:</span>
        <span class="detail-value">${dateFormatted}</span>
      </div>
      ${data.description ? `
      <div class="detail-row">
        <span class="detail-label">Description:</span>
        <span class="detail-value">${data.description}</span>
      </div>
      ` : ''}
      <div class="detail-row">
        <span class="detail-label">Amount Paid:</span>
        <span class="detail-value amount">${amountFormatted}</span>
      </div>
    </div>

    ${data.receiptUrl ? `
    <div style="text-align: center;">
      <a href="${data.receiptUrl}" class="button">Download Receipt</a>
    </div>
    ` : ''}

    <div class="next-steps">
      <h3>What's Next?</h3>
      <ol style="margin: 10px 0; padding-left: 20px;">
        <li>Your tax preparation will begin within 1-2 business days</li>
        <li>A certified CPA will review your documents before filing</li>
        <li>You'll receive updates throughout the process</li>
        <li>Once approved, your return will be electronically filed with the IRS</li>
      </ol>
    </div>

    <p>If you have any questions about your payment or tax preparation, please don't hesitate to contact our support team.</p>

    <div class="footer">
      <p><strong>SintraPrime Legal AI Platform</strong></p>
      <p>This is an automated receipt. Please do not reply to this email.</p>
      <p style="font-size: 12px; color: #9ca3af;">
        Transaction Reference: ${data.stripePaymentIntentId}
      </p>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
Payment Receipt - SintraPrime

Dear ${data.recipientName},

Your payment has been successfully processed.

Transaction Details:
- Transaction ID: #${data.transactionId}
- Service: ${serviceLabel}
- Tax Year: ${data.taxYear}
- Payment Date: ${dateFormatted}
${data.description ? `- Description: ${data.description}\n` : ''}
- Amount Paid: ${amountFormatted}

What's Next?
1. Your tax preparation will begin within 1-2 business days
2. A certified CPA will review your documents before filing
3. You'll receive updates throughout the process
4. Once approved, your return will be electronically filed with the IRS

${data.receiptUrl ? `Download your receipt: ${data.receiptUrl}\n\n` : ''}

If you have any questions, please contact our support team.

Transaction Reference: ${data.stripePaymentIntentId}

---
SintraPrime Legal AI Platform
This is an automated receipt. Please do not reply to this email.
    `;

    const msg = {
      to: data.recipientEmail,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: `Payment Receipt - ${serviceLabel} (${amountFormatted})`,
      text: textContent,
      html: htmlContent,
    };

    await sgMail.send(msg);
    console.log(`[EmailNotification] Payment receipt sent to ${data.recipientEmail}`);
    return true;
  } catch (error: any) {
    console.error("[EmailNotification] Failed to send payment receipt:", error);
    if (error.response) {
      console.error("[EmailNotification] SendGrid error:", error.response.body);
    }
    return false;
  }
}

/**
 * Send payment failure notification email
 */
export async function sendPaymentFailureEmail(data: PaymentFailureData): Promise<boolean> {
  try {
    const serviceLabel = getServiceLabel(data.serviceType);
    const amountFormatted = formatCurrency(data.amount);

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 2px solid #dc2626;
    }
    .header h1 {
      color: #dc2626;
      margin: 0;
      font-size: 28px;
    }
    .warning-icon {
      font-size: 48px;
      color: #f59e0b;
      margin-bottom: 10px;
    }
    .details {
      background-color: #fef2f2;
      border-radius: 6px;
      padding: 20px;
      margin: 20px 0;
      border-left: 4px solid #dc2626;
    }
    .button {
      display: inline-block;
      background-color: #0066cc;
      color: #ffffff;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 6px;
      margin: 20px 0;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="warning-icon">⚠</div>
      <h1>Payment Failed</h1>
      <p>We were unable to process your payment</p>
    </div>

    <p>Dear ${data.recipientName},</p>
    
    <p>Unfortunately, we were unable to process your payment for ${serviceLabel} (${amountFormatted}).</p>

    ${data.failureReason ? `
    <div class="details">
      <strong>Reason:</strong> ${data.failureReason}
    </div>
    ` : ''}

    <p><strong>What you can do:</strong></p>
    <ul>
      <li>Check that your payment information is correct</li>
      <li>Ensure you have sufficient funds available</li>
      <li>Try using a different payment method</li>
      <li>Contact your bank if the issue persists</li>
    </ul>

    <div style="text-align: center;">
      <a href="${data.retryUrl}" class="button">Try Again</a>
    </div>

    <p>If you continue to experience issues, please contact our support team for assistance.</p>

    <div class="footer">
      <p><strong>SintraPrime Legal AI Platform</strong></p>
      <p>This is an automated notification. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `;

    const textContent = `
Payment Failed - SintraPrime

Dear ${data.recipientName},

Unfortunately, we were unable to process your payment for ${serviceLabel} (${amountFormatted}).

${data.failureReason ? `Reason: ${data.failureReason}\n\n` : ''}

What you can do:
- Check that your payment information is correct
- Ensure you have sufficient funds available
- Try using a different payment method
- Contact your bank if the issue persists

Try again: ${data.retryUrl}

If you continue to experience issues, please contact our support team.

---
SintraPrime Legal AI Platform
This is an automated notification. Please do not reply to this email.
    `;

    const msg = {
      to: data.recipientEmail,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject: `Payment Failed - ${serviceLabel}`,
      text: textContent,
      html: htmlContent,
    };

    await sgMail.send(msg);
    console.log(`[EmailNotification] Payment failure notification sent to ${data.recipientEmail}`);
    return true;
  } catch (error: any) {
    console.error("[EmailNotification] Failed to send payment failure email:", error);
    if (error.response) {
      console.error("[EmailNotification] SendGrid error:", error.response.body);
    }
    return false;
  }
}
