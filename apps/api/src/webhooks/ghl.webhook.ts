import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import * as crypto from 'crypto';

import { getDb } from '../db/mysql';
import { ikeAgentLogs } from '../db/schema';
import {
  GhlWebhookPayload,
  GhlNormalizedEvent,
  GhlEventType,
} from '../types/ghl.types';
import { createLogger } from '../config/logger';

const log = createLogger({ module: 'ghl-webhook' });

/**
 * Detect the GHL event type from the incoming payload.
 * GHL outbound webhooks don't include a standard event type header,
 * so we infer it from the payload structure and custom fields.
 */
function detectEventType(payload: GhlWebhookPayload): GhlEventType {
  // Explicit event_type set in the GHL workflow custom data
  if (payload.event_type && payload.event_type !== 'unknown') {
    return payload.event_type;
  }

  // Conversation AI event — has conversation_ai data
  if (payload.conversation_ai?.agent_id || payload.conversation_ai?.response_text) {
    if (payload.conversation_ai.action_taken === 'escalate') {
      return 'conversation_ai_escalated';
    }
    return 'conversation_ai_responded';
  }

  // Voice AI event — has voice_call data
  if (payload.voice_call?.call_id || payload.voice_call?.call_sid) {
    if (payload.voice_call.status === 'completed') {
      return 'voice_ai_call_completed';
    }
    return 'voice_ai_custom_action';
  }

  // Workflow trigger with message data
  if (payload.message) {
    if (payload.message.direction === 'inbound') {
      return 'customer_replied';
    }
    return 'message_sent';
  }

  // Workflow trigger without message
  if (payload.workflow?.id) {
    return 'workflow_trigger';
  }

  return 'unknown';
}

/**
 * Normalize the raw GHL webhook payload into a consistent internal structure.
 */
function normalizePayload(payload: GhlWebhookPayload): GhlNormalizedEvent {
  const eventType = detectEventType(payload);

  return {
    source: 'gohighlevel',
    event_type: eventType,
    location_id: payload.location?.id || process.env.GHL_LOCATION_ID || '69323e851c84d97148a27daa',
    contact: {
      id: payload.contact_id,
      name: payload.full_name || [payload.first_name, payload.last_name].filter(Boolean).join(' ') || undefined,
      email: payload.email,
      phone: payload.phone,
      tags: payload.tags,
    },
    message: payload.message || null,
    workflow: payload.workflow || null,
    voice_call: payload.voice_call || null,
    conversation_ai: payload.conversation_ai || null,
    agent_name:
      payload.agent_name ||
      payload.conversation_ai?.agent_name ||
      payload.voice_call?.agent_name ||
      payload.workflow?.name ||
      'GHL AI Agent',
    received_at: new Date().toISOString(),
  };
}

/**
 * Validate the shared secret from the request body.
 *
 * GHL's free outbound webhook does not support custom HTTP headers,
 * so the shared secret is passed as a body field (x_ghl_secret) instead.
 * Uses timing-safe comparison to prevent timing attacks.
 */
function validateSecret(payload: GhlWebhookPayload): boolean {
  const expectedSecret = process.env.GHL_WEBHOOK_SECRET;

  // If no secret is configured, skip validation (development mode)
  if (!expectedSecret) {
    return true;
  }

  const providedSecret = payload.x_ghl_secret;
  if (!providedSecret) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedSecret),
      Buffer.from(expectedSecret)
    );
  } catch {
    // Length mismatch — secrets don't match
    return false;
  }
}

/**
 * Handle incoming POST webhooks from GoHighLevel AI agent workflows.
 *
 * Supports all GHL event types:
 * - Conversation AI responses and escalations
 * - Voice AI call completions and custom actions
 * - Workflow triggers (contact events, appointment bookings, etc.)
 *
 * Payload flow:
 * 1. Validate shared secret (from body field x_ghl_secret)
 * 2. Detect and normalize the event type
 * 3. Log to the ike_agent_logs table for audit trail
 * 4. Forward to SintraPrime orchestration layer
 * 5. Return success response
 */
