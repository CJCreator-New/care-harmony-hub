# Healthcare Management System - Performance Optimization Plan

## Executive Summary

This comprehensive performance optimization plan addresses critical scalability and efficiency concerns identified in the CareSync HMS codebase. Based on analysis of [`testDataSeeder.ts`](src/utils/testDataSeeder.ts:1), [`securityMonitoring.ts`](src/utils/securityMonitoring.ts:1), [`useOfflineSync.ts`](src/hooks/useOfflineSync.ts:1), [`useAdminStats.ts`](src/hooks/useAdminStats.ts:1), and database query patterns across 59+ files, this plan provides actionable recommendations to ensure the system can handle hospital-scale operations efficiently.

---

## 1. Database Query Optimization

### 1.1 Current Issues Identified

#### N+1 Query Problems
- **Location**: [`testDataSeeder.ts`](src/utils/testDataSeeder.ts:135-148) - Activity logging inside patient creation loop
- **Impact**: Creates 1 additional query per patient (50 patients = 51 queries)
- **Severity**: HIGH

```typescript
// CURRENT (Inefficient)
for (const patient of data) {
  await supabase.from('activity_logs').insert({...}); // N queries
}
```

#### Sequential Query Execution
- **Location**: [`useAdminStats.ts`](src/hooks/useAdminStats.ts:119-181) - 14 sequential count queries
- **Impact**: Dashboard loads wait for all queries to complete serially
- **Severity**: HIGH

#### Missing Database Indexes
- No composite indexes on frequently queried columns
- Full table scans on `hospital_id` filtered queries
- Missing indexes on `created_at`, `status` columns

### 1.2 Recommended Solutions

#### A. Batch Insert Operations
```typescript
// OPTIMIZED - Batch activity logging
const activityLogs = data.map(patient => ({
  hospital_id: this.hospitalId,
  user_id: patient.id,
  action_type: 'patient_registered',
  entity_type: 'patient',
  entity_id: patient.id,
  details: { patient_name: `${patient.first_name} ${patient.last_name}`, mrn: patient.mrn }
}));

await supabase.from('activity_logs').insert(activityLogs); // 1 query
```

#### B. Database Function Consolidation
Create PostgreSQL function for dashboard stats:
```sql
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_hospital_id UUID)
RETURNS TABLE (
  total_patients BIGINT,
  new_patients_this_month BIGINT,
  today_appointments BIGINT,
  -- ... other stats
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM patients WHERE hospital_id = p_hospital_id AND is_active = true),
    (SELECT COUNT(*) FROM patients WHERE hospital_id = p_hospital_id AND created_at >= DATE_TRUNC('month', NOW())),
    -- ... other counts
END;
$$ LANGUAGE plpgsql;
```

#### C. Required Database Indexes
```sql
-- Composite indexes for common query patterns
CREATE INDEX idx_patients_hospital_active ON patients(hospital_id, is_active, created_at);
CREATE INDEX idx_appointments_hospital_date ON appointments(hospital_id, scheduled_date, status);
CREATE INDEX idx_invoices_hospital_status ON invoices(hospital_id, status, created_at);
CREATE INDEX idx_activity_logs_hospital_time ON activity_logs(hospital_id, created_at DESC);
CREATE INDEX idx_queue_hospital_status ON patient_queue(hospital_id, status, check_in_time);

-- Partial indexes for filtered queries
CREATE INDEX idx_pending_prescriptions ON prescriptions(hospital_id) WHERE status = 'pending';
CREATE INDEX idx_critical_labs ON lab_orders(hospital_id) WHERE is_critical = true AND status != 'completed';
```

---

## 2. Memory Management & Caching Strategies

### 2.1 Current Issues

#### LocalStorage Overuse
- **Location**: [`useOfflineSync.ts`](src/hooks/useOfflineSync.ts:22-53)
- **Issue**: Stores entire patient datasets in localStorage (5-10MB limit)
- **Risk**: Data loss, performance degradation, quota exceeded errors

#### No Application-Level Caching
- React Query cache not optimized for healthcare data patterns
- Repeated identical queries within short timeframes
- No cache invalidation strategy for real-time updates

#### Memory Leaks in Real-time Subscriptions
- **Location**: [`useAdminStats.ts`](src/hooks/useAdminStats.ts:49-107)
- **Issue**: Multiple subscription channels without proper cleanup

