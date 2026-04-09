# CareSync HIMS Codebase Structure Explorer

**Generated:** April 9, 2026  
**Purpose:** Comprehensive overview of service organization, repository patterns, client initialization, authentication, routes, and query patterns.

---

## Quick Directory Tree: `src/services/`

```
src/services/
├── ai/                                    # AI/ML feature services
├── aiServices/                            # AI service implementations
├── analytics/                             # Analytics & metrics
├── testing/                               # Test utilities
├── advancedAnalytics.ts                   # Advanced analytics service
├── aiTriageService.ts                     # AI-powered triage
├── blockchainAuditService.ts              # Blockchain audit trail
├── clinicalApiClient.ts                   # Clinical API wrapper
├── clinicalDecisionSupport.ts             # CDS engine
├── continuousImprovement.ts               # CI/continuous monitoring
├── enterpriseScaling.ts                   # Enterprise scaling logic
├── fhirInteroperability.ts                # FHIR R4/R5 mapping
├── futureProofing.ts                      # Future-proofing utilities
├── health-check.ts                        # Kubernetes health probe
├── health-check.test.ts                   # Health check tests
├── identityResolver.ts                    # MPI/identity resolution
├── insuranceIntegration.ts                # Insurance claim integration
├── iotIntegration.ts                      # IoT device integration
├── machineLearningService.ts              # ML predictions
├── messagingService.ts                    # Async messaging
├── metrics.ts                             # Prometheus-compatible metrics
├── metrics.test.ts                        # Metrics tests
├── notificationAdapter.ts                 # Multi-channel notifications
├── performanceOptimization.ts             # Performance tuning
├── populationHealthService.ts             # Population health analytics
├── unifiedRecordService.ts                # Unified medical record view
├── voiceNLPService.ts                     # Voice transcription & NLP
└── workflowOrchestration.ts               # Workflow state machine
```

---

## Current Architecture Patterns

### 1. **Services Organization - NOT Traditional Repository Pattern**

**Pattern Used:** Domain-driven utility services + React Query hooks  
**Key Principles:**
- Services are **stateless utility classes** or functions (NOT ORM repositories)
- Data access happens in **React hooks** using TanStack Query
- Services handle business logic, orchestration, external integrations

**Example: Clinical API Client** (`clinicalApiClient.ts`)
```typescript
class ClinicalApiClient {
  private authHeaders: Record<string, string> = {};

  setAuthHeaders(session: { access_token?: string } | null) {
    // Set headers with API key + Bearer token
  }

  async getConsultations(params?: {...}): Promise<{data: Consultation[]; total: number}> {
    // Fetch from clinical microservice
  }

  async createConsultation(data: CreateConsultation): Promise<Consultation> {
    // Create via API
  }
}

export const clinicalClient = new ClinicalApiClient();
```

---

### 2. **Why NOT Traditional Repository Pattern?**

| Aspect | Current Approach | Traditional Repo |
|--------|------------------|-----------------|
| **Data Access Layer** | React Query hooks | Repository classes |
| **Query Caching** | TanStack Query (client-side) | Database-level |
| **Hospital Scoping** | Built into hook logic | Repository method param |
| **Type Safety** | Supabase auto-generated types | Manually defined DTOs |
| **Pagination** | Hook-level (`page`, `limit`) | Repository method param |
| **Encryption** | HIPAA hooks (`useHIPAACompliance`) | Repository constructor |

---

## Key Architecture Components

### 3. **Supabase Client Initialization**

**Location:** `src/integrations/supabase/client.ts`

```typescript
// Auto-generated; do not edit directly
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Session management: Expires-at check + refresh token validation
const safeStorage: Storage = {
  getItem(key: string) {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedSupabaseSession;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const isExpired = parsed.expires_at <= nowInSeconds;
    const hasRefreshToken = parsed.refresh_token?.length > 0;

    if (isExpired || !hasRefreshToken) {
      window.localStorage.removeItem(key);
      return null;
    }
    return raw;
  },
  // ... other storage methods
};

// Timeout handling: 10s default abort
const safeFetch = async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
  const controller = new AbortController();
  const timeoutMs = 10000; // 10 second timeout
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: safeStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    fetch: safeFetch,
  },
});
```

