import test from "node:test";
import assert from "node:assert/strict";

import { parseDuckDuckGoInstantAnswerResults } from "../../src/browser/webSearch/duckduckgoInstantAnswer.js";

test("parseDuckDuckGoInstantAnswerResults flattens related topics", () => {
  const res = parseDuckDuckGoInstantAnswerResults({
    query: "example",
    maxResults: 10,
    json: {
      Heading: "Example",
      AbstractText: "Abstract",
      AbstractURL: "https://example.com/abstract",
      RelatedTopics: [
        { Text: "A", FirstURL: "https://example.com/a" },
        {
          Name: "Group",
          Topics: [
            { Text: "B", FirstURL: "https://example.com/b" },
            { Text: "C", FirstURL: "https://example.com/c" },
          ],
        },
      ],
    },
  });

  assert.equal(res.provider, "duckduckgo_instant_answer");
  assert.equal(res.partial, false);
  assert.equal(res.results.length, 4);
  assert.equal(res.results[0]?.url, "https://example.com/abstract");
  assert.ok(res.warnings.some((w) => w.includes("not full web search")));
  assert.equal(typeof res.rawSha256, "string");
  assert.equal(res.rawSha256?.length, 64);
});

test("parseDuckDuckGoInstantAnswerResults returns partial on bad shape", () => {
  const res = parseDuckDuckGoInstantAnswerResults({ query: "x", maxResults: 5, json: "not-json" });
  assert.equal(res.partial, true);
  assert.equal(res.results.length, 0);
  assert.ok(res.warnings.length >= 1);
});
