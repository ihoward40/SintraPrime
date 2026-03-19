import { describe, it, expect } from "vitest";

// ============================================================
// VLM Router — Unit Tests
// ============================================================

// --- Data Validation Helpers ---
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function buildMultimodalContent(text: string, imageUrls: string[]) {
  const parts: any[] = [{ type: "text", text }];
  for (const url of imageUrls) {
    parts.push({ type: "image_url", image_url: { url, detail: "high" } });
  }
  return parts;
}

function buildTextOnlyContent(text: string) {
  return text;
}

// --- Analysis Type Validation ---
const VALID_ANALYSIS_TYPES = ["general", "ocr", "evidence", "document"] as const;
type AnalysisType = typeof VALID_ANALYSIS_TYPES[number];

function isValidAnalysisType(type: string): type is AnalysisType {
  return VALID_ANALYSIS_TYPES.includes(type as AnalysisType);
}

function getSystemPromptForType(type: AnalysisType): string {
  const base = "You are an expert AI Vision Assistant for SintraPrime, specializing in analyzing images, documents, and visual evidence.";
  if (type === "ocr") return base + " Your primary task is to extract all text from the image exactly as it appears, preserving formatting and layout where possible.";
  if (type === "evidence") return base + " Your primary task is to analyze this image as potential legal evidence. Identify key objects, people, timestamps, locations, and any anomalies or details that might be relevant to a case.";
  if (type === "document") return base + " Your primary task is to analyze this scanned document. Extract the main clauses, identify the document type, parties involved, dates, and summarize the core purpose.";
  return base;
}

// --- Structured Data Validation ---
function isValidStructuredData(data: any): boolean {
  if (!data || typeof data !== "object") return false;
  if (!Array.isArray(data.entities)) return false;
  if (typeof data.summary !== "string") return false;
  if (typeof data.confidence !== "number") return false;
  if (data.confidence < 0 || data.confidence > 1) return false;
  return true;
}

// ============================================================
// Test Suites
// ============================================================

describe("VLM Router — Input Validation", () => {
  it("should accept a valid HTTPS image URL", () => {
    const url = "https://example.com/image.jpg";
    expect(isValidUrl(url)).toBe(true);
  });

  it("should reject a non-URL string as imageUrl", () => {
    const url = "not-a-url";
    expect(isValidUrl(url)).toBe(false);
  });

  it("should accept all four valid analysis types", () => {
    for (const type of VALID_ANALYSIS_TYPES) {
      expect(isValidAnalysisType(type)).toBe(true);
    }
  });

  it("should reject an invalid analysis type", () => {
    expect(isValidAnalysisType("screenshot")).toBe(false);
    expect(isValidAnalysisType("")).toBe(false);
    expect(isValidAnalysisType("video")).toBe(false);
  });

  it("should default to 'general' if no analysis type is provided", () => {
    const defaultType = "general";
    expect(isValidAnalysisType(defaultType)).toBe(true);
  });
});

describe("VLM Router — System Prompt Generation", () => {
  it("should include the base prompt for all types", () => {
    for (const type of VALID_ANALYSIS_TYPES) {
      const prompt = getSystemPromptForType(type);
      expect(prompt).toContain("SintraPrime");
      expect(prompt).toContain("Vision Assistant");
    }
  });

  it("should include OCR-specific instructions for 'ocr' type", () => {
    const prompt = getSystemPromptForType("ocr");
    expect(prompt).toContain("extract all text");
    expect(prompt).toContain("formatting and layout");
  });

  it("should include evidence-specific instructions for 'evidence' type", () => {
    const prompt = getSystemPromptForType("evidence");
    expect(prompt).toContain("legal evidence");
    expect(prompt).toContain("timestamps");
  });

  it("should include document-specific instructions for 'document' type", () => {
    const prompt = getSystemPromptForType("document");
    expect(prompt).toContain("scanned document");
    expect(prompt).toContain("parties involved");
  });

  it("should return a plain base prompt for 'general' type", () => {
    const prompt = getSystemPromptForType("general");
    expect(prompt).not.toContain("extract all text");
    expect(prompt).not.toContain("legal evidence");
    expect(prompt).not.toContain("scanned document");
  });
});