**Key Features:**
- ✅ **Type-safe**: Auto-generated `Database` type from Supabase schema
- ✅ **Session expiration check**: Validates `expires_at` and `refresh_token` on retrieval
- ✅ **Network timeout**: 10s abort signal to prevent hanging requests
- ✅ **Auto-refresh**: `autoRefreshToken: true` keeps session alive

**Usage (deprecated redirect):**
```typescript
// ❌ OLD: src/lib/supabase.ts
export { supabase } from '@/integrations/supabase/client';

// ✅ NEW: Import directly
import { supabase } from '@/integrations/supabase/client';
```

---

### 4. **Authentication & Middleware Structure**

**Location:** `src/contexts/AuthContext.tsx`

```typescript
interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile;           // User profile with name, role
  hospital: Hospital | null;  // Multi-tenant scoping
  roles: UserRole[];          // Can have multiple roles
  primaryRole: UserRole | null;

  // Auth methods
  login(email: string, password: string): Promise<{error: Error | null}>;
  signup(...): Promise<{error: Error | null; userId?: string}>;
  logout(): Promise<void>;
  switchRole(targetRole: UserRole): Promise<{error: Error | null}>;

  // Biometric & password methods
  isBiometricAvailable(): boolean;
  registerBiometric(userName: string, userDisplayName: string): Promise<boolean>;
  validatePassword(password: string): Promise<{isValid: boolean; errors: string[]}>;
}

// Role priority (first match is primary)
const ROLE_PRIORITY: UserRole[] = [
  'admin',        // System administrator
  'doctor',       // Prescriber
  'nurse',        // Care coordinator
  'receptionist', // Scheduler
  'pharmacist',   // Dispenser
  'lab_technician', // Lab analyzer
  'patient',      // Self-service portal
];
```

**Special Features:**
- **Multi-role support**: Users can have `admin + doctor` roles, with `primaryRole` for UI defaults
- **Hospital context**: `hospital.id` automatically scoped to all queries via hooks
- **Biometric auth**: Built-in support for fingerprint/face unlock
- **Session timeout**: `useSessionTimeout()` hook for security

---

### 5. **Route Organization & Access Control**

**Location:** `src/middleware/routeGuard.ts` + `src/routes/routeDefinitions.tsx`

```typescript
// Route configuration with permissions
interface RouteConfig {
  path: string;
  allowedRoles: UserRole[];
  requiredPermission?: Permission;
  description: string;
}

const EXPLICIT_ROUTE_CONFIG: RouteConfig[] = [
  { path: '/settings', allowedRoles: ['admin'], requiredPermission: 'settings' },
  { path: '/pharmacy', allowedRoles: ['admin', 'pharmacist'], requiredPermission: 'pharmacy' },
  { path: '/laboratory', allowedRoles: ['admin', 'doctor', 'nurse', 'lab_technician'] },
  { path: '/patient/portal', allowedRoles: ['patient'], requiredPermission: 'portal' },
];

export function checkRouteAccess(
  path: string,
  userRoles: UserRole[],
): { allowed: boolean; denyReason?: string } {
  const routeConfig = PROTECTED_ROUTE_CONFIG.find(config => path.startsWith(config.path));

  if (!routeConfig) return { allowed: true };

  const hasRequiredRole = hasAnyAllowedRole(userRoles, routeConfig.allowedRoles);
  if (!hasRequiredRole) {
    return {
      allowed: false,
      denyReason: `Required roles: ${routeConfig.allowedRoles.join(', ')}`,
    };
  }

  // Additional permission check (e.g., 'pharmacy:write')
  if (routeConfig.requiredPermission) {
    if (!hasPermissionForAnyRole(userRoles, routeConfig.requiredPermission)) {
      return { allowed: false, denyReason: `Permission denied: ${routeConfig.requiredPermission}` };
    }
  }

  return { allowed: true };
}
```

