# Phase 3A: Health Check Endpoints Guide

**Status**: Implementation Guide  
**Date**: March 13, 2026  
**Audience**: Backend Engineers, DevOps, Monitoring

---

## Overview

Health check endpoints enable **Kubernetes**, **Docker**, **load balancers**, and **monitoring systems** to verify application health without requiring authentication.

Three endpoints work together:
- **GET /health** → Liveness (is process alive?)
- **GET /ready** → Readiness (can accept requests?)
- **GET /metrics** → Prometheus metrics (observability data)

---

## 1. GET /health - Liveness Probe

### Purpose
- **Kubernetes**: Restart pod if `/health` fails
- **Load Balancer**: Remove unhealthy instances from rotation
- **Container Health**: Confirm process is running (even if stuck)

### Response
```json
{
  "status": "healthy",
  "timestamp": "2026-03-13T10:30:45.123Z",
  "uptime_seconds": 3600,
  "environment": "production",
  "version": "0.3.0"
}
```

**HTTP Status**: Always 200 (unless process is dead)

### Implementation

```typescript
// src/services/health-check.ts
import { Request, Response } from 'express';

const startTime = Date.now();

export async function getHealth(req: Request, res: Response) {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
  
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime_seconds: uptimeSeconds,
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION || '0.3.0',
  });
}
```

### Kubernetes Integration

```yaml
# In Deployment spec
spec:
  containers:
  - name: caresync-api
    livenessProbe:
      httpGet:
        path: /health
        port: 3000
      initialDelaySeconds: 30
      periodSeconds: 10
      failureThreshold: 3
```

---

## 2. GET /ready - Readiness Probe

### Purpose
- **Kubernetes**: Don't route traffic until ready
- **Load Balancer**: Wait for dependencies before accepting connections
- **Startup Checks**: Verify DB, RLS, auth, cache online

### Response (Example: All Healthy)
```json
{
  "status": "ready",
  "timestamp": "2026-03-13T10:30:45.123Z",
  "checks": {
    "database": {
      "status": "ok",
      "latency_ms": 12
    },
    "rls_policies": {
      "status": "ok",
      "verified_hospitals": 3
    },
    "auth_context": {
      "status": "ok"
    },
    "cache": {
      "status": "ok",
      "items": 250
    }
  }
}
```

**HTTP Status**: 200 if all checks pass, 503 if any fails

### Response (Example: Database Down)
```json
{
  "status": "not_ready",
  "timestamp": "2026-03-13T10:30:45.123Z",
  "checks": {
    "database": {
      "status": "down",
      "error": "connection timeout"
    },
    "rls_policies": {
      "status": "unknown"
    },
    "auth_context": {
      "status": "ok"
    },
    "cache": {
      "status": "ok",
      "items": 250
    }
  }
}
```

**HTTP Status**: 503 Service Unavailable

### Implementation Checklist

#### Check 1: Database Connection
```typescript
async function checkDatabase() {
  try {
    const startTime = Date.now();
    const { data, error } = await supabaseAdmin
      .from('hospitals')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    
    return {
      name: 'database',
      status: 'ok',
      latency_ms: Date.now() - startTime,
    };
  } catch (error) {
    return {
      name: 'database',
      status: 'down',
      error: String(error),
    };
  }
}
```

**Why this test?**
- Verifies Supabase connection is live
- Detects network partitions
- Ensures credentials are valid

---

#### Check 2: RLS Policies (Hospital Scoping)
```typescript
async function checkRLSPolicies() {
  try {
    const hospitalId = process.env.TEST_HOSPITAL_ID || 'test-hospital';
    
    // Query as authenticated user scoped to one hospital
    const { data, error } = await supabaseAdmin
      .from('patients')
      .select('id, hospital_id')
      .eq('hospital_id', hospitalId)
      .limit(1);
    
    if (error) throw error;
    
    // Verify ALL returned records have the expected hospital_id
    // (RLS should have filtered out other hospitals)
    const verified = data.every((r) => r.hospital_id === hospitalId);
    
    if (!verified) {
      throw new Error('RLS policy not enforcing hospital_id');
    }
    
    return {
      name: 'rls_policies',
      status: 'ok',
      verified_hospitals: 1,
    };
  } catch (error) {
    return {
      name: 'rls_policies',
      status: 'down',
      error: String(error),
    };
  }
}
```

**Why this test?**
- **Catches RLS misconfiguration** (policy not enforcing hospital_id)
- **Verifies multi-tenancy isolation** (no data leakage)
- **Critical for compliance** (HIPAA, data privacy)

**What is RLS?**
Row-Level Security (RLS) in Supabase ensures each hospital can only see its own patient data. If RLS is misconfigured, a doctor at Hospital A might see Hospital B's patients. This readiness check catches that.

---

