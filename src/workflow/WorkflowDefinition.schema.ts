import { z } from "zod";

import { ExecutionStepSchema } from "../schemas/ExecutionPlan.schema.js";

const HttpWorkflowStepSchema = ExecutionStepSchema
  .omit({ step_id: true, url: true })
  // Allow template placeholders like {{BASE_URL}}/...; the rendered step is still
  // validated by ExecutionPlanSchema inside executePlan.
  .extend({ url: z.string().min(1) });

// ShellAdapter steps are not URL-based and are executed locally.
const ShellWorkflowStepSchema = z.object({
  adapter: z.literal("ShellAdapter"),
  action: z.string().optional().default("shell.run"),
  command: z.string().min(1),
  shell: z.enum(["bash", "pwsh", "sh"]).optional().default("bash"),
  cwd: z.string().optional(),
  env: z.record(z.string()).optional(),
  timeout_ms: z.number().int().min(1).max(3_600_000).optional(),
  expects: z.object({ exit_code: z.union([z.number().int(), z.array(z.number().int())]).optional() }).optional(),
});

// NotionAdapter insert is a workflow-level convenience that compiles to a governed Notion live insert.
const NotionInsertWorkflowStepSchema = z.object({
  adapter: z.literal("NotionAdapter"),
  method: z.literal("insert"),
  database_id: z.string().min(1),
  content: z.record(z.any()).default({}),
});

const BrowserWorkflowStepSchema = z.object({
  adapter: z.literal("BrowserAgent"),
  action: z.string().optional().default("browser.goto"),
  method: z.enum(["goto", "pause_for_confirmation", "run_script"]),
  // Allow template placeholders like {{URL}}; the rendered step is validated by ExecutionPlanSchema.
  url: z.string().min(1).optional(),
  timeout_ms: z.number().int().min(1).max(3_600_000).optional(),
  // pause_for_confirmation
  message: z.string().min(1).optional(),
  // run_script
  script: z.string().min(1).optional(),
  headed: z.boolean().optional(),
});

const SnapshotWorkflowStepSchema = z.object({
  adapter: z.literal("SnapshotAdapter"),
  action: z.string().optional().default("snapshot.capture"),
  method: z.literal("capture"),
  vendor: z.string().min(1),
  // Allow template placeholders like {{URL}}; the rendered step is validated by ExecutionPlanSchema.
  url: z.string().min(1),
  mode: z.enum(["playwright", "fetch"]).optional(),
  robots: z.enum(["respect", "override"]).optional(),
  labels: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const WorkflowStepSchema = z.union([
  HttpWorkflowStepSchema,
  ShellWorkflowStepSchema,
  NotionInsertWorkflowStepSchema,
  BrowserWorkflowStepSchema,
  SnapshotWorkflowStepSchema,
]);

const RetrySchema = z
  .object({
    max_attempts: z.number().int().min(1).max(20).default(1),
    backoff_ms: z.number().int().min(0).max(300_000).default(0),
  })
  .default({ max_attempts: 1, backoff_ms: 0 });

const ConditionSchema = z.object({
  ref: z.string().min(1),
  path: z.string().min(1),
  equals: z.any(),
});

const VarsSchema = z.record(z.string()).default({});

const AdapterUseSchema = z.object({
  adapter: z.string().min(1),
  scopes: z.array(z.string().min(1)).min(1),
});

const NodePolicySchema = z.object({
  hoursAllowed: z.array(z.number().int().min(0).max(23)).optional(),
  requiredRole: z.enum(["approver", "viewer", "operator"]).optional(),
}).optional();

const EmitSchema = z
  .object({
    // Allow template placeholders; emit plan is validated at execution time.
    url: z.string().min(1),
    event_type: z.string().min(1),
    mode: z.enum(["always", "success", "failure"]).default("always"),
  })
  .optional();

export const WorkflowNodeSchema = z.object({
  id: z.string().min(1),
  description: z.string().optional(),

  when: ConditionSchema.optional(),

  retry: RetrySchema.optional(),

  // Variable injection for template substitution ({{VARNAME}}) inside step fields.
  env: VarsSchema.optional(),
  vars: VarsSchema.optional(),

  // Minimal policy layer.
  policy: NodePolicySchema,

  // Optional post-step emitter (webhook POST).
  emit: EmitSchema,

  // Routing. If omitted, runner falls back to the next node in array order.
  next: z.string().min(1).optional(),
  on_success: z.string().min(1).optional(),
  on_failure: z.string().min(1).optional(),

  // An ExecutionStep without step_id; runner assigns step_id=node.id.
  step: WorkflowStepSchema,
});

export const WorkflowDefinitionSchema = z.object({
  kind: z.literal("WorkflowDefinition"),
  workflow_id: z.string().min(1),
  threadId: z.string().min(1),
  dry_run: z.boolean().default(false),
  goal: z.string().min(1),

  // Optional governed adapter declarations (capability surface).
  uses: z.array(AdapterUseSchema).default([]),

  // Optional domain for role checks.
  domain_id: z.string().min(1).optional(),

  // Global template variables.
  vars: VarsSchema.optional(),

  agent_versions: z
    .object({
      validator: z.string().min(1),
      planner: z.string().min(1),
    })
    .default({ validator: "workflow.runner@1", planner: "workflow.runner@1" }),

  assumptions: z.array(z.string()).optional(),

  required_secrets: z
    .array(
      z.object({
        name: z.string().min(1),
        source: z.literal("env"),
        notes: z.string().min(1),
      })
    )
    .default([]),

  nodes: z.array(WorkflowNodeSchema).min(1),
});

export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
