import { describe, expect, it } from "vitest";
import {
  evaluateEmbeddingPolicy,
  parseFrameAncestors,
} from "./lib/iframePreflight";

describe("parseFrameAncestors", () => {
  it("returns directive value when present", () => {
    expect(
      parseFrameAncestors("default-src 'self'; frame-ancestors 'none'; img-src *")
    ).toBe("'none'");
  });

  it("returns null when absent", () => {
    expect(parseFrameAncestors("default-src 'self'")).toBe(null);
  });
});

describe("evaluateEmbeddingPolicy", () => {
  const appOrigin = "https://app.example.com";

  it("CSP frame-ancestors 'none' => blocked", () => {
    const res = evaluateEmbeddingPolicy({
      status: 200,
      headers: { csp: "frame-ancestors 'none'", xFrameOptions: null },
      appOrigin,
      targetOrigin: "https://target.example.com",
    });

    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("CSP_FRAME_ANCESTORS_NONE");
  });

  it("CSP frame-ancestors * => allowed", () => {
    const res = evaluateEmbeddingPolicy({
      status: 200,
      headers: { csp: "frame-ancestors *", xFrameOptions: null },
      appOrigin,
      targetOrigin: "https://target.example.com",
    });

    expect(res.allowed).toBe(true);
    expect(res.reason).toBe("ALLOWED");
  });

  it("CSP frame-ancestors 'self' with mismatch => blocked", () => {
    const res = evaluateEmbeddingPolicy({
      status: 200,
      headers: { csp: "frame-ancestors 'self'", xFrameOptions: null },
      appOrigin,
      targetOrigin: "https://target.example.com",
    });

    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("CSP_FRAME_ANCESTORS_MISMATCH");
  });

  it("XFO DENY => blocked", () => {
    const res = evaluateEmbeddingPolicy({
      status: 200,
      headers: { csp: null, xFrameOptions: "DENY" },
      appOrigin,
      targetOrigin: "https://target.example.com",
    });

    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("XFO_DENY");
  });

  it("XFO SAMEORIGIN mismatch => blocked", () => {
    const res = evaluateEmbeddingPolicy({
      status: 200,
      headers: { csp: null, xFrameOptions: "SAMEORIGIN" },
      appOrigin,
      targetOrigin: "https://target.example.com",
    });

    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("XFO_SAMEORIGIN");
  });

  it("No relevant headers => unknown", () => {
    const res = evaluateEmbeddingPolicy({
      status: 200,
      headers: { csp: null, xFrameOptions: null },
      appOrigin,
      targetOrigin: "https://target.example.com",
    });

    expect(res.allowed).toBe(null);
    expect(res.reason).toBe("NO_RELEVANT_HEADERS");
  });
});
