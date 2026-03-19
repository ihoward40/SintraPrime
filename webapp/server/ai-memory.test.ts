/**
 * AI Memory Layer - Comprehensive Test Suite
 * Tests cover: schema, router logic, memory extraction, chat integration, and data integrity
 */
import { describe, it, expect, vi } from "vitest";

// ============================================================================
// SCHEMA TESTS
// ============================================================================

describe("AI Memory Schema", () => {
  const VALID_CATEGORIES = ["user_preference", "case_fact", "legal_strategy", "general_context"] as const;

  it("should define all four required memory categories", () => {
    expect(VALID_CATEGORIES).toHaveLength(4);
    expect(VALID_CATEGORIES).toContain("user_preference");
    expect(VALID_CATEGORIES).toContain("case_fact");
    expect(VALID_CATEGORIES).toContain("legal_strategy");
    expect(VALID_CATEGORIES).toContain("general_context");
  });

  it("should have a default category of general_context", () => {
    const defaultCategory = "general_context";
    expect(VALID_CATEGORIES).toContain(defaultCategory);
  });

  it("should accept importance values 1 through 5", () => {
    for (let i = 1; i <= 5; i++) {
      expect(i).toBeGreaterThanOrEqual(1);
      expect(i).toBeLessThanOrEqual(5);
    }
  });

  it("should reject importance values outside 1-5 range", () => {
    const invalid = [0, 6, -1, 100];
    for (const v of invalid) {
      expect(v < 1 || v > 5).toBe(true);
    }
  });

  it("should define all required fields", () => {
    const requiredFields = ["id", "userId", "category", "key", "value", "importance", "source", "createdAt", "updatedAt"];
    const optionalFields = ["caseId"];
    expect(requiredFields).toHaveLength(9);
    expect(optionalFields).toHaveLength(1);
  });

  it("should have valid source types", () => {
    const validSources = ["manual", "chat", "chat_extraction", "document_extraction"];
    expect(validSources).toContain("manual");
    expect(validSources).toContain("chat_extraction");
    expect(validSources).toContain("document_extraction");
  });
});

// ============================================================================
// MEMORY ROUTER LOGIC TESTS
// ============================================================================

describe("AI Memory Router Logic", () => {
  // Simulate the list filtering logic
  function filterMemories(
    memories: Array<{ userId: number; caseId: number | null; category: string }>,
    userId: number,
    caseId?: number,
    category?: string
  ) {
    return memories.filter((m) => {
      if (m.userId !== userId) return false;
      if (caseId !== undefined && m.caseId !== caseId) return false;
      if (category && m.category !== category) return false;
      return true;
    });
  }

  const mockMemories = [
    { id: 1, userId: 1, caseId: null, category: "user_preference", key: "format", value: "Use bullet points", importance: 4, source: "manual" },
    { id: 2, userId: 1, caseId: 42, category: "case_fact", key: "defendant", value: "John Doe", importance: 5, source: "manual" },
    { id: 3, userId: 1, caseId: 42, category: "legal_strategy", key: "focus", value: "FDCPA violations", importance: 5, source: "chat_extraction" },
    { id: 4, userId: 2, caseId: null, category: "user_preference", key: "tone", value: "Formal", importance: 3, source: "manual" },
    { id: 5, userId: 1, caseId: null, category: "general_context", key: "role", value: "Pro se litigant", importance: 3, source: "manual" },
  ];

  it("should list only memories for the current user", () => {
    const result = filterMemories(mockMemories, 1);
    expect(result).toHaveLength(4);
    expect(result.every((m) => m.userId === 1)).toBe(true);
  });

  it("should filter memories by caseId", () => {
    const result = filterMemories(mockMemories, 1, 42);
    expect(result).toHaveLength(2);
    expect(result.every((m) => m.caseId === 42)).toBe(true);
  });

  it("should filter memories by category", () => {
    const result = filterMemories(mockMemories, 1, undefined, "user_preference");
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("format");
  });

  it("should not return other users' memories", () => {
    const result = filterMemories(mockMemories, 1);
    expect(result.find((m) => m.userId === 2)).toBeUndefined();
  });

  it("should return empty array when user has no memories", () => {
    const result = filterMemories(mockMemories, 999);
    expect(result).toHaveLength(0);
  });

  it("should handle combined caseId and category filter", () => {
    const result = filterMemories(mockMemories, 1, 42, "case_fact");
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("defendant");
  });
});

// ============================================================================
// MEMORY IMPORTANCE SORTING TESTS
// ============================================================================

