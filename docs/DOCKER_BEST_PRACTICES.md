# Docker Best Practices Guide

This guide documents best practices for managing the SintraPrime Docker deployment in production environments.

## Container Management Guidelines

### Image Management

#### Versioning and Tagging
```bash
# Always tag images with explicit versions
docker build -t sintraprime/brain:1.1.0 .
docker build -t sintraprime/brain:latest .

# Use semantic versioning
# Major.Minor.Patch (e.g., 1.2.3)
# - Major: Breaking changes
# - Minor: New features, backwards compatible
# - Patch: Bug fixes
```

#### Image Security
- **Use minimal base images** (alpine, distroless)
- **Scan images regularly** for vulnerabilities
  ```bash
  # Using Docker Scout
  docker scout cves sintraprime/brain:1.1.0
  
  # Using Trivy
  trivy image sintraprime/brain:1.1.0
  ```
- **Don't run as root** - use non-privileged users
  ```dockerfile
  # In Dockerfile
  USER node:node
  ```
- **Use multi-stage builds** to minimize attack surface

#### Registry Management
```bash
# Push to private registry
docker tag sintraprime/brain:1.1.0 registry.example.com/sintraprime/brain:1.1.0
docker push registry.example.com/sintraprime/brain:1.1.0

# Pull from specific registry
docker pull registry.example.com/sintraprime/brain:1.1.0
```

### Container Lifecycle

#### Graceful Shutdown
Ensure containers handle SIGTERM gracefully:

```javascript
// Node.js example
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  
  // Close database connections
  await db.close();
  
  // Close server
  server.close(() => {
    process.exit(0);
  });
  
  // Force exit after 30 seconds
  setTimeout(() => {
    console.error('Force exit after timeout');
    process.exit(1);
  }, 30000);
});
```

Configure appropriate stop grace period in docker-compose.yml:
```yaml
services:
  brain:
    stop_grace_period: 30s
```

#### Restart Policies
```yaml
services:
  brain:
    restart: unless-stopped  # Recommended for production
    # Other options:
    # - no: Never restart
    # - always: Always restart
    # - on-failure: Only on non-zero exit
```

## Health Check Configuration

### Application-Level Health Checks

Implement comprehensive health checks that verify:
1. **Service is running** - Basic liveness
2. **Dependencies are reachable** - Database, external APIs
3. **Service is ready** - Initialization complete

```javascript
// Express.js example
app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  };
  
  try {
    // Check database
    await db.ping();
    health.dependencies = { database: 'connected' };
    
    res.status(200).json(health);
  } catch (error) {
    health.status = 'degraded';
    health.error = error.message;
    res.status(503).json(health);
  }
});
```

### Docker Health Checks

Configure health checks in docker-compose.yml:

```yaml
services:
  brain:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8011/health"]
      interval: 30s      # Check every 30 seconds
      timeout: 10s       # Timeout after 10 seconds
      retries: 3         # Mark unhealthy after 3 failures
      start_period: 60s  # Grace period for startup
```

### Readiness vs Liveness

- **Liveness:** Is the service alive? (Restart if unhealthy)
- **Readiness:** Can the service handle requests? (Remove from load balancer if not ready)

```yaml
# Liveness check (Docker native)
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:8011/health"]
  
# Readiness check (application level)
# Return 503 from /health until fully initialized
```

## Resource Limits and Monitoring

### Setting Resource Limits

Always set memory and CPU limits to prevent resource exhaustion:

```yaml
services:
  brain:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
```

### Recommended Limits by Service

| Service  | CPU Limit | Memory Limit | CPU Reserve | Memory Reserve |
|----------|-----------|--------------|-------------|----------------|
| MySQL    | 2.0       | 2G           | 1.0         | 1G             |
| Airlock  | 1.0       | 512M         | 0.5         | 256M           |
| Brain    | 2.0       | 2G           | 1.0         | 1G             |
| FastAPI  | 2.0       | 2G           | 1.0         | 1G             |
| WebApp   | 0.5       | 256M         | 0.25        | 128M           |

### Monitoring Resource Usage

#### Real-Time Monitoring
```bash
# Monitor all containers
docker stats

# Monitor specific container
docker stats sintraprime_brain_1
```

#### Historical Metrics with Prometheus

