import { z } from "zod";

const HttpStatusExpectedSchema = z
  .union([z.number(), z.array(z.number())])
  .transform((v) => (Array.isArray(v) ? v : [v]));

const StepGuardSchema = z.object({
  path: z.string().min(1),
  op: z.enum(["==", "!=" as const]),
  value: z.any(),
});

const EgressGuardSchema = z.object({
  // Case linkage (required for approval-by-hash enforcement)
  case_id: z.string().min(1),
  notion_page_id: z.string().min(1),

  // If provided, executor will compute bundle hash for this stage/kind.
  stage: z.string().min(1).optional(),
  kind: z.enum(["packet", "binder"]).optional(),

  // Optional override: must be accompanied by override metadata to leave evidence.
  override_reason: z.string().min(1).optional(),
  override_by: z.string().min(1).optional(),
});

function hasHeader(headers: Record<string, string> | undefined, headerName: string) {
  if (!headers) return false;
  const wanted = headerName.toLowerCase();
  return Object.keys(headers).some((k) => k.toLowerCase() === wanted);
}

function headersIndicateAuthOrSession(headers: Record<string, string> | undefined): boolean {
  if (!headers) return false;
  return (
    hasHeader(headers, "cookie") ||
    hasHeader(headers, "authorization") ||
    Object.keys(headers).some((k) => k.toLowerCase().startsWith("x-csrf"))
  );
}

function looksSendish(action: string, url: string): boolean {
  return /upload|submit|dispatch|send|portal|certified|mail|file|complaint/i.test(`${action} ${url}`);
}

export const ExecutionStepSchema = z.object({
  step_id: z.string(),
  action: z.string(),
  adapter: z.enum([
    "WebhookAdapter",
    "NotionAdapter",
    "GoogleDriveAdapter",
    "MakeAdapter",
    "SlackAdapter",
    "BuildMyAgentAdapter",
  ]),
  method: z.enum(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]),
  read_only: z.boolean().optional(),
  url: z.string().url(),
  notion_path: z.string().optional(),
  notion_path_prestate: z.string().optional(),
  approval_scoped: z.boolean().optional(),
  approved_at: z.string().optional(),
  prestate: z.any().optional(),
  prestate_fingerprint: z.string().optional(),
  properties: z.any().optional(),
  guards: z.array(StepGuardSchema).optional(),
  headers: z.record(z.string()).optional(),
  payload: z.any().optional(),
  expects: z.object({
    http_status: HttpStatusExpectedSchema,
    json_paths_present: z.array(z.string()).optional(),
  }),
  idempotency_key: z.string().nullable().optional(),
  egress_guard: EgressGuardSchema.optional(),
  rollback: z.any().optional(),
});

export const ExecutionPhaseSchema = z.object({
  phase_id: z.string().min(1),
  required_capabilities: z.array(z.string()).min(1),
  inputs_from: z.array(z.string()).optional(),
  steps: z.array(ExecutionStepSchema).min(1),
  // Planner-declared outputs that should be captured into artifacts for later phases.
  outputs: z.array(z.string()).optional(),
});

export const ExecutionPlanSchema = z
  .object({
  kind: z.literal("ExecutionPlan"),
  execution_id: z.string(),
  threadId: z.string(),
  dry_run: z.boolean(),
  goal: z.string(),
  // Tier 5.1: capability requirements (planner emits requirements, CLI resolves via registry).
  required_capabilities: z.array(z.string()).optional(),
  agent_versions: z.object({
    validator: z.string(),
    planner: z.string(),
  }),
  assumptions: z.array(z.string()).optional(),
  required_secrets: z.array(
    z.object({
      name: z.string(),
      source: z.literal("env"),
      notes: z.string(),
    })
  ),
  // Tier 5.2: phased execution is optional and additive.
  phases: z.array(ExecutionPhaseSchema).optional(),
  // Legacy single-phase steps. If phases are present, steps may be omitted.
  steps: z.array(ExecutionStepSchema).optional().default([]),
  })
  .refine(
    (plan) => !(plan.phases && Array.isArray(plan.steps) && plan.steps.length > 0),
    {
      message: "ExecutionPlan cannot define both top-level steps and phases",
    }
  )
  .superRefine((plan, ctx) => {
    // Pre-validation egress tightening (best-effort):
    // - If a plan is egress-bearing (any step has egress_guard), then treat subsequent external steps as part of an egress chain.
    // - Require egress_guard for any external non-GET/HEAD, and for GET/HEAD that carry auth/session headers, look send-ish,
    //   or occur after the first guarded step.
    // This is intentionally conservative and duplicates runtime checks to prevent side-door plans.
    const steps = Array.isArray((plan as any).steps) ? ((plan as any).steps as any[]) : [];
    const planIsEgressBearing = steps.some((s) => !!s?.egress_guard);
    let followingGuardedStep = false;

    for (const step of steps) {
      let host = "";
      try {
        host = new URL(String(step.url)).hostname.toLowerCase();
      } catch {
        // URL shape is validated by zod already.
      }
      const isLocal = host === "localhost" || host === "127.0.0.1";
      const isNotion = host === "api.notion.com";
      const isExternal = Boolean(host) && !isLocal && !isNotion;

      if (!isExternal) continue;

      const method = String(step.method).toUpperCase();
      const stepHasGuard = Boolean(step?.egress_guard?.case_id && step?.egress_guard?.notion_page_id);

      const guardRequired =
        (method !== "GET" && method !== "HEAD") ||
        (planIsEgressBearing && (followingGuardedStep || headersIndicateAuthOrSession(step.headers) || looksSendish(String(step.action), String(step.url))));

      if (guardRequired && !stepHasGuard) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `egress_guard required for external request (method=${method} host=${host})`,
        });
        return;
      }

      if (isExternal && stepHasGuard) {
        followingGuardedStep = true;
      }
    }
  });

export const NeedInputSchema = z.object({
  kind: z.literal("NeedInput"),
  threadId: z.string().optional(),
  question: z.string(),
  missing: z.array(z.string()).optional(),
});

export const ValidatedCommandSchema = z.object({
  kind: z.literal("ValidatedCommand"),
  allowed: z.boolean(),
  threadId: z.string().optional(),
  intent: z.string().optional(),
  command: z.string().optional(),
  args: z.record(z.any()).optional(),
  denial_reason: z.string().optional(),
  required_inputs: z.array(z.string()).optional(),
  // Optional: validator may override the forwarded command
  forwarded_command: z.string().optional(),
});

export const ValidatorOutputSchema = z.union([ValidatedCommandSchema, NeedInputSchema]);

export const PlannerOutputSchema = z.union([ExecutionPlanSchema, NeedInputSchema]);

export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;
export type ExecutionStep = z.infer<typeof ExecutionStepSchema>;
export type ExecutionPhase = z.infer<typeof ExecutionPhaseSchema>;
export type NeedInput = z.infer<typeof NeedInputSchema>;
export type ValidatedCommand = z.infer<typeof ValidatedCommandSchema>;
export type ValidatorOutput = z.infer<typeof ValidatorOutputSchema>;
export type PlannerOutput = z.infer<typeof PlannerOutputSchema>;