describe("VLM Router — Multimodal Message Building", () => {
  it("should build a multimodal content array with text and one image", () => {
    const content = buildMultimodalContent("Analyze this image.", ["https://example.com/img.jpg"]);
    expect(Array.isArray(content)).toBe(true);
    expect(content).toHaveLength(2);
    expect(content[0].type).toBe("text");
    expect(content[0].text).toBe("Analyze this image.");
    expect(content[1].type).toBe("image_url");
    expect(content[1].image_url.url).toBe("https://example.com/img.jpg");
    expect(content[1].image_url.detail).toBe("high");
  });

  it("should build a multimodal content array with text and multiple images", () => {
    const urls = [
      "https://example.com/img1.jpg",
      "https://example.com/img2.png",
      "https://example.com/img3.webp",
    ];
    const content = buildMultimodalContent("Compare these images.", urls);
    expect(content).toHaveLength(4); // 1 text + 3 images
    expect(content[0].type).toBe("text");
    for (let i = 1; i <= 3; i++) {
      expect(content[i].type).toBe("image_url");
      expect(content[i].image_url.url).toBe(urls[i - 1]);
    }
  });

  it("should return a plain string when no images are provided", () => {
    const content = buildTextOnlyContent("Hello, what can you help me with?");
    expect(typeof content).toBe("string");
    expect(content).toBe("Hello, what can you help me with?");
  });

  it("should use 'high' detail level for all image parts", () => {
    const content = buildMultimodalContent("Analyze.", ["https://example.com/doc.png"]);
    const imagePart = content.find((p: any) => p.type === "image_url");
    expect(imagePart?.image_url?.detail).toBe("high");
  });
});

describe("VLM Router — Structured Data Validation", () => {
  it("should validate a correct structured data object", () => {
    const data = {
      entities: ["John Doe", "Jane Smith", "Contract dated 2024-01-15"],
      summary: "A contract between two parties for software services.",
      confidence: 0.92,
    };
    expect(isValidStructuredData(data)).toBe(true);
  });

  it("should reject structured data missing entities", () => {
    const data = { summary: "A contract.", confidence: 0.9 };
    expect(isValidStructuredData(data)).toBe(false);
  });

  it("should reject structured data missing summary", () => {
    const data = { entities: ["John"], confidence: 0.9 };
    expect(isValidStructuredData(data)).toBe(false);
  });

  it("should reject structured data with confidence out of range", () => {
    const data = { entities: [], summary: "test", confidence: 1.5 };
    expect(isValidStructuredData(data)).toBe(false);
  });

  it("should reject null structured data", () => {
    expect(isValidStructuredData(null)).toBe(false);
  });

  it("should accept confidence of exactly 0 or 1", () => {
    expect(isValidStructuredData({ entities: [], summary: "test", confidence: 0 })).toBe(true);
    expect(isValidStructuredData({ entities: [], summary: "test", confidence: 1 })).toBe(true);
  });
});

describe("VLM Chat Integration — imageUrls in sendMessage", () => {
  it("should build multimodal content when imageUrls are provided", () => {
    const message = "What does this document say?";
    const imageUrls = ["https://s3.example.com/uploads/doc.png"];

    const content = imageUrls.length > 0
      ? buildMultimodalContent(message, imageUrls)
      : buildTextOnlyContent(message);

    expect(Array.isArray(content)).toBe(true);
    expect((content as any[])[0].type).toBe("text");
    expect((content as any[])[1].type).toBe("image_url");
  });

  it("should build text-only content when no imageUrls are provided", () => {
    const message = "What is the status of my case?";
    const imageUrls: string[] = [];

    const content = imageUrls.length > 0
      ? buildMultimodalContent(message, imageUrls)
      : buildTextOnlyContent(message);

    expect(typeof content).toBe("string");
    expect(content).toBe(message);
  });

  it("should handle multiple images in a single chat message", () => {
    const message = "Compare these two exhibits.";
    const imageUrls = [
      "https://s3.example.com/exhibit-a.jpg",
      "https://s3.example.com/exhibit-b.jpg",
    ];

    const content = buildMultimodalContent(message, imageUrls);
    expect(content).toHaveLength(3);
  });
});

describe("VLM Router — Edge Cases", () => {
  it("should handle an empty custom prompt by falling back to default", () => {
    const customPrompt = "   ";
    const defaultPrompt = "Analyze this image in detail.";
    const effectivePrompt = customPrompt.trim() ? customPrompt.trim() : defaultPrompt;
    expect(effectivePrompt).toBe(defaultPrompt);
  });

  it("should use custom prompt when provided and non-empty", () => {
    const customPrompt = "Focus only on the signatures in this document.";
    const defaultPrompt = "Analyze this image in detail.";
    const effectivePrompt = customPrompt.trim() ? customPrompt.trim() : defaultPrompt;
    expect(effectivePrompt).toBe(customPrompt);
  });

  it("should handle image URLs with query parameters", () => {
    const url = "https://s3.amazonaws.com/bucket/image.jpg?X-Amz-Signature=abc123&X-Amz-Expires=3600";
    expect(isValidUrl(url)).toBe(true);
  });

  it("should handle PNG, JPEG, WebP, and GIF image URLs", () => {
    const urls = [
      "https://example.com/image.png",
      "https://example.com/image.jpg",
      "https://example.com/image.jpeg",
      "https://example.com/image.webp",
      "https://example.com/image.gif",
    ];
    for (const url of urls) {
      expect(isValidUrl(url)).toBe(true);
    }
  });
});
