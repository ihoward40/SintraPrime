import { describe, it, expect } from "vitest";

describe("LLM Provider API Keys Validation", () => {
  it("should have all required API keys configured", () => {
    // Check that all keys are present in environment
    expect(process.env.OPENAI_API_KEY).toBeDefined();
    expect(process.env.GOOGLE_GEMINI_API_KEY).toBeDefined();
    expect(process.env.KIMI_API_KEY).toBeDefined();
    expect(process.env.MINIMAX_API_KEY).toBeDefined();
    expect(process.env.ANTHROPIC_API_KEY).toBeDefined();
  });

  it("should validate OpenAI API key format", () => {
    const key = process.env.OPENAI_API_KEY;
    expect(key).toBeDefined();
    // OpenAI keys typically start with "sk-"
    if (key && !key.startsWith("sk-proj-")) {
      // May be a legacy key format
      expect(key.startsWith("sk-")).toBe(true);
    }
  });

  it("should validate Anthropic API key format", () => {
    const key = process.env.ANTHROPIC_API_KEY;
    expect(key).toBeDefined();
    // Anthropic keys typically start with "sk-ant-"
    expect(key?.startsWith("sk-ant-")).toBe(true);
  });

  it("should have non-empty API keys", () => {
    expect(process.env.OPENAI_API_KEY?.length).toBeGreaterThan(10);
    expect(process.env.GOOGLE_GEMINI_API_KEY?.length).toBeGreaterThan(10);
    expect(process.env.KIMI_API_KEY?.length).toBeGreaterThan(10);
    expect(process.env.MINIMAX_API_KEY?.length).toBeGreaterThan(10);
    expect(process.env.ANTHROPIC_API_KEY?.length).toBeGreaterThan(10);
  });

  it("should load multi-model router with all providers", async () => {
    const { getAvailableModels } = await import("./lib/multi-model-router");
    
    const models = getAvailableModels();
    
    // Should have models from multiple providers
    const providers = new Set(models.map(m => m.provider));
    expect(providers.has("anthropic")).toBe(true);
    expect(providers.has("openai")).toBe(true);
    expect(providers.has("gemini")).toBe(true);
    expect(providers.has("kimi")).toBe(true);
    expect(providers.has("minimax")).toBe(true);
  });
});
