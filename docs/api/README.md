# API Documentation

## Overview

SintraPrime provides multiple APIs for different components:

- **Airlock Server API** - HMAC-verified webhook gateway
- **Monitoring API** - Credit forensics and alerting
- **CLI API** - Command-line interface

## Airlock Server API

### POST /manus/webhook

Receives HMAC-verified payloads from automation scripts.

**Headers:**

- `x-manus-timestamp`: Unix timestamp (seconds)
- `x-manus-signature`: HMAC-SHA256 signature

**Request:**

```json
{
  "task_id": "string",
  "task_title": "string",
  "portal": "string",
  "no_submit_pay": true,
  "files": [
    {
      "name": "string",
      "mime": "string",
      "bytes": 12345,
      "sha256": "abc123...",
      "data_b64": "base64-encoded-data"
    }
  ]
}
```

**Response:** 200 OK

```json
{
  "status": "forwarded",
  "task_id": "string"
}
```

### GET /health

Health check endpoint.

**Response:** 200 OK

```json
{
  "status": "healthy",
  "service": "sintraprime-airlock",
  "version": "1.1.0",
  "timestamp": "ISO-8601"
}
```

## Monitoring API

### SeverityClassifier

```typescript
import { SeverityClassifier } from './monitoring/severityClassifier.js';

const classifier = new SeverityClassifier(policy);
const result = classifier.classify(run);
```

### RunLogger

```typescript
import { RunLogger } from './monitoring/runLogger.js';

const logger = new RunLogger();
const runDir = await logger.logRun(runRecord);
```

### CaseManager

```typescript
import { CaseManager } from './monitoring/caseManager.js';

const manager = new CaseManager();
const caseRecord = manager.createCase(runRecord);
```

## CLI Commands

```bash
# Testing
npm test
npm run test:watch
npm run test:coverage

# Code Quality
npm run lint
npm run format
npm run typecheck

# Build
npm run build
npm run dev

# Smoke Tests
npm run smoke:vectors

# DeepThink
npm run deepthink

# Signing
npm run sign:run -- --run runs/DEEPTHINK_<id>
```

## Security

### HMAC Signature Verification

All webhook requests require valid HMAC signatures:

```bash
TIMESTAMP=$(date +%s)
SIGNATURE=$(echo -n "${TIMESTAMP}.${PAYLOAD}" | openssl dgst -sha256 -hmac "$SECRET")
```

### SHA-256 File Integrity

All files include SHA-256 hashes for verification.

## Support

- Issues: [GitHub Issues](https://github.com/ihoward40/SintraPrime/issues)
- Security: See [SECURITY.md](../../SECURITY.md)
