# Demo Deck

## Why this exists
- Proves bullet splitting
- Proves auto sections
- Proves code + table detection

## A big bullet list (should split)
- Bullet 1: This is intentionally long to verify clamp and split behavior.
- Bullet 2: Another bullet.
- Bullet 3: Another bullet.
- Bullet 4: Another bullet.
- Bullet 5: Another bullet.
- Bullet 6: Another bullet.
- Bullet 7: Another bullet.
- Bullet 8: Another bullet.
- Bullet 9: Another bullet.
- Bullet 10: Another bullet.
- Bullet 11: Another bullet.

```ts
type Refusal = { type: "REFUSE"; code: string; message: string };
export const r: Refusal = { type: "REFUSE", code: "TEST", message: "Hello" };
```

| Feature       | Expectation    |
| ------------- | -------------- |
| Split bullets | multiple cards |
| Code blocks   | code card      |
| Tables        | table card     |

## Closing

This should trigger at least one auto section divider after a few content cards.
