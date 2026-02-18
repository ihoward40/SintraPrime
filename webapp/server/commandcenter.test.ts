import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/trpc";

describe("Command Center - Terminal", () => {
  const mockUser = {
    id: 1,
    name: "Test User",
    email: "test@example.com",
    role: "admin" as const,
  };

  const mockContext: TrpcContext = {
    user: mockUser,
    req: {} as any,
    res: {} as any,
  };

  const caller = appRouter.createCaller(mockContext);

  it("should execute help command", async () => {
    const result = await caller.terminal.execute({ command: "help" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("Available Commands");
    expect(result.output).toContain("Case Management");
  });

  it("should execute whoami command", async () => {
    const result = await caller.terminal.execute({ command: "whoami" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("Test User");
    expect(result.output).toContain("test@example.com");
  });

  it("should execute stats command", async () => {
    const result = await caller.terminal.execute({ command: "stats" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("System Statistics");
    expect(result.output).toContain("Cases:");
    expect(result.output).toContain("Documents:");
  });

  it("should list cases", async () => {
    const result = await caller.terminal.execute({ command: "cases list" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("Cases");
  });

  it("should list documents", async () => {
    const result = await caller.terminal.execute({ command: "documents list" });
    expect(result.success).toBe(true);
    expect(result.output).toContain("Documents");
  });

  it("should list evidence", async () => {
    const result = await caller.terminal.execute({ command: "evidence list" });
    expect(result.success).toBe(true);
    // Output should contain either "Evidence" or "No evidence found"
    expect(result.output).toMatch(/Evidence|No evidence found/);
  });

  it("should handle unknown command", async () => {
    const result = await caller.terminal.execute({ command: "unknown" });
    expect(result.success).toBe(false);
    expect(result.output).toContain("Unknown command");
  });

  it("should create a case via terminal", async () => {
    const result = await caller.terminal.execute({ 
      command: "cases create Test Terminal Case" 
    });
    expect(result.success).toBe(true);
    expect(result.output).toContain("created");
    expect(result.output).toContain("Test Terminal Case");
  });
});