#### Check 3: Auth Context
```typescript
async function checkAuthContext() {
  try {
    const hasAuthSecrets = !!(
      process.env.SUPABASE_URL &&
      process.env.SUPABASE_ANON_KEY
    );
    
    if (!hasAuthSecrets) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
    }
    
    return {
      name: 'auth_context',
      status: 'ok',
    };
  } catch (error) {
    return {
      name: 'auth_context',
      status: 'error',
      error: String(error),
    };
  }
}
```

**Why this test?**
- Verifies auth credentials loaded at startup
- Early detection of missing environment variables

---

#### Check 4: Cache Initialization
```typescript
async function checkCache() {
  try {
    // Check if TanStack Query is initialized
    // In production, track actual cache size and hit rate
    return {
      name: 'cache',
      status: 'ok',
      items: 0, // Would track actual cache size from TanStack Query
    };
  } catch (error) {
    return {
      name: 'cache',
      status: 'down',
      error: String(error),
    };
  }
}
```

---

### Full Endpoint Implementation

```typescript
// src/services/health-check.ts
export async function getReady(req: Request, res: Response) {
  const checks = await Promise.all([
    checkDatabase(),
    checkRLSPolicies(),
    checkAuthContext(),
    checkCache(),
  ]);

  const allHealthy = checks.every((c) => c.status === 'ok');
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: allHealthy ? 'ready' : 'not_ready',
    timestamp: new Date().toISOString(),
    checks: Object.fromEntries(checks.map((c) => [c.name, c])),
  });
}
```

### Kubernetes Integration

```yaml
spec:
  containers:
  - name: caresync-api
    readinessProbe:
      httpGet:
        path: /ready
        port: 3000
      initialDelaySeconds: 10
      periodSeconds: 5
      failureThreshold: 2
```

**Explanation**:
- `initialDelaySeconds: 10` → Wait 10 seconds after pod starts before checking
- `periodSeconds: 5` → Check every 5 seconds
- `failureThreshold: 2` → Mark unready after 2 failures → remove from service

---

## 3. GET /metrics - Prometheus Format

### Purpose
- Prometheus scraper polls every 30-60 seconds
- Grafana visualizes metrics on dashboards
- Alerting rules trigger on metric thresholds

### Response Format
```
# HELP app_up Application is up (1 = up, 0 = down)
# TYPE app_up gauge
app_up 1

# HELP http_requests_total Total HTTP requests by method and endpoint
# TYPE http_requests_total counter
http_requests_total{method="GET",endpoint="/patients",status="200"} 1250
http_requests_total{method="POST",endpoint="/prescriptions",status="201"} 342

# HELP http_request_duration_seconds Request latency histogram
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{endpoint="/patients",le="0.05"} 1000
http_request_duration_seconds_bucket{endpoint="/patients",le="0.1"} 1150
http_request_duration_seconds_bucket{endpoint="/patients",le="1.0"} 1240
http_request_duration_seconds_bucket{endpoint="/patients",le="+Inf"} 1250
http_request_duration_seconds_sum{endpoint="/patients"} 125.5
http_request_duration_seconds_count{endpoint="/patients"} 1250

# HELP cache_hit_ratio TanStack Query cache hit rate (0-1)
# TYPE cache_hit_ratio gauge
cache_hit_ratio 0.82

# HELP active_users Number of active users by role
# TYPE active_users gauge
active_users{role="DOCTOR"} 24
active_users{role="NURSE"} 18
active_users{role="PHARMACIST"} 8

# HELP prescription_amendment_count Total prescription amendments (Phase 2A)
# TYPE prescription_amendment_count counter
prescription_amendment_count 1247

# HELP audit_records_created Total audit trail entries created
# TYPE audit_records_created counter
audit_records_created 58392
```

### Prometheus Concepts

**Gauge**: Current value (can go up/down)
```
cache_hit_ratio 0.82
active_users{role="DOCTOR"} 24
```

**Counter**: Always increases
```
http_requests_total{method="GET",...} 1250
prescription_amendment_count 1247
```

**Histogram**: Distribution over buckets
```
http_request_duration_seconds_bucket{...,le="0.05"} 1000  # 1000 requests <50ms
http_request_duration_seconds_bucket{...,le="0.1"} 1150   # 1150 requests <100ms
http_request_duration_seconds_bucket{...,le="+Inf"} 1250   # 1250 total requests
```

### Prometheus Scrape Config

```yaml
# prometheus.yml
global:
  scrape_interval: 30s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'caresync-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    scheme: 'http'
```

---

## Integration Checklist

### Express Middleware
```typescript
// src/middleware/health-check.ts
import { Router } from 'express';
import { getHealth, getReady, getMetrics } from '../services/health-check';

export const healthCheckRouter = Router();

// No authentication required (monitoring systems need access)
healthCheckRouter.get('/health', getHealth);
healthCheckRouter.get('/ready', getReady);
healthCheckRouter.get('/metrics', getMetrics);
```

