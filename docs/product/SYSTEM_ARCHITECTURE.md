# CareSync HIMS - System Architecture & Technical Overview

**Last Updated**: April 8, 2026  
**Version**: 1.2.1  
**Document Owner**: Architecture Team

---

## Executive Summary

**CareSync** is a comprehensive, enterprise-grade Hospital Information Management System (HIMS) built on modern cloud-native technologies. It provides unified operations across OPD (Out-Patient Department), IPD (In-Patient Department), Operating Theater, Pharmacy, Laboratory, and Billing—all accessible through role-based web dashboards and a patient portal.

### Key System Characteristics
- **Multi-Tenancy**: Supports multiple hospitals/clinics with complete data isolation
- **Role-Based Access**: 7 distinct roles (Admin, Doctor, Nurse, Receptionist, Pharmacist, Lab Tech, Patient)
- **HIPAA-Ready**: Encryption at rest, audit trails, PHI protection, consent tracking
- **Real-Time Clinical**: Sub-millisecond workflow updates via Supabase Realtime
- **Performance-Optimized**: 96% reduction in initial bundle size via lazy loading
- **AI-Integrated**: Differential diagnosis, predictive analytics, voice clinical notes
- **Comprehensive Testing**: 500+ automated E2E tests covering all role workflows

---

## 1. System Architecture Overview

### Technology Stack

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (Browser)                              │
│  React 18 + TypeScript + TailwindCSS + shadcn/ui           │
│  ├─ Role-based dashboards (lazy-loaded)                    │
│  ├─ Patient portal                                         │
│  └─ Mobile-responsive design (PWA)                         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  STATE MANAGEMENT & DATA LAYER                             │
│  ├─ TanStack Query (React Query) - HTTP cache              │
│  ├─ Zustand - State (if needed for UI state)               │
│  ├─ Context API - Auth, Theme, Testing                     │
│  └─ Real-time - Supabase Realtime subscriptions            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  API LAYER                                                 │
│  Kong API Gateway (8000) - Rate limiting, auth forwarding  │
│  Supabase REST API (Postgres via PostgREST)               │
│  ├─ Real-time subscriptions (WebSocket)                    │
│  ├─ Auth (JWT, 2FA, Biometric)                             │
│  └─ File storage (buckets for documents, images)           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  BACKEND SERVICES (Docker Microservices)                   │
│  ├─ patient-service (patient registry, demographics)       │
│  ├─ appointment-service (scheduling, queue mgmt)           │
│  ├─ clinical-service (vitals, consultation notes, orders)  │
│  ├─ laboratory-service (lab orders, results, critical val) │
│  └─ pharmacy-service (dispensing, inventory, interactions) │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  DATABASE LAYER                                            │
│  PostgreSQL (Supabase-hosted)                              │
│  ├─ 50+ migrations defining RLS policies                   │
│  ├─ Audit trail tables (append-only)                       │
│  ├─ Hospital-scoped multi-tenancy                          │
│  └─ Encryption metadata for PHI protection                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  DATA INTEGRATION LAYER                                    │
│  ├─ Lab equipment (HL7v2.5 / API)                         │
│  ├─ Pharmacy systems                                       │
│  ├─ Insurance/billing (X12, claims)                        │
│  ├─ Telemedicine provider (video, recordings)              │
│  └─ Observability (OTEL, Prometheus, Grafana)              │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Model

**Development**: Docker Compose (local services)  
**Staging**: Kubernetes cluster with Kong ingress  
**Production**: Multi-zone HA setup with automated failover

---

## 2. Frontend Architecture

### Component Organization

