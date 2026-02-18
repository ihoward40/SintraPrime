import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(overrides?: Partial<AuthenticatedUser>): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  } as AuthenticatedUser;

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("cases router", () => {
  it("creates a new case with valid input", async () => {
    const ctx = createAuthContext({ subscriptionTier: "enterprise" } as any);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cases.create({
      title: "Test Case v. Creditor",
      description: "Test case description",
      caseType: "FDCPA",
      priority: "high",
    });

    expect(result).toBeDefined();
    expect(result[0]).toHaveProperty("insertId");
  });

  it("lists cases for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.cases.list();

    expect(Array.isArray(result)).toBe(true);
  });

  it("requires authentication for case creation", async () => {
    const ctx: TrpcContext = {
      user: null,
      req: {
        protocol: "https",
        headers: {},
      } as TrpcContext["req"],
      res: {
        clearCookie: () => {},
      } as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.cases.create({
        title: "Test Case",
      })
    ).rejects.toThrow();
  });

  it("validates required fields", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.cases.create({
        title: "", // Empty title should fail
      })
    ).rejects.toThrow();
  });
});
