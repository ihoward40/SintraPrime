import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ============================================================
// Mock invokeLLM so tests don't require actual LLM credentials
// ============================================================
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

// Mock SSRF guard: allow example.com, reject private/localhost URLs
vi.mock("./lib/iframePreflight", () => ({
  passesSsrfGuard: vi.fn().mockImplementation(async (url: URL) => {
    const host = url.hostname;
    return (
      url.protocol === "https:" &&
      host !== "localhost" &&
      host !== "127.0.0.1" &&
      !host.startsWith("192.168.") &&
      !host.startsWith("10.")
    );
  }),
}));

import { invokeLLM } from "./_core/llm";
import { vlmRouter } from "./vlm-router";
import type { TrpcContext } from "./_core/context";

// ============================================================
// Mock tRPC context (only user field needed for protectedProcedure)
// ============================================================
const mockCtx = {
  user: {
    id: 1,
    openId: "test-openid",
    name: "Test User",
    email: "test@example.com",
    role: "user",
    createdAt: new Date(),
    subscriptionTier: "pro",
  },
} as unknown as TrpcContext;

const caller = vlmRouter.createCaller(mockCtx);

const mockLlm = vi.mocked(invokeLLM);

function makeLlmResponse(content: string) {
  return {
    id: "test-id",
    created: Date.now(),
    model: "test-model",
    choices: [{ index: 0, message: { role: "assistant" as const, content }, finish_reason: "stop" }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// Test Suites
// ============================================================

describe("vlmRouter.analyzeImage — input validation", () => {
  it("rejects a non-URL imageUrl (Zod validation)", async () => {
    await expect(
      caller.analyzeImage({ imageUrl: "not-a-url", analysisType: "general" })
    ).rejects.toThrow();
  });

  it("rejects a localhost URL (SSRF guard)", async () => {
    await expect(
      caller.analyzeImage({ imageUrl: "http://localhost/image.jpg", analysisType: "general" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a private IP URL (SSRF guard)", async () => {
    await expect(
      caller.analyzeImage({ imageUrl: "http://192.168.1.1/image.jpg", analysisType: "general" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts a valid HTTPS URL and calls invokeLLM", async () => {
    mockLlm.mockResolvedValue(makeLlmResponse("A photo of a document."));

    const result = await caller.analyzeImage({
      imageUrl: "https://example.com/image.jpg",
      analysisType: "general",
    });

    expect(mockLlm).toHaveBeenCalledOnce();
    expect(result.success).toBe(true);
    expect(result.analysis).toBe("A photo of a document.");
    expect(result.structuredData).toBeNull();
  });

  it("accepts all four valid analysis types", async () => {
    for (const analysisType of ["general", "ocr", "evidence", "document"] as const) {
      mockLlm.mockResolvedValue(makeLlmResponse("Some analysis."));
      const result = await caller.analyzeImage({
        imageUrl: "https://example.com/image.jpg",
        analysisType,
      });
      expect(result.success).toBe(true);
    }
  });
});

describe("vlmRouter.analyzeImage — system prompt selection", () => {
  it("uses OCR-specific system prompt for ocr type", async () => {
    mockLlm.mockResolvedValue(makeLlmResponse("Extracted text."));

    await caller.analyzeImage({
      imageUrl: "https://example.com/image.jpg",
      analysisType: "ocr",
    });

    const callArgs = mockLlm.mock.calls[0][0];
    const systemMsg = callArgs.messages.find((m: any) => m.role === "system");
    expect(systemMsg?.content).toContain("extract all text");
  });

  it("uses evidence-specific system prompt for evidence type", async () => {
    // evidence calls invokeLLM twice (once for analysis, once for extraction)
    mockLlm.mockResolvedValueOnce(makeLlmResponse("Evidence analysis."))
            .mockResolvedValueOnce(makeLlmResponse('{"entities":[],"summary":"test","confidence":0.9}'));

    await caller.analyzeImage({
      imageUrl: "https://example.com/image.jpg",
      analysisType: "evidence",
    });

    const callArgs = mockLlm.mock.calls[0][0];
    const systemMsg = callArgs.messages.find((m: any) => m.role === "system");
    expect(systemMsg?.content).toContain("legal evidence");
  });

  it("uses document-specific system prompt for document type", async () => {
    mockLlm.mockResolvedValueOnce(makeLlmResponse("Document analysis."))
            .mockResolvedValueOnce(makeLlmResponse('{"entities":[],"summary":"doc","confidence":0.8}'));

    await caller.analyzeImage({
      imageUrl: "https://example.com/image.jpg",
      analysisType: "document",
    });

    const callArgs = mockLlm.mock.calls[0][0];
    const systemMsg = callArgs.messages.find((m: any) => m.role === "system");
    expect(systemMsg?.content).toContain("scanned document");
  });
});

describe("vlmRouter.analyzeImage — multimodal message building", () => {
  it("sends an image_url content part with detail:high", async () => {
    mockLlm.mockResolvedValue(makeLlmResponse("An image analysis."));

    await caller.analyzeImage({
      imageUrl: "https://example.com/photo.png",
      analysisType: "general",
    });

    const callArgs = mockLlm.mock.calls[0][0];
    const userMsg = callArgs.messages.find((m: any) => m.role === "user");
    expect(Array.isArray(userMsg?.content)).toBe(true);
    const imagePart = userMsg.content.find((p: any) => p.type === "image_url");
    expect(imagePart).toBeDefined();
    expect(imagePart.image_url.url).toBe("https://example.com/photo.png");
    expect(imagePart.image_url.detail).toBe("high");
  });

  it("sends the prompt as a text content part", async () => {
    mockLlm.mockResolvedValue(makeLlmResponse("Result."));

    await caller.analyzeImage({
      imageUrl: "https://example.com/photo.png",
      prompt: "What does this say?",
      analysisType: "general",
    });

    const callArgs = mockLlm.mock.calls[0][0];
    const userMsg = callArgs.messages.find((m: any) => m.role === "user");
    const textPart = userMsg.content.find((p: any) => p.type === "text");
    expect(textPart?.text).toBe("What does this say?");
  });
});

describe("vlmRouter.analyzeImage — response content normalization", () => {
  it("returns string content unchanged", async () => {
    mockLlm.mockResolvedValue(makeLlmResponse("Plain text response."));

    const result = await caller.analyzeImage({
      imageUrl: "https://example.com/image.jpg",
      analysisType: "general",
    });

    expect(typeof result.analysis).toBe("string");
    expect(result.analysis).toBe("Plain text response.");
  });

  it("joins array content parts into a single string", async () => {
    const arrayContent = [
      { type: "text", text: "Part one." },
      { type: "text", text: "Part two." },
    ] as any;
    mockLlm.mockResolvedValue({
      ...makeLlmResponse(""),
      choices: [{ index: 0, message: { role: "assistant", content: arrayContent }, finish_reason: "stop" }],
    });

    const result = await caller.analyzeImage({
      imageUrl: "https://example.com/image.jpg",
      analysisType: "general",
    });

    expect(typeof result.analysis).toBe("string");
    expect(result.analysis).toContain("Part one.");
    expect(result.analysis).toContain("Part two.");
  });

  it("throws INTERNAL_SERVER_ERROR when no analysis is returned", async () => {
    mockLlm.mockResolvedValue({
      ...makeLlmResponse(""),
      choices: [{ index: 0, message: { role: "assistant", content: "" }, finish_reason: "stop" }],
    });

    await expect(
      caller.analyzeImage({ imageUrl: "https://example.com/image.jpg", analysisType: "general" })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});

describe("vlmRouter.analyzeImage — structured data extraction", () => {
  it("returns structuredData for document type", async () => {
    const structuredPayload = { entities: ["John Doe"], summary: "A contract.", confidence: 0.9 };
    mockLlm
      .mockResolvedValueOnce(makeLlmResponse("Document analysis text."))
      .mockResolvedValueOnce(makeLlmResponse(JSON.stringify(structuredPayload)));

    const result = await caller.analyzeImage({
      imageUrl: "https://example.com/image.jpg",
      analysisType: "document",
    });

    expect(result.structuredData).toMatchObject(structuredPayload);
    expect(mockLlm).toHaveBeenCalledTimes(2);
  });

  it("returns structuredData for evidence type", async () => {
    const structuredPayload = { entities: ["Exhibit A"], summary: "Evidence photo.", confidence: 0.85 };
    mockLlm
      .mockResolvedValueOnce(makeLlmResponse("Evidence analysis text."))
      .mockResolvedValueOnce(makeLlmResponse(JSON.stringify(structuredPayload)));

    const result = await caller.analyzeImage({
      imageUrl: "https://example.com/image.jpg",
      analysisType: "evidence",
    });

    expect(result.structuredData).toMatchObject(structuredPayload);
  });

  it("returns null structuredData for general type (no extraction call)", async () => {
    mockLlm.mockResolvedValue(makeLlmResponse("General analysis."));

    const result = await caller.analyzeImage({
      imageUrl: "https://example.com/image.jpg",
      analysisType: "general",
    });

    expect(result.structuredData).toBeNull();
    expect(mockLlm).toHaveBeenCalledTimes(1);
  });

  it("returns null structuredData when extraction JSON parsing fails (non-fatal)", async () => {
    mockLlm
      .mockResolvedValueOnce(makeLlmResponse("Document analysis text."))
      .mockResolvedValueOnce(makeLlmResponse("not valid json"));

    const result = await caller.analyzeImage({
      imageUrl: "https://example.com/image.jpg",
      analysisType: "document",
    });

    // Non-fatal: analysis still succeeds, structuredData is null
    expect(result.success).toBe(true);
    expect(result.structuredData).toBeNull();
  });
});

describe("vlmRouter.analyzeImage — LLM error handling", () => {
  it("throws INTERNAL_SERVER_ERROR when invokeLLM rejects", async () => {
    mockLlm.mockRejectedValue(new Error("LLM service unavailable"));

    await expect(
      caller.analyzeImage({ imageUrl: "https://example.com/image.jpg", analysisType: "general" })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });
});
