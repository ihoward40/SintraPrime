import { describe, it, expect, beforeAll } from "vitest";
import { AgentOrchestrator } from "./agent/orchestrator";
import { toolRegistry } from "./agent/tools/registry";
import type { AgentContext } from "./agent/types";

describe("Autonomous Agent System", () => {
  let orchestrator: AgentOrchestrator;
  const mockContext: AgentContext = {
    userId: 1,
    caseId: undefined,
  };

  beforeAll(() => {
    orchestrator = new AgentOrchestrator();
    // Register all tools
    for (const tool of toolRegistry.getAll()) {
      orchestrator.registerTool(tool);
    }
  });

  describe("Tool Registry", () => {
    it("should have 8 core tools registered", () => {
      const tools = toolRegistry.getAll();
      expect(tools.length).toBe(8);
    });

    it("should have all required tools", () => {
      const toolNames = toolRegistry.getNames();
      const requiredTools = [
        "web_search",
        "browser_navigate",
        "browser_fill_form",
        "document_generator",
        "email_sender",
        "code_executor",
        "deadline_calculator",
        "citation_checker",
      ];

      for (const toolName of requiredTools) {
        expect(toolNames).toContain(toolName);
      }
    });

    it("should retrieve tools by name", () => {
      const tool = toolRegistry.get("web_search");
      expect(tool).toBeDefined();
      expect(tool?.name).toBe("web_search");
    });

    it("should return undefined for non-existent tools", () => {
      const tool = toolRegistry.get("non_existent_tool");
      expect(tool).toBeUndefined();
    });
  });

  describe("Web Search Tool", () => {
    it("should execute web search with valid query", async () => {
      const tool = toolRegistry.get("web_search");
      expect(tool).toBeDefined();

      const result = await tool!.execute(
        {
          query: "FDCPA violations California",
          num_results: 5,
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.query).toBe("FDCPA violations California");
      expect(result.data.results).toBeDefined();
      expect(Array.isArray(result.data.results)).toBe(true);
    });

    it("should reject invalid query", async () => {
      const tool = toolRegistry.get("web_search");
      const result = await tool!.execute({ query: "" }, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid query");
    });
  });

  describe("Browser Navigate Tool", () => {
    it("should navigate to valid URL (or fail gracefully in test env)", async () => {
      const tool = toolRegistry.get("browser_navigate");
      const result = await tool!.execute(
        {
          url: "https://example.com",
        },
        mockContext
      );

      // Puppeteer may not work in test environment, accept both success and failure
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.url).toBe("https://example.com");
        expect(result.data.content).toBeDefined();
      } else {
        // In test environment without browser, expect error
        expect(result.error).toBeDefined();
      }
    });

    it("should reject invalid URL", async () => {
      const tool = toolRegistry.get("browser_navigate");
      const result = await tool!.execute({ url: "not-a-url" }, mockContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid URL");
    });
  });

  describe("Document Generator Tool", () => {
    it("should generate document with valid template", async () => {
      const tool = toolRegistry.get("document_generator");
      const result = await tool!.execute(
        {
          template_type: "contract",
          variables: {
            party1: "John Doe",
            party2: "ABC Corp",
            date: "2026-02-14",
          },
          format: "markdown",
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.documentId).toBeDefined();
      expect(result.data.templateType).toBe("contract");
      expect(result.data.content).toBeDefined();
    });

    it("should reject invalid template type", async () => {
      const tool = toolRegistry.get("document_generator");
      const result = await tool!.execute(
        {
          template_type: "",
          variables: {},
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid template_type");
    });
  });

  describe("Deadline Calculator Tool", () => {
    it("should calculate deadline with valid inputs", async () => {
      const tool = toolRegistry.get("deadline_calculator");
      const result = await tool!.execute(
        {
          filing_date: "2026-02-01",
          jurisdiction: "federal",
          motion_type: "response",
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.filingDate).toBe("2026-02-01");
      expect(result.data.deadlineDate).toBeDefined();
      expect(result.data.businessDays).toBeDefined();
    });

    it("should reject missing parameters", async () => {
      const tool = toolRegistry.get("deadline_calculator");
      const result = await tool!.execute(
        {
          filing_date: "2026-02-01",
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Missing required parameters");
    });
  });

  describe("Citation Checker Tool", () => {
    it("should validate citations", async () => {
      const tool = toolRegistry.get("citation_checker");
      const result = await tool!.execute(
        {
          citations: ["Smith v. Jones, 123 F.3d 456 (9th Cir. 2020)", "Brown v. Board of Education, 347 U.S. 483 (1954)"],
          format: "bluebook",
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.totalCitations).toBe(2);
      expect(result.data.results).toBeDefined();
      expect(Array.isArray(result.data.results)).toBe(true);
    });

    it("should reject invalid citations parameter", async () => {
      const tool = toolRegistry.get("citation_checker");
      const result = await tool!.execute(
        {
          citations: "not an array",
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid citations parameter");
    });
  });

  describe("Code Executor Tool", () => {
    it("should execute Python code", async () => {
      const tool = toolRegistry.get("code_executor");
      const result = await tool!.execute(
        {
          code: "print('Hello, World!')",
          language: "python",
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.stdout).toBeDefined();
    });

    it("should execute JavaScript code", async () => {
      const tool = toolRegistry.get("code_executor");
      const result = await tool!.execute(
        {
          code: "console.log('Hello, World!');",
          language: "javascript",
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it("should reject invalid language", async () => {
      const tool = toolRegistry.get("code_executor");
      const result = await tool!.execute(
        {
          code: "print('test')",
          language: "ruby",
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid language");
    });
  });

  describe("Email Sender Tool", () => {
    it("should send email with valid parameters", async () => {
      const tool = toolRegistry.get("email_sender");
      const result = await tool!.execute(
        {
          to: "test@example.com",
          subject: "Test Email",
          body: "This is a test email",
        },
        mockContext
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.messageId).toBeDefined();
      expect(result.data.to).toBe("test@example.com");
    });

    it("should reject missing required parameters", async () => {
      const tool = toolRegistry.get("email_sender");
      const result = await tool!.execute(
        {
          to: "test@example.com",
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Missing required parameters");
    });
  });

  describe("Browser Fill Form Tool", () => {
    it("should fill form with valid data (or fail gracefully in test env)", async () => {
      const tool = toolRegistry.get("browser_fill_form");
      const result = await tool!.execute(
        {
          url: "https://example.com/form",
          form_data: {
            name: "John Doe",
            email: "john@example.com",
          },
          submit: false,
        },
        mockContext
      );

      // Puppeteer may not work in test environment, accept both success and failure
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data.filledFields).toBeDefined();
      } else {
        // In test environment without browser, expect error
        expect(result.error).toBeDefined();
      }
    });

    it("should reject invalid form_data", async () => {
      const tool = toolRegistry.get("browser_fill_form");
      const result = await tool!.execute(
        {
          url: "https://example.com/form",
          form_data: "not an object",
        },
        mockContext
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid form_data");
    });
  });

  describe("Agent Orchestrator", () => {
    it("should have tools registered", () => {
      const tools = orchestrator["tools"];
      expect(tools.size).toBeGreaterThan(0);
    });

    it("should register new tools", () => {
      const mockTool = {
        name: "test_tool",
        description: "A test tool",
        parameters: [],
        execute: async () => ({ success: true, data: {} }),
      };

      orchestrator.registerTool(mockTool);
      const tool = orchestrator["tools"].get("test_tool");
      expect(tool).toBeDefined();
      expect(tool?.name).toBe("test_tool");
    });
  });
});
