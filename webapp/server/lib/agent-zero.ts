/**
 * Agent Zero - Autonomous Task Execution Engine
 * 
 * Inspired by Agent Zero, this system provides autonomous task execution with:
 * - Multi-step task planning and decomposition
 * - Self-correction and iterative refinement
 * - Tool calling for web search, code execution, file operations
 * - Memory and context management
 * - Real-time progress tracking
 */

import { routeAIRequest, type AIMessage } from "./multi-model-router";

export interface AgentTask {
  id: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  result?: string;
  error?: string;
  subtasks?: AgentTask[];
  toolCalls?: ToolCall[];
  startTime?: Date;
  endTime?: Date;
}

export interface ToolCall {
  tool: string;
  input: any;
  output?: any;
  error?: string;
  timestamp: Date;
}

export interface AgentContext {
  userId: number;
  caseId?: number;
  conversationHistory: AIMessage[];
  memory: Map<string, any>;
  availableTools: string[];
}

export interface AgentProgress {
  taskId: string;
  phase: string;
  message: string;
  progress: number; // 0-100
  timestamp: Date;
}

type ProgressCallback = (progress: AgentProgress) => void;

/**
 * Agent Zero Core Engine
 */
export class AgentZero {
  private context: AgentContext;
  private progressCallback?: ProgressCallback;
  private taskHistory: AgentTask[] = [];

  constructor(context: AgentContext, progressCallback?: ProgressCallback) {
    this.context = context;
    this.progressCallback = progressCallback;
  }

  /**
   * Execute a high-level task autonomously
   */
  async executeTask(taskDescription: string): Promise<AgentTask> {
    const task: AgentTask = {
      id: `task-${Date.now()}`,
      description: taskDescription,
      status: "in_progress",
      startTime: new Date(),
      subtasks: [],
      toolCalls: [],
    };

    this.taskHistory.push(task);
    this.emitProgress(task.id, "Planning", "Breaking down task into steps...", 10);

    try {
      // Step 1: Plan the task
      const plan = await this.planTask(taskDescription);
      task.subtasks = plan.subtasks;

      this.emitProgress(task.id, "Execution", "Executing planned steps...", 30);

      // Step 2: Execute each subtask
      const subtasks = plan.subtasks || [];
      for (let i = 0; i < subtasks.length; i++) {
        const subtask = subtasks[i];
        const progress = 30 + ((i + 1) / subtasks.length) * 60;

        this.emitProgress(
          task.id,
          "Execution",
          `Step ${i + 1}/${subtasks.length}: ${subtask.description}`,
          progress
        );

        await this.executeSubtask(subtask, task);

        if (subtask.status === "failed") {
          // Try to recover or adapt
          await this.handleSubtaskFailure(subtask, task);
        }
      }

      // Step 3: Synthesize results
      this.emitProgress(task.id, "Synthesis", "Combining results...", 90);
      const finalResult = await this.synthesizeResults(task);

      task.result = finalResult;
      task.status = "completed";
      task.endTime = new Date();

      this.emitProgress(task.id, "Completed", "Task completed successfully", 100);

      return task;
    } catch (error) {
      task.status = "failed";
      task.error = error instanceof Error ? error.message : String(error);
      task.endTime = new Date();

      this.emitProgress(task.id, "Failed", `Task failed: ${task.error}`, 0);

      return task;
    }
  }