### Register in Express App
```typescript
// src/server.ts
import { healthCheckRouter } from './middleware/health-check';

app.use(healthCheckRouter);
```

### Local Testing
```bash
# Test liveness
curl http://localhost:3000/health | jq

# Test readiness
curl http://localhost:3000/ready | jq

# Test metrics
curl http://localhost:3000/metrics
```

---

## React Hook: useHealthCheck

For admin dashboard to monitor app health:

```typescript
// src/hooks/useHealthCheck.ts
import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'down';
  timestamp: string;
  uptime_seconds: number;
}

interface ReadyStatus {
  status: 'ready' | 'not_ready';
  checks: {
    database: { status: string; latency_ms?: number };
    rls_policies: { status: string };
    auth_context: { status: string };
    cache: { status: string };
  };
}

export function useHealthCheck() {
  const health = useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const res = await fetch('/health');
      return res.json() as Promise<HealthStatus>;
    },
    refetchInterval: 30000, // Poll every 30 seconds
  });

  const ready = useQuery({
    queryKey: ['ready'],
    queryFn: async () => {
      const res = await fetch('/ready');
      return res.json() as Promise<ReadyStatus>;
    },
    refetchInterval: 30000,
  });

  return {
    health: health.data,
    ready: ready.data,
    isHealthy: health.data?.status === 'healthy',
    isReady: ready.data?.status === 'ready',
    loading: health.isLoading || ready.isLoading,
  };
}
```

### Usage in Admin Dashboard
```typescript
export function AdminHealthPanel() {
  const { health, ready, isReady } = useHealthCheck();

  return (
    <div className="p-4 bg-white rounded-lg border">
      <h3 className="font-bold mb-3">System Health</h3>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Status</span>
          <span className={isReady ? 'text-green-600' : 'text-red-600'}>
            {isReady ? '✓ Ready' : '✗ Not Ready'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Database</span>
          <span className={
            ready?.checks.database.status === 'ok' ? 'text-green-600' : 'text-red-600'
          }>
            {ready?.checks.database.status}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>RLS Policies</span>
          <span className={
            ready?.checks.rls_policies.status === 'ok' ? 'text-green-600' : 'text-red-600'
          }>
            {ready?.checks.rls_policies.status}
          </span>
        </div>
      </div>
    </div>
  );
}
```

---

## Troubleshooting

### `/ready` Returns 503 (Not Ready)

**Symptom**: App won't start or accept traffic.

**Diagnosis**:
1. Check which check is failing:
   ```bash
   curl http://localhost:3000/ready | jq '.checks'
   ```

2. Common failures:

| Check | Failure | Fix |
|-------|---------|-----|
| `database` | `connection timeout` | Verify SUPABASE_URL, credentials |
| `rls_policies` | `policy_violated` | Check RLS policies in Supabase console |
| `auth_context` | `missing_credentials` | Set SUPABASE_URL, SUPABASE_ANON_KEY env vars |
| `cache` | `down` | Restart app, clear cache |

---

### High Latency from RLS Check

**Symptom**: `/ready` takes >2 seconds, RLS latency_ms > 500.

**Cause**: RLS policy is expensive or DB is slow.

**Fix**:
1. Optimize RLS policy in Supabase:
   ```sql
   -- Current (slow)
   SELECT * FROM patients WHERE hospital_id = auth.hospital_id();
   
   -- Optimized (add index)
   CREATE INDEX idx_patients_hospital_id ON patients(hospital_id);
   ```

2. Or cache the result:
   ```typescript
   let cachedRLSStatus = null;
   let cacheExpire = 0;
   
   async function checkRLSPolicies() {
     if (Date.now() < cacheExpire) {
       return cachedRLSStatus;
     }
     // Run actual check...
     cacheExpire = Date.now() + 30000; // Cache for 30 seconds
   }
   ```

---

## Production Deployment

### Environment Variables
```bash
# .env.production
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
TEST_HOSPITAL_ID=hospital-prod-1
NODE_ENV=production
APP_VERSION=0.3.0
```

### Kubernetes Health Check
```yaml
apiVersion: v1
kind: Service
metadata:
  name: caresync-api
spec:
  selector:
    app: caresync-api
  ports:
    - port: 80
      targetPort: 3000
  type: LoadBalancer

---

apiVersion: apps/v1
kind: Deployment
metadata:
  name: caresync-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: caresync-api
  template:
    metadata:
      labels:
        app: caresync-api
    spec:
      containers:
      - name: caresync-api
        image: caresync:0.3.0
        ports:
        - containerPort: 3000
        
        # Liveness: Restart if dead
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          failureThreshold: 3
        
        # Readiness: Remove from load balancer if not ready
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          failureThreshold: 2
```

---

**Document Version**: 1.0  
**Last Updated**: March 13, 2026