**Route Registration:**
```typescript
// Lazy-loaded pages with RoleProtectedRoute wrapper
function ProtectedRouteWrapper({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isProfileReady, roles, pendingRoleSelection } = useAuth();

  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (pendingRoleSelection) return <RoleSelectionPage />;

  return (
    <RoleProtectedRoute allowedRoles={allowedRoles}>
      {children}
    </RoleProtectedRoute>
  );
}
```

---

### 6. **Query Patterns: Patients, Prescriptions, Appointments**

#### **Patient Queries** (`usePatients.ts`)

```typescript
export function usePatients(options?: { page?: number; limit?: number }) {
  const { hospital } = useAuth();
  const { decryptPHI } = useHIPAACompliance(); // HIPAA §164.312(e)(2)(ii)
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 50;
  const offset = (page - 1) * limit;

  return useQuery({
    queryKey: ['patients', hospital?.id, page, limit], // Hospital-scoped cache key
    queryFn: async () => {
      if (!hospital?.id) return { patients: [], total: 0 };

      // Get count for pagination
      const { count, error: countError } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('hospital_id', hospital.id)
        .eq('is_active', true);

      // Fetch paginated data with optimized columns
      const { data, error } = await supabase
        .from('patients')
        .select(PATIENT_COLUMNS.list + ',encryption_metadata') // Predefined columns
        .eq('hospital_id', hospital.id)
        .eq('is_active', true)
        .order('last_name', { ascending: true })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Decrypt PHI for each patient
      const decryptedPatients = await Promise.all(
        (data || []).map(async (patient: any) => {
          if (patient.encryption_metadata) {
            const decrypted = await decryptPHI(patient);
            return decrypted;
          }
          return patient;
        })
      );

      return { patients: decryptedPatients, total: count || 0 };
    },
  });
}
```

**Key Patterns:**
- ✅ **Hospital scoping**: `.eq('hospital_id', hospital.id)` on every query
- ✅ **Column optimization**: `PATIENT_COLUMNS.list` reduces payload by 40-60%
- ✅ **PHI encryption**: Decrypt sensitive fields post-query
- ✅ **Query caching**: Hospital + page in cache key prevents reloads

**PATIENT_COLUMNS Presets:**
```typescript
export const PATIENT_COLUMNS = {
  list: 'id, mrn, first_name, last_name, date_of_birth, gender, phone, email, blood_type, is_active, created_at',
  detail: '... full patient record including address, allergies, chronic_conditions ...',
  search: 'id, mrn, first_name, last_name, email, phone',
  minimal: 'id, first_name, last_name, mrn',
};
```

---

#### **Prescription Queries** (`usePrescriptions.ts`)

```typescript
export function usePrescriptions(patientId?: string) {
  const { hospital } = useAuth();
  const queryClient = useQueryClient();

  // F2.4 — HIPAA §164.312(e)(2)(ii): Decrypt PHI on prescription items
  async function decryptPrescriptionItems(prescription: any): Promise<any> {
    if (!prescription.items?.length) return prescription;
    
    const decryptedItems = await Promise.all(
      prescription.items.map(async (item: any) => {
        if (!item.encryption_metadata) return item;
        
        const decrypted = { ...item };
        for (const [field, encData] of Object.entries(item.encryption_metadata)) {
          if (typeof decrypted[field] === 'string' && decrypted[field].startsWith('__ENCRYPTED__')) {
            try {
              decrypted[field] = await fieldEncryption.decryptField(encData);
            } catch {
              decrypted[field] = '[Encrypted]';
            }
          }
        }
        return decrypted;
      })
    );
    return { ...prescription, items: decryptedItems };
  }

  // Query: Fetch prescriptions with related items
  const prescriptionsQuery = useQuery({
    queryKey: ['prescriptions', hospital?.id, patientId],
    queryFn: async () => {
      if (!hospital?.id) return [];

      let query = supabase
        .from('prescriptions')
        .select(`
          ${PRESCRIPTION_COLUMNS.detail},
          patient:patients(id, first_name, last_name, mrn),
          items:prescription_items(...)
        `)
        .eq('hospital_id', hospital.id);

      if (patientId) {
        query = query.eq('patient_id', patientId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;

      // Decrypt sensitive fields
      return Promise.all(data.map(decryptPrescriptionItems));
    },
  });

  // Mutation: Dispense prescription (approve for pharmacy)
  const dispenseMutation = useMutation({
    mutationFn: async (prescriptionId: string) => {
      const { data, error } = await supabase
        .from('prescriptions')
        .update({ status: 'dispensed', dispensed_at: new Date().toISOString() })
        .eq('id', prescriptionId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
      toast.success('Prescription dispensed');
    },
    onError: (error) => {
      toast.error(`Failed to dispense: ${error.message}`);
    },
  });

  return {
    prescriptions: prescriptionsQuery.data || [],
    isLoading: prescriptionsQuery.isLoading,
    dispense: dispenseMutation.mutate,
  };
}
```

