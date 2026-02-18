import { invokeLLM } from "../_core/llm";
import type { Tool, ToolResult, AgentContext, AgentResult, TaskPlan } from "./types";
import {
  emitTaskStart,
  emitStep,
  emitToolCall,
  emitToolResult,
  emitTaskComplete,
  emitTaskError,
} from "./services/agentProgressEmitter";
import { getRelevantContext, storeAgentInteraction } from "./services/vectorMemory";

export class AgentOrchestrator {
  private tools: Map<string, Tool> = new Map();
  private executionHistory: Array<{ step: any; result: ToolResult }> = [];

  registerTool(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  async executeTask(task: string, context: AgentContext): Promise<AgentResult> {
    const taskId = `${context.userId}_${Date.now()}`;
    emitTaskStart(taskId, task);
    
    try {
      // 0. Retrieve relevant context from memory
      const relevantContext = await getRelevantContext(context.userId, task, context.caseId);
      
      // 1. Create execution plan
      emitStep(taskId, "Planning", "Analyzing task and creating execution plan");
      const plan = await this.createPlan(task, context, relevantContext);

      // 2. Execute each step
      const results: ToolResult[] = [];
      for (let i = 0; i < plan.steps.length; i++) {
        const step = plan.steps[i];

        // Notify progress
        if (context.onProgress) {
          context.onProgress({
            currentStep: i + 1,
            totalSteps: plan.steps.length,
            stepDescription: step.description,
            progress: ((i + 1) / plan.steps.length) * 100,
          });
        }

        // Execute tool
        const tool = this.tools.get(step.tool);
        if (!tool) {
          throw new Error(`Tool not found: ${step.tool}`);
        }

        emitToolCall(taskId, step.tool, step.params);
        const result = await tool.execute(step.params, context);
        emitToolResult(taskId, step.tool, result);
        results.push(result);

        // Store in history
        this.executionHistory.push({ step, result });

        // Stop on error (unless step is marked as optional)
        if (!result.success && !step.optional) {
          throw new Error(`Step failed: ${step.description} - ${result.error}`);
        }
      }

      // 3. Synthesize final result
      emitStep(taskId, "Synthesizing", "Combining results into final answer");
      const finalResult = await this.synthesizeResults(results, task, context);
      emitTaskComplete(taskId, finalResult);
      
      // 4. Store interaction in memory
      await storeAgentInteraction(context.userId, task, finalResult, context.caseId);

      return {
        success: true,
        result: finalResult,
        steps: plan.steps.length,
        executionHistory: this.executionHistory,
      };
    } catch (error: any) {
      emitTaskError(taskId, error.message);
      return {
        success: false,
        error: error.message,
        executionHistory: this.executionHistory,
      };
    }
  }

  private async createPlan(task: string, context: AgentContext, relevantContext?: string): Promise<TaskPlan> {
    const toolDescriptions = Array.from(this.tools.values())
      .map(
        (t) =>
          `- ${t.name}: ${t.description}\n  Parameters: ${t.parameters.map((p: any) => `${p.name} (${p.type}${p.required ? ", required" : ""})`).join(", ")}`
      )
      .join("\n");

    const systemPrompt = `You are a legal task planning AI. Break down the user's request into executable steps using available tools.

Available Tools:
${toolDescriptions}

Context:
- User ID: ${context.userId}
- Case ID: ${context.caseId || "N/A"}

Relevant Context from Memory:
${relevantContext || "No relevant context found."}

Return a JSON plan with steps. Each step should have:
- tool: name of the tool to use
- params: parameters for the tool (as object)
- description: human-readable description of what this step does
- optional: boolean (true if failure is acceptable)

Example:
{
  "steps": [
    {
      "tool": "web_search",
      "params": { "query": "FDCPA violations California", "num_results": 5 },
      "description": "Search for FDCPA violation cases in California",
      "optional": false
    }
  ]
}`;

    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: task },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "task_plan",
          strict: true,
          schema: {
            type: "object",
            properties: {
              steps: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    tool: { type: "string" },
                    params: { type: "object", additionalProperties: true },
                    description: { type: "string" },
                    optional: { type: "boolean" },
                  },
                  required: ["tool", "params", "description"],
                  additionalProperties: false,
                },
              },
            },
            required: ["steps"],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Failed to create plan");

    return JSON.parse(typeof content === "string" ? content : JSON.stringify(content));
  }

  private async synthesizeResults(
    results: ToolResult[],
    originalTask: string,
    context: AgentContext
  ): Promise<string> {
    const resultsContext = this.executionHistory
      .map(({ step, result }, idx) => {
        return `Step ${idx + 1}: ${step.description}
Tool: ${step.tool}
Success: ${result.success}
${result.success ? `Data: ${JSON.stringify(result.data, null, 2)}` : `Error: ${result.error}`}`;
      })
      .join("\n\n");

    const systemPrompt = `You are a legal assistant synthesizing the results of a multi-step task execution.

Original Task: ${originalTask}

Execution Results:
${resultsContext}

Provide a clear, concise summary of what was accomplished. If documents were created, mention their IDs. If searches were performed, summarize findings. Be specific and actionable.`;

    const response = await invokeLLM({
      messages: [{ role: "system", content: systemPrompt }],
    });

    const content = response.choices[0]?.message?.content;
    return typeof content === "string" ? content : JSON.stringify(content);
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  clearHistory() {
    this.executionHistory = [];
  }
}
