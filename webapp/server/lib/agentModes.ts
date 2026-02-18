import { invokeLLM } from '../_core/llm';

/**
 * Agent Modes Engine - Three-stage autonomous execution
 * Validator → Planner → Executor
 */

export interface AgentTask {
  id: string;
  description: string;
  context?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ExecutionPlan {
  steps: Array<{
    id: number;
    action: string;
    params: Record<string, any>;
    dependencies: number[];
    estimatedDuration: string;
  }>;
  totalEstimatedTime: string;
  requiredResources: string[];
  risks: string[];
}

export interface ExecutionResult {
  success: boolean;
  completedSteps: number;
  totalSteps: number;
  results: any[];
  errors: string[];
  duration: number;
}

/**
 * Mode 1: Validator
 * Analyzes task feasibility, identifies risks, and validates requirements
 */
export async function validateTask(task: AgentTask): Promise<ValidationResult> {
  const prompt = `You are a legal task validator. Analyze this task for feasibility and risks.

Task: ${task.description}
Context: ${JSON.stringify(task.context || {}, null, 2)}

Provide a structured validation analysis:
1. Is this task valid and feasible?
2. What are the potential issues or blockers?
3. What recommendations would improve success?
4. What is the risk level (low/medium/high/critical)?

Respond in JSON format:
{
  "isValid": boolean,
  "issues": string[],
  "recommendations": string[],
  "riskLevel": "low" | "medium" | "high" | "critical"
}`;

  const response = await invokeLLM({
    messages: [
      { role: 'system', content: 'You are a legal task validation expert.' },
      { role: 'user', content: prompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'validation_result',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            isValid: { type: 'boolean' },
            issues: { type: 'array', items: { type: 'string' } },
            recommendations: { type: 'array', items: { type: 'string' } },
            riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          },
          required: ['isValid', 'issues', 'recommendations', 'riskLevel'],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  return JSON.parse(content || '{}');
}

/**
 * Mode 2: Planner
 * Creates detailed execution plan with steps, dependencies, and resource requirements
 */
export async function createExecutionPlan(task: AgentTask): Promise<ExecutionPlan> {
  const prompt = `You are a legal task planner. Create a detailed execution plan for this task.

Task: ${task.description}
Context: ${JSON.stringify(task.context || {}, null, 2)}

Create a step-by-step execution plan with:
1. Ordered steps with clear actions
2. Parameters needed for each step
3. Dependencies between steps
4. Estimated duration for each step
5. Required resources (APIs, tools, data)
6. Potential risks

Respond in JSON format:
{
  "steps": [
    {
      "id": number,
      "action": string,
      "params": object,
      "dependencies": number[],
      "estimatedDuration": string
    }
  ],
  "totalEstimatedTime": string,
  "requiredResources": string[],
  "risks": string[]
}`;

  const response = await invokeLLM({
    messages: [
      { role: 'system', content: 'You are a legal task planning expert.' },
      { role: 'user', content: prompt },
    ],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'execution_plan',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  action: { type: 'string' },
                  params: { type: 'object', additionalProperties: true },
                  dependencies: { type: 'array', items: { type: 'number' } },
                  estimatedDuration: { type: 'string' },
                },
                required: ['id', 'action', 'params', 'dependencies', 'estimatedDuration'],
                additionalProperties: false,
              },
            },
            totalEstimatedTime: { type: 'string' },
            requiredResources: { type: 'array', items: { type: 'string' } },
            risks: { type: 'array', items: { type: 'string' } },
          },
          required: ['steps', 'totalEstimatedTime', 'requiredResources', 'risks'],
          additionalProperties: false,
        },
      },
    },
  });

  const content = response.choices[0].message.content;
  return JSON.parse(content || '{}');
}

/**
 * Mode 3: Executor
 * Executes the plan step-by-step with error handling and progress tracking
 */
export async function executePlan(
  plan: ExecutionPlan,
  onProgress?: (step: number, total: number, action: string) => void
): Promise<ExecutionResult> {
  const startTime = Date.now();
  const results: any[] = [];
  const errors: string[] = [];
  let completedSteps = 0;

  try {
    // Execute steps in dependency order
    for (const step of plan.steps) {
      // Check dependencies are completed
      const dependenciesCompleted = step.dependencies.every(
        (depId) => results[depId - 1] !== undefined
      );

      if (!dependenciesCompleted) {
        errors.push(`Step ${step.id}: Dependencies not met`);
        break;
      }

      // Report progress
      if (onProgress) {
        onProgress(step.id, plan.steps.length, step.action);
      }

      // Execute step (MVP: simulate execution)
      console.log(`[Agent Executor] Executing step ${step.id}: ${step.action}`);
      
      // In production, this would call actual tools/APIs based on step.action
      const stepResult = {
        stepId: step.id,
        action: step.action,
        success: true,
        output: `Simulated execution of ${step.action}`,
      };

      results.push(stepResult);
      completedSteps++;
    }

    return {
      success: errors.length === 0,
      completedSteps,
      totalSteps: plan.steps.length,
      results,
      errors,
      duration: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      completedSteps,
      totalSteps: plan.steps.length,
      results,
      errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
      duration: Date.now() - startTime,
    };
  }
}

/**
 * Complete agent workflow: Validate → Plan → Execute
 */
export async function runAgentWorkflow(
  task: AgentTask,
  onProgress?: (stage: string, data: any) => void
): Promise<{
  validation: ValidationResult;
  plan: ExecutionPlan;
  execution: ExecutionResult;
}> {
  // Stage 1: Validate
  if (onProgress) onProgress('validating', { task });
  const validation = await validateTask(task);

  if (!validation.isValid) {
    throw new Error(`Task validation failed: ${validation.issues.join(', ')}`);
  }

  // Stage 2: Plan
  if (onProgress) onProgress('planning', { validation });
  const plan = await createExecutionPlan(task);

  // Stage 3: Execute
  if (onProgress) onProgress('executing', { plan });
  const execution = await executePlan(plan, (step, total, action) => {
    if (onProgress) {
      onProgress('executing_step', { step, total, action });
    }
  });

  return { validation, plan, execution };
}