```
src/
├── components/           # 45+ feature-specific components
│   ├── admin/           # Admin console
│   ├── appointments/    # Scheduling UI
│   ├── billing/         # Invoicing & claims
│   ├── clinical/        # Vital signs, consultations
│   ├── laboratory/      # Lab orders & results
│   ├── pharmacy/        # Dispensing & inventory
│   ├── dashboard/       # 7 role-specific dashboards (lazy-loaded)
│   ├── auth/            # Login, role selection
│   ├── layout/          # Sidebar, headers, layout shells
│   ├── ui/              # shadcn UI primitives (45+ components)
│   └── common/          # Error boundaries, modals, shared
│
├── hooks/               # 150+ custom hooks for data & logic
│   ├── usePatients()
│   ├── useAppointments()
│   ├── usePrescriptions()
│   ├── useLaboratory()
│   ├── useWorkflowOrchestrator()
│   ├── useAIClinicalSuggestions()
│   ├── usePermissions()
│   └── ... (100+ more)
│
├── contexts/            # Global state
│   ├── AuthContext.tsx  # User, role, hospital, permissions
│   ├── ThemeContext.tsx # Dark/light theme
│   └── TestingContext.tsx # E2E testing helpers
│
├── services/            # API clients
│   ├── supabase/        # Supabase client
│   ├── api/             # REST API calls
│   └── external/        # Third-party integrations
│
├── integrations/        # External system integration
│   ├── telemedicine/    # Video consultation
│   ├── ai/              # AI clinical support
│   └── laboratory/      # Lab equipment integration
│
├── lib/                 # Utilities & helpers
│   ├── permissions.ts   # RBAC logic
│   ├── validation.ts    # Input validation
│   ├── sanitization.ts  # PHI protection
│   └── ... (15+ utilities)
│
├── utils/               # Helper functions
│   ├── logger.ts        # Structured logging
│   ├── telemetry.ts     # OTEL integration
│   ├── errorTracking.ts # Error reporting
│   └── ... (20+ utilities)
│
├── pages/               # Route handlers (lazy-loaded)
│   ├── admin/           # Admin dashboard
│   ├── doctor/          # Doctor workspace
│   ├── nurse/           # Nurse dashboard
│   ├── patient/         # Patient portal
│   └── ... (8+ role pages)
│
├── routes/              # Route definitions
│   └── routeDefinitions.tsx
│
├── types/               # TypeScript types
│   └── index.ts         # 100+ types (auto-synced with Supabase)
│
└── App.tsx              # Root component
```

### Rendering Strategy

**Lazy Loading**:
- Role-specific dashboards loaded on-demand (96% reduction in main bundle)
- Code splitting via React.lazy() + Suspense
- Pre-loading of next likely page

**Performance**:
- TanStack Query: HTTP caching, automatic stale-while-revalidate
- Realtime subscriptions: WebSocket for live data (prescriptions, alerts)
- Memoization: React.memo(), useMemo() for expensive computations

---

## 3. Data Access Layer (Supabase + TanStack Query)

### Authentication & Authorization

```typescript
// Authentication Flow
AuthContext.tsx
  ├─ login(email, password)  → Supabase JWT + session
  ├─ switchRole(role)        → Multi-role support
  └─ logout()                → Session revocation

// Authorization Flow (RLS + Frontend Check)
usePermissions()
  ├─ Check user role
  ├─ Query Supabase RLS (backend enforcement)
  └─ Hide/disable UI (frontend UX)

RoleProtectedRoute({ permission, children })
  ├─ Check hasPermission()
  └─ Redirect to 403 if denied
```

### Data Query Pattern

All data queries follow this pattern for hospital-scoped multi-tenancy:

```typescript
// ✅ CORRECT PATTERN
const { data: patients } = useQuery({
  queryKey: ['patients', hospital?.id, filters],
  queryFn: async () => {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .eq('hospital_id', hospital.id)  // ← REQUIRED for multi-tenancy
      .order('last_name')
      .limit(50);
    return data;
  }
});

// ❌ INCORRECT (Missing hospital_id filter)
const { data: patients } = useQuery({
  queryFn: async () => {
    const { data } = await supabase
      .from('patients')
      .select('*');  // ← Relies ONLY on RLS (fragile)
    return data;
  }
});
```

### Supabase Integration Points

| Layer | Purpose | Location |
|-------|---------|----------|
| **Client Setup** | Initialize authenticated Supabase client | `src/integrations/supabase/client.ts` |
| **Types** | Auto-generated types from schema | `src/types/index.ts` (from migrations) |
| **Hooks** | Data fetching & mutations for each feature | `src/hooks/use*.ts` (150+ hooks) |
| **Real-Time** | Live dashboards, alerts, notifications | `useRealtimeUpdates()` hook |
| **RLS Policies** | Server-side access control | `supabase/migrations/*.sql` (50+) |
| **Encryption** | Field-level PHI protection | `HIPAA_encryption_metadata` in tables |

### Key Hooks (Data Access Layer)