  /**
   * Plan a task by breaking it down into subtasks
   */
  private async planTask(taskDescription: string): Promise<AgentTask> {
    const planningPrompt = `You are an AI task planner. Break down the following task into clear, executable subtasks.

Task: ${taskDescription}

Context:
- User ID: ${this.context.userId}
- Available tools: ${this.context.availableTools.join(", ")}

Provide a JSON response with the following structure:
{
  "subtasks": [
    {
      "id": "subtask-1",
      "description": "Clear description of what needs to be done",
      "requiredTools": ["tool_name"],
      "estimatedDuration": "short|medium|long"
    }
  ],
  "reasoning": "Explanation of the plan"
}`;

    const response = await routeAIRequest({
      messages: [
        { role: "system", content: "You are a task planning AI. Always respond with valid JSON." },
        { role: "user", content: planningPrompt },
      ],
      preferredCapability: "reasoning",
    });

    try {
      // Extract JSON from response (handle markdown code blocks)
      let jsonText = response.content.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      } else if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```\n?/g, "");
      }

      const plan = JSON.parse(jsonText);

      return {
        id: `plan-${Date.now()}`,
        description: taskDescription,
        status: "pending",
        subtasks: (plan.subtasks || []).map((st: any, idx: number) => ({
          id: st.id || `subtask-${idx + 1}`,
          description: st.description,
          status: "pending" as const,
          toolCalls: [],
        })),
      };
    } catch (error) {
      console.error("Failed to parse plan:", error);
      // Fallback: create a single subtask
      return {
        id: `plan-${Date.now()}`,
        description: taskDescription,
        status: "pending",
        subtasks: [
          {
            id: "subtask-1",
            description: taskDescription,
            status: "pending",
            toolCalls: [],
          },
        ],
      };
    }
  }

  /**
   * Execute a single subtask
   */
  private async executeSubtask(subtask: AgentTask, parentTask: AgentTask): Promise<void> {
    subtask.status = "in_progress";
    subtask.startTime = new Date();

    try {
      // Determine if tools are needed
      const toolAnalysis = await this.analyzeToolRequirements(subtask.description);

      if (toolAnalysis.requiresTools) {
        // Execute with tools
        for (const toolName of toolAnalysis.tools) {
          const toolCall = await this.executeTool(toolName, toolAnalysis.toolInputs[toolName]);
          subtask.toolCalls = subtask.toolCalls || [];
          subtask.toolCalls.push(toolCall);

          if (toolCall.error) {
            throw new Error(`Tool ${toolName} failed: ${toolCall.error}`);
          }
        }
      }

      // Generate result using AI
      const resultPrompt = `Complete the following subtask:

Subtask: ${subtask.description}

${
  subtask.toolCalls && subtask.toolCalls.length > 0
    ? `Tool results:\n${subtask.toolCalls
        .map((tc) => `- ${tc.tool}: ${JSON.stringify(tc.output)}`)
        .join("\n")}`
    : ""
}

Provide a clear, concise result for this subtask.`;

      const response = await routeAIRequest({
        messages: [
          {
            role: "system",
            content: "You are an AI assistant completing a subtask. Be concise and actionable.",
          },
          { role: "user", content: resultPrompt },
        ],
        preferredCapability: "chat",
      });

      subtask.result = response.content;
      subtask.status = "completed";
      subtask.endTime = new Date();
    } catch (error) {
      subtask.status = "failed";
      subtask.error = error instanceof Error ? error.message : String(error);
      subtask.endTime = new Date();
    }
  }

  /**
   * Analyze if a subtask requires tools
   */
  private async analyzeToolRequirements(
    subtaskDescription: string
  ): Promise<{ requiresTools: boolean; tools: string[]; toolInputs: Record<string, any> }> {
    // Simple heuristic-based analysis (can be enhanced with AI)
    const description = subtaskDescription.toLowerCase();
    const tools: string[] = [];
    const toolInputs: Record<string, any> = {};

    if (description.includes("search") || description.includes("find") || description.includes("research")) {
      tools.push("web_search");
      toolInputs.web_search = { query: subtaskDescription };
    }

    if (description.includes("code") || description.includes("script") || description.includes("program")) {
      tools.push("code_executor");
      toolInputs.code_executor = { language: "python", code: "" };
    }

    if (description.includes("file") || description.includes("document") || description.includes("save")) {
      tools.push("file_operations");
      toolInputs.file_operations = { operation: "read" };
    }

    return {
      requiresTools: tools.length > 0,
      tools,
      toolInputs,
    };
  }

  /**
   * Execute a tool
   */
  private async executeTool(toolName: string, input: any): Promise<ToolCall> {
    const toolCall: ToolCall = {
      tool: toolName,
      input,
      timestamp: new Date(),
    };

    try {
      switch (toolName) {
        case "web_search":
          toolCall.output = await this.toolWebSearch(input.query);
          break;
        case "code_executor":
          toolCall.output = await this.toolCodeExecutor(input.language, input.code);
          break;
        case "file_operations":
          toolCall.output = await this.toolFileOperations(input.operation, input.path, input.content);
          break;
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      toolCall.error = error instanceof Error ? error.message : String(error);
    }

    return toolCall;
  }

  /**
   * Tool: Web Search
   */
  private async toolWebSearch(query: string): Promise<any> {
    // Placeholder - integrate with actual search API
    return {
      query,
      results: [
        { title: "Search result 1", snippet: "Relevant information...", url: "https://example.com" },
      ],
      note: "Web search tool not fully integrated yet",
    };
  }

  /**
   * Tool: Code Executor
   */
  private async toolCodeExecutor(language: string, code: string): Promise<any> {
    // Placeholder - integrate with E2B or similar
    return {
      language,
      output: "Code execution not fully integrated yet",
      exitCode: 0,
    };
  }

  /**
   * Tool: File Operations
   */
  private async toolFileOperations(operation: string, path?: string, content?: string): Promise<any> {
    // Placeholder - integrate with file system
    return {
      operation,
      path,
      success: true,
      note: "File operations not fully integrated yet",
    };
  }

  /**
   * Handle subtask failure with recovery
   */
  private async handleSubtaskFailure(subtask: AgentTask, parentTask: AgentTask): Promise<void> {
    // Try to diagnose and fix the issue
    const diagnosisPrompt = `A subtask has failed. Analyze the failure and suggest a fix.

Subtask: ${subtask.description}
Error: ${subtask.error}

Provide a JSON response with:
{
  "diagnosis": "What went wrong",
  "canRecover": true/false,
  "recoveryAction": "What to do to fix it"
}`;

    try {
      const response = await routeAIRequest({
        messages: [
          { role: "system", content: "You are a debugging AI. Respond with valid JSON." },
          { role: "user", content: diagnosisPrompt },
        ],
        preferredCapability: "reasoning",
      });

      let jsonText = response.content.trim();
      if (jsonText.startsWith("```json")) {
        jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      }

