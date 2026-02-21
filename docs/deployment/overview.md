---
sidebar_position: 1
title: Deployment Overview
description: Deployment options and strategies for SintraPrime in production environments.
---

# Deployment Overview

SintraPrime supports multiple deployment strategies, from single-server Docker Compose to multi-node orchestrated deployments. This guide covers the available options and best practices for production deployments.

## Deployment Options

| Option | Best For | Complexity |
|:---|:---|:---|
| **Docker Compose** | Single server, small teams | Low |
| **Docker Compose (Full)** | Single server, all services | Medium |
| **Manual** | Custom environments, development | Medium |
| **Kubernetes** | Multi-node, enterprise | High |

## Docker Compose Deployment

The recommended production deployment uses `docker-compose.full.yml`:

```bash
# Production deployment
cp .env.docker.example .env.docker
# Edit .env.docker with production values

docker-compose -f docker-compose.full.yml up -d
```

### Services

| Service | Image | Port | Resources |
|:---|:---|:---|:---|
| **airlock** | `sintraprime/airlock` | 3100 | 512MB RAM, 0.5 CPU |
| **brain** | `sintraprime/brain` | 3000 | 2GB RAM, 2 CPU |
| **fastapi** | `sintraprime/fastapi` | 8000 | 1GB RAM, 1 CPU |
| **webapp** | `sintraprime/webapp` | 5173 | 512MB RAM, 0.5 CPU |
| **mysql** | `mysql:8.0` | 3306 | 2GB RAM, 1 CPU |

### Production Configuration

```yaml title="docker-compose.full.yml (production overrides)"
services:
  brain:
    restart: always
    deploy:
      resources:
        limits:
          memory: 4G
          cpus: '2.0'
    environment:
      - NODE_ENV=production
      - LOG_LEVEL=info

  mysql:
    restart: always
    volumes:
      - mysql_data:/var/lib/mysql
    deploy:
      resources:
        limits:
          memory: 4G
```

## Security Hardening

### TLS Termination

Use a reverse proxy (nginx, Caddy, or Traefik) for TLS:

```nginx title="nginx.conf"
server {
    listen 443 ssl;
    server_name sintraprime.example.com;

    ssl_certificate /etc/ssl/certs/sintraprime.crt;
    ssl_certificate_key /etc/ssl/private/sintraprime.key;

    location / {
        proxy_pass http://localhost:3100;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Firewall Rules

```bash
# Allow only necessary ports
sudo ufw allow 443/tcp    # HTTPS
sudo ufw allow 22/tcp     # SSH
sudo ufw deny 3000/tcp    # Block direct Brain access
sudo ufw deny 3100/tcp    # Block direct Airlock access (use nginx)
sudo ufw deny 3306/tcp    # Block direct MySQL access
```

## Backup Strategy

### Database Backup

```bash
# Automated daily backup
docker-compose exec mysql mysqldump -u root -p sintraprime > backup_$(date +%Y%m%d).sql

# Restore from backup
docker-compose exec -i mysql mysql -u root -p sintraprime < backup_20260220.sql
```

### Receipt Backup

```bash
# Backup receipt files
tar -czf receipts_backup_$(date +%Y%m%d).tar.gz receipts/

# Backup evidence files
tar -czf evidence_backup_$(date +%Y%m%d).tar.gz evidence/
```

## Monitoring

### Health Checks

```bash
# Check all services
curl http://localhost:3100/health  # Airlock
curl http://localhost:3000/health  # Brain
curl http://localhost:8000/health  # FastAPI
curl http://localhost:5173         # WebApp
```

### Log Management

```bash
# View logs
docker-compose logs -f --tail=100

# Export logs
docker-compose logs --no-color > sintraprime_logs_$(date +%Y%m%d).txt
```

:::warning Production Checklist
Before deploying to production, ensure:
- All API keys are set to production values
- HMAC secrets are unique and strong
- TLS is configured for all external endpoints
- Database backups are automated
- Monitoring and alerting are configured
- Governance mode is set appropriately
- Receipt signing keys are generated and secured
:::

## Next Steps

- [Quick Start (Docker)](../getting-started/quick-start-docker) — Initial Docker setup
- [Configuration Reference](../getting-started/configuration) — All configuration options
- [Architecture Overview](../core-concepts/architecture-overview) — System design
