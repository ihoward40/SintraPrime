// apps/api/src/types/ghl.types.ts
// TypeScript types and interfaces for GoHighLevel (GHL) webhook payloads
// and API responses. Used by ghl.webhook.ts and ghlClient.ts.

// ─── Webhook Payload Types ───────────────────────────────────────────────────

/**
 * GHL Location (sub-account) information included in webhook payloads.
 */
export interface GhlLocation {
  id: string;
  name: string;
}

/**
 * GHL Contact data extracted from webhook payloads.
 */
export interface GhlContact {
  id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  company_name?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  source?: string;
  date_added?: string;
  custom_fields?: Record<string, string>;
}

/**
 * GHL Message data from Conversation AI or SMS/email events.
 */
export interface GhlMessage {
  id?: string;
  type: 'SMS' | 'Email' | 'GMB' | 'FB' | 'IG' | 'WhatsApp' | 'Live_Chat' | 'Custom' | string;
  body: string;
  direction: 'inbound' | 'outbound';
  status?: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  date_added?: string;
  conversation_id?: string;
  contact_id?: string;
  user_id?: string;
}

/**
 * GHL Workflow metadata included in webhook payloads.
 */
export interface GhlWorkflow {
  id: string;
  name: string;
  status?: 'active' | 'draft' | 'inactive';
}

/**
 * GHL Voice AI call data from Voice AI Custom Actions.
 */
export interface GhlVoiceCall {
  call_id?: string;
  call_sid?: string;
  direction: 'inbound' | 'outbound';
  status: 'ringing' | 'in-progress' | 'completed' | 'failed' | 'busy' | 'no-answer';
  from?: string;
  to?: string;
  duration_seconds?: number;
  recording_url?: string;
  transcript?: string;
  agent_id?: string;
  agent_name?: string;
}

/**
 * GHL Conversation AI agent event data.
 */
export interface GhlConversationAiEvent {
  agent_id?: string;
  agent_name?: string;
  conversation_id?: string;
  contact_id?: string;
  response_text?: string;
  intent_detected?: string;
  confidence_score?: number;
  action_taken?: string;
}

/**
 * All GHL event types that can be received via webhook.
 */
export type GhlEventType =
  | 'conversation_ai_responded'
  | 'conversation_ai_escalated'
  | 'voice_ai_call_completed'
  | 'voice_ai_custom_action'
  | 'workflow_trigger'
  | 'contact_created'
  | 'contact_updated'
  | 'appointment_booked'
  | 'customer_replied'
  | 'message_sent'
  | 'unknown';

/**
 * The full incoming webhook payload from GHL outbound webhook action.
 * GHL's free outbound webhook sends contact fields at the top level
 * along with nested objects for location, message, and workflow data.
 *
 * NOTE: The shared secret is sent as a body field (x_ghl_secret) because
 * GHL's free outbound webhook does not support custom HTTP headers.
 */
export interface GhlWebhookPayload {
  // Authentication (body field since free webhooks don't support custom headers)
  x_ghl_secret?: string;

  // Contact fields (top-level in GHL outbound webhook)
  contact_id?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  email?: string;
  phone?: string;
  tags?: string[];
  company_name?: string;

  // Location (sub-account)
  location?: GhlLocation;

  // Message data
  message?: GhlMessage;

  // Workflow info
  workflow?: GhlWorkflow;

  // Voice AI data (present for voice agent events)
  voice_call?: GhlVoiceCall;

  // Conversation AI data (present for conversation agent events)
  conversation_ai?: GhlConversationAiEvent;

  // Custom data fields added in the GHL workflow webhook action
  agent_name?: string;
  event_type?: GhlEventType;

  // Catch-all for additional custom fields
  [key: string]: unknown;
}

/**
 * Normalized event structure after processing the raw GHL webhook payload.
 * This is what gets logged and forwarded to the SintraPrime orchestration layer.
 */
export interface GhlNormalizedEvent {
  source: 'gohighlevel';
  event_type: GhlEventType;
  location_id: string;
  contact: {
    id?: string;
    name?: string;
    email?: string;
    phone?: string;
    tags?: string[];
  };
  message: GhlMessage | null;
  workflow: GhlWorkflow | null;
  voice_call: GhlVoiceCall | null;
  conversation_ai: GhlConversationAiEvent | null;
  agent_name: string;
  received_at: string;
}

// ─── API Response Types ──────────────────────────────────────────────────────

/**
 * GHL Conversation AI Agent as returned by the API.
 */
export interface GhlAgent {
  id: string;
  name: string;
  locationId: string;
  type?: 'conversation' | 'voice' | 'agent-studio';
  status?: 'active' | 'inactive' | 'draft';
  model?: string;
  prompt?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * GHL API list response wrapper (paginated).
 */
export interface GhlListResponse<T> {
  data: T[];
  meta?: {
    total: number;
    currentPage: number;
    nextPage: number | null;
    prevPage: number | null;
    lastPage: number;
  };
}

/**
 * GHL Conversation as returned by the Conversations API.
 */
export interface GhlConversation {
  id: string;
  contactId: string;
  locationId: string;
  lastMessageBody?: string;
  lastMessageDate?: string;
  lastMessageType?: string;
  lastMessageDirection?: 'inbound' | 'outbound';
  type: string;
  unreadCount?: number;
  starred?: boolean;
  assignedTo?: string;
  dateAdded?: string;
  dateUpdated?: string;
}

/**
 * GHL Conversation Message as returned by the Messages API.
 */
export interface GhlConversationMessage {
  id: string;
  conversationId: string;
  contactId: string;
  locationId: string;
  body: string;
  type: string;
  direction: 'inbound' | 'outbound';
  status?: string;
  dateAdded: string;
  userId?: string;
  attachments?: string[];
}

/**
 * GHL Contact as returned by the Contacts API.
 */
export interface GhlApiContact {
  id: string;
  locationId: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  tags?: string[];
  source?: string;
  dateAdded?: string;
  dateUpdated?: string;
  customFields?: Record<string, string>;
}

/**
 * Request body for updating a GHL contact.
 */
export interface GhlUpdateContactRequest {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  address1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  tags?: string[];
  customFields?: Record<string, string>;
}

/**
 * Request body for sending a message via the GHL API.
 */
export interface GhlSendMessageRequest {
  type: 'SMS' | 'Email' | 'WhatsApp' | 'GMB' | 'IG' | 'FB' | 'Live_Chat' | 'Custom';
  contactId: string;
  message?: string;
  subject?: string;
  html?: string;
  emailFrom?: string;
  attachments?: string[];
}

/**
 * Response from sending a message via the GHL API.
 */
export interface GhlSendMessageResponse {
  conversationId: string;
  messageId: string;
  msg?: string;
}

/**
 * Request body for triggering a GHL workflow via API.
 */
export interface GhlTriggerWorkflowRequest {
  eventStartTime?: string;
  [key: string]: unknown;
}

/**
 * GHL API error response structure.
 */
export interface GhlApiError {
  statusCode: number;
  message: string;
  error?: string;
}