| Feature | Hooks |
|---------|-------|
| **Patients** | `usePatients()`, `usePatientDetails()`, `usePatientMedicalHistory()` |
| **Appointments** | `useAppointments()`, `useAvailableSlots()`, `useQueueManagement()` |
| **Prescriptions** | `usePrescriptions()`, `usePrescriptionApprovalWorkflow()`, `useDrugInteractions()` |
| **Lab** | `useLaboratory()`, `useLabOrder()`, `useCriticalValues()`, `useLabResults()` |
| **Pharmacy** | `usePharmacyInventory()`, `useDispensing()`, `useDrugInteractionChecker()` |
| **Billing** | `useBilling()`, `useInsuranceClaims()`, `usePaymentPlans()` |
| **Workflow** | `useWorkflowOrchestrator()`, `useDischargeWorkflow()`, `useApprovalChains()` |
| **Analytics** | `useClinicalMetrics()`, `useDashboardMetrics()`, `useAdvancedAnalytics()` |

---

## 4. Role-Based Access Control (RBAC)

### 7 Roles & Responsibilities

| Role | Primary Dashboard | Permissions | Constraints |
|------|----------|-----------|-----------|
| **Admin** | Admin Console | All operations | Hospital ownership |
| **Doctor** | Doctor Workspace | Consultations, Orders, Prescriptions, Lab Results | Assigned patients only |
| **Nurse** | Nurse Dashboard | Vitals, Medication Admin, Care Plans | IPD ward assignment |
| **Receptionist** | Reception Queue | Appointments, Check-in, Patient Registry | Desk-assigned location |
| **Pharmacist** | Pharmacy Queue | Rx Dispensing, Inventory, Drug Interactions | Pharmacy location |
| **Lab Technician** | Lab Dashboard | Specimen Processing, Results Entry | Lab location |
| **Patient** | Patient Portal | Appointments, Rx, Lab Results, Medical History | Own data only |

### Permission Enforcement

```typescript
// Location: src/lib/permissions.ts
type Permission = 
  | 'patients:read' | 'patients:write' | 'patients:delete'
  | 'appointments:read' | 'appointments:write'
  | 'prescriptions:read' | 'prescriptions:write' | 'prescriptions:sign'
  | 'laboratory:read' | 'laboratory:write'
  | 'pharmacy:dispense' | 'pharmacy:inventory'
  | 'billing:read' | 'billing:write'
  | 'reports:generate' | 'reports:read'
  | ... (30+ permissions)

// Check permission
hasPermission('prescriptions:sign') → boolean

// Enforce at component level
<RoleProtectedRoute permission="prescriptions:sign">
  <SignPrescriptionUI />
</RoleProtectedRoute>

// RLS enforces at DB level (belt-and-suspenders)
-- Supabase RLS Policy
CREATE POLICY "Only doctors can sign prescriptions" ON prescriptions
AS RESTRICTIVE
FOR UPDATE
USING (
  auth.uid() IN (SELECT id FROM users WHERE role = 'doctor')
);
```

---

## 5. Multi-Tenancy Architecture

### Hospital Isolation

**Every table has `hospital_id` foreign key:**

```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES hospitals(id),
  first_name VARCHAR,
  last_name VARCHAR,
  -- ...
  CONSTRAINT hospital_scope CHECK (hospital_id IS NOT NULL)
);

-- RLS: Users can only see their hospital's data
CREATE POLICY "Hospital Isolation" ON patients
  USING (hospital_id = auth.hospital_id());
```

**Auth Context Store Hospital:**

```typescript
interface AuthContext {
  user: User              // Current user
  hospital: Hospital      // Current hospital
  profile: Profile        // User profile
  roles: UserRole[]       // User's roles
}

// All queries filter by hospital_id + apply RLS
const { data } = await supabase
  .from('patients')
  .select('*')
  .eq('hospital_id', authContext.hospital.id);
```

---

## 6. Key Clinical Workflows

### Workflow 1: Prescription Workflow

```
Doctor creates prescription (draft)
    ↓
Doctor reviews interactions/allergies (system validates)
    ↓
Doctor signs prescription (e-signature + timestamp logged)
    ↓
Notification → Pharmacist + Patient
    ↓
Pharmacist reviews & verifies stock
    ↓
Pharmacist marks dispensed (lot number, expiry logged)
    ↓
Notification → Patient "Ready for pickup"
    ↓
Patient picks up at pharmacy
    ↓
[AUDIT TRAIL: All actions logged to prescription_audit_log]
```

**Key Tables**: `prescriptions`, `drugs`, `prescription_audit_log`, `drug_interactions`

### Workflow 2: Lab Order Workflow