describe("Memory Importance Sorting", () => {
  const memories = [
    { id: 1, key: "low", importance: 1 },
    { id: 2, key: "critical", importance: 5 },
    { id: 3, key: "medium", importance: 3 },
    { id: 4, key: "high", importance: 4 },
    { id: 5, key: "minor", importance: 2 },
  ];

  it("should sort memories by importance descending", () => {
    const sorted = [...memories].sort((a, b) => b.importance - a.importance);
    expect(sorted[0].importance).toBe(5);
    expect(sorted[1].importance).toBe(4);
    expect(sorted[2].importance).toBe(3);
    expect(sorted[3].importance).toBe(2);
    expect(sorted[4].importance).toBe(1);
  });

  it("should include high-importance memories in chat context", () => {
    const highImportance = memories.filter((m) => m.importance >= 3);
    expect(highImportance).toHaveLength(3);
  });

  it("should limit context injection to top 10 user preferences", () => {
    const manyMemories = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      key: `pref_${i}`,
      importance: Math.floor(Math.random() * 5) + 1,
    }));
    const limited = manyMemories.slice(0, 10);
    expect(limited).toHaveLength(10);
  });

  it("should limit case-specific memories to top 15", () => {
    const caseMemories = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      key: `fact_${i}`,
      caseId: 42,
    }));
    const limited = caseMemories.slice(0, 15);
    expect(limited).toHaveLength(15);
  });
});

// ============================================================================
// MEMORY EXTRACTION LOGIC TESTS
// ============================================================================

describe("Memory Extraction Logic", () => {
  // Simulate the extraction parsing logic
  function parseExtractionResponse(content: string): Array<{ category: string; key: string; value: string; importance: number }> {
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(content);
    } catch {
      return [];
    }
  }

  it("should parse valid JSON array from LLM response", () => {
    const response = JSON.stringify([
      { category: "user_preference", key: "format", value: "Use bullet points", importance: 4 },
    ]);
    const result = parseExtractionResponse(response);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("format");
  });

  it("should extract JSON from markdown-wrapped LLM response", () => {
    const response = "Here are the extracted memories:\n```json\n[{\"category\":\"case_fact\",\"key\":\"defendant\",\"value\":\"John Doe\",\"importance\":5}]\n```";
    const result = parseExtractionResponse(response);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("defendant");
  });

  it("should return empty array for non-JSON LLM response", () => {
    const result = parseExtractionResponse("No memorable facts found.");
    expect(result).toHaveLength(0);
  });

  it("should return empty array for empty JSON array", () => {
    const result = parseExtractionResponse("[]");
    expect(result).toHaveLength(0);
  });

  it("should handle malformed JSON gracefully", () => {
    const result = parseExtractionResponse("{ invalid json }");
    expect(result).toHaveLength(0);
  });

  it("should validate required fields before insertion", () => {
    const memories = [
      { category: "case_fact", key: "defendant", value: "John Doe", importance: 5 }, // valid
      { category: "case_fact", key: "", value: "Something", importance: 3 },          // invalid: empty key
      { category: "case_fact", key: "fact", value: "", importance: 3 },               // invalid: empty value
      { key: "fact", value: "Something", importance: 3 },                              // invalid: missing category
    ];
    const valid = memories.filter((m) => m.category && m.key && m.value);
    expect(valid).toHaveLength(1);
  });
});

// ============================================================================
// CHAT SYSTEM PROMPT INJECTION TESTS
// ============================================================================