Example prometheus.yml configuration:
```yaml
scrape_configs:
  - job_name: 'docker'
    static_configs:
      - targets: ['cadvisor:8080']
  
  - job_name: 'sintraprime'
    static_configs:
      - targets: 
        - 'airlock:3000'
        - 'brain:8011'
        - 'fastapi:8000'
```

#### Key Metrics to Monitor

1. **Container Health**
   - Up/down status
   - Restart count
   - Health check status

2. **Resource Usage**
   - CPU utilization (%)
   - Memory usage (absolute and %)
   - Network I/O
   - Disk I/O

3. **Application Metrics**
   - Request rate
   - Response time
   - Error rate
   - Queue depth

### Alerting Thresholds

Configure alerts for:
- Memory usage > 90% for 5 minutes
- CPU usage > 80% for 10 minutes
- Container restarts > 3 in 1 hour
- Health check failures
- Disk space < 10% free

## Log Management

### Logging Best Practices

#### Structured Logging
Use JSON format for easier parsing:

```javascript
// Good: Structured JSON
console.log(JSON.stringify({
  level: 'info',
  message: 'Request processed',
  requestId: '123',
  duration: 45,
  timestamp: new Date().toISOString()
}));

// Avoid: Unstructured strings
console.log('Request 123 processed in 45ms');
```

#### Log Levels
Use appropriate log levels:
- **ERROR** - Errors requiring immediate attention
- **WARN** - Warning conditions, degraded state
- **INFO** - Normal operational messages
- **DEBUG** - Detailed diagnostic information

```javascript
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3
};

function log(level, message, meta = {}) {
  if (levels[level] <= levels[process.env.LOG_LEVEL || 'info']) {
    console.log(JSON.stringify({
      level,
      message,
      ...meta,
      timestamp: new Date().toISOString()
    }));
  }
}
```

### Log Collection

#### Docker Logging Drivers

Configure logging driver in docker-compose.yml:

```yaml
services:
  brain:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"      # Max size per file
        max-file: "3"        # Keep 3 rotated files
        compress: "true"     # Compress rotated files
```

#### Centralized Logging with ELK Stack

Example configuration:
```yaml
services:
  filebeat:
    image: docker.elastic.co/beats/filebeat:8.0.0
    volumes:
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
      - ./filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
    depends_on:
      - elasticsearch
      
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.type=single-node
      
  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"
```

### Viewing Logs

```bash
# View all service logs
docker-compose logs

# Follow specific service
docker-compose logs -f brain

# View last 100 lines
docker-compose logs --tail=100 airlock

# View logs since timestamp
docker-compose logs --since 2026-02-17T10:00:00

# Search logs with grep
docker-compose logs brain | grep ERROR
```

## Backup and Restore Procedures

### Database Backups

#### Automated Daily Backups

```bash
#!/bin/bash
# backup-mysql.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mysql"
CONTAINER="sintraprime_mysql_1"

# Create backup directory
mkdir -p $BACKUP_DIR

# Dump database
docker-compose exec -T mysql mysqldump \
  -u root \
  -p${MYSQL_ROOT_PASSWORD} \
  --single-transaction \
  --routines \
  --triggers \
  sintraprime > ${BACKUP_DIR}/sintraprime_${DATE}.sql

# Compress
gzip ${BACKUP_DIR}/sintraprime_${DATE}.sql

# Keep only last 7 days
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: sintraprime_${DATE}.sql.gz"
```

Schedule with cron:
```cron
# Daily backup at 2 AM
0 2 * * * /path/to/backup-mysql.sh >> /var/log/mysql-backup.log 2>&1
```

#### Restore from Backup

```bash
#!/bin/bash
# restore-mysql.sh
BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  exit 1
fi

# Decompress if needed
if [[ $BACKUP_FILE == *.gz ]]; then
  gunzip -c $BACKUP_FILE > /tmp/restore.sql
  SQL_FILE=/tmp/restore.sql
else
  SQL_FILE=$BACKUP_FILE
fi

# Restore
docker-compose exec -T mysql mysql \
  -u root \
  -p${MYSQL_ROOT_PASSWORD} \
  sintraprime < $SQL_FILE

# Cleanup
rm -f /tmp/restore.sql

echo "Restore completed from: $BACKUP_FILE"
```

### Volume Backups

#### Backup Docker Volumes

```bash
#!/bin/bash
# backup-volumes.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/volumes"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup each volume
for volume in $(docker volume ls -q | grep sintraprime); do
  echo "Backing up volume: $volume"
  
  docker run --rm \
    -v $volume:/data \
    -v $BACKUP_DIR:/backup \
    alpine tar czf /backup/${volume}_${DATE}.tar.gz -C /data .
done

echo "Volume backups completed"
```