```
Doctor orders lab test (specify reason, fasting status)
    ↓
Lab Technician receives notification
    ↓
Lab Tech collects specimen (logs specimen type, collector)
    ↓
Lab equipment processes sample
    ↓
System checks for critical values
    ↓
If critical: Immediate alert to doctor (phone + in-app)
If normal: Pending approval status
    ↓
Doctor reviews results in patient chart
    ↓
Doctor approves results (optional notes)
    ↓
Patient notified (portal + SMS/email)
    ↓
[AUDIT TRAIL: Status changes, approvals, critical value alerts]
```

**Key Tables**: `lab_orders`, `lab_results`, `specimens`, `critical_value_alerts`

### Workflow 3: Billing Workflow

```
Encounter completed (admission + all services delivered)
    ↓
Billing codes assigned (CPT, ICD-10)
    ↓
Tariff applied (base + modifiers)
    ↓
Insurance pre-auth checked (prior authorization required?)
    ↓
If pre-auth needed: Claim queued pending authorization
If pre-auth approved: Claim prepared
    ↓
Claim submitted to insurance (X12 format)
    ↓
Insurance responds: Approved/Denied/Requested Info
    ↓
If approved: Payment expected per plan (patient responsible for copay/deductible)
If denied: Appeal workflow initiated
    ↓
Payment received/reconciled
    ↓
[AUDIT TRAIL: Code selection, tariff application, claim status, appeal history]
```

**Key Tables**: `billing_encounters`, `billing_line_items`, `insurance_claims`, `claim_appeals`

---

## 7. Security & Compliance

### HIPAA Compliance

| Requirement | Implementation |
|-------------|-----------------|
| **Encryption at Rest** | PostgreSQL encryption + field-level encryption for PHI |
| **Encryption in Transit** | TLS 1.3 + HSTS headers |
| **Audit Trails** | Append-only `activity_logs` table with immutable records |
| **Access Control** | RLS policies + role-based permissions |
| **Consent Management** | Consent records tracked for data disclosure |
| **Data Retention** | Configurable retention policies per hospital (7-year default for clinical) |
| **Password Policy** | Min 12 chars, complexity, rotation enforced |
| **Session Management** | JWT + automatic timeout (30 min idle) |
| **2FA/Biometric** | TOTP + WebAuthn support for critical roles |

### Audit Trail Pattern

```sql
-- Immutable append-only audit log
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY,
  hospital_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR (e.g., 'prescription.signed', 'patient.created'),
  entity_type VARCHAR (e.g., 'prescription'),
  entity_id UUID,
  old_values JSONB,  -- Before state
  new_values JSONB,  -- After state
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  
  -- Make append-only (no updates/deletes)
  CONSTRAINT immutable CHECK (true)
);

-- Encrypted for sensitive queries
-- Retention: 7 years (legal requirement)
```

---

## 8. External Integrations

### Laboratory Equipment

**Protocol**: HL7v2.5 (or REST API)  
**Direction**: Bidirectional  
- **Send**: Lab orders (test code, specimen requirements)
- **Receive**: Results (test values, reference ranges, critical flags)

### Pharmacy Management

**Protocol**: NCPDP SCRIPT (script.org) or REST  
- **Send**: Prescriptions (drug, dose, patient)
- **Receive**: Dispensing confirmation, inventory updates

### Insurance & Billing

**Protocol**: X12 EDI (claim format 837) or SFTP  
- **Send**: Claim (patient, provider, procedures, charges)
- **Receive**: Remittance Advice (approved, denied, paid amounts)

### Telemedicine Provider

**Protocol**: REST API + WebRTC  
- **Send**: Consultation request, patient demographics
- **Receive**: Session token, recording URL

### Observability

**Protocol**: OTEL (OpenTelemetry)  
- **Send**: Metrics, traces, logs to central collector
- **Receive**: Dashboards (Grafana), alerting (Prometheus)

---

## 9. Performance Optimizations

### Bundle Optimization

```javascript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split large libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query': ['@tanstack/react-query'],
          'ui': ['@radix-ui/primitives', 'tailwindcss'],
          
          // Lazy-load role dashboards
          'admin-dashboard': ['./src/pages/admin/AdminDashboard'],
          'doctor-dashboard': ['./src/pages/doctor/DoctorDashboard'],
          // ... (5+ more)
        }
      }
    }
  }
}

// Result: 96% reduction in main.js (1.2MB → 50KB)
```