**Prescription Status Flow:**
```
'pending' → 'approved' → 'dispensed' → 'collected'
           OR 'rejected'   OR 'partial'
```

---

#### **Appointment Queries** (`useAppointments.ts`)

```typescript
export function useAppointments(date?: string) {
  const { hospital } = useAuth();
  
  return useQuery({
    queryKey: ['appointments', hospital?.id, date],
    queryFn: async () => {
      if (!hospital?.id) return [];

      let query = supabase
        .from('appointments')
        .select(`
          ${APPOINTMENT_COLUMNS.list},
          patient:patients(id, first_name, last_name, mrn, phone),
          doctor:profiles!appointments_doctor_id_fkey(id, first_name, last_name)
        `)
        .eq('hospital_id', hospital.id)
        .order('scheduled_date', { ascending: true })
        .order('scheduled_time', { ascending: true });

      if (date) {
        query = query.eq('scheduled_date', date);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data;
    },
  });
}
```

**Appointment Types & Priorities:**
| Status | Meaning |
|--------|---------|
| `scheduled` | Awaiting check-in |
| `checked_in` | Patient arrived |
| `in_progress` | Doctor seeing patient |
| `completed` | Consultation finished |
| `cancelled` | User cancelled |
| `no_show` | Patient didn't arrive |

| Priority | SLO |
|----------|-----|
| `emergency` | <5 min |
| `urgent` | <15 min |
| `high` | <30 min |
| `normal` | <60 min |
| `low` | <120 min |

---

## Column Selection Presets (`lib/queryColumns.ts`)

**Why?** Reduces payload by 40-60%; improves cache hit ratio.

```typescript
export const APPOINTMENT_COLUMNS = {
  list: 'id, scheduled_date, scheduled_time, status, appointment_type, patient_id, doctor_id, duration_minutes, queue_number',
  detail: 'id, scheduled_date, scheduled_time, status, appointment_type, priority, patient_id, doctor_id, duration_minutes, reason_for_visit, notes, check_in_time, start_time, end_time, queue_number, created_at, updated_at',
  calendar: 'id, scheduled_date, scheduled_time, status, appointment_type, patient_id, doctor_id, duration_minutes',
  queue: 'id, scheduled_date, scheduled_time, status, priority, patient_id, queue_number, check_in_time',
};

export const CONSULTATION_COLUMNS = {
  list: 'id, status, current_step, created_at, patient_id, doctor_id, appointment_id, started_at',
  detail: '... full clinical record ...',
  summary: 'id, chief_complaint, status, created_at, patient_id, doctor_id',
};

export const LAB_ORDER_COLUMNS = {
  list: 'id, test_name, status, priority, ordered_at, patient_id, ordered_by',
  detail: 'id, test_name, status, priority, ordered_at, completed_at, results, patient_id, ordered_by, processed_by',
  pending: 'id, test_name, priority, ordered_at, patient_id',
};

// Utility to get dynamic columns
export function getColumnsForView(table: string, view: 'list' | 'detail' | 'search' = 'list'): string {
  const columnSets = {
    patients: PATIENT_COLUMNS,
    appointments: APPOINTMENT_COLUMNS,
    // ... etc
  };
  return columnSets[table as keyof typeof columnSets]?.[view] || '*';
}
```

---

## Error Handling & Security Patterns

### Standardized Error Flow

