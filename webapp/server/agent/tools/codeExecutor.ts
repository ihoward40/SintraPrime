import type { Tool, ToolResult, AgentContext } from "../types";
import { executeCode } from "../services/codeExecutionService";

export const codeExecutorTool: Tool = {
  name: "code_executor",
  description: "Execute Python or JavaScript code in a secure sandbox. Returns stdout, stderr, and return value. Use this to run calculations, data processing, or custom scripts.",
  parameters: [
    {
      name: "code",
      type: "string",
      description: "Code to execute",
      required: true,
    },
    {
      name: "language",
      type: "string",
      description: "Programming language: 'python' or 'javascript'",
      required: true,
    },
    {
      name: "timeout",
      type: "number",
      description: "Execution timeout in seconds (default: 30, max: 300)",
      required: false,
    },
  ],
  async execute(params: any, context: AgentContext): Promise<ToolResult> {
    const startTime = Date.now();
    
    try {
      const { code, language, timeout = 30 } = params;
      
      if (!code || typeof code !== "string") {
        return {
          success: false,
          error: "Invalid code parameter",
        };
      }
      
      if (!["python", "javascript"].includes(language)) {
        return {
          success: false,
          error: "Invalid language: must be 'python' or 'javascript'",
        };
      }
      
      // Use E2B code execution service
      const result = await executeCode(code, language, timeout);
      
      return {
        success: !result.error,
        data: result,
        error: result.error,
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Code execution failed: ${error.message}`,
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    }
  },
};