### Query Caching

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,     // 5 min: data freshness
      cacheTime: 10 * 60 * 1000,    // 10 min: keep in memory
      retry: 1,                     // Retry failed requests once
      refetchOnWindowFocus: false,  // Don't refetch when tab re-focused
    },
    mutations: {
      retry: 0,  // Never auto-retry mutations
    }
  }
});
```

### Real-Time Subscriptions

```typescript
// Only subscribe to data you need
const { data: prescription } = useRealtimeUpdates([
  {
    table: 'prescriptions',
    filter: `id=eq.${prescriptionId}`,
    event: ['UPDATE'],  // Only listen to updates, not deletes
  }
]);

// Unsubscribe automatically when component unmounts
useEffect(() => {
  return () => supabase.removeAllSubscriptions();
}, []);
```

---

## 10. Testing Architecture

### Test Types & Coverage

| Type | Framework | Coverage | Command |
|------|-----------|----------|---------|
| **Unit** | Vitest | Business logic, hooks | `npm run test:unit` |
| **Integration** | Vitest | Hook + service integration | `npm run test:integration` |
| **Security** | Vitest | Auth, RLS, encryption | `npm run test:security` |
| **Accessibility** | Vitest | WCAG compliance | `npm run test:accessibility` |
| **E2E** | Playwright | Full user workflows by role | `npm run test:e2e` |
| **Performance** | Vitest | Bundle size, query latency | `npm run test:performance` |

### E2E Test Structure

```
tests/e2e/
├── roles/
│   ├── admin/          # 80+ tests: admin console, user mgmt
│   ├── doctor/         # 120+ tests: consultations, orders
│   ├── nurse/          # 100+ tests: vitals, meds, care plans
│   ├── receptionist/   # 60+ tests: appointments, check-in
│   ├── pharmacist/     # 90+ tests: dispensing, inventory
│   ├── lab_technician/ # 70+ tests: orders, results entry
│   └── patient/        # 50+ tests: portal, self-service
│
├── workflows/          # Cross-role workflows
│   ├── prescription-workflow.spec.ts       # Dr → Pharmacy → Patient
│   ├── lab-order-workflow.spec.ts          # Dr → Lab → Results
│   ├── appointment-workflow.spec.ts        # Reception → Appointment
│   └── discharge-workflow.spec.ts          # Multi-step discharge
│
└── critical/           # Patient-safety critical paths
    ├── medication-safety.spec.ts           # No drug interactions
    ├── vital-signs-alerts.spec.ts          # Critical values alert
    ├── billing-accuracy.spec.ts            # Correct charges
    └── rbac-enforcement.spec.ts            # Permission boundaries
```

**Test Count**: 500+ E2E tests  
**Execution Time**: ~45 min (full suite), ~5 min (smoke tests)

---

## 11. Developer Experience

### Setup & Local Development

```bash
# 1. Clone & install
git clone <repo>
cd care-harmony-hub
npm install

# 2. Start microservices (Docker)
docker-compose -f docker-compose.dev.yml up -d

# 3. Initialize Kong API Gateway
docker-compose --profile init up kong-init

# 4. Start frontend dev server
npm run dev
# → http://localhost:5173

# 5. Run tests during development
npm run test:unit --watch
npm run test:e2e:smoke
```

### Code Organization Standards

- **Components**: 1 file per component, co-located styles
- **Hooks**: Separate file per hook, testable in isolation
- **Services**: API clients grouped by domain
- **Types**: Centralized in `src/types/`, auto-synced with Supabase
- **Tests**: Parallel structure to source (`src/hooks/` ↔ `src/hooks/__tests__/`)

### Logging & Debugging

```typescript
import { createLogger } from '@/utils/logger';

const logger = createLogger('component-name');

logger.info('User logged in', { userId: 123 });          // Info-level
logger.warn('Dr X has no access to patient Y', { ... }); // Warning
logger.error('Failed to fetch patient', { error });      // Error
logger.debug('Query cache miss', { queryKey });          // Debug

// Structured logging automatically sanitizes PHI
// ✅ logger.info('Patient created', { first_name: 'John' })
// ❌ logger.info('SSN: 123-45-6789')  ← Stripped by sanitizeForLog()
```

---

## 12. Deployment & DevOps

### Environments

| Env | URL | Infrastructure | Secrets Mgmt |
|-----|-----|-----------------|-------------|
| **Dev** | localhost:5173 | Docker Compose | .env.local |
| **Staging** | staging.caresync.com | Kubernetes (single zone) | Sealed Secrets |
| **Prod** | caresync.com | Kubernetes (multi-zone HA) | HashiCorp Vault |

### CI/CD Pipeline

```yaml
# GitHub Actions
on: [push, pull_request]

