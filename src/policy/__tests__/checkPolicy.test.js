const policy = require('../checkPolicy');

test('checkContextBudget denies when over max tokens', async () => {
  const max = Number(process.env.SINTRA_CONTEXT_MAX_TOKENS || 64000);
  const res = await policy.checkContextBudget({ contextMode: 'full', estimatedTokens: max + 1 });
  expect(res.allowed).toBe(false);
});

test('checkContextBudget denies when SINTRA_CONTEXT_MAX_TOKENS is invalid', async () => {
  const res = await policy.checkContextBudget(
    { contextMode: 'full', estimatedTokens: 100 },
    { SINTRA_CONTEXT_MAX_TOKENS: 'banana' }
  );
  expect(res.allowed).toBe(false);
});
