import { describe, it, expect } from "vitest";
import Anthropic from "@anthropic-ai/sdk";

describe("Anthropic API Key Validation", () => {
  it("should validate ANTHROPIC_API_KEY with a simple API call", async () => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    expect(apiKey).toBeDefined();
    expect(apiKey).toMatch(/^sk-ant-/);

    // Test the key with a minimal API call
    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 10,
      messages: [
        {
          role: "user",
          content: "Say 'OK'",
        },
      ],
    });

    expect(message.content).toBeDefined();
    expect(message.content.length).toBeGreaterThan(0);
    expect(message.content[0].type).toBe("text");
  }, 30000); // 30 second timeout for API call
});
