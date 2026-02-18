/**
 * Dispute Notification Email Service
 * Sends automated emails for dispute lifecycle events
 */

import sgMail from "@sendgrid/mail";

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@sintraprime.com";
const FROM_NAME = process.env.FROM_NAME || "SintraPrime";

sgMail.setApiKey(SENDGRID_API_KEY);

interface DisputeEmailData {
  userEmail: string;
  userName: string;
  disputeId: string;
  amount: number;
  reason: string;
  status: string;
  dueDate?: Date;
}

export async function sendDisputeFiledEmail(data: DisputeEmailData): Promise<boolean> {
  const { userEmail, userName, disputeId, amount, reason } = data;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .alert { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
        .details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⚠️ Payment Dispute Filed</h1>
        </div>
        <div class="content">
          <p>Dear ${userName},</p>
          
          <div class="alert">
            <strong>A payment dispute has been filed against your account.</strong>
          </div>
          
          <p>We wanted to inform you that a dispute has been filed with your payment processor. This typically occurs when a customer contacts their bank or card issuer to challenge a charge.</p>
          
          <div class="details">
            <h3>Dispute Details</h3>
            <div class="detail-row">
              <span><strong>Dispute ID:</strong></span>
              <span>${disputeId}</span>
            </div>
            <div class="detail-row">
              <span><strong>Amount:</strong></span>
              <span>$${(amount / 100).toFixed(2)}</span>
            </div>
            <div class="detail-row">
              <span><strong>Reason:</strong></span>
              <span>${reason}</span>
            </div>
            <div class="detail-row">
              <span><strong>Status:</strong></span>
              <span>Needs Response</span>
            </div>
          </div>
          
          <p><strong>What happens next?</strong></p>
          <ul>
            <li>You have the opportunity to submit evidence to challenge this dispute</li>
            <li>The payment processor will review the evidence from both parties</li>
            <li>A decision will be made within 60-75 days</li>
          </ul>
          
          <p><strong>Action Required:</strong> Please log in to your account to review the dispute details and submit evidence if you wish to challenge it.</p>
          
          <a href="${process.env.VITE_APP_URL || 'https://sintraprime.com'}/disputes" class="button">View Dispute Details</a>
        </div>
        <div class="footer">
          <p>This is an automated notification from SintraPrime.</p>
          <p>© ${new Date().getFullYear()} SintraPrime. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Payment Dispute Filed

Dear ${userName},

A payment dispute has been filed against your account.

Dispute Details:
- Dispute ID: ${disputeId}
- Amount: $${(amount / 100).toFixed(2)}
- Reason: ${reason}
- Status: Needs Response

What happens next?
- You have the opportunity to submit evidence to challenge this dispute
- The payment processor will review the evidence from both parties
- A decision will be made within 60-75 days

Action Required: Please log in to your account to review the dispute details and submit evidence if you wish to challenge it.

Visit: ${process.env.VITE_APP_URL || 'https://sintraprime.com'}/disputes

---
This is an automated notification from SintraPrime.
© ${new Date().getFullYear()} SintraPrime. All rights reserved.
  `;

  try {
    await sgMail.send({
      to: userEmail,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: `⚠️ Payment Dispute Filed - Action Required`,
      text: textContent,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error("Failed to send dispute filed email:", error);
    return false;
  }
}

export async function sendDisputeUnderReviewEmail(data: DisputeEmailData): Promise<boolean> {
  const { userEmail, userName, disputeId, amount } = data;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .info { background: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📋 Dispute Under Review</h1>
        </div>
        <div class="content">
          <p>Dear ${userName},</p>
          
          <div class="info">
            <strong>Your dispute (${disputeId}) is now under review by the payment processor.</strong>
          </div>
          
          <p>The evidence you submitted has been received and is being reviewed. The payment processor will make a decision within 60-75 days.</p>
          
          <p><strong>Amount in Dispute:</strong> $${(amount / 100).toFixed(2)}</p>
          
          <p>We'll notify you as soon as a decision is made.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} SintraPrime. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sgMail.send({
      to: userEmail,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: `Dispute Under Review - ${disputeId}`,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error("Failed to send dispute under review email:", error);
    return false;
  }
}

export async function sendDisputeWonEmail(data: DisputeEmailData): Promise<boolean> {
  const { userEmail, userName, disputeId, amount } = data;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #16a34a; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .success { background: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ Dispute Won!</h1>
        </div>
        <div class="content">
          <p>Dear ${userName},</p>
          
          <div class="success">
            <strong>Great news! You've won the dispute (${disputeId}).</strong>
          </div>
          
          <p>The payment processor has reviewed the evidence and ruled in your favor. The disputed amount of $${(amount / 100).toFixed(2)} will be returned to your account.</p>
          
          <p>Thank you for providing the necessary evidence to support your case.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} SintraPrime. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sgMail.send({
      to: userEmail,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: `✅ Dispute Won - ${disputeId}`,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error("Failed to send dispute won email:", error);
    return false;
  }
}

export async function sendDisputeLostEmail(data: DisputeEmailData): Promise<boolean> {
  const { userEmail, userName, disputeId, amount } = data;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .warning { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>❌ Dispute Lost</h1>
        </div>
        <div class="content">
          <p>Dear ${userName},</p>
          
          <div class="warning">
            <strong>Unfortunately, the dispute (${disputeId}) was not resolved in your favor.</strong>
          </div>
          
          <p>The payment processor has reviewed the evidence and ruled against your case. The disputed amount of $${(amount / 100).toFixed(2)} will be withdrawn from your account.</p>
          
          <p>If you have any questions about this decision, please contact our support team.</p>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} SintraPrime. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sgMail.send({
      to: userEmail,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: `Dispute Resolution - ${disputeId}`,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error("Failed to send dispute lost email:", error);
    return false;
  }
}

export async function sendEvidenceReminderEmail(data: DisputeEmailData): Promise<boolean> {
  const { userEmail, userName, disputeId, amount, dueDate } = data;

  const daysRemaining = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 7;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .reminder { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>⏰ Evidence Submission Reminder</h1>
        </div>
        <div class="content">
          <p>Dear ${userName},</p>
          
          <div class="reminder">
            <strong>Reminder: You have ${daysRemaining} days remaining to submit evidence for dispute ${disputeId}.</strong>
          </div>
          
          <p>A dispute has been filed for $${(amount / 100).toFixed(2)}. To have the best chance of winning this dispute, please submit supporting evidence as soon as possible.</p>
          
          <p><strong>Recommended evidence includes:</strong></p>
          <ul>
            <li>Proof of service delivery</li>
            <li>Customer communication records</li>
            <li>Signed agreements or contracts</li>
            <li>Shipping/delivery confirmation</li>
            <li>Product or service descriptions</li>
          </ul>
          
          <a href="${process.env.VITE_APP_URL || 'https://sintraprime.com'}/disputes" class="button">Submit Evidence Now</a>
        </div>
        <div class="footer">
          <p>© ${new Date().getFullYear()} SintraPrime. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sgMail.send({
      to: userEmail,
      from: { email: FROM_EMAIL, name: FROM_NAME },
      subject: `⏰ Evidence Submission Reminder - ${disputeId}`,
      html: htmlContent,
    });
    return true;
  } catch (error) {
    console.error("Failed to send evidence reminder email:", error);
    return false;
  }
}
