import { describe, it, expect } from "vitest";

describe("Sprint 19: God-Tier Platform - Unit Tests", () => {
  describe("Multi-Model AI Router", () => {
    it("should have model registry with multiple providers", async () => {
      const { getAvailableModels } = await import("./lib/multi-model-router");

      const allModels = getAvailableModels();

      expect(allModels).toBeDefined();
      expect(allModels.length).toBeGreaterThan(0);
      
      // Check for multiple providers
      const providers = new Set(allModels.map(m => m.provider));
      expect(providers.size).toBeGreaterThanOrEqual(2); // At least Anthropic and one other
    });

    it("should filter models by capability", async () => {
      const { getAvailableModels } = await import("./lib/multi-model-router");

      const reasoningModels = getAvailableModels("reasoning");
      const fastModels = getAvailableModels("fast-response");

      expect(reasoningModels.length).toBeGreaterThan(0);
      expect(fastModels.length).toBeGreaterThan(0);
      
      reasoningModels.forEach(model => {
        expect(model.capabilities).toContain("reasoning");
      });
      
      fastModels.forEach(model => {
        expect(model.capabilities).toContain("fast-response");
      });
    });

    it("should select appropriate model for simple tasks", async () => {
      const { selectModel } = await import("./lib/multi-model-router");

      const model = selectModel({
        messages: [{ role: "user", content: "Simple question" }],
        preferredCapability: "fast-response",
      });

      expect(model).toBeDefined();
      expect(model.provider).toBeDefined();
      expect(model.modelId).toBeDefined();
      expect(model.capabilities).toContain("fast-response");
    });

    it("should select reasoning model for complex tasks", async () => {
      const { selectModel } = await import("./lib/multi-model-router");

      const model = selectModel({
        messages: [{ role: "user", content: "Complex reasoning task" }],
        preferredCapability: "reasoning",
      });

      expect(model).toBeDefined();
      expect(model.capabilities).toContain("reasoning");
    });

    it("should track provider metrics", async () => {
      const { getProviderMetrics } = await import("./lib/multi-model-router");

      const metrics = getProviderMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.size).toBeGreaterThan(0);
      
      // Check metrics structure
      metrics.forEach((metric, provider) => {
        expect(metric).toHaveProperty("totalRequests");
        expect(metric).toHaveProperty("successfulRequests");
        expect(metric).toHaveProperty("failedRequests");
        expect(metric).toHaveProperty("totalTokens");
        expect(metric).toHaveProperty("totalResponseTime");
      });
    });

    it("should have model configurations with required fields", async () => {
      const { getAvailableModels } = await import("./lib/multi-model-router");

      const models = getAvailableModels();

      models.forEach(model => {
        expect(model.provider).toBeDefined();
        expect(model.modelId).toBeDefined();
        expect(Array.isArray(model.capabilities)).toBe(true);
        expect(model.contextWindow).toBeGreaterThan(0);
        expect(model.costPer1kTokens).toBeGreaterThanOrEqual(0);
        expect(model.avgResponseTime).toBeGreaterThan(0);
        expect(model.priority).toBeGreaterThan(0);
        expect(model.priority).toBeLessThanOrEqual(10);
      });
    });
  });

  describe("Agent Zero Core Classes", () => {
    it("should create AgentZero instance", async () => {
      const { AgentZero } = await import("./lib/agent-zero");

      const agent = new AgentZero({
        userId: 1,
        conversationHistory: [],
        memory: new Map(),
        availableTools: ["web_search"],
      });

      expect(agent).toBeDefined();
      expect(agent.getTaskHistory()).toEqual([]);
      expect(agent.getMemory()).toBeInstanceOf(Map);
    });

    it("should initialize with empty task history", async () => {
      const { AgentZero } = await import("./lib/agent-zero");

      const agent = new AgentZero({
        userId: 1,
        conversationHistory: [],
        memory: new Map(),
        availableTools: [],
      });

      const history = agent.getTaskHistory();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(0);
    });

    it("should maintain memory state", async () => {
      const { AgentZero } = await import("./lib/agent-zero");

      const memory = new Map();
      memory.set("test-key", "test-value");

      const agent = new AgentZero({
        userId: 1,
        conversationHistory: [],
        memory,
        availableTools: [],
      });

      const agentMemory = agent.getMemory();
      expect(agentMemory.get("test-key")).toBe("test-value");
    });
  });

  describe("Agent Zero Router Integration", () => {
    it("should export agentZero router", async () => {
      const { agentZeroRouter } = await import("./agent-zero/router");

      expect(agentZeroRouter).toBeDefined();
      expect(agentZeroRouter._def).toBeDefined();
    });

    it("should have required procedures", async () => {
      const { agentZeroRouter } = await import("./agent-zero/router");

      const procedures = agentZeroRouter._def.procedures;
      
      expect(procedures).toHaveProperty("executeTask");
      expect(procedures).toHaveProperty("getTaskHistory");
      expect(procedures).toHaveProperty("getMemory");
      expect(procedures).toHaveProperty("cancelTask");
    });
  });

  describe("AI Assistant Enhancements", () => {
    it("should have getSuggestedPrompts procedure", async () => {
      const { aiChatRouter } = await import("./ai-chat/router");

      const procedures = aiChatRouter._def.procedures;
      
      expect(procedures).toHaveProperty("getSuggestedPrompts");
    });

    it("should have document comparison router", async () => {
      const { documentComparisonRouter } = await import("./document-comparison/router");

      expect(documentComparisonRouter).toBeDefined();
      
      const procedures = documentComparisonRouter._def.procedures;
      expect(procedures).toHaveProperty("compareDocuments");
    });
  });

  describe("Main Router Integration", () => {
    it("should include agentZero in main router", async () => {
      const { appRouter } = await import("./routers");

      // Check if agentZero router is defined
      expect(appRouter._def).toBeDefined();
      expect(appRouter._def.record).toBeDefined();
      expect(appRouter._def.record.agentZero).toBeDefined();
    });

    it("should have all Sprint 19 routers integrated", async () => {
      const { appRouter } = await import("./routers");

      const record = appRouter._def.record;
      
      expect(record.agentZero).toBeDefined();
      expect(record.aiChat).toBeDefined();
      expect(record.documentComparison).toBeDefined();
    });
  });
});
