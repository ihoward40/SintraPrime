/**
 * Core type definitions for the SintraPrime autonomous agent system
 */

export interface TaskRequest {
  id: string;
  prompt: string;
  context?: any;
  priority: 'low' | 'medium' | 'high';
  requester: string;
  timestamp: string;
}

export interface Plan {
  id: string;
  taskId: string;
  steps: PlanStep[];
  constraints: any;
}

export interface PlanStep {
  id: string;
  description: string;
  tool: string;
  args: any;
  dependencies: string[];
}

export interface ToolCall {
  id: string;
  idempotencyKey: string;
  planStepId: string;
  tool: string;
  args: any;
  timestamp: string;
}

export interface ActionReceipt {
  id: string;
  toolCallId: string;
  actor: string;
  action: string;
  timestamp: string;
  result: any;
  hash: string;
}

export interface PolicyDecision {
  id: string;
  toolCallId: string;
  decision: 'allow' | 'block' | 'modify';
  reason: string;
  timestamp: string;
  modifiedArgs?: any;
}

export interface CredentialReference {
  id: string;
  credentialName: string;
  tokenHandle: string;
}

export interface JobState {
  id: string;
  planId: string;
  status: 'running' | 'paused' | 'waiting-human' | 'completed' | 'failed';
  currentStepId?: string;
  history: JobHistoryEntry[];
}

export interface JobHistoryEntry {
  stepId: string;
  status: 'completed' | 'failed';
  result?: any;
  error?: string;
  timestamp: string;
}

export interface BudgetPolicy {
  id: string;
  name: string;
  spendCaps: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  thresholds: {
    requiresApproval: number;
  };
  perToolLimits: {
    [toolName: string]: number;
  };
}

export interface ReportArtifact {
  id: string;
  name: string;
  timestamp: string;
  format: 'pdf' | 'csv' | 'markdown';
  content: any;
}

export interface Tool {
  name: string;
  description: string;
  execute(args: any): Promise<any>;
}

// Legacy/compat task types used by some modules under src/agents and src/ai.
export type TaskResult = {
  ok?: boolean;
  success?: boolean;
  data?: unknown;
  error?: string;
  [k: string]: unknown;
};

export type ExecutionContext = {
  now?: () => Date;
  env?: Record<string, string | undefined>;
  log?: (msg: string, meta?: unknown) => void;
  secrets?: Record<string, string>;
  [k: string]: unknown;
};

export type Task = {
  id: string;
  name: string;
  run: (ctx: ExecutionContext) => Promise<TaskResult>;
  [k: string]: unknown;
};

export interface Connector {
  name: string;
  type: string;
  authenticate(): Promise<void>;
  call(method: string, endpoint: string, args: any): Promise<any>;
}
