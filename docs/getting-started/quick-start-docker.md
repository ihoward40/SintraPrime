---
sidebar_position: 3
title: Quick Start (Docker)
description: Get SintraPrime running with Docker in under 5 minutes.
---

# Quick Start — Docker

This is the fastest path to a running SintraPrime instance. You will have all services operational in under 5 minutes.

## Step 1: Clone and Configure

```bash
git clone https://github.com/ihoward40/SintraPrime.git
cd SintraPrime

# Copy the Docker environment template
cp .env.docker.example .env.docker
```

Edit `.env.docker` with your API keys:

```bash title=".env.docker"
# AI Provider (at least one required)
OPENAI_API_KEY=sk-your-key-here

# Database
MYSQL_ROOT_PASSWORD=your-secure-password
MYSQL_DATABASE=sintraprime

# Airlock Server
AIRLOCK_PORT=3100
AIRLOCK_HMAC_SECRET=your-hmac-secret

# Governance
GOVERNANCE_MODE=SINGLE_RUN_APPROVED
```

## Step 2: Launch Services

```bash
docker-compose -f docker-compose.full.yml up -d
```

This starts five services:

| Service | Port | Description |
|:---|:---|:---|
| **airlock** | 3100 | ManusLite Gateway — secure payload entry point |
| **brain** | 3000 | Core orchestrator — agent engine and governance |
| **fastapi** | 8000 | Python API for ML/AI integrations |
| **webapp** | 5173 | Operator dashboard UI |
| **mysql** | 3306 | Persistent data store |

## Step 3: Verify Health

```bash
# Check all containers are running
docker-compose -f docker-compose.full.yml ps

# Check Airlock health
curl http://localhost:3100/health

# Check Brain health
curl http://localhost:3000/health

# Check WebApp
open http://localhost:5173
```

Expected output:

```json
{
  "status": "healthy",
  "version": "2.0.0",
  "services": {
    "brain": "up",
    "airlock": "up",
    "fastapi": "up",
    "mysql": "connected"
  }
}
```

## Step 4: Run Your First Task

Send a test payload to the Airlock:

```bash
curl -X POST http://localhost:3100/api/v1/task \
  -H "Content-Type: application/json" \
  -H "X-HMAC-Signature: $(echo -n '{"task":"hello"}' | openssl dgst -sha256 -hmac 'your-hmac-secret' | awk '{print $2}')" \
  -d '{"task": "hello", "mode": "SINGLE_RUN_APPROVED"}'
```

## Step 5: View Logs

```bash
# All services
docker-compose -f docker-compose.full.yml logs -f

# Specific service
docker-compose -f docker-compose.full.yml logs -f brain

# View receipts
docker-compose -f docker-compose.full.yml exec brain cat /app/receipts/latest.json
```

:::tip Production Deployment
For production deployments, see the [Deployment Guide](../deployment/overview) which covers TLS termination, resource limits, backup strategies, and monitoring.
:::

## Stopping Services

```bash
# Stop all services
docker-compose -f docker-compose.full.yml down

# Stop and remove volumes (destroys data)
docker-compose -f docker-compose.full.yml down -v
```

## Troubleshooting

| Issue | Solution |
|:---|:---|
| Port conflict on 3100 | Change `AIRLOCK_PORT` in `.env.docker` |
| MySQL connection refused | Wait 30 seconds for MySQL to initialize |
| Brain fails to start | Check `OPENAI_API_KEY` is set correctly |
| Permission denied | Run `sudo usermod -aG docker $USER` and re-login |

## Next Steps

- [Configuration Reference](./configuration) — Customize your deployment
- [Architecture Overview](../core-concepts/architecture-overview) — Understand the system design
- [Agent Mode Engine](../core-concepts/agent-mode-engine) — Submit your first real task
