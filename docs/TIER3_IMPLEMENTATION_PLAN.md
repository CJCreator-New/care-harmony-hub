# TIER 3 IMPLEMENTATION PLAN: OBSERVABILITY & OPERATIONS

**Tier Start Date:** April 18, 2026  
**Total Effort:** 32 hours  
**Owner:** GitHub Copilot  
**Status:** 🟢 STARTING NOW

---

## 📊 Items Overview

| ID | Item | Effort | Status | Dependencies |
|----|------|--------|--------|---|
| 3.1 | Real `/api/health` endpoint | 4h | Starting | None |
| 3.2 | AI Gateway usage metrics | 6h | Queued | 3.1 |
| 3.3 | Audit log viewer UI | 8h | Queued | 3.1 |
| 3.4 | Realtime connection status | 5h | Queued | 3.1 |
| **TOTAL** | | **32h** | | |

---

## 🎯 ITEM 3.1: REAL `/API/HEALTH` ENDPOINT (4 hours)

**Goal:** Enhance existing health-check Edge Function and create admin dashboard to monitor system health

**Current Status:**
- ✅ Edge Function exists: `supabase/functions/health-check/index.ts`
- ✅ Checks: database, auth, storage
- ❌ Missing: External API checks (Lovable AI, etc.)
- ❌ Missing: UI dashboard for admins
- ❌ Missing: K8s/Docker health probe config

**Work Items:**

### 3.1.1: Enhance health-check Edge Function (1.5h)
**Add external API checks:**
```typescript
// Add to existing health check:
- Lovable AI API reachability
- Email service (SendGrid/similar)
- Analytics service (if external)
- Return: { status, timestamp, services, metrics, external_apis }
```

**Implementation:**
- [ ] Add Lovable AI endpoint check (ping /api/models or equivalent)
- [ ] Add email service check (test send capability)
- [ ] Handle timeouts gracefully (5s max per service)
- [ ] Cache results for 30s to avoid overload

### 3.1.2: Create System Health Dashboard component (1.5h)
**Build admin-only dashboard:**
```typescript
// src/pages/admin/SystemHealthDashboard.tsx
- Show: Overall health status
- List: Each service (db, auth, storage, api) with status
- Display: Last check time, response time
- Show: Memory usage, uptime metrics
- Alert: Red if any service unhealthy
- Refresh: Auto-refresh every 30s
```

**Features:**
- [ ] Role-protected (admin only)
- [ ] Real-time status indicators
- [ ] Service history (last 24h)
- [ ] Alert if service degraded >5min

### 3.1.3: Wire to admin interface (1h)
**Add navigation & integration:**
- [ ] Add menu item to admin sidebar: "System Health"
- [ ] Link to new dashboard page
- [ ] Add status badge to header (green/yellow/red)

**Deployment:**
- [ ] Test locally with docker-compose
- [ ] Add to k8s health probe: `/functions/v1/health-check`
- [ ] Add to Docker health check

---

## 📈 ITEM 3.2: AI GATEWAY USAGE METRICS (6 hours)

**Goal:** Track Lovable AI usage and costs, display in dashboard, alert on thresholds

**Implementation Plan:**
- [ ] Query Lovable API for usage stats (if SDK available)
- [ ] Log to `system_metrics` table: `{ ai_calls_count, tokens_used, cost_estimate, timestamp }`
- [ ] Create chart component showing usage trends
- [ ] Set alert if daily cost exceeds $100 (configurable)
- [ ] Add to System Health Dashboard

---

## 📋 ITEM 3.3: AUDIT LOG VIEWER UI (8 hours)

**Goal:** Build admin interface to browse, filter, and export audit logs

**Implementation Plan:**
- [ ] Create `src/pages/admin/AuditLogViewer.tsx`
- [ ] Query `activity_logs` table with:
  - Pagination (50 rows/page)
  - Filters: user, action, date range, resource type
  - Sort: by timestamp (descending)
- [ ] Display columns: timestamp, user, action, resource, changes, ip_address
- [ ] Add export to CSV for compliance
- [ ] Role protection: admin only

---

## 🔄 ITEM 3.4: REALTIME CONNECTION STATUS (5 hours)

**Goal:** Show users when Supabase Realtime connection drops

**Implementation Plan:**
- [ ] Add Realtime disconnect listener to `AuthContext`
- [ ] Show banner when connection lost: "🔴 Realtime connection lost"
- [ ] Auto-retry with exponential backoff (1s, 2s, 4s, 8s...)
- [ ] Log disconnect events for post-mortem analysis
- [ ] Automatically hide banner when reconnected

---

## ⏱️ EXECUTION SCHEDULE

```
Hour 1-4:   Item 3.1 (Health dashboard)
Hour 5-10:  Item 3.2 (AI metrics)
Hour 11-18: Item 3.3 (Audit viewer)
Hour 19-24: Item 3.4 (Realtime status) + buffer

Estimated completion: April 19-20, 2026
```

---

**Next Step:** Begin Item 3.1.1 (Enhance health-check Edge Function)
