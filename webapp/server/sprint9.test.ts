import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { Context } from "./_core/context";

// Mock context for testing
function createMockContext(userId: number): Context {
  return {
    user: {
      id: userId,
      openId: `test-user-${userId}`,
      name: "Test User",
      email: "test@example.com",
      loginMethod: "test",
      role: "user",
      stripeCustomerId: null,
      subscriptionTier: "pro",
      stripeSubscriptionId: null,
      onboardingComplete: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as any,
    res: {} as any,
  };
}

describe("Sprint 9: Activity Feed and Bulk Import", () => {
  const testUserId = 1;

  describe("Case Activity Feed", () => {
    it("should create and list case activities", async () => {
      const ctx = createMockContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      // Create a test case
      const testCaseResult = await caller.cases.create({
        title: "Activity Feed Test Case",
        caseType: "consumer_protection",
        priority: "medium",
      });
      const testCaseId = (testCaseResult as any)?.[0]?.insertId || (testCaseResult as any)?.id || 1;

      // Create activities
      await caller.caseActivity.create({
        caseId: testCaseId,
        activityType: "document_added",
        description: "Added a document",
        metadata: { documentTitle: "Test Doc" },
      });

      await caller.caseActivity.create({
        caseId: testCaseId,
        activityType: "note_added",
        description: "Added a note",
      });

      await caller.caseActivity.create({
        caseId: testCaseId,
        activityType: "status_changed",
        description: "Changed status",
        metadata: { oldStatus: "draft", newStatus: "active" },
      });

      // List activities
      const activities = await caller.caseActivity.list({
        caseId: testCaseId,
        limit: 10,
      });

      expect(activities).toBeDefined();
      expect(activities.length).toBeGreaterThanOrEqual(3);
      // Should be ordered by newest first
      expect(new Date(activities[0].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(activities[1].createdAt).getTime()
      );
    });

    it("should handle activity metadata", async () => {
      const ctx = createMockContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const testCaseResult = await caller.cases.create({
        title: "Metadata Test Case",
        caseType: "consumer_protection",
        priority: "medium",
      });
      const testCaseId = (testCaseResult as any)?.[0]?.insertId || (testCaseResult as any)?.id || 1;

      const activity = await caller.caseActivity.create({
        caseId: testCaseId,
        activityType: "document_updated",
        description: "Document updated with metadata",
        metadata: {
          documentId: 123,
          versionNumber: 2,
          changes: ["content", "title"],
        },
      });

      expect(activity).toBeDefined();
      // Activity with metadata created successfully
    });

    it("should filter activities by case", async () => {
      const ctx = createMockContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      // Create two cases
      const case1Result = await caller.cases.create({
        title: "Filter Test Case 1",
        caseType: "consumer_protection",
        priority: "medium",
      });
      const case1Id = (case1Result as any)?.[0]?.insertId || (case1Result as any)?.id || 1;

      const case2Result = await caller.cases.create({
        title: "Filter Test Case 2",
        caseType: "civil_rights",
        priority: "high",
      });
      const case2Id = (case2Result as any)?.[0]?.insertId || (case2Result as any)?.id || 2;

      // Add activities to each
      await caller.caseActivity.create({
        caseId: case1Id,
        activityType: "case_created",
        description: "Case 1 created",
      });

      await caller.caseActivity.create({
        caseId: case2Id,
        activityType: "case_created",
        description: "Case 2 created",
      });

      // List activities for case 1
      const case1Activities = await caller.caseActivity.list({
        caseId: case1Id,
        limit: 10,
      });

      // Should only contain case 1 activities
      expect(case1Activities.every((a) => a.caseId === case1Id)).toBe(true);
    });
  });

  describe("Bulk Case Import", () => {
    it("should create multiple cases", async () => {
      const ctx = createMockContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const casesToImport = [
        {
          title: "Bulk Import Case 1",
          description: "First bulk case",
          caseType: "consumer_protection",
          priority: "high" as const,
        },
        {
          title: "Bulk Import Case 2",
          description: "Second bulk case",
          caseType: "civil_rights",
          priority: "medium" as const,
        },
        {
          title: "Bulk Import Case 3",
          description: "Third bulk case",
          caseType: "consumer_protection",
          priority: "low" as const,
        },
      ];

      const results = [];
      for (const caseData of casesToImport) {
        const newCase = await caller.cases.create(caseData);
        results.push(newCase);
      }

      expect(results.length).toBe(3);
      // All cases created successfully
    });

    it("should handle bulk import with optional fields", async () => {
      const ctx = createMockContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const caseWithOptionals = await caller.cases.create({
        title: "Bulk Import with Optionals",
        caseNumber: "2024-BULK-001",
        description: "Case with optional fields",
        caseType: "consumer_protection",
        jurisdiction: "Federal",
        priority: "critical",
        tags: ["bulk-import", "test"],
      });

      expect(caseWithOptionals).toBeDefined();
      // Case with optional fields created successfully
    });

    it("should handle bulk import with minimal fields", async () => {
      const ctx = createMockContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const minimalCase = await caller.cases.create({
        title: "Minimal Bulk Import Case",
      });

      expect(minimalCase).toBeDefined();
      // Case created successfully
    });
  });

  describe("Rich Text Editor Integration", () => {
    it("should create documents with rich text content", async () => {
      const ctx = createMockContext(testUserId);
      const caller = appRouter.createCaller(ctx);

      const testCaseResult = await caller.cases.create({
        title: "Rich Text Test Case",
        caseType: "consumer_protection",
        priority: "medium",
      });
      const testCaseId = (testCaseResult as any)?.[0]?.insertId || (testCaseResult as any)?.id || 1;

      const richTextContent = `<h1>Legal Document</h1><p>This is a <strong>bold</strong> statement.</p><ul><li>Item 1</li><li>Item 2</li></ul>`;

      const doc = await caller.documents.create({
        title: "Rich Text Document",
        content: richTextContent,
        documentType: "motion",
        caseId: testCaseId,
      });

      expect(doc).toBeDefined();
      // Document created successfully
    });
  });
});
