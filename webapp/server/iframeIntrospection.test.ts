import { describe, expect, it } from "vitest";
import { shouldAttemptIframeIntrospection } from "../shared/iframeIntrospection";

describe("shouldAttemptIframeIntrospection", () => {
  it("returns true for same-origin", () => {
    expect(
      shouldAttemptIframeIntrospection(
        "https://app.example.com/path",
        "https://app.example.com"
      )
    ).toBe(true);
  });

  it("returns false for cross-origin", () => {
    expect(
      shouldAttemptIframeIntrospection(
        "https://other.example.com/path",
        "https://app.example.com"
      )
    ).toBe(false);
  });

  it("returns false for invalid URL", () => {
    expect(shouldAttemptIframeIntrospection("not a url", "https://app.example.com")).toBe(
      false
    );
  });
});
