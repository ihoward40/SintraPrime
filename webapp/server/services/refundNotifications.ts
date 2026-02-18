import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@sintraprime.com";
const FROM_NAME = process.env.FROM_NAME || "SintraPrime Tax Services";

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

interface RefundConfirmationEmailParams {
  recipientEmail: string;
  recipientName: string;
  transactionId: number;
  originalAmount: number;
  refundAmount: number;
  serviceType: string;
  taxYear: number;
  refundReason?: string;
  refundDate: Date;
  stripeRefundId: string;
  originalPaymentDate: Date;
}

/**
 * Send refund confirmation email to user
 */
export async function sendRefundConfirmationEmail(
  params: RefundConfirmationEmailParams
): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.warn("[Email] SendGrid API key not configured, skipping refund email");
    return false;
  }

  const {
    recipientEmail,
    recipientName,
    transactionId,
    originalAmount,
    refundAmount,
    serviceType,
    taxYear,
    refundReason,
    refundDate,
    stripeRefundId,
    originalPaymentDate,
  } = params;

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const getServiceLabel = (type: string) => {
    const labels: Record<string, string> = {
      form1041_filing: "Form 1041 Filing",
      k1_preparation: "Schedule K-1 Preparation",
      tax_consultation: "Tax Consultation",
      audit_support: "Audit Support",
      full_service: "Full Service Package",
    };
    return labels[type] || type;
  };

  const isPartialRefund = refundAmount < originalAmount;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Refund Confirmation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .info-box {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #10b981;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: 600;
      color: #6b7280;
    }
    .value {
      color: #111827;
      font-weight: 500;
    }
    .refund-amount {
      font-size: 32px;
      font-weight: bold;
      color: #10b981;
      text-align: center;
      margin: 20px 0;
    }
    .notice {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }
    .footer {
      text-align: center;
      color: #6b7280;
      font-size: 14px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>✓ Refund Processed</h1>
    <p style="margin: 10px 0 0 0;">Your payment has been refunded</p>
  </div>
  
  <div class="content">
    <p>Dear ${recipientName},</p>
    
    <p>We have processed a ${isPartialRefund ? "partial" : "full"} refund for your tax preparation service payment.</p>
    
    <div class="refund-amount">
      ${formatCurrency(refundAmount)}
    </div>
    
    <div class="info-box">
      <div class="info-row">
        <span class="label">Transaction ID</span>
        <span class="value">#${transactionId}</span>
      </div>
      <div class="info-row">
        <span class="label">Service</span>
        <span class="value">${getServiceLabel(serviceType)}</span>
      </div>
      <div class="info-row">
        <span class="label">Tax Year</span>
        <span class="value">${taxYear}</span>
      </div>
      <div class="info-row">
        <span class="label">Original Payment</span>
        <span class="value">${formatCurrency(originalAmount)}</span>
      </div>
      <div class="info-row">
        <span class="label">Original Payment Date</span>
        <span class="value">${formatDate(originalPaymentDate)}</span>
      </div>
      <div class="info-row">
        <span class="label">Refund Amount</span>
        <span class="value">${formatCurrency(refundAmount)}</span>
      </div>
      <div class="info-row">
        <span class="label">Refund Date</span>
        <span class="value">${formatDate(refundDate)}</span>
      </div>
      <div class="info-row">
        <span class="label">Refund ID</span>
        <span class="value">${stripeRefundId}</span>
      </div>
      ${refundReason ? `
      <div class="info-row">
        <span class="label">Reason</span>
        <span class="value">${refundReason}</span>
      </div>
      ` : ""}
    </div>
    
    <div class="notice">
      <strong>⏱ Processing Time:</strong> The refund will appear in your account within 5-10 business days, depending on your bank or card issuer.
    </div>
    
    <p>If you have any questions about this refund, please don't hesitate to contact our support team.</p>
    
    <div style="text-align: center;">
      <a href="https://sintraprime.manus.space/payments/dashboard" class="button">View Payment History</a>
    </div>
  </div>
  
  <div class="footer">
    <p><strong>${FROM_NAME}</strong></p>
    <p>This is an automated message. Please do not reply to this email.</p>
  </div>
</body>
</html>
  `;

  const textContent = `
REFUND CONFIRMATION

Dear ${recipientName},

We have processed a ${isPartialRefund ? "partial" : "full"} refund for your tax preparation service payment.

REFUND AMOUNT: ${formatCurrency(refundAmount)}

Transaction Details:
- Transaction ID: #${transactionId}
- Service: ${getServiceLabel(serviceType)}
- Tax Year: ${taxYear}
- Original Payment: ${formatCurrency(originalAmount)}
- Original Payment Date: ${formatDate(originalPaymentDate)}
- Refund Amount: ${formatCurrency(refundAmount)}
- Refund Date: ${formatDate(refundDate)}
- Refund ID: ${stripeRefundId}
${refundReason ? `- Reason: ${refundReason}` : ""}

PROCESSING TIME: The refund will appear in your account within 5-10 business days, depending on your bank or card issuer.

If you have any questions about this refund, please contact our support team.

View your payment history: https://sintraprime.manus.space/payments/dashboard

${FROM_NAME}
This is an automated message. Please do not reply to this email.
  `;

  const msg = {
    to: recipientEmail,
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    subject: `Refund Confirmation - ${formatCurrency(refundAmount)} for ${getServiceLabel(serviceType)}`,
    text: textContent,
    html: htmlContent,
  };

  try {
    await sgMail.send(msg);
    console.log(`[Email] Refund confirmation sent to ${recipientEmail}`);
    return true;
  } catch (error: any) {
    console.error("[Email] Failed to send refund confirmation:", error.message);
    if (error.response) {
      console.error("[Email] SendGrid error details:", error.response.body);
    }
    return false;
  }
}
