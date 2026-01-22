# Make.com Webhook Consolidation (SintraPrime)

Goal: collapse many Make webhooks into **three** signed endpoints.

## Endpoints

- `POST /sintra/gateway`
  - Unified inbound router for most events.
- `POST /sintra/log`
  - Secure log ingest (append-only jsonl under `runs/ingest/`).
- `POST /tiktok/bridge`
  - Optional TikTok high-velocity ingress.

These routes are implemented in `ui/routes/webhooks.routes.js`.

## Required headers (HMAC)

Each request must include:

- `X-Sintra-Timestamp`: unix seconds (e.g. `1737456000`)
- `X-Sintra-Signature`: `sha256=<hex>` where `<hex>` is HMAC-SHA256 of `${timestamp}.${rawBody}`
- `X-Sintra-Nonce`: optional random nonce (enables replay protection)

Set secrets in `control/secrets.env`:

- `SINTRA_GATEWAY_SECRET`
- `SINTRA_LOG_SECRET`
- `TIKTOK_BRIDGE_SECRET`

## Make scenario payload shape

The gateway tries to read:

- `type` (preferred) or `kind` or `event`
- `payload` (optional) — if absent, the entire body is used

It always emits:

- `sintra.gateway` with `{ type, payload, receivedAt, ip }`

If `SINTRA_GATEWAY_EMIT_TYPED_EVENTS=1` (default), it also emits `eventBus.emit(type, payload)`.

## Migration checklist

1) Pick which existing Make webhooks map to:
   - gateway
   - log ingest
   - tiktok bridge
2) Create 1 new Make custom webhook per endpoint (or use HTTP module to call the router directly).
3) Update scenarios to send:
   - JSON body with `type` and `payload`
   - the 3 signature headers
4) Disable/delete the old webhooks once the new ones are confirmed.

## Local testing

Set `SINTRA_WEBHOOK_ALLOW_UNVERIFIED=1` for local dev only.

To generate valid headers for a payload locally:

- Human-readable:
  - `node scripts/make-signature-example.mjs <secret> '{"type":"sintra.test","payload":{"hello":"world"}}'`
- Machine-readable JSON:
  - `node scripts/make-signature-example.mjs <secret> .\\payload.json --json`