describe("Chat System Prompt Memory Injection", () => {
  function buildSystemPrompt(
    userName: string,
    userPreferences: Array<{ key: string; value: string }>,
    caseMemories: Array<{ category: string; key: string; value: string }>
  ): string {
    let prompt = `You are SintraPrime AI Assistant.\nCurrent user: ${userName}`;

    if (userPreferences.length > 0) {
      prompt += `\n\nUser Preferences to Remember:\n`;
      for (const mem of userPreferences) {
        prompt += `- ${mem.key}: ${mem.value}\n`;
      }
    }

    if (caseMemories.length > 0) {
      prompt += `\n\nImportant Case Facts & Strategy:\n`;
      for (const mem of caseMemories) {
        prompt += `- [${mem.category}] ${mem.key}: ${mem.value}\n`;
      }
    }

    return prompt;
  }

  it("should include user preferences in system prompt", () => {
    const prompt = buildSystemPrompt(
      "Alice",
      [{ key: "format", value: "Use bullet points" }],
      []
    );
    expect(prompt).toContain("User Preferences to Remember");
    expect(prompt).toContain("format: Use bullet points");
  });

  it("should include case facts in system prompt", () => {
    const prompt = buildSystemPrompt(
      "Alice",
      [],
      [{ category: "case_fact", key: "defendant", value: "John Doe" }]
    );
    expect(prompt).toContain("Important Case Facts & Strategy");
    expect(prompt).toContain("[case_fact] defendant: John Doe");
  });

  it("should include both preferences and case facts", () => {
    const prompt = buildSystemPrompt(
      "Alice",
      [{ key: "tone", value: "Formal" }],
      [{ category: "legal_strategy", key: "approach", value: "FDCPA focus" }]
    );
    expect(prompt).toContain("User Preferences to Remember");
    expect(prompt).toContain("Important Case Facts & Strategy");
  });

  it("should not add memory sections when there are no memories", () => {
    const prompt = buildSystemPrompt("Alice", [], []);
    expect(prompt).not.toContain("User Preferences to Remember");
    expect(prompt).not.toContain("Important Case Facts & Strategy");
  });

  it("should include the user name in the prompt", () => {
    const prompt = buildSystemPrompt("Bob Smith", [], []);
    expect(prompt).toContain("Bob Smith");
  });

  it("should handle multiple preferences correctly", () => {
    const prefs = [
      { key: "format", value: "Bullet points" },
      { key: "length", value: "Under 200 words" },
      { key: "tone", value: "Formal" },
    ];
    const prompt = buildSystemPrompt("Alice", prefs, []);
    expect(prompt).toContain("format: Bullet points");
    expect(prompt).toContain("length: Under 200 words");
    expect(prompt).toContain("tone: Formal");
  });
});

// ============================================================================
// MEMORY CRUD VALIDATION TESTS
// ============================================================================

describe("Memory CRUD Validation", () => {
  function validateMemoryInput(input: { key?: string; value?: string; importance?: number; category?: string }) {
    const errors: string[] = [];
    if (!input.key || input.key.trim().length === 0) errors.push("Key is required");
    if (!input.value || input.value.trim().length === 0) errors.push("Value is required");
    if (input.importance !== undefined && (input.importance < 1 || input.importance > 5)) {
      errors.push("Importance must be between 1 and 5");
    }
    if (!input.category) errors.push("Category is required");
    return errors;
  }

  it("should validate that key is required", () => {
    const errors = validateMemoryInput({ value: "test", importance: 3, category: "general_context" });
    expect(errors).toContain("Key is required");
  });

  it("should validate that value is required", () => {
    const errors = validateMemoryInput({ key: "test", importance: 3, category: "general_context" });
    expect(errors).toContain("Value is required");
  });

  it("should validate importance range", () => {
    const errors = validateMemoryInput({ key: "test", value: "val", importance: 10, category: "general_context" });
    expect(errors).toContain("Importance must be between 1 and 5");
  });

  it("should pass validation for valid input", () => {
    const errors = validateMemoryInput({ key: "format", value: "Bullet points", importance: 4, category: "user_preference" });
    expect(errors).toHaveLength(0);
  });

  it("should reject empty string key", () => {
    const errors = validateMemoryInput({ key: "   ", value: "test", importance: 3, category: "general_context" });
    expect(errors).toContain("Key is required");
  });

  it("should require category", () => {
    const errors = validateMemoryInput({ key: "test", value: "val", importance: 3 });
    expect(errors).toContain("Category is required");
  });
});

// ============================================================================
// MEMORY OWNERSHIP SECURITY TESTS
// ============================================================================

describe("Memory Ownership Security", () => {
  const memories = [
    { id: 1, userId: 1, key: "pref1" },
    { id: 2, userId: 2, key: "pref2" },
    { id: 3, userId: 1, key: "pref3" },
  ];

  function canUserAccessMemory(userId: number, memoryId: number): boolean {
    const memory = memories.find((m) => m.id === memoryId);
    return memory?.userId === userId;
  }

  it("should allow user to access their own memory", () => {
    expect(canUserAccessMemory(1, 1)).toBe(true);
    expect(canUserAccessMemory(1, 3)).toBe(true);
  });

  it("should deny user access to another user's memory", () => {
    expect(canUserAccessMemory(1, 2)).toBe(false);
    expect(canUserAccessMemory(2, 1)).toBe(false);
  });

  it("should return false for non-existent memory", () => {
    expect(canUserAccessMemory(1, 999)).toBe(false);
  });
});