#### Restore Docker Volumes

```bash
#!/bin/bash
# restore-volumes.sh
BACKUP_FILE=$1
VOLUME_NAME=$2

if [ -z "$BACKUP_FILE" ] || [ -z "$VOLUME_NAME" ]; then
  echo "Usage: $0 <backup-file.tar.gz> <volume-name>"
  exit 1
fi

# Restore volume
docker run --rm \
  -v $VOLUME_NAME:/data \
  -v $(dirname $BACKUP_FILE):/backup \
  alpine tar xzf /backup/$(basename $BACKUP_FILE) -C /data

echo "Volume $VOLUME_NAME restored from $BACKUP_FILE"
```

### Configuration Backups

```bash
#!/bin/bash
# backup-config.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/config"

mkdir -p $BACKUP_DIR

# Backup docker-compose and environment
tar czf ${BACKUP_DIR}/config_${DATE}.tar.gz \
  docker-compose.yml \
  .env.docker \
  Dockerfile* \
  nginx.conf

echo "Configuration backup completed"
```

## Rollback Procedures

### Version Rollback

#### Quick Rollback to Previous Version

```bash
#!/bin/bash
# rollback.sh
PREVIOUS_VERSION=$1

if [ -z "$PREVIOUS_VERSION" ]; then
  echo "Usage: $0 <version>"
  echo "Example: $0 1.0.0"
  exit 1
fi

# Update image tags in docker-compose.yml
sed -i "s/:latest/:$PREVIOUS_VERSION/g" docker-compose.yml

# Pull previous images
docker-compose pull

# Restart services
docker-compose up -d

echo "Rolled back to version: $PREVIOUS_VERSION"
```

#### Blue-Green Deployment

```yaml
# docker-compose.blue.yml (current production)
services:
  brain:
    image: sintraprime/brain:1.0.0
    container_name: brain_blue
    # ... other config
    
# docker-compose.green.yml (new version)
services:
  brain:
    image: sintraprime/brain:1.1.0
    container_name: brain_green
    # ... other config
```

Deployment process:
```bash
# 1. Start green deployment
docker-compose -f docker-compose.green.yml up -d

# 2. Verify green is healthy
curl http://localhost:8012/health  # Green on different port

# 3. Switch traffic (update load balancer/proxy)
# Update nginx.conf to point to green

# 4. Stop blue deployment
docker-compose -f docker-compose.blue.yml down

# 5. If issues, rollback to blue
docker-compose -f docker-compose.blue.yml up -d
# Revert nginx.conf
```

### Database Rollback

⚠️ **Database rollbacks are high-risk operations**

#### Safe Rollback Strategy

1. **Always backup before changes**
   ```bash
   ./backup-mysql.sh
   ```

2. **Test restore in staging**
   ```bash
   ./restore-mysql.sh backups/mysql/sintraprime_20260217_120000.sql.gz
   ```

3. **Use transactions for schema changes**
   ```sql
   START TRANSACTION;
   
   -- Schema changes here
   ALTER TABLE runs ADD COLUMN new_field VARCHAR(255);
   
   -- Verify
   SELECT * FROM runs LIMIT 1;
   
   -- Commit or rollback
   COMMIT;
   -- Or: ROLLBACK;
   ```

4. **Keep migration scripts**
   ```bash
   migrations/
     001_add_new_field.up.sql
     001_add_new_field.down.sql
   ```

### Emergency Rollback Checklist

When critical issues occur:

- [ ] **Stop all services**
  ```bash
  docker-compose down
  ```

- [ ] **Verify backups exist**
  ```bash
  ls -lh /backups/mysql/
  ls -lh /backups/volumes/
  ```

- [ ] **Restore database from backup**
  ```bash
  ./restore-mysql.sh /backups/mysql/sintraprime_YYYYMMDD_HHMMSS.sql.gz
  ```

- [ ] **Restore volumes if needed**
  ```bash
  ./restore-volumes.sh /backups/volumes/VOLUME_YYYYMMDD_HHMMSS.tar.gz VOLUME_NAME
  ```

- [ ] **Rollback to previous version**
  ```bash
  ./rollback.sh 1.0.0
  ```

- [ ] **Verify health checks**
  ```bash
  ./scripts/health-check-all.sh
  ```

