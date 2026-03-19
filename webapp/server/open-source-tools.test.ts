/**
 * Tests for the Open Source Tools Hub router
 *
 * Validates that all 10 tools are present, properly structured,
 * search and filtering work correctly, and stats are accurate.
 */

import { describe, it, expect } from "vitest";
import {
  OPEN_SOURCE_TOOLS,
  TOOL_CATEGORIES,
  openSourceToolsRouter,
} from "./open-source-tools-router";

// ============================================================================
// Data Integrity Tests
// ============================================================================

describe("Open Source Tools – Data Integrity", () => {
  it("should have exactly 10 tools", () => {
    expect(OPEN_SOURCE_TOOLS).toHaveLength(10);
  });

  it("should include all 10 required tools by name", () => {
    const names = OPEN_SOURCE_TOOLS.map((t) => t.name);
    expect(names).toContain("Coolify");
    expect(names).toContain("Fish Speech (Vish Speech)");
    expect(names).toContain("Promptfoo");
    expect(names).toContain("OpenRAG");
    expect(names).toContain("DeerFlow 2.0");
    expect(names).toContain("Dolt");
    expect(names).toContain("AstrBot");
    expect(names).toContain("OpenUtter");
    expect(names).toContain("CLI-Anything");
    expect(names).toContain("LightPanda Browser");
  });

  it("every tool should have required fields", () => {
    for (const tool of OPEN_SOURCE_TOOLS) {
      expect(tool.id).toBeTypeOf("number");
      expect(tool.name).toBeTypeOf("string");
      expect(tool.name.length).toBeGreaterThan(0);
      expect(tool.slug).toBeTypeOf("string");
      expect(tool.tagline).toBeTypeOf("string");
      expect(tool.category).toBeTypeOf("string");
      expect(tool.categorySlug).toBeTypeOf("string");
      expect(tool.replaces).toBeTypeOf("string");
      expect(tool.githubUrl).toMatch(/^https:\/\/github\.com\//);
      expect(tool.stars).toBeTypeOf("string");
      expect(tool.license).toBeTypeOf("string");
      expect(tool.badge).toBeTypeOf("string");
      expect(tool.icon).toBeTypeOf("string");
      expect(tool.description.length).toBeGreaterThan(50);
      expect(tool.whyItMatters.length).toBeGreaterThan(50);
      expect(Array.isArray(tool.features)).toBe(true);
      expect(tool.features.length).toBeGreaterThanOrEqual(4);
      expect(Array.isArray(tool.useCases)).toBe(true);
      expect(tool.useCases.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("all tool IDs should be unique", () => {
    const ids = OPEN_SOURCE_TOOLS.map((t) => t.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(OPEN_SOURCE_TOOLS.length);
  });

  it("all tool slugs should be unique", () => {
    const slugs = OPEN_SOURCE_TOOLS.map((t) => t.slug);
    const uniqueSlugs = new Set(slugs);
    expect(uniqueSlugs.size).toBe(OPEN_SOURCE_TOOLS.length);
  });

  it("all category slugs should be valid (present in TOOL_CATEGORIES)", () => {
    const validSlugs = new Set(TOOL_CATEGORIES.map((c) => c.id));
    for (const tool of OPEN_SOURCE_TOOLS) {
      expect(validSlugs.has(tool.categorySlug)).toBe(true);
    }
  });
});

// ============================================================================
// Category Tests
// ============================================================================

describe("Open Source Tools – Categories", () => {
  it("should have 11 categories (including 'all')", () => {
    expect(TOOL_CATEGORIES).toHaveLength(11);
  });

  it("first category should be 'all'", () => {
    expect(TOOL_CATEGORIES[0].id).toBe("all");
    expect(TOOL_CATEGORIES[0].count).toBe(10);
  });

  it("each non-all category should have count = 1", () => {
    for (const cat of TOOL_CATEGORIES.slice(1)) {
      expect(cat.count).toBe(1);
    }
  });

  it("should cover all 10 required category slugs", () => {
    const slugs = TOOL_CATEGORIES.map((c) => c.id);
    expect(slugs).toContain("hosting");
    expect(slugs).toContain("voice");
    expect(slugs).toContain("testing");
    expect(slugs).toContain("rag");
    expect(slugs).toContain("agents");
    expect(slugs).toContain("database");
    expect(slugs).toContain("chatbot");
    expect(slugs).toContain("transcription");
    expect(slugs).toContain("agent-native");
    expect(slugs).toContain("automation");
  });
});

// ============================================================================
// Router Logic Tests (inline simulation)
// ============================================================================

describe("Open Source Tools – Router Logic", () => {
  // Simulate the list query logic directly
  function listTools(input?: { category?: string; query?: string }) {
    let tools = OPEN_SOURCE_TOOLS;
    if (input?.category && input.category !== "all") {
      tools = tools.filter((t) => t.categorySlug === input.category);
    }
    if (input?.query) {
      const q = input.query.toLowerCase();
      tools = tools.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.tagline.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          t.replaces.toLowerCase().includes(q) ||
          t.features.some((f) => f.toLowerCase().includes(q)) ||
          t.useCases.some((u) => u.toLowerCase().includes(q))
      );
    }
    return tools;
  }

  it("list with no filter returns all 10 tools", () => {
    expect(listTools()).toHaveLength(10);
  });

  it("list filtered by 'hosting' returns exactly Coolify", () => {
    const result = listTools({ category: "hosting" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Coolify");
  });

  it("list filtered by 'agents' returns exactly DeerFlow 2.0", () => {
    const result = listTools({ category: "agents" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("DeerFlow 2.0");
  });

  it("list filtered by 'voice' returns exactly Fish Speech", () => {
    const result = listTools({ category: "voice" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Fish Speech (Vish Speech)");
  });

  it("search for 'coolify' returns Coolify", () => {
    const result = listTools({ query: "coolify" });
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].name).toBe("Coolify");
  });

  it("search for 'fork clone branch' returns Dolt", () => {
    const result = listTools({ query: "fork" });
    const names = result.map((t) => t.name);
    expect(names).toContain("Dolt");
  });

  it("search for 'headless browser' returns LightPanda", () => {
    const result = listTools({ query: "headless browser" });
    const names = result.map((t) => t.name);
    expect(names).toContain("LightPanda Browser");
  });

  it("search for 'red team' returns Promptfoo", () => {
    const result = listTools({ query: "red team" });
    const names = result.map((t) => t.name);
    expect(names).toContain("Promptfoo");
  });

  it("search for 'google meet' returns OpenUtter", () => {
    const result = listTools({ query: "google meet" });
    const names = result.map((t) => t.name);
    expect(names).toContain("OpenUtter");
  });

  it("search for 'rag' returns OpenRAG", () => {
    const result = listTools({ query: "rag" });
    const names = result.map((t) => t.name);
    expect(names).toContain("OpenRAG");
  });

  it("search for 'agent-native' returns CLI-Anything", () => {
    const result = listTools({ query: "agent-native" });
    const names = result.map((t) => t.name);
    expect(names).toContain("CLI-Anything");
  });

  it("search for 'telegram' returns AstrBot", () => {
    const result = listTools({ query: "telegram" });
    const names = result.map((t) => t.name);
    expect(names).toContain("AstrBot");
  });

  it("empty query returns all tools", () => {
    expect(listTools({ query: "" })).toHaveLength(10);
  });

  it("unknown category returns empty array", () => {
    expect(listTools({ category: "nonexistent-category" })).toHaveLength(0);
  });

  it("get by slug returns correct tool", () => {
    const tool = OPEN_SOURCE_TOOLS.find((t) => t.slug === "coolify");
    expect(tool).toBeDefined();
    expect(tool?.name).toBe("Coolify");
  });

  it("get by unknown slug returns undefined", () => {
    const tool = OPEN_SOURCE_TOOLS.find((t) => t.slug === "nonexistent");
    expect(tool).toBeUndefined();
  });
});

// ============================================================================
// Content Quality Tests
// ============================================================================

describe("Open Source Tools – Content Quality", () => {
  it("every tool description should be at least 100 characters", () => {
    for (const tool of OPEN_SOURCE_TOOLS) {
      expect(tool.description.length).toBeGreaterThanOrEqual(100);
    }
  });

  it("every tool should have at least 6 features", () => {
    for (const tool of OPEN_SOURCE_TOOLS) {
      expect(tool.features.length).toBeGreaterThanOrEqual(6);
    }
  });

  it("every tool should have at least 3 use cases", () => {
    for (const tool of OPEN_SOURCE_TOOLS) {
      expect(tool.useCases.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("every tool should have a valid GitHub URL", () => {
    for (const tool of OPEN_SOURCE_TOOLS) {
      expect(tool.githubUrl).toMatch(/^https:\/\/github\.com\/.+\/.+/);
    }
  });

  it("every tool should have a non-empty trend field", () => {
    for (const tool of OPEN_SOURCE_TOOLS) {
      expect(tool.trend.length).toBeGreaterThan(0);
    }
  });

  it("every tool should have a non-empty replaces field", () => {
    for (const tool of OPEN_SOURCE_TOOLS) {
      expect(tool.replaces.length).toBeGreaterThan(0);
    }
  });
});
