import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/trpc";

// Mock context for testing
const mockContext: TrpcContext = {
  user: {
    id: 1,
    openId: "test-user",
    name: "Test User",
    email: "test@example.com",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  req: {} as any,
  res: {} as any,
};

const caller = appRouter.createCaller(mockContext);

describe("Automation Results Persistence", () => {
  let testResultId: number;

  it("should create automation result record", async () => {
    const result = await caller.automationResults.create({
      demoType: "web-scraping",
      sessionId: `test-session-${Date.now()}`,
      resultData: ""
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    testResultId = result.id;
    expect(testResultId).toBeGreaterThan(0);
  });

  it("should update automation result to completed", async () => {
    const result = await caller.automationResults.update({
      id: testResultId,
      status: "completed",
      resultData: JSON.stringify({ extracted: "test data" })
    });

    expect(result).toBeDefined();
  });

  it("should update automation result to failed", async () => {
    const result = await caller.automationResults.update({
      id: testResultId,
      status: "failed",
      errorMessage: "Test error message"
    });

    expect(result).toBeDefined();
  });

  it("should list user's automation results", async () => {
    const results = await caller.automationResults.list({
      limit: 10,
      offset: 0
    });

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);
  });

  it("should filter results by demo type", async () => {
    const results = await caller.automationResults.list({
      demoType: "web-scraping",
      limit: 10,
      offset: 0
    });

    expect(Array.isArray(results)).toBe(true);
    results.forEach(result => {
      expect(result.demoType).toBe("web-scraping");
    });
  });

  it("should get results by specific demo type", async () => {
    const results = await caller.automationResults.byType({
      demoType: "web-scraping"
    });

    expect(Array.isArray(results)).toBe(true);
  });

  it("should track demo usage metrics", async () => {
    const result = await caller.automationResults.trackUsage({
      demoType: "web-scraping",
      duration: 45,
      success: true
    });

    expect(result.success).toBe(true);
  });

  it("should get user's demo usage metrics", async () => {
    const metrics = await caller.automationResults.metrics();

    expect(metrics).toBeDefined();
  });

  it("should delete automation result", async () => {
    const result = await caller.automationResults.deleteResult({
      id: testResultId
    });

    expect(result).toBeDefined();
  });
});

describe("Automation Demo Integration", () => {
  it("should create result for web scraping demo", async () => {
    const sessionId = `web-scraping-${Date.now()}`;
    
    // Create result
    const result = await caller.automationResults.create({
      demoType: "web-scraping",
      sessionId,
      resultData: ""
    });

    const resultId = result.id;
    expect(resultId).toBeGreaterThan(0);

    // Update with extracted data
    await caller.automationResults.update({
      id: resultId,
      status: "completed",
      resultData: JSON.stringify({
        title: "FTC Data Visualization",
        count: "1,234 complaints"
      })
    });

    // Verify result was saved
    const results = await caller.automationResults.list({ limit: 1, offset: 0 });
    expect(results.length).toBeGreaterThan(0);
  });

  it("should create result for document generation demo", async () => {
    const sessionId = `document-generation-${Date.now()}`;
    
    const result = await caller.automationResults.create({
      demoType: "document-generation",
      sessionId,
      resultData: ""
    });

    const resultId = result.id;

    await caller.automationResults.update({
      id: resultId,
      status: "completed",
      resultData: "FDCPA demand letter generated successfully"
    });

    const results = await caller.automationResults.byType({
      demoType: "document-generation"
    });
    expect(results.length).toBeGreaterThan(0);
  });

  it("should create result for video creation demo", async () => {
    const sessionId = `video-creation-${Date.now()}`;
    
    const result = await caller.automationResults.create({
      demoType: "video-creation",
      sessionId,
      resultData: ""
    });

    const resultId = result.id;

    await caller.automationResults.update({
      id: resultId,
      status: "completed",
      resultData: JSON.stringify({
        videoUrl: "https://example.com/video.mp4"
      })
    });

    const results = await caller.automationResults.byType({
      demoType: "video-creation"
    });
    expect(results.length).toBeGreaterThan(0);
  });

  it("should create result for full workflow demo", async () => {
    const sessionId = `full-workflow-${Date.now()}`;
    
    const result = await caller.automationResults.create({
      demoType: "full-workflow",
      sessionId,
      resultData: ""
    });

    const resultId = result.id;

    await caller.automationResults.update({
      id: resultId,
      status: "completed",
      resultData: "Full workflow completed: research + document + video"
    });

    const results = await caller.automationResults.byType({
      demoType: "full-workflow"
    });
    expect(results.length).toBeGreaterThan(0);
  });

  it("should handle failed automation gracefully", async () => {
    const sessionId = `failed-demo-${Date.now()}`;
    
    const result = await caller.automationResults.create({
      demoType: "web-scraping",
      sessionId,
      resultData: ""
    });

    const resultId = result.id;

    await caller.automationResults.update({
      id: resultId,
      status: "failed",
      errorMessage: "Navigation timeout: page took too long to load"
    });

    const results = await caller.automationResults.list({ limit: 10, offset: 0 });
    const failedResult = results.find(r => r.id === resultId);
    expect(failedResult?.status).toBe("failed");
    expect(failedResult?.errorMessage).toContain("timeout");
  });
});

describe("Automation History Page Data", () => {
  it("should provide data for history table", async () => {
    // Create multiple results for testing
    const demoTypes = ["web-scraping", "document-generation", "video-creation"];
    
    for (const demoType of demoTypes) {
      const result = await caller.automationResults.create({
        demoType,
        sessionId: `history-test-${demoType}-${Date.now()}`,
        resultData: ""
      });

      const resultId = result.id;

      await caller.automationResults.update({
        id: resultId,
        status: "completed",
        resultData: `Test data for ${demoType}`
      });
    }

    // Fetch all results
    const results = await caller.automationResults.list({
      limit: 50,
      offset: 0
    });

    expect(results.length).toBeGreaterThan(0);
    
    // Verify each result has required fields
    results.forEach(result => {
      expect(result).toHaveProperty("id");
      expect(result).toHaveProperty("sessionId");
      expect(result).toHaveProperty("demoType");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("startedAt");
    });
  });

  it("should support pagination", async () => {
    const page1 = await caller.automationResults.list({
      limit: 5,
      offset: 0
    });

    const page2 = await caller.automationResults.list({
      limit: 5,
      offset: 5
    });

    expect(Array.isArray(page1)).toBe(true);
    expect(Array.isArray(page2)).toBe(true);
    
    // Verify pages don't overlap (if we have enough data)
    if (page1.length > 0 && page2.length > 0) {
      const page1Ids = page1.map(r => r.id);
      const page2Ids = page2.map(r => r.id);
      const overlap = page1Ids.some(id => page2Ids.includes(id));
      expect(overlap).toBe(false);
    }
  });
});