      const diagnosis = JSON.parse(jsonText);

      if (diagnosis.canRecover) {
        // Attempt recovery
        subtask.status = "in_progress";
        subtask.error = undefined;
        await this.executeSubtask(subtask, parentTask);
      }
    } catch (error) {
      console.error("Failed to recover from subtask failure:", error);
    }
  }

  /**
   * Synthesize results from all subtasks
   */
  private async synthesizeResults(task: AgentTask): Promise<string> {
    const subtaskResults = task.subtasks
      ?.map((st, idx) => `${idx + 1}. ${st.description}\n   Result: ${st.result || st.error || "No result"}`)
      .join("\n\n");

    const synthesisPrompt = `Synthesize the following subtask results into a final, coherent answer for the original task.

Original Task: ${task.description}

Subtask Results:
${subtaskResults}

Provide a clear, comprehensive final result.`;

    const response = await routeAIRequest({
      messages: [
        { role: "system", content: "You are an AI assistant synthesizing task results." },
        { role: "user", content: synthesisPrompt },
      ],
      preferredCapability: "reasoning",
    });

    return response.content;
  }

  /**
   * Emit progress update
   */
  private emitProgress(taskId: string, phase: string, message: string, progress: number): void {
    if (this.progressCallback) {
      this.progressCallback({
        taskId,
        phase,
        message,
        progress,
        timestamp: new Date(),
      });
    }
  }

  /**
   * Get task history
   */
  getTaskHistory(): AgentTask[] {
    return this.taskHistory;
  }

  /**
   * Get context memory
   */
  getMemory(): Map<string, any> {
    return this.context.memory;
  }
}
