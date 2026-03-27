const bm = require("../budgetManager");

test("estimateTokens should approximate token counts", () => {
  const text = "a".repeat(400); // ~100 tokens by 1 token ~=4 chars
  const est = bm.estimateTokens(text);
  expect(est).toBeGreaterThanOrEqual(90);
  expect(est).toBeLessThanOrEqual(110);
});

test("decideModeByTokenCount returns modes for thresholds", () => {
  const cfg = bm.getBudgetConfig();
  const small = Math.max(1, Math.floor(cfg.summaryTrigger / 2));
  const medium = Math.floor((cfg.summaryTrigger + cfg.compressTrigger) / 2);
  const large = Math.floor((cfg.compressTrigger + cfg.maxTokens) / 2);

  expect(bm.decideModeByTokenCount(small)).toBe("full");
  expect(bm.decideModeByTokenCount(medium)).toBe("summarized");
  expect(bm.decideModeByTokenCount(large)).toBe("retrieval_augmented");
});
