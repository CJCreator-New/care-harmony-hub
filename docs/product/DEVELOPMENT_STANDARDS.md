# CareSync HIMS - Development Standards & Best Practices

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026  
**Audience**: Frontend developers, backend developers, QA engineers, DevOps

---

## Table of Contents

1. [Code Organization Standards](#code-organization-standards)
2. [TypeScript & Type Safety](#typescript--type-safety)
3. [React Component Patterns](#react-component-patterns)
4. [Data Access & Queries](#data-access--queries)
5. [Error Handling](#error-handling)
6. [Security Best Practices](#security-best-practices)
7. [Performance Guidelines](#performance-guidelines)
8. [Testing Standards](#testing-standards)
9. [Commit & PR Guidelines](#commit--pr-guidelines)

---

## Code Organization Standards

### Frontend Directory Structure

```
src/
├── App.tsx                    # Root component
├── main.tsx                   # Entry point
│
├── components/                # React components
│   ├── admin/                # Admin-specific UI
│   ├── appointments/         # Appointment feature
│   ├── clinical/             # Clinical components (vitals, etc)
│   ├── dashboard/            # 7 role dashboards (lazy-loaded)
│   ├── layout/               # Shared layout components
│   ├── ui/                   # shadcn primitives
│   └── common/               # Globally reused components
│
├── hooks/                     # Custom React hooks (150+)
│   ├── usePatients.ts
│   ├── usePrescriptions.ts
│   ├── usePermissions.ts
│   └── useAIClinicalSuggestions.ts
│
├── contexts/                  # React Context
│   ├── AuthContext.tsx       # User, role, hospital
│   ├── ThemeContext.tsx      # Dark/light theme
│   └── TestingContext.tsx    # E2E test helpers
│
├── services/                  # API clients
│   ├── supabase/             # Supabase client setup
│   ├── api/                  # REST API calls
│   └── external/             # Third-party integrations
│
├── integrations/              # External system integrations
│   ├── telemedicine/         # Video consultation
│   ├── ai/                   # AI clinical support
│   └── laboratory/           # Lab equipment
│
├── lib/                       # Utilities library
│   ├── permissions.ts        # RBAC logic
│   ├── validation.ts         # Input validation
│   ├── encryption.ts         # PHI encryption/decryption
│   ├── sanitization.ts       # Data sanitization
│   └── formatters.ts         # Date, currency formatting
│
├── utils/                     # Helper functions
│   ├── logger.ts             # Structured logging
│   ├── errorTracking.ts      # Error reporting
│   ├── telemetry.ts          # OpenTelemetry
│   └── correlationId.ts      # Request tracing
│
├── pages/                     # Route page components
│   ├── admin/
│   ├── doctor/
│   ├── patient/
│   └── ... (role pages)
│
├── routes/                    # Route definitions
│   └── routeDefinitions.tsx
│
├── types/                     # TypeScript types
│   └── index.ts              # Auto-synced with Supabase
│
├── __tests__/                 # Unit tests
│   └── [Feature].test.ts
│
└── App.css                    # Global styles
```

### Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Components | PascalCase | `PatientDashboard.tsx`, `VitalSignsChart.tsx` |
| Hooks | camelCase, prefix `use` | `usePatients()`, `usePrescriptionApproval()` |
| Types/Interfaces | PascalCase | `Patient`, `Prescription`, `LabResult` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES`, `CACHE_TIMEOUT_MS` |
| Variables | camelCase | `patientId`, `isLoading`, `handleSubmit` |
| Files | Match export name | `Patient.ts` exports `export default Patient` |
| Directories | kebab-case | `src/components/patient-forms/` |

---

## TypeScript & Type Safety

### Type Definitions

```typescript
// ✅ CORRECT: Type everything
interface Patient {
  id: UUID;
  hospital_id: UUID;
  first_name: string;
  last_name: string;
  date_of_birth: Date;
  drug_allergies: Array<{ drug: string; reaction: string }>;
}

// ❌ WRONG: Implicit any
const patient = useQuery({
  queryFn: async () => {
    const { data } = await supabase.from('patients').select();
    return data;  // ← Type is 'any', lose type safety
  }
});

// ✅ CORRECT: Explicit return type
const { data: patients } = useQuery<Patient[]>({
  queryFn: async (): Promise<Patient[]> => {
    const { data } = await supabase
      .from('patients')
      .select('*')
      .returns<Patient[]>();
    return data || [];
  }
});
```

### Generated Types from Supabase

```typescript
// Supabase auto-generates types from schema
// Location: src/types/index.ts (regenerated after migrations)

import { Database } from './supabase';

type Patient = Database['public']['Tables']['patients']['Row'];
type Prescription = Database['public']['Tables']['prescriptions']['Row'];
type LabResult = Database['public']['Tables']['lab_results']['Row'];

// Regenerate after migrations:
// supabase gen types typescript > src/types/index.ts
```

### strict Mode Always Enabled

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "strictPropertyInitialization": true,
    "strictBindCallApply": true,
    "alwaysStrict": true
  }
}
```

---

## React Component Patterns

### Functional Component Template

```typescript
// ✅ CORRECT PATTERN
import { FC, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';

interface PatientListProps {
  filterStatus?: 'active' | 'inactive';
  limit?: number;
}

export const PatientList: FC<PatientListProps> = ({
  filterStatus = 'active',
  limit = 50
}) => {
  const { hasPermission } = usePermissions();
  const [page, setPage] = useState(1);
  
  // Data fetching
  const { data: patients, isLoading, error } = useQuery({
    queryKey: ['patients', filterStatus, page],
    queryFn: async () => {
      const { data } = await supabase
        .from('patients')
        .select('*')
        .eq('status', filterStatus)
        .order('last_name')
        .range((page - 1) * limit, page * limit - 1);
      return data || [];
    }
  });
  
  if (!hasPermission('patients:read')) {
    return <div>Access Denied</div>;
  }
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h2>Patients</h2>
      {patients?.map(p => (
        <div key={p.id}>{p.first_name} {p.last_name}</div>
      ))}
      <Button onClick={() => setPage(p => p + 1)}>Next</Button>
    </div>
  );
};
```

### Custom Hook Pattern

```typescript
// ✅ CORRECT HOOK PATTERN
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabase';
import { useAuthContext } from '@/contexts/AuthContext';

interface UsePatientOptions {
  enabled?: boolean;
  staleTime?: number;
}

export function usePatients(options: UsePatientOptions = {}) {
  const { hospital } = useAuthContext();
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options;
  
  return useQuery({
    queryKey: ['patients', hospital?.id],
    queryFn: async () => {
      if (!hospital?.id) return [];
      
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('hospital_id', hospital.id)  // ← MULTI-TENANCY
        .order('last_name');
      
      if (error) throw error;
      return data || [];
    },
    enabled: enabled && !!hospital?.id,
    staleTime
  });
}
```

### Error Boundary Pattern

```typescript
// ✅ ERROR BOUNDARY
import { FC, ReactNode } from 'react';
import { createLogger } from '@/utils/logger';

const logger = createLogger('ErrorBoundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('Component error caught', {
      error: error.message,
      componentStack: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong</div>;
    }
    return this.props.children;
  }
}
```

---

## Data Access & Queries

### Query Key Convention

```typescript
// ✅ CORRECT: Hierarchical query keys
const queryKeys = {
  patients: ['patients'] as const,
  patientsList: (hospitalId: UUID) => [...queryKeys.patients, 'list', hospitalId] as const,
  patientsDetail: (id: UUID) => [...queryKeys.patients, 'detail', id] as const,
  
  prescriptions: ['prescriptions'] as const,
  prescriptionsList: (hospitalId: UUID) => [...queryKeys.prescriptions, 'list', hospitalId],
  prescriptionsForPatient: (patientId: UUID) => [...queryKeys.prescriptions, 'patient', patientId],
};

// Usage
useQuery({
  queryKey: queryKeys.patientsList(hospital.id),
  queryFn: () => fetchPatients(hospital.id)
});

// Invalidate
queryClient.invalidateQueries({ queryKey: queryKeys.patients });
```

### Mutation Pattern

```typescript
// ✅ CORRECT: Mutation with optimistic updates
export function useCreatePrescription() {
  const queryClient = useQueryClient();
  const { hospital } = useAuthContext();
  
  return useMutation({
    mutationFn: async (data: Partial<Prescription>) => {
      const { data: result, error } = await supabase
        .from('prescriptions')
        .insert({
          ...data,
          hospital_id: hospital?.id,
          created_at: new Date()
        })
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    },
    onError: (error) => {
      logger.error('Prescription creation failed', { error });
    }
  });
}
```

---

## Error Handling

### Logging Pattern

```typescript
import { createLogger } from '@/utils/logger';

const logger = createLogger('ComponentName');

// Info level
logger.info('Patient loaded', { patientId });

// Warning level
logger.warn('No prescription available', { patientId, reason: 'Allergic reaction' });

// Error level  
logger.error('Failed to fetch results', { patientId, error });

// Debug level (development only)
logger.debug('Query cache miss', { queryKey: 'patients-123' });
```

### Error Toast Pattern

```typescript
import { toast } from '@/components/ui/sonner';

try {
  const { data } = await supabase.from('patients').select();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  
  // ❌ WRONG: Leaking PHI
  // toast.error(`Failed for patient ${patientId}: ${message}`);
  
  // ✅ CORRECT: Sanitized message
  toast.error('Failed to load patient data. Please try again.');
  
  logger.error('Patient fetch failed', { error });
}
```

### Permission Denied Pattern

```typescript
// ✅ CORRECT: Handle gracefully
const { hasPermission } = usePermissions();

if (!hasPermission('laboratory:approve_results')) {
  return (
    <Alert>
      <AlertTitle>Access Denied</AlertTitle>
      <AlertDescription>
        You don't have permission to approve lab results.
        Contact your administrator for access.
      </AlertDescription>
    </Alert>
  );
}
```

---

## Security Best Practices

### Input Validation

```typescript
import { parseISO } from 'date-fns';
import * as z from 'zod';

// ✅ CORRECT: Zod validation
const PatientSchema = z.object({
  first_name: z.string().min(1).max(128),
  last_name: z.string().min(1).max(128),
  date_of_birth: z.string().pipe(z.coerce.date()),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\+?[\d\s\-()]{10,20}$/).optional(),
});

const validatedData = PatientSchema.parse(formData);
```

### PHI Protection

```typescript
// ❌ WRONG: Logging PHI
logger.info('Created patient', { ssn: '123-45-6789' });

// ✅ CORRECT: Sanitized logging
import { sanitizeForLog } from '@/lib/sanitization';

logger.info('Created patient', {
  patientId: patient.id,
  ...sanitizeForLog(patient)  // Strips SSN, etc
});
```

### HIPAA Encryption

```typescript
// ✅ CORRECT: Encrypt PHI before storage
import { encryptPHI, decryptPHI } from '@/lib/encryption';

// On write
const encrypted = await encryptPHI(patient.first_name);

// On read
const decrypted = await decryptPHI(encrypted);
```

---

## Performance Guidelines

### Lazy Loading Routes

```typescript
// ✅ CORRECT: Lazy load role dashboards
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'));
const DoctorDashboard = lazy(() => import('./doctor/DoctorDashboard'));

// Result: 96% bundle size reduction
```

### Query Caching

```typescript
// ✅ CORRECT: Set appropriate cache times
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min: data considered fresh
      gcTime: 10 * 60 * 1000,        // 10 min: keep in memory
      retry: 1,
      refetchOnWindowFocus: false
    }
  }
});
```

### Memoization Pattern

```typescript
// ✅ CORRECT: Memoize expensive computations
import { useMemo } from 'react';

export function PatientAnalytics({ patients }: Props) {
  const stats = useMemo(() => {
    return {
      total: patients.length,
      avgAge: patients.reduce((sum, p) => sum + getAge(p.dob), 0) / patients.length
    };
  }, [patients]);
  
  return <div>Total: {stats.total}</div>;
}
```

---

## Testing Standards

### Unit Test Pattern

```typescript
// tests/hooks/usePatients.test.ts
import { renderHook, waitFor } from '@testing-library/react';
import { usePatients } from '@/hooks/usePatients';
import * as supabaseModule from '@/services/supabase';

vi.mock('@/services/supabase');

test('usePatients fetches patientlist for hospital', async () => {
  vi.spyOn(supabaseModule, 'supabase', 'get').mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            data: [{ id: '1', first_name: 'John' }]
          })
        })
      })
    })
  } as any);
  
  const { result } = renderHook(() => usePatients(), {
    wrapper: AuthProvider  // Provide context
  });
  
  await waitFor(() => {
    expect(result.current.data).toHaveLength(1);
  });
});
```

### E2E Test Pattern

```typescript
// tests/e2e/roles/doctor/create-prescription.spec.ts
import { test, expect } from '@playwright/test';

test('Doctor can create and sign prescription', async ({ page }) => {
  // Login as doctor
  await page.goto('/login');
  await page.fill('[name="email"]', 'doctor@hospital.com');
  await page.fill('[name="password"]', 'password');
  await page.click('button:has-text("Login")');
  
  await page.goto('/prescriptions/new');
  
  // Create prescription
  await page.fill('[name="drug"]', 'Metformin');
  await page.fill('[name="dose"]', '500');
  await page.selectOption('[name="unit"]', 'mg');
  
  // Check interactions
  await expect(page.locator('text=No interactions found')).toBeVisible();
  
  // Sign
  await page.click('button:has-text("Sign")');
  
  // Verify success
  await expect(page.locator('text=Prescription signed')).toBeVisible();
});
```

---

## Commit & PR Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>

type: feat, fix, docs, style, refactor, perf, test, chore
scope: Component/feature name
subject: <50 chars, imperative mood, no period
```

### Example Commits

```
feat(prescriptions): add drug interaction checking

Implement real-time drug interaction validation when
doctor enters prescription. Checks against patient's
current medications and allergies. Shows red/yellow/green
alerts with suggestion for alternatives.

Closes #234

---

fix(vital-signs): prevent critical value duplicate alerts

Critical values were being triggered twice due to race
condition in real-time subscription. Now uses debounce
to prevent duplicate alerts within 5 seconds.

Fixes #891

---

test(lab-results): add e2e test for critical value workflow

Add E2E test verifying doctor receives phone + in-app alert
within 1 min of critical lab result. Tests both approval and
escalation paths.

Related to #567
```

### PR Checklist

- [ ] Tests pass locally (`npm run test:e2e:smoke`)
- [ ] TypeScript compiles without errors
- [ ] ESLint passes (`npm run lint`)
- [ ] No PHI or secrets committed
- [ ] Documentation updated
- [ ] Permissions/RLS verified (if touching auth)
- [ ] Performance impact reviewed
- [ ] Cross-browser tested (Chrome, Firefox, Safari)
- [ ] Accessibility verified (WCAG 2.1 AA)

---

## Code Review Checklist

### Frontend Reviews

- [ ] Types are complete (no `any`)
- [ ] Error handling present + graceful
- [ ] Permissions checked before UI rendered
- [ ] PHI never logged or exposed in errors
- [ ] Performance: <2s latency, no N+1 queries
- [ ] Accessibility: Keyboard nav, screen reader compatible
- [ ] Tests: Unit + E2E coverage for main paths
- [ ] Style: Consistent with shadcn components

### Backend/RLS Reviews

- [ ] RLS policies enforce hospital isolation
- [ ] Permissions mapped correctly
- [ ] No data leakage across hospitals
- [ ] Audit trail captures action
- [ ] Encryption applied to PHI
- [ ] Backup recovery tested

---

## Troubleshooting Guide

| Issue | Diagnosis | Fix |
|-------|-----------|-----|
| "Permission Denied" on read | Missing permission check | Add `hasPermission()` + RLS policy |
| Query returns empty | Hospital_id filter missing | Add `.eq('hospital_id', hospital.id)` |
| Component re-renders endlessly | Missing dependency in useEffect | Add all deps to dependency array |
| E2E test timing out | Race condition | Add `page.waitForLoadState()` |
| Slow query | Missing index | Add index on filter/sort columns |
| Bundle size > 1MB | No lazy loading | Move feature to separate chunk |

---

## Resources & Links

- **TypeScript**: https://www.typescriptlang.org/docs/
- **React**: https://react.dev/
- **TanStack Query**: https://tanstack.com/query/latest
- **Supabase**: https://supabase.com/docs/
- **shadcn/ui**: https://ui.shadcn.com/

---

**Questions?** Refer to architecture team or check `/docs/` for detailed guides.
