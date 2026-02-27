import {
  GhlAgent,
  GhlListResponse,
  GhlConversation,
  GhlConversationMessage,
  GhlApiContact,
  GhlUpdateContactRequest,
  GhlSendMessageRequest,
  GhlSendMessageResponse,
  GhlTriggerWorkflowRequest,
} from '../types/ghl.types';
import { createLogger } from '../config/logger';

const log = createLogger({ module: 'ghl-client' });

// ─── Configuration ───────────────────────────────────────────────────────────

const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_DEFAULT_LOCATION_ID = '69323e851c84d97148a27daa';

/**
 * GHL API rate limits (per Private Integration Token):
 * - 100 requests per 10 seconds
 * - 200,000 requests per day
 *
 * This simple sliding-window rate limiter prevents exceeding the burst limit.
 */
class RateLimiter {
  private timestamps: number[] = [];
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    // Remove timestamps outside the current window
    this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);

    if (this.timestamps.length >= this.maxRequests) {
      const oldestInWindow = this.timestamps[0];
      const waitTime = this.windowMs - (now - oldestInWindow) + 50; // +50ms buffer
      log.debug({ waitTime }, 'GHL rate limit: waiting before next request');
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.timestamps.push(Date.now());
  }
}

const rateLimiter = new RateLimiter(100, 10_000); // 100 requests per 10 seconds

// ─── Core HTTP Helper ────────────────────────────────────────────────────────

/**
 * Make an authenticated request to the GHL API.
 * Follows the same pattern as makeClient.ts but with GHL-specific auth and rate limiting.
 *
 * @param method - HTTP method
 * @param endpoint - API path (e.g., /conversation-ai/agents)
 * @param body - Optional request body for POST/PUT/PATCH
 * @param queryParams - Optional URL query parameters
 */
async function ghlRequest<T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  body?: Record<string, any>,
  queryParams?: Record<string, string>
): Promise<T> {
  const token = process.env.GHL_PRIVATE_INTEGRATION_TOKEN;
  if (!token) throw new Error('GHL_PRIVATE_INTEGRATION_TOKEN not set');

  // Enforce rate limiting
  await rateLimiter.waitForSlot();

  // Build URL with query params
  const url = new URL(`${GHL_BASE_URL}${endpoint}`);
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Version: '2021-07-28',
    Accept: 'application/json',
  };

  const options: RequestInit = { method, headers };

  if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  log.debug({ method, endpoint }, 'GHL API request');

  const res = await fetch(url.toString(), options);

  if (!res.ok) {
    const text = await res.text();
    log.error({ status: res.status, endpoint, response: text }, 'GHL API error');
    throw new Error(`GHL API error: ${res.status} ${text}`);
  }

  // Some endpoints return 204 No Content
  if (res.status === 204) {
    return {} as T;
  }

  return res.json() as Promise<T>;
}

// ─── Helper: Resolve Location ID ────────────────────────────────────────────

function getLocationId(): string {
  return process.env.GHL_LOCATION_ID || GHL_DEFAULT_LOCATION_ID;
}

// ─── Conversation AI Agent Methods ──────────────────────────────────────────

/**
 * List all Conversation AI agents for the configured location.
 * GET /conversation-ai/agents?locationId={locationId}
 */
export async function listAgents(): Promise<GhlAgent[]> {
  const response = await ghlRequest<{ agents: GhlAgent[] }>(
    'GET',
    '/conversation-ai/agents',
    undefined,
    { locationId: getLocationId() }
  );
  return response.agents || [];
}

/**
 * Get details of a specific Conversation AI agent.
 * GET /conversation-ai/agents/{agentId}?locationId={locationId}
 */
export async function getAgent(agentId: string): Promise<GhlAgent> {
  return ghlRequest<GhlAgent>(
    'GET',
    `/conversation-ai/agents/${agentId}`,
    undefined,
    { locationId: getLocationId() }
  );
}

// ─── Conversation Methods ───────────────────────────────────────────────────

/**
 * List conversations for the configured location.
 * GET /conversations/?locationId={locationId}
 */
