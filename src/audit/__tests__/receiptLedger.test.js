const ledger = require('../../audit/receiptLedger');

test('writeReceipt stores a receipt with context fields', () => {
  const r = { runId: 'r1', command: 'echo hi', startedAt: new Date().toISOString(), context_mode: 'full', context_tokens_estimate: 123 };
  ledger.writeReceipt(r);
  const list = ledger.listReceipts();
  expect(list.length).toBeGreaterThanOrEqual(1);
  expect(list[0].runId).toBe('r1');
  expect(list[0].context_mode).toBe('full');
});
