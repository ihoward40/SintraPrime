---
sidebar_position: 1
title: API Reference
description: Complete API reference for SintraPrime's Airlock Server and Brain Service endpoints.
---

# API Reference

SintraPrime exposes two primary API surfaces: the **Airlock Server** (external-facing gateway) and the **Brain Service** (internal orchestrator). All external interactions should go through the Airlock Server.

## Airlock Server API

Base URL: `http://localhost:3100`

### Authentication

All Airlock requests require HMAC-SHA256 authentication:

```bash
# Generate HMAC signature
SIGNATURE=$(echo -n "${REQUEST_BODY}" | openssl dgst -sha256 -hmac "${AIRLOCK_HMAC_SECRET}" | awk '{print $2}')

# Include in request header
curl -X POST http://localhost:3100/api/v1/task \
  -H "Content-Type: application/json" \
  -H "X-HMAC-Signature: ${SIGNATURE}" \
  -d "${REQUEST_BODY}"
```

### Endpoints

#### POST /api/v1/task

Submit a task for agent execution.

**Request:**

```json
{
  "task": "Send weekly report via email",
  "agent": "general-purpose-agent",
  "mode": "SINGLE_RUN_APPROVED",
  "params": {
    "to": "team@example.com",
    "subject": "Weekly Report"
  }
}
```

**Response:**

```json
{
  "task_id": "task_a1b2c3d4",
  "status": "accepted",
  "receipt_id": "rcpt_e5f6g7h8",
  "estimated_duration": 30
}
```

#### POST /api/v1/workflow

Execute a workflow.

**Request:**

```json
{
  "workflow": "evidence-collection",
  "params": {
    "since": "7d"
  }
}
```

#### GET /api/v1/status

Get system status.

**Response:**

```json
{
  "status": "healthy",
  "version": "2.0.0",
  "governance_mode": "SINGLE_RUN_APPROVED",
  "active_tasks": 0,
  "services": {
    "brain": "up",
    "fastapi": "up",
    "mysql": "connected"
  }
}
```

#### GET /api/v1/receipts

List recent receipts.

**Query Parameters:**

| Parameter | Type | Default | Description |
|:---|:---|:---|:---|
| `limit` | integer | 20 | Number of receipts to return |
| `offset` | integer | 0 | Pagination offset |
| `type` | string | — | Filter by receipt type |
| `since` | string | — | Filter by timestamp (ISO 8601) |

#### GET /api/v1/receipts/:id

Get a specific receipt.

#### POST /api/v1/receipts/verify

Verify a receipt or receipt chain.

**Request:**

```json
{
  "receipt_id": "rcpt_a1b2c3d4",
  "verify_chain": true
}
```

#### GET /api/v1/evidence

List evidence items.

#### GET /api/v1/evidence/:id

Get a specific evidence item with metadata.

#### POST /api/v1/webhook

Receive external webhook payloads (Make.com, Slack, etc.).

#### GET /health

Health check endpoint (no authentication required).

## Brain Service API (Internal)

Base URL: `http://localhost:3000`

:::warning Internal API
The Brain Service API is intended for internal service-to-service communication only. Do not expose it externally. Use the Airlock Server for all external interactions.
:::

### Key Internal Endpoints

| Endpoint | Method | Description |
|:---|:---|:---|
| `/agent/execute` | POST | Execute an agent task |
| `/agent/plan` | POST | Generate an execution plan |
| `/workflow/run` | POST | Run a workflow |
| `/governance/mode` | GET/PUT | Get or set governance mode |
| `/governance/gates` | GET | List policy gates |
| `/receipts/generate` | POST | Generate a receipt |
| `/receipts/chain/verify` | POST | Verify receipt chain |
| `/evidence/ingest` | POST | Ingest evidence |
| `/evidence/timeline/build` | POST | Build a timeline |

## Error Responses

All API errors follow a consistent format:

```json
{
  "error": {
    "code": "GOVERNANCE_DENIED",
    "message": "Operation denied: system is in READ_ONLY mode",
    "receipt_id": "rcpt_denial_a1b2c3",
    "details": {
      "current_mode": "READ_ONLY",
      "required_mode": "SINGLE_RUN_APPROVED"
    }
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|:---|:---|:---|
| `INVALID_HMAC` | 401 | HMAC signature verification failed |
| `RATE_LIMITED` | 429 | Request rate limit exceeded |
| `GOVERNANCE_DENIED` | 403 | Governance policy denied the operation |
| `VALIDATION_FAILED` | 400 | Request validation failed |
| `AGENT_NOT_FOUND` | 404 | Specified agent not found |
| `TASK_TIMEOUT` | 408 | Task execution timed out |
| `INTERNAL_ERROR` | 500 | Internal server error |

## SDKs and Client Libraries

SintraPrime provides a TypeScript client library:

```typescript
import { SintraPrimeClient } from '@sintraprime/client';

const client = new SintraPrimeClient({
  endpoint: 'http://localhost:3100',
  hmacSecret: process.env.AIRLOCK_HMAC_SECRET,
});

// Submit a task
const result = await client.submitTask({
  task: 'Check system status',
  agent: 'general-purpose-agent',
});

// Verify a receipt
const verification = await client.verifyReceipt('rcpt_a1b2c3d4');
```

## Next Steps

- [Architecture Overview](../core-concepts/architecture-overview) — System design
- [Quick Start (Docker)](../getting-started/quick-start-docker) — Get started
- [Configuration Reference](../getting-started/configuration) — API configuration