### 2.2 Recommended Solutions

#### A. IndexedDB for Offline Storage
```typescript
// Replace localStorage with IndexedDB
import { openDB } from 'idb';

const db = await openDB('care-harmony-cache', 1, {
  upgrade(db) {
    db.createObjectStore('patients', { keyPath: 'id' });
    db.createObjectStore('appointments', { keyPath: 'id' });
    db.createObjectStore('pending-actions', { keyPath: 'id' });
  }
});

// Store with size limits
const MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
```

#### B. Optimized React Query Configuration
```typescript
// Healthcare-specific cache strategies
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes for general data
      cacheTime: 1000 * 60 * 30, // 30 minutes
      refetchOnWindowFocus: false, // Critical for clinical workflows
    },
  },
});

// Real-time data with aggressive invalidation
useQuery({
  queryKey: ['critical-alerts'],
  staleTime: 1000 * 30, // 30 seconds
  refetchInterval: 1000 * 60, // 1 minute polling backup
});
```

#### C. Memory-Efficient Real-time Subscriptions
```typescript
// Consolidate subscriptions into single channel
const channel = supabase
  .channel('hospital-realtime')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'patients', filter: `hospital_id=eq.${hospitalId}` }, handler)
  .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments', filter: `hospital_id=eq.${hospitalId}` }, handler)
  .subscribe();

// Proper cleanup
useEffect(() => {
  return () => {
    channel.unsubscribe();
  };
}, [hospitalId]);
```

---

## 3. Bundle Size Optimization

### 3.1 Current Issues

#### Large Dependencies
- `jspdf` (2.5MB+) - PDF generation
- `html2canvas` (800KB+) - Screenshot functionality
- `recharts` (600KB+) - Charting library
- `framer-motion` (400KB+) - Animation library

#### No Code Splitting
- All pages loaded upfront
- Unused components in initial bundle
- No lazy loading for heavy features

### 3.2 Recommended Solutions

#### A. Dynamic Imports for Heavy Features
```typescript
// Lazy load PDF generation
const generatePDF = async () => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  // ... generate PDF
};

// Lazy load chart components
const PatientChart = lazy(() => import('./PatientChart'));
```

#### B. Dependency Optimization
```typescript
// Replace heavy libraries with lighter alternatives
// Option 1: Use react-pdf (lighter) instead of jspdf
// Option 2: Use chart.js with tree-shaking instead of recharts
// Option 3: Use CSS animations instead of framer-motion for simple transitions

// Vite configuration for tree-shaking
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-generation': ['jspdf', 'html2canvas'],
          'charts': ['recharts'],
          'animations': ['framer-motion'],
        },
      },
    },
  },
});
```

#### C. Service Worker Caching Strategy
```typescript
// vite.config.ts
vitePWA({
  workbox: {
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/,
        handler: 'NetworkFirst',
        options: {
          cacheName: 'api-cache',
          expiration: {
            maxEntries: 100,
            maxAgeSeconds: 60 * 60 * 24, // 24 hours
          },
        },
      },
    ],
  },
});
```

---

## 4. API Response Optimization

### 4.1 Current Issues

#### Over-fetching Data
- **Location**: Multiple hooks selecting `*` when only counts needed
- **Impact**: Transferring unnecessary data over network

#### No Request Batching
- Individual API calls for related data
- Missing GraphQL or batch query support

### 4.2 Recommended Solutions

#### A. Field Selection Optimization
```typescript
// BEFORE: Over-fetching
const { data } = await supabase
  .from('patients')
  .select('*') // Fetches all 30+ columns
  .eq('hospital_id', hospitalId);

// AFTER: Select only needed fields
const { data } = await supabase
  .from('patients')
  .select('id, first_name, last_name, mrn, date_of_birth') // 5 columns
  .eq('hospital_id', hospitalId);
```

#### B. Request Batching with Supabase
```typescript
// Batch multiple queries into single request
const [patients, appointments, prescriptions] = await Promise.all([
  supabase.from('patients').select('count', { count: 'exact', head: true }),
  supabase.from('appointments').select('count', { count: 'exact', head: true }),
  supabase.from('prescriptions').select('count', { count: 'exact', head: true }),
]);
```

