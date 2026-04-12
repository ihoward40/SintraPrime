import { describe, expect, it } from "vitest";
import {
  coerceMemoryExtractionContent,
  parseExtractedMemories,
  summarizeMemoryExtractionContent,
} from "./ai-memory-router";

describe("ai-memory extraction guards", () => {
  it("parses fenced JSON array content", () => {
    const parsed = parseExtractedMemories(
      '```json\n[{"category":"general_context","key":"role","value":"pro se litigant","importance":4}]\n```'
    );

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.memories).toHaveLength(1);
      expect(parsed.memories[0]).toMatchObject({
        category: "general_context",
        key: "role",
        value: "pro se litigant",
        importance: 4,
      });
    }
  });

  it("coerces text-part arrays into a single string", () => {
    const content = coerceMemoryExtractionContent([
      { type: "text", text: '[{"category":"case_fact",' },
      { type: "text", text: '"key":"incident_date","value":"Jan 1","importance":5}]' },
    ]);

    expect(content).toBe(
      '[{"category":"case_fact",\n"key":"incident_date","value":"Jan 1","importance":5}]'
    );
  });

  it("returns invalid_shape for schema-invalid payloads with safe log context", () => {
    const parsed = parseExtractedMemories('[{"category":"general_context","value":"missing key"}]');

    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.reason).toBe("invalid_shape");
      expect(parsed.logContext).toEqual({
        contentLength: '[{"category":"general_context","value":"missing key"}]'.length,
        hasJsonArray: true,
        startsWithCodeFence: false,
      });
    }
  });

  it("returns missing_content for non-text multimodal payloads", () => {
    const content = coerceMemoryExtractionContent([
      {
        type: "image_url",
        image_url: {
          url: "https://example.com/proof.png",
        },
      },
    ]);

    expect(content).toBeNull();

    const parsed = parseExtractedMemories(content);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.reason).toBe("missing_content");
      expect(parsed.logContext).toEqual(summarizeMemoryExtractionContent(null));
    }
  });
});