export async function listConversations(params?: {
  limit?: number;
  startAfterDate?: string;
  assignedTo?: string;
}): Promise<GhlListResponse<GhlConversation>> {
  const query: Record<string, string> = { locationId: getLocationId() };
  if (params?.limit) query.limit = String(params.limit);
  if (params?.startAfterDate) query.startAfterDate = params.startAfterDate;
  if (params?.assignedTo) query.assignedTo = params.assignedTo;

  return ghlRequest<GhlListResponse<GhlConversation>>(
    'GET',
    '/conversations/',
    undefined,
    query
  );
}

/**
 * Get a specific conversation by ID.
 * GET /conversations/{conversationId}
 */
export async function getConversation(conversationId: string): Promise<GhlConversation> {
  return ghlRequest<GhlConversation>(
    'GET',
    `/conversations/${conversationId}`
  );
}

// ─── Message Methods ────────────────────────────────────────────────────────

/**
 * List messages in a conversation.
 * GET /conversations/{conversationId}/messages
 */
export async function listMessages(
  conversationId: string,
  params?: { limit?: number; lastMessageId?: string }
): Promise<GhlListResponse<GhlConversationMessage>> {
  const query: Record<string, string> = {};
  if (params?.limit) query.limit = String(params.limit);
  if (params?.lastMessageId) query.lastMessageId = params.lastMessageId;

  return ghlRequest<GhlListResponse<GhlConversationMessage>>(
    'GET',
    `/conversations/${conversationId}/messages`,
    undefined,
    query
  );
}

/**
 * Send a message to a contact via the GHL API.
 * POST /conversations/messages
 */
export async function sendMessage(
  request: GhlSendMessageRequest
): Promise<GhlSendMessageResponse> {
  return ghlRequest<GhlSendMessageResponse>(
    'POST',
    '/conversations/messages',
    request
  );
}

// ─── Contact Methods ────────────────────────────────────────────────────────

/**
 * Get a contact by ID.
 * GET /contacts/{contactId}
 */
export async function getContact(contactId: string): Promise<GhlApiContact> {
  const response = await ghlRequest<{ contact: GhlApiContact }>(
    'GET',
    `/contacts/${contactId}`
  );
  return response.contact;
}

/**
 * Update a contact's information.
 * PUT /contacts/{contactId}
 */
export async function updateContact(
  contactId: string,
  data: GhlUpdateContactRequest
): Promise<GhlApiContact> {
  const response = await ghlRequest<{ contact: GhlApiContact }>(
    'PUT',
    `/contacts/${contactId}`,
    data
  );
  return response.contact;
}

/**
 * Search contacts by email, phone, or name.
 * GET /contacts/?locationId={locationId}&query={query}
 */
export async function searchContacts(
  query: string,
  params?: { limit?: number }
): Promise<GhlListResponse<GhlApiContact>> {
  const queryParams: Record<string, string> = {
    locationId: getLocationId(),
    query,
  };
  if (params?.limit) queryParams.limit = String(params.limit);

  return ghlRequest<GhlListResponse<GhlApiContact>>(
    'GET',
    '/contacts/',
    undefined,
    queryParams
  );
}

/**
 * Add tags to a contact.
 * POST /contacts/{contactId}/tags
 */
export async function addContactTags(
  contactId: string,
  tags: string[]
): Promise<void> {
  await ghlRequest<void>(
    'POST',
    `/contacts/${contactId}/tags`,
    { tags }
  );
}

// ─── Workflow Methods ───────────────────────────────────────────────────────

/**
 * Trigger a GHL workflow for a specific contact.
 * POST /contacts/{contactId}/workflow/{workflowId}
 */
export async function triggerWorkflow(
  contactId: string,
  workflowId: string,
  data?: GhlTriggerWorkflowRequest
): Promise<void> {
  await ghlRequest<void>(
    'POST',
    `/contacts/${contactId}/workflow/${workflowId}`,
    data || {}
  );
}

// ─── Convenience: callGhl (mirrors callMake pattern) ────────────────────────

/**
 * Generic GHL API call — mirrors the callMake() pattern from makeClient.ts.
 * Use this for any GHL endpoint not covered by the typed methods above.
 *
 * @param endpoint - API path (e.g., /contacts/abc123)
 * @param body - Request body (POST/PUT)
 * @param method - HTTP method (defaults to POST)
 */
export async function callGhl(
  endpoint: string,
  body: any,
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' = 'POST'
): Promise<any> {
  return ghlRequest(method, endpoint, body);
}
