import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import type { TrpcContext } from "./_core/context";

describe("Sprint 19: God-Tier Platform - Agent Zero", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  let testUserId: number;
  let testCaseId: number;

  beforeAll(async () => {
    db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Create test user
    const { users } = await import("../drizzle/schema");
    const userResult = await db
      .insert(users)
      .values({
        openId: `test-agent-zero-${Date.now()}`,
        name: "Agent Zero Test User",
        email: `agent-zero-test-${Date.now()}@test.com`,
        role: "user",
      });
    
    // Get the inserted user ID
    const insertedUsers = await db
      .select()
      .from(users)
      .where((await import("drizzle-orm")).eq(users.openId, `test-agent-zero-${Date.now()}`));
    testUserId = insertedUsers[0]?.id || 1;

    // Create test case
    const { cases } = await import("../drizzle/schema");
    await db
      .insert(cases)
      .values({
        userId: testUserId,
        title: "Agent Zero Test Case",
        caseNumber: "AGENT-001",
        description: "Test case for Agent Zero",
        status: "active",
      });
    
    // Get the inserted case ID
    const insertedCases = await db
      .select()
      .from(cases)
      .where((await import("drizzle-orm")).eq(cases.userId, testUserId));
    testCaseId = insertedCases[0]?.id || 1;
  });

  const createTestContext = (): TrpcContext => ({
    user: {
      id: testUserId,
      openId: `test-agent-zero-${testUserId}`,
      name: "Agent Zero Test User",
      email: `agent-zero-test-${testUserId}@test.com`,
      role: "user",
      createdAt: new Date(),
    },
    req: {} as any,
    res: {} as any,
  });

  describe("Agent Zero Core Engine", () => {
    it("should execute a simple task", async () => {
      const caller = appRouter.createCaller(createTestContext());

      const result = await caller.agentZero.executeTask({
        taskDescription: "Summarize the key points of the FDCPA statute",
      });

      expect(result).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(result.task).toBeDefined();
      expect(result.task.description).toBe("Summarize the key points of the FDCPA statute");
      expect(["completed", "failed"]).toContain(result.task.status);
    }, 60000); // 60 second timeout for AI execution

    it("should break down complex tasks into subtasks", async () => {
      const caller = appRouter.createCaller(createTestContext());

      const result = await caller.agentZero.executeTask({
        taskDescription: "Research FDCPA violations, draft a demand letter, and calculate damages",
      });

      expect(result.task.subtasks).toBeDefined();
      expect(result.task.subtasks!.length).toBeGreaterThan(1);
    }, 60000);

    it("should handle task with case context", async () => {
      const caller = appRouter.createCaller(createTestContext());

      const result = await caller.agentZero.executeTask({
        taskDescription: "Analyze this case and suggest next steps",
        caseId: testCaseId,
      });

      expect(result).toBeDefined();
      expect(result.task.status).toBeDefined();
    }, 60000);
  });

  describe("Agent Zero Session Management", () => {
    it("should create and track sessions", async () => {
      const caller = appRouter.createCaller(createTestContext());

      const result = await caller.agentZero.executeTask({
        taskDescription: "Test session tracking",
      });

      expect(result.sessionId).toBeDefined();
      expect(result.sessionId).toMatch(/^session-/);
    }, 60000);

    it("should retrieve task history for a session", async () => {
      const caller = appRouter.createCaller(createTestContext());

      const executeResult = await caller.agentZero.executeTask({
        taskDescription: "Test task history",
      });

      const historyResult = await caller.agentZero.getTaskHistory({
        sessionId: executeResult.sessionId,
      });

      expect(historyResult.history).toBeDefined();
      expect(Array.isArray(historyResult.history)).toBe(true);
    }, 60000);

    it("should retrieve agent memory", async () => {
      const caller = appRouter.createCaller(createTestContext());

      const executeResult = await caller.agentZero.executeTask({
        taskDescription: "Test memory retrieval",
      });

      const memoryResult = await caller.agentZero.getMemory({
        sessionId: executeResult.sessionId,
      });

      expect(memoryResult.memory).toBeDefined();
      expect(typeof memoryResult.memory).toBe("object");
    }, 60000);
  });

  describe("Agent Zero Error Handling", () => {
    it("should handle invalid task descriptions gracefully", async () => {
      const caller = appRouter.createCaller(createTestContext());

      await expect(
        caller.agentZero.executeTask({
          taskDescription: "",
        })
      ).rejects.toThrow();
    });

    it("should handle session cancellation", async () => {
      const caller = appRouter.createCaller(createTestContext());

      const executeResult = await caller.agentZero.executeTask({
        taskDescription: "Long running task for cancellation test",
      });

      const cancelResult = await caller.agentZero.cancelTask({
        sessionId: executeResult.sessionId,
      });

      expect(cancelResult.cancelled).toBe(true);
    }, 60000);

    it("should handle non-existent session gracefully", async () => {
      const caller = appRouter.createCaller(createTestContext());

      const historyResult = await caller.agentZero.getTaskHistory({
        sessionId: "non-existent-session",
      });

      expect(historyResult.message).toBeDefined();
      expect(historyResult.history).toEqual([]);
    });
  });

  describe("Multi-Model AI Router", () => {
    it("should route requests to appropriate models", async () => {
      const { selectModel } = await import("./lib/multi-model-router");

      const model = selectModel({
        messages: [{ role: "user", content: "Simple question" }],
        preferredCapability: "fast-response",
      });

      expect(model).toBeDefined();
      expect(model.capabilities).toContain("fast-response");
    });

    it("should select reasoning models for complex tasks", async () => {
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
    });
  });

  describe("AI Assistant Enhancements", () => {
    it("should retrieve suggested prompts", async () => {
      const caller = appRouter.createCaller(createTestContext());

      const prompts = await caller.aiChat.getSuggestedPrompts({});

      expect(prompts).toBeDefined();
      expect(Array.isArray(prompts)).toBe(true);
      expect(prompts.length).toBeGreaterThan(0);
    });

    it("should filter suggested prompts by category", async () => {
      const caller = appRouter.createCaller(createTestContext());

      const prompts = await caller.aiChat.getSuggestedPrompts({
        category: "analysis",
      });

      expect(prompts).toBeDefined();
      expect(prompts.every((p: any) => p.category === "analysis")).toBe(true);
    });
  });
});
