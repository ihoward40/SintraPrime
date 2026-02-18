import { describe, it, expect } from "vitest";

describe("God-Tier Platform Features", () => {
  describe("Multi-Model AI Router", () => {
    it("should have all LLM providers registered", async () => {
      const { getAvailableModels } = await import("./lib/multi-model-router");

      const models = getAvailableModels();
      const providers = new Set(models.map((m) => m.provider));

      expect(providers.has("anthropic")).toBe(true);
      expect(providers.has("openai")).toBe(true);
      expect(providers.has("gemini")).toBe(true);
      expect(providers.has("kimi")).toBe(true);
      expect(providers.has("minimax")).toBe(true);
    });

    it("should have multiple models available", async () => {
      const { getAvailableModels } = await import("./lib/multi-model-router");

      const models = getAvailableModels();
      
      // Should have models with different capabilities
      const hasCodeModel = models.some(m => m.capabilities.includes("code"));
      const hasReasoningModel = models.some(m => m.capabilities.includes("reasoning"));
      const hasFastModel = models.some(m => m.capabilities.includes("fast-response"));
      
      expect(hasCodeModel).toBe(true);
      expect(hasReasoningModel).toBe(true);
      expect(hasFastModel).toBe(true);
    });
  });

  describe("Slide Generation System", () => {
    it("should have slide generation router", async () => {
      const { slidesRouter } = await import("./slides/router");

      expect(slidesRouter).toBeDefined();
      expect(slidesRouter._def.procedures.generateOutline).toBeDefined();
      expect(slidesRouter._def.procedures.generateFromCase).toBeDefined();
      expect(slidesRouter._def.procedures.enhanceSlide).toBeDefined();
    });

    it("should convert outline to markdown", async () => {
      const { outlineToMarkdown } = await import("./lib/slide-generator");

      const outline = {
        title: "Test Presentation",
        subtitle: "Subtitle",
        theme: "legal" as const,
        slides: [
          {
            title: "Slide 1",
            content: ["Point 1", "Point 2"],
            layout: "content" as const,
          },
        ],
        totalSlides: 1,
      };

      const markdown = outlineToMarkdown(outline);

      expect(markdown).toContain("# Test Presentation");
      expect(markdown).toContain("## Slide 1");
      expect(markdown).toContain("- Point 1");
      expect(markdown).toContain("- Point 2");
    });
  });

  describe("Digital Product Creator", () => {
    it("should have digital products router", async () => {
      const { digitalProductsRouter } = await import("./digital-products/router");

      expect(digitalProductsRouter).toBeDefined();
      expect(digitalProductsRouter._def.procedures.generateLegalDocument).toBeDefined();
      expect(digitalProductsRouter._def.procedures.generateDemandLetter).toBeDefined();
      expect(digitalProductsRouter._def.procedures.generateContract).toBeDefined();
      expect(digitalProductsRouter._def.procedures.generateInfographic).toBeDefined();
    });

    it("should convert markdown to HTML", async () => {
      const { markdownToHTML } = await import("./lib/digital-product-creator");

      const markdown = "# Title\n\n## Section\n\n- Point 1\n- Point 2";
      const html = markdownToHTML(markdown, "Test Document");

      expect(html).toContain("<h1>Title</h1>");
      expect(html).toContain("<h2>Section</h2>");
      expect(html).toContain("<li>Point 1</li>");
      expect(html).toContain("<title>Test Document</title>");
    });
  });

  describe("Advanced AI Features", () => {
    it("should have advanced AI router", async () => {
      const { advancedAIRouter } = await import("./advanced-ai/router");

      expect(advancedAIRouter).toBeDefined();
      expect(advancedAIRouter._def.procedures.deepReasoning).toBeDefined();
      expect(advancedAIRouter._def.procedures.generateCode).toBeDefined();
      expect(advancedAIRouter._def.procedures.generateVisualDesign).toBeDefined();
      expect(advancedAIRouter._def.procedures.multiModelConsensus).toBeDefined();
      expect(advancedAIRouter._def.procedures.explainCode).toBeDefined();
    });
  });

  describe("Agent Zero System", () => {
    it("should have agent zero router", async () => {
      const { agentZeroRouter } = await import("./agent-zero/router");

      expect(agentZeroRouter).toBeDefined();
      expect(agentZeroRouter._def.procedures.executeTask).toBeDefined();
      expect(agentZeroRouter._def.procedures.getTaskHistory).toBeDefined();
    });

    it("should have agent zero core engine", async () => {
      const { AgentZero } = await import("./lib/agent-zero");

      expect(AgentZero).toBeDefined();
      expect(typeof AgentZero).toBe("function");
    });
  });

  describe("Main Router Integration", () => {
    it("should have main app router defined", async () => {
      const { appRouter } = await import("./routers");

      // Check that main router exists
      expect(appRouter).toBeDefined();
      expect(appRouter._def).toBeDefined();
    });
  });

  describe("Environment Configuration", () => {
    it("should have all required API keys", () => {
      expect(process.env.OPENAI_API_KEY).toBeDefined();
      expect(process.env.GOOGLE_GEMINI_API_KEY).toBeDefined();
      expect(process.env.KIMI_API_KEY).toBeDefined();
      expect(process.env.MINIMAX_API_KEY).toBeDefined();
      expect(process.env.ANTHROPIC_API_KEY).toBeDefined();
    });
  });
});
