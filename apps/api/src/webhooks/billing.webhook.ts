import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

import { getDb } from '../db/mysql';
import { ikeAgentLogs, ikeBillingEvents } from '../db/schema';

/**
 * Generic billing alert webhook handler
 * Accepts billing alerts from various sources
 */
export const handleBillingAlert = async (req: Request, res: Response) => {
  try {
    const alert = req.body;

    // Validate required fields
    if (!alert.source || !alert.alert_type) {
      return res.status(400).json({ 
        error: 'Missing required fields: source, alert_type' 
      });
    }

    console.log(`Billing alert received from ${alert.source}: ${alert.alert_type}`);

    const database = getDb();
    const eventId = randomUUID();

    // Store the billing event
    await database.insert(ikeBillingEvents).values({
      id: eventId,
      event_type: alert.alert_type,
      event_source: alert.source,
      amount: alert.amount,
      currency: alert.currency || 'USD',
      status: alert.status || 'pending',
      beneficiary_id: alert.beneficiary_id,
      metadata: {
        ...alert.metadata,
        alert_severity: alert.severity,
        alert_message: alert.message,
      },
    });

    // Log the alert
    await database.insert(ikeAgentLogs).values({
      id: randomUUID(),
      trace_id: randomUUID(),
      level: alert.severity || 'info',
      message: `Billing alert: ${alert.alert_type}`,
      action: 'billing_alert',
      beneficiary_id: alert.beneficiary_id,
      metadata: {
        source: alert.source,
        alert_type: alert.alert_type,
        amount: alert.amount,
      },
    });

    // Handle specific alert types
    switch (alert.alert_type) {
      case 'payment_overdue':
        await handlePaymentOverdue(alert);
        break;
      case 'subscription_cancelled':
        await handleSubscriptionCancelled(alert);
        break;
      case 'payment_method_expired':
        await handlePaymentMethodExpired(alert);
        break;
      case 'charge_dispute':
        await handleChargeDispute(alert);
        break;
      default:
        console.log(`Unhandled billing alert type: ${alert.alert_type}`);
    }

    res.json({ 
      success: true, 
      message: 'Billing alert processed',
      event_id: eventId,
    });
  } catch (error: any) {
    console.error('Error processing billing alert:', error);
    res.status(500).json({ error: error.message });
  }
};

async function handlePaymentOverdue(alert: any) {
  console.log(`Payment overdue alert for beneficiary: ${alert.beneficiary_id}`);
  // Could trigger notification workflow, enforcement action, etc.
}

async function handleSubscriptionCancelled(alert: any) {
  console.log(`Subscription cancelled for beneficiary: ${alert.beneficiary_id}`);
  // Could update beneficiary status, send notification, etc.
}

async function handlePaymentMethodExpired(alert: any) {
  console.log(`Payment method expired for beneficiary: ${alert.beneficiary_id}`);
  // Could send renewal reminder, update payment status, etc.
}

async function handleChargeDispute(alert: any) {
  console.log(`Charge dispute alert: ${alert.message}`);
  // Could create enforcement packet, log dispute, etc.
}