export const handleGhlWebhook = async (req: Request, res: Response) => {
  try {
    const payload: GhlWebhookPayload = req.body;

    // 1. Validate shared secret
    if (!validateSecret(payload)) {
      log.warn({ ip: req.ip }, 'GHL webhook rejected: invalid secret');
      return res.status(401).json({ error: 'Unauthorized: invalid webhook secret' });
    }

    // 2. Normalize the payload
    const event = normalizePayload(payload);

    log.info({
      event_type: event.event_type,
      agent_name: event.agent_name,
      contact: event.contact.email || event.contact.phone || 'unknown',
      location_id: event.location_id,
    }, 'GHL webhook received');

    // 3. Log to agent_logs for audit trail
    const database = getDb();
    const logId = randomUUID();
    const traceId = randomUUID();

    await database.insert(ikeAgentLogs).values({
      id: logId,
      trace_id: traceId,
      level: 'info',
      message: `GHL AI Agent event: ${event.agent_name} [${event.event_type}]`,
      action: `ghl_${event.event_type}`,
      metadata: event,
    });

    // 4. Forward to SintraPrime orchestration layer
    const sintraWebhookUrl = process.env.SINTRA_WEBHOOK_URL;
    if (sintraWebhookUrl) {
      try {
        await fetch(sintraWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'ghl_agent_event',
            trace_id: traceId,
            payload: event,
          }),
        });
      } catch (fwdError: any) {
        // Don't fail the webhook — the event is already logged
        log.error({ error: fwdError.message }, 'Failed to forward GHL event to SintraPrime orchestration');
      }
    }

    // 5. Handle specific event types
    switch (event.event_type) {
      case 'conversation_ai_responded':
        await handleConversationAiResponse(event);
        break;
      case 'conversation_ai_escalated':
        await handleConversationAiEscalation(event);
        break;
      case 'voice_ai_call_completed':
        await handleVoiceAiCallCompleted(event);
        break;
      case 'voice_ai_custom_action':
        // Voice AI custom actions expect a JSON response the agent can use
        return res.json({
          success: true,
          message: 'Custom action processed',
          trace_id: traceId,
          data: await handleVoiceAiCustomAction(event),
        });
      default:
        log.info({ event_type: event.event_type }, 'GHL event processed (no specific handler)');
    }

    res.json({
      success: true,
      message: 'GHL webhook processed',
      trace_id: traceId,
    });
  } catch (error: any) {
    log.error({ error: error.message, stack: error.stack }, 'Error processing GHL webhook');
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

// ─── Event-Specific Handlers ─────────────────────────────────────────────────

async function handleConversationAiResponse(event: GhlNormalizedEvent): Promise<void> {
  log.info({
    agent: event.agent_name,
    contact: event.contact.name || event.contact.phone,
    response_preview: event.conversation_ai?.response_text?.substring(0, 100),
  }, 'Conversation AI agent responded');

  // Future: Route to specific SintraPrime agent based on agent_name
  // Future: Update contact CRM record with interaction summary
}

async function handleConversationAiEscalation(event: GhlNormalizedEvent): Promise<void> {
  log.warn({
    agent: event.agent_name,
    contact: event.contact.name || event.contact.phone,
    intent: event.conversation_ai?.intent_detected,
  }, 'Conversation AI agent escalated — human handoff required');

  // Future: Create a task in SintraPrime for human review
  // Future: Send Slack notification to the team
}

async function handleVoiceAiCallCompleted(event: GhlNormalizedEvent): Promise<void> {
  log.info({
    agent: event.agent_name,
    duration: event.voice_call?.duration_seconds,
    status: event.voice_call?.status,
    contact: event.contact.phone,
  }, 'Voice AI call completed');

  // Future: Store call transcript for analysis
  // Future: Update contact record with call outcome
}

async function handleVoiceAiCustomAction(event: GhlNormalizedEvent): Promise<Record<string, any>> {
  log.info({
    agent: event.agent_name,
    contact: event.contact.phone,
  }, 'Voice AI custom action triggered');

  // Voice AI custom actions can return data the agent uses mid-call.
  // For example, looking up a contact's case status in SintraPrime.
  return {
    contact_name: event.contact.name || 'Unknown',
    status: 'active',
    message: 'Contact data retrieved from SintraPrime',
  };
}
