// clawdbot-integration/skills/ManusSkill.ts
// Primary interface between the Telegram user and the IkeBot execution engine.
// Defines the service catalog, validates user input, formats task payloads,
// and submits tasks to the SintraPrime airlock server.

import { z } from "zod";
import crypto from "crypto";

// --- Service Definitions ---
export const SERVICE_CATALOG = {
  credit_analysis: {
    name: "Credit Analysis Report",
    category: "business",
    price_basic: 79900, // cents
    price_pro: 63900,
    estimated_hours: 24,
    required_fields: ["business_name", "financial_data_description"],
    deliverable_format: "pdf",
  },
  basic_business_plan: {
    name: "Basic Business Plan",
    category: "business",
    price_basic: 49900,
    price_pro: 39900,
    estimated_hours: 12,
    required_fields: ["business_concept", "target_market"],
    deliverable_format: "pdf",
  },
  comprehensive_business_plan: {
    name: "Comprehensive Business Plan",
    category: "business",
    price_basic: 99900,
    price_pro: 79900,
    estimated_hours: 48,
    required_fields: ["business_concept", "target_market", "financial_assumptions"],
    deliverable_format: "pdf",
  },
  ai_research_brief: {
    name: "AI Topic Research Brief",
    category: "research",
    price_basic: 34900,
    price_pro: 27900,
    estimated_hours: 16,
    required_fields: ["research_topic", "scope_description"],
    deliverable_format: "md",
  },
  static_website: {
    name: "Static Website Scaffold",
    category: "development",
    price_basic: 29900,
    price_pro: 23900,
    estimated_hours: 4,
    required_fields: ["site_purpose", "design_preferences"],
    deliverable_format: "zip",
  },
  landing_page: {
    name: "Landing Page Development",
    category: "development",
    price_basic: 49900,
    price_pro: 39900,
    estimated_hours: 8,
    required_fields: ["site_purpose", "design_preferences", "copy_requirements"],
    deliverable_format: "zip",
  },
  document_analysis: {
    name: "Document Analysis & Summary",
    category: "documents",
    price_basic: 4900,
    price_pro: 3900,
    estimated_hours: 2,
    required_fields: ["document_description"],
    deliverable_format: "md",
  },
  document_creation: {
    name: "Comprehensive Document Creation",
    category: "documents",
    price_basic: 19900,
    price_pro: 15900,
    estimated_hours: 8,
    required_fields: ["document_type", "requirements"],
    deliverable_format: "md",
  },
  brand_copy: {
    name: "Brand Copy Package",
    category: "creative",
    price_basic: 19900,
    price_pro: 15900,
    estimated_hours: 6,
    required_fields: ["brand_name", "brand_description"],
    deliverable_format: "md",
  },
  data_analysis: {
    name: "Data Analysis & Visualization",
    category: "data",
    price_basic: 29900,
    price_pro: 23900,
    estimated_hours: 8,
    required_fields: ["dataset_description", "analysis_goals"],
    deliverable_format: "pdf",
  },
} as const;

export type ServiceKey = keyof typeof SERVICE_CATALOG;

// --- Task Payload Schema ---
const TaskPayloadSchema = z.object({
  task_id: z.string(),
  service_key: z.string(),
  user_id: z.string(),
  telegram_chat_id: z.number(),
  subscription_tier: z.enum(["free", "pro", "enterprise"]),
  payment_confirmed: z.boolean(),
  stripe_payment_id: z.string(),
  user_input: z.record(z.string()),
  uploaded_files: z.array(z.string()).optional(),
  created_at: z.string().datetime(),
  priority: z.number().min(1).max(3),
});

export type TaskPayload = z.infer<typeof TaskPayloadSchema>;

// --- Task ID Generation ---
export function generateTaskId(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
  return `TK-${dateStr}-${suffix}`;
}

// --- HMAC Signing ---
export function signPayload(payload: TaskPayload, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(JSON.stringify(payload));
  return hmac.digest("hex");
}

// --- Priority from Tier ---
export function getPriorityFromTier(
  tier: "free" | "pro" | "enterprise"
): number {
  switch (tier) {
    case "enterprise":
      return 1;
    case "pro":
      return 2;
    default:
      return 3;
  }
}

// --- Price Lookup ---
export function getPrice(
  serviceKey: ServiceKey,
  tier: "free" | "pro" | "enterprise"
): number {
  const service = SERVICE_CATALOG[serviceKey];
  if (!service) return 0;

  if (tier === "enterprise") return 0; // Included in subscription
  if (tier === "pro") return service.price_pro;
  return service.price_basic;
}

// --- Task Submission ---
export async function submitTask(payload: TaskPayload): Promise<void> {
  const validated = TaskPayloadSchema.parse(payload);
  const secret = process.env.AIRLOCK_HMAC_SECRET;

  if (!secret) {
    throw new Error("AIRLOCK_HMAC_SECRET is not configured");
  }

  const signature = signPayload(validated, secret);

  const response = await fetch(
    `${process.env.AIRLOCK_SERVER_URL}/api/ikebot-task`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Signature": signature,
        "X-Task-ID": validated.task_id,
      },
      body: JSON.stringify(validated),
    }
  );

  if (!response.ok) {
    throw new Error(`Airlock submission failed: ${response.status}`);
  }
}
