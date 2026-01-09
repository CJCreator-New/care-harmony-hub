# CareSync HMS Deployment Operations

## Overview

This document outlines the deployment operations for the CareSync Hospital Management System, including multi-environment setup, deployment automation, and operational procedures.

## Table of Contents

1. [Environment Architecture](#architecture)
2. [Environment Configuration](#configuration)
3. [Deployment Automation](#automation)
4. [Release Management](#release)
5. [Monitoring and Alerting](#monitoring)
6. [Backup and Recovery](#backup)
7. [Disaster Recovery](#disaster)
8. [Scaling Operations](#scaling)

---

## Environment Architecture

### Environment Overview

CareSync HMS uses a multi-environment architecture to ensure safe development, testing, and production operations.

#### Development Environment (DEV)
- **Purpose**: Active development and feature implementation
- **Access**: Development team only
- **Data**: Synthetic/test data only
- **Uptime**: Business hours only
- **Backup**: Daily backups, 30-day retention

#### Testing Environment (TEST)
- **Purpose**: Quality assurance and user acceptance testing
- **Access**: QA team and select stakeholders
- **Data**: Production-like test data (anonymized)
- **Uptime**: Business hours + extended testing windows
- **Backup**: Daily backups, 90-day retention

#### Staging Environment (STAGING)
- **Purpose**: Pre-production validation and final testing
- **Access**: Technical teams and product owners
- **Data**: Recent production backup (anonymized)
- **Uptime**: 24/7 for monitoring
- **Backup**: Daily backups, 90-day retention

#### Production Environment (PROD)
- **Purpose**: Live system serving end users
- **Access**: Authorized hospital staff and patients
- **Data**: Live production data
- **Uptime**: 99.9% SLA (24/7)
- **Backup**: Hourly transaction logs, daily full backups, 7-year retention

### Infrastructure Components

#### Application Layer
```
Load Balancer (AWS ALB/NGINX)
├── Web Servers (Node.js/React)
├── API Servers (Node.js/Express)
└── Background Workers (Node.js/Queue)
```

#### Data Layer
```
Primary Database (PostgreSQL)
├── Read Replicas (3x)
├── Backup Server
└── Analytics Database (Optional)
```

#### Supporting Services
```
Redis Cache Cluster
├── Session Store
├── Application Cache
└── Queue Management

File Storage (S3/Cloud Storage)
├── Documents
├── Images
└── Backups

Monitoring Stack
├── Application Metrics (Prometheus)
├── Logs (ELK Stack)
└── Alerts (PagerDuty/OpsGenie)
```

---

## Environment Configuration

### Configuration Management

#### Environment Variables

Create `.env` files for each environment:

**Development (.env.dev)**
```bash
NODE_ENV=development
DATABASE_URL=postgresql://user:pass@localhost:5432/caresync_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev_jwt_secret_key_here
API_BASE_URL=http://localhost:3001
FRONTEND_URL=http://localhost:3000
LOG_LEVEL=debug
```

**Production (.env.prod)**
```bash
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-db-host:5432/caresync_prod
REDIS_URL=redis://prod-redis-cluster:6379
JWT_SECRET=${JWT_SECRET}  # From secrets manager
API_BASE_URL=https://api.caresync.com
FRONTEND_URL=https://app.caresync.com
LOG_LEVEL=warn
ENABLE_HTTPS=true
SSL_CERT_PATH=/etc/ssl/certs/caresync.crt
SSL_KEY_PATH=/etc/ssl/private/caresync.key
```

#### Infrastructure as Code

Use Terraform for infrastructure provisioning:

**terraform/environments/dev/main.tf**
```hcl
module "caresync_dev" {
  source = "../../modules/caresync"

  environment = "dev"
  instance_count = 2
  instance_type = "t3.medium"
  database_instance_class = "db.t3.micro"

  # Development-specific settings
  enable_deletion_protection = false
  backup_retention_days = 7
}
```

**terraform/environments/prod/main.tf**
```hcl
module "caresync_prod" {
  source = "../../modules/caresync"

  environment = "prod"
  instance_count = 6
  instance_type = "t3.large"
  database_instance_class = "db.r5.large"

  # Production-specific settings
  enable_deletion_protection = true
  backup_retention_days = 30
  multi_az = true
}
```

### Secrets Management

#### AWS Secrets Manager Setup
```bash
# Create secrets
aws secretsmanager create-secret \
  --name caresync/prod/database \
  --secret-string '{"username":"admin","password":"secure_password"}'

aws secretsmanager create-secret \
  --name caresync/prod/jwt \
  --secret-string '{"secret":"jwt_secret_key"}'
```

#### Application Integration
```typescript
// config/secrets.ts
import { SecretsManager } from 'aws-sdk';

export async function getSecret(secretName: string) {
  const client = new SecretsManager();
  const response = await client.getSecretValue({ SecretId: secretName }).promise();
  return JSON.parse(response.SecretString);
}

// Usage in application
const dbSecrets = await getSecret('caresync/prod/database');
const jwtSecret = await getSecret('caresync/prod/jwt');
```

---

## Deployment Automation

### CI/CD Pipeline

#### GitHub Actions Workflow

**.github/workflows/deploy.yml**
```yaml
name: Deploy CareSync HMS

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Run tests
        run: npm run test:ci
      - name: Build application
        run: npm run build

  deploy-dev:
    needs: test
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Development
        run: |
          aws eks update-kubeconfig --name caresync-dev
          kubectl apply -f k8s/dev/
          kubectl rollout status deployment/caresync-app

  deploy-prod:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Production
        run: |
          aws eks update-kubeconfig --name caresync-prod
          kubectl apply -f k8s/prod/
          kubectl rollout status deployment/caresync-app
```

### Container Orchestration

#### Kubernetes Manifests

**k8s/base/deployment.yaml**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: caresync-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: caresync
  template:
    metadata:
      labels:
        app: caresync
    spec:
      containers:
      - name: caresync
        image: caresync/app:${TAG}
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: caresync-config
        - secretRef:
            name: caresync-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

**k8s/base/service.yaml**
```yaml
apiVersion: v1
kind: Service
metadata:
  name: caresync-service
spec:
  selector:
    app: caresync
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

#### Environment-Specific Overlays

**k8s/dev/kustomization.yaml**
```yaml
bases:
  - ../base

patchesStrategicMerge:
  - replicas.yaml

images:
  - name: caresync/app
    newTag: dev-${COMMIT_SHA}
```

**k8s/prod/kustomization.yaml**
```yaml
bases:
  - ../base

patchesStrategicMerge:
  - replicas.yaml
  - resources.yaml

images:
  - name: caresync/app
    newTag: prod-${COMMIT_SHA}
```

### Database Migrations

#### Migration Strategy
```bash
# Migration script structure
migrations/
├── 001_initial_schema.sql
├── 002_add_user_roles.sql
├── 003_add_appointments.sql
└── 004_add_audit_logs.sql
```

#### Automated Migration Deployment
```bash
#!/bin/bash
# deploy-migrations.sh

# Get list of applied migrations
APPLIED=$(psql $DATABASE_URL -t -c "SELECT name FROM migrations ORDER BY id")

# Get list of available migrations
AVAILABLE=$(ls migrations/*.sql | sort)

# Apply new migrations
for migration in $AVAILABLE; do
  filename=$(basename $migration)
  if ! echo "$APPLIED" | grep -q "$filename"; then
    echo "Applying migration: $filename"
    psql $DATABASE_URL -f $migration

    # Record migration
    psql $DATABASE_URL -c "INSERT INTO migrations (name, applied_at) VALUES ('$filename', NOW())"
  fi
done
```

---

## Release Management

### Release Process

#### Version Numbering
- **Format**: `MAJOR.MINOR.PATCH` (Semantic Versioning)
- **Major**: Breaking changes
- **Minor**: New features
- **Patch**: Bug fixes

#### Release Branches
```
main (production)
├── release/v2.1.0
├── release/v2.0.0
└── develop
    ├── feature/user-auth
    ├── feature/appointments
    └── bugfix/login-issue
```

#### Release Checklist
- [ ] Code complete and tested
- [ ] Documentation updated
- [ ] Database migrations prepared
- [ ] Rollback plan documented
- [ ] Deployment tested in staging
- [ ] Security review completed
- [ ] Performance benchmarks met
- [ ] User acceptance testing passed

### Rollback Procedures

#### Application Rollback
```bash
# Quick rollback to previous version
kubectl rollout undo deployment/caresync-app

# Rollback to specific version
kubectl rollout undo deployment/caresync-app --to-revision=2
```

#### Database Rollback
```bash
# Rollback migration
psql $DATABASE_URL -c "DELETE FROM migrations WHERE name = '004_add_audit_logs.sql'"

# Restore from backup if needed
pg_restore -d caresync_prod backup_file.dump
```

---

## Monitoring and Alerting

### Application Monitoring

#### Key Metrics to Monitor
```yaml
# Prometheus metrics
caresync_http_requests_total{status="200"}  # Request count by status
caresync_http_request_duration_seconds{quantile="0.95"}  # Response time p95
caresync_active_users  # Current active users
caresync_database_connections_active  # DB connection pool usage
caresync_queue_size  # Background job queue length
```

#### Health Check Endpoints
```typescript
// GET /health - Overall health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});

// GET /ready - Readiness probe
app.get('/ready', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({ status: 'ready' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});
```

### Alerting Rules

#### Critical Alerts
```yaml
# Alert on high error rate
- alert: HighErrorRate
  expr: rate(caresync_http_requests_total{status=~"5.."}[5m]) / rate(caresync_http_requests_total[5m]) > 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High error rate detected"
    description: "Error rate is {{ $value }}%"

# Alert on database connection issues
- alert: DatabaseDown
  expr: caresync_database_connections_active == 0
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Database is down"
    description: "No active database connections"
```

#### Warning Alerts
```yaml
# Alert on high response times
- alert: SlowResponseTime
  expr: histogram_quantile(0.95, rate(caresync_http_request_duration_seconds_bucket[5m])) > 5
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Slow response times detected"
    description: "95th percentile response time is {{ $value }}s"
```

### Log Management

#### Centralized Logging
```yaml
# Fluentd configuration
<match caresync.**>
  @type elasticsearch
  host elasticsearch.logging.svc.cluster.local
  port 9200
  logstash_format true
  logstash_prefix caresync
</match>
```

#### Log Levels
- **ERROR**: System errors requiring immediate attention
- **WARN**: Potential issues or unusual conditions
- **INFO**: General operational messages
- **DEBUG**: Detailed debugging information (dev only)

---

## Backup and Recovery

### Backup Strategy

#### Database Backups
```bash
# Daily full backup
pg_dump caresync_prod > backup_$(date +%Y%m%d).sql

# Hourly transaction log backup
pg_basebackup -D /backup/base -Ft -z -P

# Upload to S3
aws s3 cp backup_$(date +%Y%m%d).sql s3://caresync-backups/database/
```

#### Application Backups
```bash
# Configuration backup
tar -czf config_backup.tar.gz /etc/caresync/

# User uploaded files backup
aws s3 sync s3://caresync-uploads/ s3://caresync-backups/uploads/
```

### Recovery Procedures

#### Point-in-Time Recovery
```bash
# Stop application
kubectl scale deployment caresync-app --replicas=0

# Restore base backup
pg_restore -d caresync_recovery backup_base.sql

# Apply WAL logs up to target time
pg_wal_replay --until-time "2024-01-15 14:30:00"

# Switch databases
psql -c "ALTER DATABASE caresync_prod RENAME TO caresync_old;"
psql -c "ALTER DATABASE caresync_recovery RENAME TO caresync_prod;"

# Restart application
kubectl scale deployment caresync-app --replicas=3
```

#### Disaster Recovery Testing
```bash
#!/bin/bash
# disaster-recovery-test.sh

echo "Starting disaster recovery test..."

# Create test scenario
kubectl delete namespace caresync-prod

# Execute recovery
./restore-from-backup.sh

# Verify recovery
./run-smoke-tests.sh

echo "Disaster recovery test completed."
```

---

## Disaster Recovery

### Recovery Time Objective (RTO)
- **Critical Systems**: 4 hours
- **Full System**: 24 hours
- **Data Loss**: 1 hour (RPO)

### Recovery Strategies

#### Regional Disaster
1. **Failover to Secondary Region**
   ```bash
   # Update DNS to point to secondary region
   aws route53 change-resource-record-sets --hosted-zone-id Z123456 --change-batch file://failover.json

   # Scale up secondary region
   kubectl scale deployment --all --replicas=3 -n caresync-dr
   ```

2. **Data Synchronization**
   ```bash
   # Start replication from backup
   pg_start_replication caresync_dr
   ```

#### Complete Infrastructure Loss
1. **Infrastructure Recreation**
   ```bash
   # Deploy infrastructure from code
   terraform apply -auto-approve

   # Restore from latest backup
   ./restore-from-backup.sh latest
   ```

2. **Application Deployment**
   ```bash
   # Deploy application
   kubectl apply -f k8s/prod/

   # Run health checks
   ./verify-deployment.sh
   ```

### Business Continuity

#### Communication Plan
- **Internal**: Slack channels and email alerts
- **External**: Status page and customer notifications
- **Escalation**: Management notification within 30 minutes

#### Alternative Procedures
- **Manual Processes**: Paper-based workflows for critical functions
- **Third-Party Services**: Backup systems for email, payments, etc.
- **Remote Access**: VPN and secure remote access for staff

---

## Scaling Operations

### Horizontal Scaling

#### Auto-Scaling Configuration
```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: caresync-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: caresync-app
  minReplicas: 3
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

#### Database Scaling
```sql
-- Add read replica
CREATE PUBLICATION caresync_pub FOR ALL TABLES;
CREATE SUBSCRIPTION caresync_sub
  CONNECTION 'host=primary-db port=5432 user=replica dbname=caresync'
  PUBLICATION caresync_pub;
```

### Vertical Scaling

#### Instance Type Upgrades
```bash
# Update instance type
kubectl patch node node-name -p '{"spec":{"providerID":"aws:///us-east-1b/i-newinstancetype"}}'

# Rolling update of pods
kubectl rollout restart deployment/caresync-app
```

### Performance Optimization

#### Database Optimization
```sql
-- Analyze slow queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;

-- Add performance indexes
CREATE INDEX CONCURRENTLY idx_appointments_date_status
ON appointments (appointment_date, status);

-- Update statistics
ANALYZE VERBOSE appointments;
```

#### Application Optimization
```typescript
// Implement caching
const cache = new Redis();

app.get('/api/patients/:id', async (req, res) => {
  const cacheKey = `patient:${req.params.id}`;
  const cached = await cache.get(cacheKey);

  if (cached) {
    return res.json(JSON.parse(cached));
  }

  const patient = await Patient.findById(req.params.id);
  await cache.setex(cacheKey, 300, JSON.stringify(patient)); // 5 min TTL

  res.json(patient);
});
```

---

## Operational Runbooks

### Common Incident Response

#### High CPU Usage
1. **Investigate**: Check monitoring dashboards for CPU usage
2. **Identify Cause**: Review application logs and database queries
3. **Mitigate**: Scale up instances or optimize queries
4. **Prevent**: Implement query optimization and monitoring alerts

#### Memory Leaks
1. **Monitor**: Set up memory usage alerts
2. **Diagnose**: Use heap dumps and profiling tools
3. **Fix**: Update application code and restart services
4. **Test**: Load test after fixes

#### Database Connection Issues
1. **Check Pool**: Monitor connection pool usage
2. **Scale Database**: Add read replicas if needed
3. **Optimize Queries**: Reduce connection-intensive operations
4. **Configure Pool**: Adjust pool size and timeouts

### Maintenance Windows

#### Scheduled Maintenance
- **Weekly**: Security patches and minor updates (Sundays 2-4 AM)
- **Monthly**: Major updates and database maintenance (1st Sunday 1-6 AM)
- **Quarterly**: Infrastructure upgrades and full system audits

#### Maintenance Communication
```bash
# Send maintenance notification
curl -X POST https://api.pagerduty.com/incidents \
  -H "Authorization: Token token=your_token" \
  -d '{
    "incident": {
      "type": "incident",
      "title": "Scheduled Maintenance",
      "service": {"id": "service_id"},
      "body": {
        "type": "incident_body",
        "details": "System maintenance scheduled for Sunday 2-4 AM EST"
      }
    }
  }'
```

---

This deployment operations guide provides the foundation for reliable, scalable, and maintainable CareSync HMS operations. Regular reviews and updates are essential as the system evolves.