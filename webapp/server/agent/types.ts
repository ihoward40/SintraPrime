export interface Tool {
  name: string;
  description: string;
  parameters: ToolParameter[];
  execute(params: any, context: AgentContext): Promise<ToolResult>;
}

export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required: boolean;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface AgentContext {
  userId: number;
  caseId?: number;
  onProgress?: (progress: ProgressUpdate) => void;
}

export interface ProgressUpdate {
  currentStep: number;
  totalSteps: number;
  stepDescription: string;
  progress: number;
}

export interface TaskPlan {
  steps: TaskStep[];
}

export interface TaskStep {
  tool: string;
  params: Record<string, any>;
  description: string;
  optional?: boolean;
}

export interface AgentResult {
  success: boolean;
  result?: string;
  error?: string;
  steps?: number;
  executionHistory?: Array<{ step: any; result: ToolResult }>;
}
