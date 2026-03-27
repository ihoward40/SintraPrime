const policy = require('../checkPolicy');

test('checkContextBudget denies when over max tokens', async () => {
  const max = Number(process.env.SINTRA_CONTEXT_MAX_TOKENS || 64000);
  const res = await policy.checkContextBudget({ contextMode: 'full', estimatedTokens: max + 1 });
  expect(res.allowed).toBe(false);
});
