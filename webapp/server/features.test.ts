import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Record<string, any>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-features",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  } as AuthenticatedUser;

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as TrpcContext["res"],
  };
}

// ============================================================================
// DOCUMENTS
// ============================================================================

describe("documents router", () => {
  it("creates a document with valid input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.documents.create({
      title: "Test Debt Validation Letter",
      documentType: "letter",
      content: "Dear Sir/Madam, I am writing to dispute...",
    });

    expect(result).toBeDefined();
    expect(result[0]).toHaveProperty("insertId");
  });

  it("lists documents for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.documents.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects document creation without auth", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.documents.create({ title: "Test Doc" })
    ).rejects.toThrow();
  });

  it("validates document title is required", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.documents.create({ title: "" })
    ).rejects.toThrow();
  });
});

// ============================================================================
// COALITIONS
// ============================================================================

describe("coalitions router", () => {
  it("creates a coalition with valid input", async () => {
    const ctx = createAuthContext({ subscriptionTier: "coalition" });
    const caller = appRouter.createCaller(ctx);

    const result = await caller.coalitions.create({
      name: "Test Consumer Coalition",
      description: "Coalition for testing",
      isPublic: false,
    });

    expect(result).toBeDefined();
  });

  it("lists coalitions for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.coalitions.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects coalition creation without auth", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.coalitions.create({ name: "Test" })
    ).rejects.toThrow();
  });

  it("validates coalition name is required", async () => {
    const ctx = createAuthContext({ subscriptionTier: "coalition" });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.coalitions.create({ name: "" })
    ).rejects.toThrow();
  });

  it("rejects coalition creation for free tier users", async () => {
    const ctx = createAuthContext({ subscriptionTier: "free" });
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.coalitions.create({ name: "Test Coalition" })
    ).rejects.toThrow(/Coalition features require/);
  });
});

// ============================================================================
// LEGAL ALERTS
// ============================================================================

describe("legalAlerts router", () => {
  it("lists legal alerts for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.legalAlerts.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects listing alerts without auth", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.legalAlerts.list({})
    ).rejects.toThrow();
  });
});

// ============================================================================
// AI CHAT
// ============================================================================

describe("ai router", () => {
  it("rejects chat without auth", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.ai.chat({
        sessionId: "test-session",
        message: "What is FDCPA?",
      })
    ).rejects.toThrow();
  });

  it("validates message is required", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.ai.chat({
        sessionId: "test-session",
        message: "",
      })
    ).rejects.toThrow();
  });
});

// ============================================================================
// WARFARE STRATEGIES
// ============================================================================

describe("warfareStrategies router", () => {
  it("lists strategies for a case", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.warfareStrategies.list({ caseId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("rejects strategy creation without auth", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.warfareStrategies.create({
        caseId: 1,
        strategyName: "Test Strategy",
        front: "legal",
      })
    ).rejects.toThrow();
  });

  it("validates front enum values", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.warfareStrategies.create({
        caseId: 1,
        strategyName: "Test",
        front: "invalid_front" as any,
      })
    ).rejects.toThrow();
  });
});

// ============================================================================
// BOOKMARKS
// ============================================================================

describe("bookmarks router", () => {
  it("lists bookmarks for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bookmarks.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a bookmark with valid URL", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.bookmarks.create({
      url: "https://www.law.cornell.edu",
      title: "Cornell Law",
      category: "research",
    });

    expect(result).toBeDefined();
  });

  it("rejects bookmark with invalid URL", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.bookmarks.create({
        url: "not-a-url",
        title: "Bad URL",
      })
    ).rejects.toThrow();
  });

  it("rejects bookmarks without auth", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.bookmarks.list({})
    ).rejects.toThrow();
  });
});

// ============================================================================
// PARTIES
// ============================================================================

describe("parties router", () => {
  it("lists parties for a case", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.parties.list({ caseId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a party with valid input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.parties.create({
      caseId: 1,
      name: "ABC Collections LLC",
      type: "defendant",
      entityType: "llc",
    });

    expect(result).toBeDefined();
  });

  it("validates party type enum", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.parties.create({
        caseId: 1,
        name: "Test",
        type: "invalid_type" as any,
      })
    ).rejects.toThrow();
  });
});

// ============================================================================
// CASE EVENTS
// ============================================================================

describe("caseEvents router", () => {
  it("lists events for a case", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.caseEvents.list({ caseId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates an event with valid input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.caseEvents.create({
      caseId: 1,
      title: "Filing Deadline",
      eventDate: new Date("2026-03-15"),
      eventType: "deadline",
      priority: "high",
    });

    expect(result).toBeDefined();
  });

  it("rejects events without auth", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.caseEvents.create({
        caseId: 1,
        title: "Test",
        eventDate: new Date(),
      })
    ).rejects.toThrow();
  });
});

// ============================================================================
// CASE NOTES
// ============================================================================

describe("caseNotes router", () => {
  it("lists notes for a case", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.caseNotes.list({ caseId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a note with valid input", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.caseNotes.create({
      caseId: 1,
      content: "Important finding about FDCPA violations",
      noteType: "research",
      isPinned: true,
    });

    expect(result).toBeDefined();
  });

  it("validates note content is required", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.caseNotes.create({
        caseId: 1,
        content: "",
      })
    ).rejects.toThrow();
  });
});