- [ ] **Document incident**
  - What failed?
  - What was the root cause?
  - What was restored?
  - How long was downtime?

## Performance Optimization

### Container Optimization

1. **Use .dockerignore**
   ```
   node_modules
   npm-debug.log
   .git
   .env*
   *.md
   tests
   ```

2. **Minimize layers**
   ```dockerfile
   # Bad: Multiple layers
   RUN npm install express
   RUN npm install dotenv
   RUN npm install mysql2
   
   # Good: Single layer
   RUN npm install express dotenv mysql2
   ```

3. **Cache dependencies**
   ```dockerfile
   # Copy package files first
   COPY package*.json ./
   RUN npm ci --only=production
   
   # Copy source code after (changes more frequently)
   COPY . .
   ```

### Network Optimization

1. **Use Docker networks**
   ```yaml
   networks:
     frontend:
       driver: bridge
     backend:
       driver: bridge
       internal: true  # No external access
   
   services:
     webapp:
       networks:
         - frontend
     brain:
       networks:
         - frontend
         - backend
     mysql:
       networks:
         - backend  # Only accessible from backend network
   ```

2. **Enable HTTP/2**
   ```nginx
   listen 443 ssl http2;
   ```

3. **Use connection pooling**
   ```javascript
   // MySQL connection pool
   const pool = mysql.createPool({
     host: 'mysql',
     user: 'sintraprime_user',
     password: process.env.MYSQL_PASSWORD,
     database: 'sintraprime',
     connectionLimit: 10,
     queueLimit: 0
   });
   ```

## Security Hardening

### Secrets Management

1. **Never commit secrets**
   - Use `.env.docker` (git-ignored)
   - Use Docker secrets (Swarm mode)
   - Use external secret managers (Vault, AWS Secrets Manager)

2. **Docker Secrets (Swarm Mode)**
   ```bash
   # Create secret
   echo "my_secret_password" | docker secret create mysql_root_password -
   
   # Use in stack file
   services:
     mysql:
       secrets:
         - mysql_root_password
   
   secrets:
     mysql_root_password:
       external: true
   ```

3. **Rotate secrets regularly**
   ```bash
   # Update MySQL password
   docker-compose exec mysql mysql -u root -p -e \
     "ALTER USER 'sintraprime_user'@'%' IDENTIFIED BY 'new_password';"
   
   # Update .env.docker
   # Restart services
   docker-compose restart brain fastapi
   ```

### Network Security

1. **Use internal networks**
   ```yaml
   networks:
     internal:
       internal: true  # No external access
   ```

2. **Limit exposed ports**
   ```yaml
   # Expose only what's necessary
   ports:
     - "127.0.0.1:3306:3306"  # Bind to localhost only
   ```

3. **Use TLS for external endpoints**
   ```yaml
   services:
     nginx:
       volumes:
         - ./ssl:/etc/nginx/ssl:ro
   ```

### Container Security

1. **Run as non-root**
   ```dockerfile
   USER node:node
   ```

2. **Read-only filesystem**
   ```yaml
   services:
     brain:
       read_only: true
       tmpfs:
         - /tmp
   ```

3. **Drop capabilities**
   ```yaml
   services:
     brain:
       cap_drop:
         - ALL
       cap_add:
         - NET_BIND_SERVICE
   ```

## Related Documentation

- [DOCKER_DEPLOYMENT.md](../DOCKER_DEPLOYMENT.md) - Deployment guide
- [OPERATOR_RUNBOOK.md](../OPERATOR_RUNBOOK.md) - Operational procedures
- [docs/snapshots/phase3-baseline/](snapshots/phase3-baseline/) - Baseline metrics

## Maintenance Schedule

Recommended maintenance tasks:

| Task                    | Frequency | Command                              |
|-------------------------|-----------|--------------------------------------|
| Database backup         | Daily     | `./backup-mysql.sh`                  |
| Volume backup           | Weekly    | `./backup-volumes.sh`                |
| Log rotation            | Daily     | Automatic (Docker logging driver)    |
| Image updates           | Monthly   | `docker-compose pull && docker-compose up -d` |
| Security scan           | Weekly    | `docker scout cves <image>`          |
| Disk cleanup            | Weekly    | `docker system prune -a`             |
| Health check review     | Daily     | `docker-compose ps`                  |
| Resource usage review   | Daily     | `docker stats`                       |