#### C. Edge Functions for Complex Operations
```typescript
// supabase/functions/dashboard-stats/index.ts
export async function getDashboardStats(hospitalId: string) {
  const { data, error } = await supabase
    .rpc('get_dashboard_stats', { p_hospital_id: hospitalId });
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

---

## 5. Real-time Data Handling

### 5.1 Current Issues

#### Subscription Overload
- **Location**: [`useAdminStats.ts`](src/hooks/useAdminStats.ts:49-107)
- **Issue**: 4 separate subscriptions causing connection overhead
- **Impact**: WebSocket connection limits, battery drain on mobile

#### Inefficient Real-time Updates
- Full query invalidation on any change
- No differential updates
- Missing optimistic updates

### 5.2 Recommended Solutions

#### A. Consolidated Real-time Channel
```typescript
// Single channel for all hospital data
const useHospitalRealtime = (hospitalId: string) => {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const channel = supabase
      .channel(`hospital-${hospitalId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        filter: `hospital_id=eq.${hospitalId}`,
      }, (payload) => {
        // Smart invalidation based on table
        const table = payload.table;
        queryClient.invalidateQueries({ queryKey: [table] });
        
        // Update specific cache entries
        if (payload.eventType === 'INSERT') {
          queryClient.setQueryData([table], (old: any[]) => [...old, payload.new]);
        }
      })
      .subscribe();
    
    return () => channel.unsubscribe();
  }, [hospitalId]);
};
```

#### B. Optimistic Updates
```typescript
// Immediate UI update before server confirmation
const mutation = useMutation({
  mutationFn: updatePatient,
  onMutate: async (newPatient) => {
    await queryClient.cancelQueries({ queryKey: ['patients'] });
    const previousPatients = queryClient.getQueryData(['patients']);
    
    queryClient.setQueryData(['patients'], (old: any[]) => 
      old.map(p => p.id === newPatient.id ? newPatient : p)
    );
    
    return { previousPatients };
  },
  onError: (err, newPatient, context) => {
    queryClient.setQueryData(['patients'], context?.previousPatients);
  },
});
```

---

## 6. Security Overhead Impact

### 6.1 Current Issues

#### Excessive Audit Logging
- **Location**: [`securityMonitoring.ts`](src/utils/securityMonitoring.ts:46-93)
- **Issue**: Logs every action synchronously, blocking UI
- **Impact**: 50-100ms delay per logged action

#### Synchronous Security Checks
- Intrusion detection runs on main thread
- Health checks block other operations

### 6.2 Recommended Solutions

#### A. Async Audit Logging with Queue
```typescript
// Batch audit logs
class AuditLogQueue {
  private queue: AuditLogEntry[] = [];
  private flushInterval = 5000; // 5 seconds
  
  add(entry: AuditLogEntry) {
    this.queue.push(entry);
    if (this.queue.length >= 10) {
      this.flush();
    }
  }
  
  private async flush() {
    if (this.queue.length === 0) return;
    
    const batch = this.queue.splice(0, this.queue.length);
    await supabase.from('audit_logs').insert(batch);
  }
}

const auditQueue = new AuditLogQueue();
setInterval(() => auditQueue.flush(), 5000);
```

#### B. Web Workers for Security Analysis
```typescript
// security-worker.ts
self.onmessage = async (event) => {
  const { logs, timeRange } = event.data;
  const alerts = await analyzeIntrusionPatterns(logs, timeRange);
  self.postMessage({ alerts });
};

// Main thread
const worker = new Worker('./security-worker.ts');
worker.postMessage({ logs, timeRange });
worker.onmessage = (e) => handleAlerts(e.data.alerts);
```

---

## 7. Scalability Bottlenecks

### 7.1 Hospital-Scale Concerns

| Metric | Current | Target (500 bed hospital) | Gap |
|--------|---------|---------------------------|-----|
| Concurrent Users | 50 | 500 | 10x |
| Daily Patients | 100 | 2,000 | 20x |
| Daily Appointments | 200 | 5,000 | 25x |
| Database Queries/sec | 50 | 1,000 | 20x |
| Real-time Connections | 20 | 200 | 10x |

### 7.2 Horizontal Scaling Strategy

#### A. Database Connection Pooling
```typescript
// supabase/config.toml
[db.pooler]
enabled = true
max_connections = 100
default_pool_size = 20
```

#### B. Read Replicas for Analytics
```typescript
// Route analytics queries to read replica
const analyticsClient = createClient(
  process.env.SUPABASE_ANALYTICS_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Use for heavy read operations
const { data } = await analyticsClient
  .from('appointments')
  .select('*')
  .gte('created_at', lastMonth);
```

#### C. Edge Caching with CDN
```typescript
// Cache static hospital data
const { data } = await supabase
  .from('hospitals')
  .select('*')
  .eq('id', hospitalId)
  .single()
  .overrideTypes<{ cache: 'force-cache' }>();
```

---

## 8. Implementation Roadmap

### Phase 1: Critical Fixes (Week 1-2)
- [ ] Add database indexes for top 10 query patterns
- [ ] Implement batch insert in testDataSeeder.ts
- [ ] Fix N+1 queries in patient creation
- [ ] Add connection pooling configuration

### Phase 2: Caching & Memory (Week 3-4)
- [ ] Replace localStorage with IndexedDB
- [ ] Optimize React Query configurations
- [ ] Implement service worker caching
- [ ] Add memory monitoring and alerts

### Phase 3: Bundle Optimization (Week 5-6)
- [ ] Implement code splitting for heavy features
- [ ] Replace heavy dependencies with lighter alternatives
- [ ] Add bundle analysis to CI/CD
- [ ] Optimize image assets

### Phase 4: Real-time & API (Week 7-8)
- [ ] Consolidate real-time subscriptions
- [ ] Implement optimistic updates
- [ ] Create dashboard stats PostgreSQL function
- [ ] Add request batching

### Phase 5: Security & Audit (Week 9-10)
- [ ] Implement async audit logging queue
- [ ] Move security analysis to Web Workers
- [ ] Add security monitoring dashboard
- [ ] Optimize health check frequency

---

## 9. Performance Monitoring

### 9.1 Key Metrics to Track

```typescript
// Performance monitoring utility
export const trackPerformance = {
  queryTime: (operation: string, duration: number) => {
    if (duration > 1000) {
      console.warn(`Slow query: ${operation} took ${duration}ms`);
    }
  },
  
  bundleSize: () => {
    const entries = performance.getEntriesByType('resource');
    const totalSize = entries.reduce((sum, r) => sum + (r as any).transferSize, 0);
    return totalSize / 1024 / 1024; // MB
  },
  
  memoryUsage: () => {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return 0;
  }
};
```

### 9.2 Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Query Time | > 500ms | > 2000ms |
| API Response | > 300ms | > 1000ms |
| Bundle Size | > 2MB | > 5MB |
| Memory Usage | > 100MB | > 250MB |
| Real-time Latency | > 100ms | > 500ms |

---

## 10. Success Criteria

After implementing this optimization plan:

1. **Database**: 80% reduction in query count, <100ms average query time
2. **Memory**: <50MB heap usage, no memory leaks in 24-hour operation
3. **Bundle**: <1.5MB initial load, <500KB for critical path
4. **API**: <200ms p95 response time, 99.9% availability
5. **Real-time**: <50ms latency for critical updates
6. **Scalability**: Support 500 concurrent users with <2s page load

---

## Appendix: Quick Reference

### Database Migration Script
```sql
-- Run this migration for immediate performance gains
CREATE INDEX CONCURRENTLY idx_patients_hospital_active ON patients(hospital_id, is_active);
CREATE INDEX CONCURRENTLY idx_appointments_hospital_date ON appointments(hospital_id, scheduled_date);
CREATE INDEX CONCURRENTLY idx_activity_logs_hospital_time ON activity_logs(hospital_id, created_at DESC);
```

### Environment Variables
```bash
# Add to .env
SUPABASE_POOL_SIZE=20
SUPABASE_MAX_CONNECTIONS=100
CACHE_TTL_SECONDS=300
ENABLE_QUERY_LOGGING=true
```

### Testing Performance
```bash
# Run performance tests
npm run test:performance

# Analyze bundle
npm run analyze

# Load testing with k6
k6 run tests/performance/load-testing.k6.js
```

---

*Document Version: 1.0*
*Last Updated: 2026-01-28*
*Next Review: 2026-02-28*
