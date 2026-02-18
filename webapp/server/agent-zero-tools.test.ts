/**
 * Agent Zero Tools Tests
 * Tests for web_search, code_executor, and file_operations tools
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { AgentZeroV2 } from "./lib/agent-zero-v2";

describe("Agent Zero Tools", () => {
  let agent: AgentZeroV2;

  beforeAll(() => {
    agent = new AgentZeroV2({
      userId: "test-user",
      sessionId: "test-session",
      availableTools: ["web_search", "code_executor", "file_operations"],
      preferences: {
        enableLearning: false,
        enableMultiAgent: false,
      },
    });
  });

  describe("Web Search Tool", () => {
    it("should search for information using omni_search API", async () => {
      const result = await (agent as any).toolWebSearch("latest AI developments");
      
      expect(result).toBeDefined();
      expect(result.query).toBe("latest AI developments");
      expect(result).toHaveProperty("results");
      // API may return error or results depending on availability
      expect(result.results || result.error).toBeDefined();
    }, 30000); // 30 second timeout for API call

    it("should handle search errors gracefully", async () => {
      const result = await (agent as any).toolWebSearch("");
      
      expect(result).toBeDefined();
      // Should either return empty results or an error property
      expect(result.results || result.error).toBeDefined();
    });
  });

  describe("Code Executor Tool", () => {
    it("should execute Python code successfully", async () => {
      const pythonCode = `print("Hello from Python")`;
      const result = await (agent as any).toolCodeExecutor("python", pythonCode);
      
      expect(result).toBeDefined();
      expect(result.language).toBe("python");
      expect(result.output).toContain("Hello from Python");
      expect(result.exitCode).toBe(0);
    }, 35000);

    it("should execute JavaScript code successfully", async () => {
      const jsCode = `console.log("Hello from JavaScript")`;
      const result = await (agent as any).toolCodeExecutor("javascript", jsCode);
      
      expect(result).toBeDefined();
      expect(result.language).toBe("javascript");
      expect(result.output).toContain("Hello from JavaScript");
      expect(result.exitCode).toBe(0);
    }, 35000);

    it("should handle Python code with calculations", async () => {
      const pythonCode = `
result = 2 + 2
print(f"Result: {result}")
`;
      const result = await (agent as any).toolCodeExecutor("python", pythonCode);
      
      expect(result).toBeDefined();
      expect(result.output).toContain("Result: 4");
      expect(result.exitCode).toBe(0);
    }, 35000);

    it("should handle code execution errors", async () => {
      const badCode = `this is not valid code`;
      const result = await (agent as any).toolCodeExecutor("python", badCode);
      
      expect(result).toBeDefined();
      expect(result.exitCode).not.toBe(0);
      expect(result.error).toBeDefined();
    }, 35000);

    it("should reject unsupported languages", async () => {
      const result = await (agent as any).toolCodeExecutor("ruby", `puts "Hello"`);
      
      expect(result).toBeDefined();
      expect(result.error).toContain("Unsupported language");
    });
  });

  describe("File Operations Tool", () => {
    const testFilePath = "test-file.txt";
    const testContent = "This is test content from Agent Zero";

    it("should write file to S3 storage", async () => {
      const result = await (agent as any).toolFileOperations("write", testFilePath, testContent);
      
      expect(result).toBeDefined();
      expect(result.operation).toBe("write");
      expect(result.success).toBe(true);
      expect(result.url).toBeDefined();
      expect(result.url).toContain("https://");
    }, 30000);

    it("should read file from S3 storage", async () => {
      // First write a file
      await (agent as any).toolFileOperations("write", testFilePath, testContent);
      
      // Then read it back
      const result = await (agent as any).toolFileOperations("read", testFilePath);
      
      expect(result).toBeDefined();
      expect(result.operation).toBe("read");
      expect(result.success).toBe(true);
      expect(result.content).toBe(testContent);
    }, 30000);

    it("should handle write operation without path", async () => {
      const result = await (agent as any).toolFileOperations("write", undefined, testContent);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle read operation without path", async () => {
      const result = await (agent as any).toolFileOperations("read", undefined);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should handle unsupported operations", async () => {
      const result = await (agent as any).toolFileOperations("delete", testFilePath);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toContain("Unsupported file operation");
    });
  });

  describe("Tool Integration", () => {
    it("should execute tool through Agent Zero interface", async () => {
      const toolCall = await (agent as any).executeTool("web_search", { query: "test query" });
      
      expect(toolCall).toBeDefined();
      expect(toolCall.tool).toBe("web_search");
      expect(toolCall.input).toEqual({ query: "test query" });
      expect(toolCall.output).toBeDefined();
      expect(toolCall.timestamp).toBeInstanceOf(Date);
    }, 30000);

    it("should handle unknown tool gracefully", async () => {
      const toolCall = await (agent as any).executeTool("unknown_tool", {});
      
      expect(toolCall).toBeDefined();
      expect(toolCall.error).toBeDefined();
      expect(toolCall.error).toContain("Unknown tool");
    });
  });
});