```typescript
try {
  const { data, error } = await supabase.from('table').select().eq('id', id);
  
  if (error) {
    // RLS violations, schema errors, etc.
    logger.error('Query failed', { error: error.message, code: error.code });
    throw error;
  }
  
  return data;
} catch (err) {
  // Sanitize before logging (strip PHI)
  const sanitized = sanitizeForLog(err instanceof Error ? err.message : String(err));
  logger.error('Operation failed', { detail: sanitized });
  
  // Show friendly toast, never leak stack trace
  toast.error('Failed to load data. Please try again.');
  throw err;
}
```

### Sanitization Utilities

```typescript
// Strip PHI from logs
sanitizeForLog(message: string): string
// ❌ Input:  "Patient John Doe (MRN 123456) loaded"
// ✅ Output: "Patient [REDACTED] ([REDACTED]) loaded"

// Sanitize Postgrest filter values
sanitizePostgrestFilterValue(value: any): string
// Escapes quotes, prevents injection in .eq(), .like(), etc.
```

---

## Multi-Tenant Scoping Pattern

**Every query follows this pattern:**

```typescript
// ✅ CORRECT: Hospital-scoped
supabase
  .from('patients')
  .select('*')
  .eq('hospital_id', hospital?.id)  // ALWAYS required
  .eq('is_active', true);

// ❌ DANGEROUS: Missing hospital_id
supabase
  .from('patients')
  .select('*')
  .eq('is_active', true);  // Could leak data across hospitals
```

**RLS Policies enforce this at database level:**
```sql
-- Example RLS policy on patients table
CREATE POLICY "Users can only see patients from their hospital" ON public.patients
  FOR SELECT USING (
    hospital_id = auth.jwt() -> 'hospital_id'::text
  );
```

---

## Summary: Design Decisions

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| **No traditional repositories** | Hooks + TanStack Query = simpler React integration, no ORM overhead | Less suitable for backend-only code |
| **Direct Supabase in hooks** | Type-safe, auto-complete, RLS built-in | Tightly coupled to Supabase |
| **Column presets** | 40-60% payload reduction, faster parsing | Requires maintenance as schema grows |
| **Hospital in context** | Eliminates parameter passing, automatic scoping | Hospital_id passed in every query |
| **PHI encryption per-query** | Field-level control, works with RLS | Decryption overhead per row |
| **React Query caching** | Deduplication, offline support, stale-while-revalidate | Client RAM usage can grow |

---

## Next Steps: Building on These Patterns

### For New Services:
1. Create **domain-specific service class** (e.g., `insuranceService.ts`)
2. Expose methods like `getInsurancePolicies()`, `validateClaim()`
3. **No data persistence** — return data to hook for caching

### For New Queries:
1. Create **hook** in `src/hooks/useFeature.ts`
2. Use **TanStack Query** with `useQuery()` or `useMutation()`
3. **Always filter by** `hospital_id` and user's permitted roles
4. **Decrypt PHI** post-query if sensitive fields present
5. **Use column presets** to optimize field selection

### Example New Hook:
```typescript
// src/hooks/useInsuranceClaims.ts
export function useInsuranceClaims(patientId?: string) {
  const { hospital } = useAuth();

  const { data: claims = [], isLoading, error } = useQuery({
    queryKey: ['insurance-claims', hospital?.id, patientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insurance_claims')
        .select('id, claim_number, status, amount, patient_id, created_at', {
          count: 'exact',
        })
        .eq('hospital_id', hospital?.id)
        .eq('is_active', true);

      if (patientId) {
        // Optional: filter by patient if viewing single record
      }

      if (error) throw error;
      return data;
    },
  });

  return { claims, isLoading, error };
}
```

---

## References

- **Supabase Client:** `src/integrations/supabase/client.ts`
- **Auth Context:** `src/contexts/AuthContext.tsx`
- **Query Patterns:** `src/hooks/usePatients.ts`, `usePrescriptions.ts`, `useAppointments.ts`
- **Column Presets:** `src/lib/queryColumns.ts`
- **Route Guards:** `src/middleware/routeGuard.ts`
- **Services:** `src/services/clinicalApiClient.ts`, `metrics.ts`, `health-check.ts`
