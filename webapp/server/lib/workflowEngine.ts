import yaml from 'js-yaml';
import { getDb } from '../db';
import { workflowExecutions } from '../../drizzle/schema-workflows';
import { eq } from 'drizzle-orm';

export interface WorkflowStep {
  name: string;
  type: 'action' | 'condition' | 'loop';
  action?: string;
  condition?: string;
  steps?: WorkflowStep[];
  params?: Record<string, any>;
}

export interface WorkflowDefinition {
  name: string;
  description?: string;
  variables?: Record<string, any>;
  steps: WorkflowStep[];
}

/**
 * Parse YAML/JSON workflow definition
 */
export function parseWorkflow(definition: any, type: 'yaml' | 'json'): WorkflowDefinition {
  if (type === 'yaml' && typeof definition === 'string') {
    return yaml.load(definition) as WorkflowDefinition;
  }
  return definition as WorkflowDefinition;
}

/**
 * Execute a single workflow step
 */
async function executeStep(
  step: WorkflowStep,
  context: Record<string, any>
): Promise<{ success: boolean; result: any; error?: string }> {
  try {
    switch (step.type) {
      case 'action':
        // Execute action based on step.action
        // MVP: Just log the action
        console.log(`[Workflow] Executing action: ${step.action}`, step.params);
        return { success: true, result: { action: step.action, params: step.params } };

      case 'condition':
        // Evaluate condition
        // MVP: Simple string evaluation
        const conditionResult = evaluateCondition(step.condition || '', context);
        return { success: true, result: conditionResult };

      case 'loop':
        // Execute loop steps
        const loopResults = [];
        if (step.steps) {
          for (const loopStep of step.steps) {
            const result = await executeStep(loopStep, context);
            loopResults.push(result);
            if (!result.success) break;
          }
        }
        return { success: true, result: loopResults };

      default:
        return { success: false, result: null, error: `Unknown step type: ${step.type}` };
    }
  } catch (error) {
    return {
      success: false,
      result: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Simple condition evaluator (MVP)
 */
function evaluateCondition(condition: string, context: Record<string, any>): boolean {
  // MVP: Very basic evaluation
  // In production, use a proper expression evaluator
  try {
    // Replace variables in condition
    let evalCondition = condition;
    for (const [key, value] of Object.entries(context)) {
      evalCondition = evalCondition.replace(new RegExp(`\\$\\{${key}\\}`, 'g'), JSON.stringify(value));
    }
    // Simple evaluation (unsafe in production, use proper evaluator)
    return eval(evalCondition);
  } catch {
    return false;
  }
}

/**
 * Execute a complete workflow
 */
export async function executeWorkflow(
  executionId: number,
  workflow: WorkflowDefinition
): Promise<void> {
  const db = await getDb();
  
  try {
    // Update execution status to running
    await db
      .update(workflowExecutions)
      .set({
        status: 'running',
        startedAt: new Date(),
        totalSteps: workflow.steps.length,
      })
      .where(eq(workflowExecutions.id, executionId));

    // Initialize context with workflow variables
    const context = { ...workflow.variables };
    const stepResults: any[] = [];

    // Execute each step
    for (let i = 0; i < workflow.steps.length; i++) {
      const step = workflow.steps[i];
      
      // Update current step
      await db
        .update(workflowExecutions)
        .set({ currentStep: i + 1 })
        .where(eq(workflowExecutions.id, executionId));

      // Execute step
      const result = await executeStep(step, context);
      stepResults.push(result);

      // Update context with step result
      if (result.success && step.name) {
        context[step.name] = result.result;
      }

      // Stop on error
      if (!result.success) {
        await db
          .update(workflowExecutions)
          .set({
            status: 'failed',
            error: result.error,
            stepResults,
            completedAt: new Date(),
          })
          .where(eq(workflowExecutions.id, executionId));
        return;
      }
    }

    // Mark as completed
    await db
      .update(workflowExecutions)
      .set({
        status: 'completed',
        stepResults,
        completedAt: new Date(),
      })
      .where(eq(workflowExecutions.id, executionId));
  } catch (error) {
    // Mark as failed
    await db
      .update(workflowExecutions)
      .set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
      })
      .where(eq(workflowExecutions.id, executionId));
  }
}

/**
 * Pre-built workflow templates
 */
export const workflowTemplates = {
  discovery_request: {
    name: 'Discovery Request Workflow',
    description: 'Automated workflow for handling discovery requests',
    variables: {
      caseId: null,
      requestType: 'interrogatories',
      deadline: null,
    },
    steps: [
      {
        name: 'validate_request',
        type: 'action' as const,
        action: 'validate_discovery_request',
        params: { requestType: '${requestType}' },
      },
      {
        name: 'generate_response',
        type: 'action' as const,
        action: 'generate_discovery_response',
        params: { caseId: '${caseId}', requestType: '${requestType}' },
      },
      {
        name: 'review_required',
        type: 'condition' as const,
        condition: '${requestType} === "interrogatories"',
      },
      {
        name: 'create_task',
        type: 'action' as const,
        action: 'create_review_task',
        params: { deadline: '${deadline}' },
      },
    ],
  },
  
  filing_checklist: {
    name: 'Filing Checklist Workflow',
    description: 'Step-by-step filing preparation workflow',
    variables: {
      filingType: 'motion',
      court: null,
    },
    steps: [
      {
        name: 'check_jurisdiction',
        type: 'action' as const,
        action: 'verify_jurisdiction',
        params: { court: '${court}' },
      },
      {
        name: 'gather_documents',
        type: 'action' as const,
        action: 'collect_required_documents',
        params: { filingType: '${filingType}' },
      },
      {
        name: 'generate_cover_sheet',
        type: 'action' as const,
        action: 'create_cover_sheet',
        params: { filingType: '${filingType}', court: '${court}' },
      },
      {
        name: 'final_review',
        type: 'action' as const,
        action: 'create_review_task',
        params: { taskType: 'filing_review' },
      },
    ],
  },
};
