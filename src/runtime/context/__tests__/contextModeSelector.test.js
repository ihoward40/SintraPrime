const selector = require("../contextModeSelector");

test("selectContextMode picks full for small prompt", async () => {
  const res = await selector.selectContextMode({ prompt: "short prompt", attachedContext: [] });
  expect(res).toBe("full");
});

test("selectContextMode falls back to minimal for enormous input", async () => {
  const huge = "x".repeat(1000000); // 1M chars -> large tokens
  const res = await selector.selectContextMode({ prompt: huge, attachedContext: [huge, huge] });
  expect(res).toBe("minimal");
});
