# SintraPrime — Phase 3 Docker Deployment (Local)

## Files
- `docker-compose.full.yml` — MySQL + Airlock + Brain + FastAPI + Webapp
- `.env.docker.example` — template (copy to `.env.docker`)
- `start-docker.ps1`, `stop-docker.ps1`, `logs-docker.ps1` — helpers
- `verify-deployment.ps1` — health verification

## Quick start
1) Create an env file:

- Copy `.env.docker.example` → `.env.docker`
- Edit secrets and webhook URLs in `.env.docker`

2) Build + start:

- `powershell -NoProfile -ExecutionPolicy Bypass -File .\start-docker.ps1`

Equivalent manual command:

- `docker compose --env-file .env.docker -f docker-compose.full.yml up -d --build`

3) Verify health:

- `powershell -NoProfile -ExecutionPolicy Bypass -File .\verify-deployment.ps1`

## Endpoints (host)
- Airlock: `http://localhost:3000/health`
- Brain: `http://localhost:8011/health`
- FastAPI: `http://localhost:8000/health`
- Webapp: `http://localhost:3002/api/sintraInfra/health`

## Notes
- Inside Docker, the webapp is wired to service DNS names (`airlock`, `brain`, `fastapi`, `mysql`).
- If you already have local services running on these ports, stop them first or the containers won’t be able to bind.