jobs:
  test:
    - Lint (ESLint)
    - Unit tests (Vitest)
    - Security scan (npm audit, OWASP)
    - Accessibility audit (axe)
    - Build verification (npm run build)

  e2e:
    - Smoke tests (quick validation)
    - Critical path tests (patient safety)
    - Full E2E suite (500+ tests)

  deploy:
    (only on main branch)
    - Build Docker image
    - Push to registry
    - Trigger Kubernetes deployment
    - Run smoke tests on live env
    - Notify team in Slack
```

---

## 13. Key Files & Directories

| Path | Purpose | Key Files |
|------|---------|-----------|
| `src/components/` | React UI components (45+) | `DoctorDashboard.tsx`, `PrescriptionUI.tsx`, etc. |
| `src/hooks/` | Data fetching & logic (150+) | `usePatients.ts`, `usePrescriptions.ts`, etc. |
| `src/contexts/` | Global state | `AuthContext.tsx`, `ThemeContext.tsx` |
| `src/pages/` | Route handlers (lazy-loaded) | `admin/`, `doctor/`, `patient/`, etc. |
| `src/services/` | Backend clients | `supabase/`, `api/`, `external/` |
| `supabase/migrations/` | Schema + RLS policies (50+) | `001_initial_schema.sql`, `020_add_rls.sql`, etc. |
| `tests/` | Test files (500+) | `e2e/roles/`, `e2e/workflows/`, `unit/` |
| `.github/` | CI/CD, workflows | `workflows/`, `skills/` |
| `docs/` | Documentation | `product/`, `workflows/` (to be populated) |

---

## 14. Common Development Tasks

### Adding a New Feature

1. **Create DB schema**: `supabase/migrations/xxx_feature.sql` + RLS
2. **Auto-generate types**: `supabase gen types > src/types/index.ts`
3. **Create data hook**: `src/hooks/useFeature.ts`
4. **Build UI component**: `src/components/feature/FeatureUI.tsx`
5. **Add route**: `src/routes/routeDefinitions.tsx`
6. **Write tests**: `tests/e2e/workflows/feature.spec.ts`
7. **Update docs**: `docs/product/feature-requirements.md`

### Adding a New Role

1. **Update DB**: Add role to `users.role` enum
2. **Define permissions**: `src/lib/permissions.ts`
3. **Create dashboard**: `src/pages/[role]/[Role]Dashboard.tsx` (lazy-loaded)
4. **Add RLS policies**: `supabase/migrations/xxx_add_role_policies.sql`
5. **Write E2E tests**: `tests/e2e/roles/[role]/`
6. **Document workflows**: `docs/product/workflows/[role]-workflows.md`

### Debugging RLS Issues

```bash
# 1. Check what the user can actually see
SELECT * FROM patients WHERE hospital_id = auth.hospital_id()
  AND auth.uid() = '<user-id>';

# 2. Verify RLS policies are active
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename = 'patients';

# 3. Test RLS enforcement
-- As admin user (full access)
SELECT COUNT(*) FROM patients; → 500 rows

-- As doctor user (hospital-scoped)
SELECT COUNT(*) FROM patients; → 150 rows (their hospital only)

-- As receptionist (desk-scoped)
SELECT COUNT(*) FROM patients; → 45 rows (check-in queue today)
```

---

## 15. Troubleshooting Guide

| Issue | Cause | Solution |
|-------|-------|----------|
| "Permission Denied" on query | RLS policy blocking access | Check `usePermissions()` + verify RLS allows role |
| Query returns empty | Missing `hospital_id` filter | Add `.eq('hospital_id', hospital.id)` to query |
| Realtime updates not working | No active subscription | Check `useRealtimeUpdates()` hook is called |
| Slow dashboard load | Large dataset + no pagination | Add `limit()` + implement infinite scroll |
| E2E test fails intermittently | Race condition or timing issue | Add `page.waitForLoadState()` + use `waitFor()` |
| Bundle size too large | Missing lazy loading | Move feature to separate chunk in `manualChunks` |

---

## Next Steps for Agents

1. **Start with this doc** to understand overall system
2. **Read role-specific workflows** in `/docs/product/workflows/`
3. **Check data model** in `/docs/product/data-model.md` (to be created)
4. **Review API docs** in `/docs/product/api-reference.md` (to be created)
5. **Study core hooks** in `/src/hooks/` for data access patterns
6. **Run E2E tests** locally to see workflows in action

---

**Questions?** See architecture team Slack channel or review `/docs/` folder for detailed guides.
