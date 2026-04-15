# CareSync HIMS - Development Standards & Best Practices

**Last Updated**: April 10, 2026  
**Applies To**: Frontend React/TypeScript development  
**References**: Root [copilot-instructions.md](../../.github/copilot-instructions.md), [DEVELOPER_GUIDELINES_HP3.md](../../DEVELOPER_GUIDELINES_HP3.md)

---

## 📚 Quick Navigation

This document establishes coding standards and patterns. For context, see:

- **Project Playbook**: [.github/copilot-instructions.md](../../.github/copilot-instructions.md)
- **Developer Guidelines**: [DEVELOPER_GUIDELINES_HP3.md](../../DEVELOPER_GUIDELINES_HP3.md)
- **System Architecture**: [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)
- **Existing Code Examples**: See [src/components/](../../src/components/) and [src/lib/hooks/](../../src/lib/lib/hooks/)

---

## 🎯 Core Principles

### 1. **Clean Code & SOLID**
- Functions under 50 lines
- Single Responsibility Principle
- Explicit naming for clinical domain
- Reuse hooks and utilities (DRY principle)

### 2. **Type Safety**
- Strict TypeScript mode enabled
- No `any` types (use proper types or `unknown`)
- Discriminated unions for complex types
- Generic constraints for shared utilities

### 3. **Error Handling & Security**
- Wrap all Supabase calls in try/catch
- Sanitize inputs with `sanitizeForLog()`
- Surface friendly Sonner toasts (no stack traces to users)
- Use `useHIPAACompliance()` for PHI encryption

### 4. **Performance**
- Use TanStack Query caching with hospital-scoped keys
- Lazy-load routes to reduce bundle
- Paginate heavy lists
- Memoize selectors and derived data

---

## 📝 Code Style Guide

### TypeScript Configuration

**tsconfig.json** - Strict mode ENABLED:
```json
{
  "strict": true,
  "noImplicitAny": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true
}
```

**All new code must pass strict mode compilation.**

---

### Naming Conventions

#### Components
```typescript
// ✅ Descriptive PascalCase
export function PatientVitalSignsEntry() { }
export function PrescriptionApprovalModal() { }

// ❌ Avoid vague names
export function VitalsForm() { }
export function Modal() { }
```

#### Hooks
```typescript
// ✅ Clear domain + action
export function usePatients() { }
export function usePrescriptionApproval() { }
export function useLabOrderWorkflow() { }

// ❌ Avoid generic names
export function useData() { }
export function useFetch() { }
```

#### Types & Interfaces
```typescript
// ✅ Descriptive names reflecting domain
interface PatientVitalSigns {
  bloodPressure: string;
  heartRate: number;
  temperature: number;
}

type WorkflowStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

// ❌ Avoid single-letter or generic names
interface VS { }
type Status = any;
```

---

### File Organization

#### Component Structure
```
src/components/
├── audit/                        # Audit trail features
│   ├── AuditTimeline.tsx
│   ├── AmendmentModal.tsx
│   └── AuditTimeline.test.tsx
├── pharmacy/                     # Pharmacy features
│   ├── PrescriptionCreate.tsx
│   ├── PharmacyDispense.tsx
│   └── __tests__/
├── common/                       # Shared UI components
│   ├── ErrorBoundary.tsx
│   ├── StandardizedFormField.tsx
│   └── Button.tsx
└── ui/                          # Base UI primitives (shadcn/ui)
    ├── button.tsx
    ├── dialog.tsx
    └── form.tsx
```

#### Hooks Structure
```
src/lib/hooks/
├── appointments.ts             # Appointments data & mutations
├── pharmacy.ts                 # Prescriptions & medications
├── patients.ts                 # Patient data management
├── useFormStandardized.ts      # Standardized form hook
└── ...
```

#### Utilities Structure
```
src/utils/
├── sanitize.ts                 # PHI sanitization
├── edgeCaseResilience.ts       # Null/undefined safety
└── validation.ts               # Input validation
```

---

## 🎨 React Component Patterns

### Functional Component with Hooks

```typescript
// ✅ GOOD: Clear, concise, type-safe
interface PatientCheckinProps {
  appointmentId: string;
  onSuccess?: (vitalsSigns: VitalSigns) => void;
}

export function PatientCheckin({
  appointmentId,
  onSuccess
}: PatientCheckinProps) {
  const { vitals, isSaving, saveVitals } = useVitalSigns(appointmentId);
  
  return (
    <div className="space-y-4">
      {/* JSX */}
    </div>
  );
}

export default PatientCheckin;
```

### Form Component with Validation

**Use Standard Form Hook**:
```typescript
export function MedicationOrderForm({ prescriptionId }: Props) {
  const { form, handleSubmit, isSubmitting } = useFormStandardized({
    schema: medicationOrderSchema,
    onSubmit: async (data) => {
      // handle submission
    }
  });

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      <StandardizedFormField
        form={form}
        name="dailyDosage"
        label="Daily Dosage (mg)"
        placeholder="Enter dosage"
      />
      <button disabled={isSubmitting}>Order</button>
    </form>
  );
}
```

**See**: [formValidation.ts](../../src/utils/formValidation.ts) for 30+ pre-built schemas

---

## 🔧 Data Fetching & State Management

### Using TanStack Query (React Query)

```typescript
// ✅ Custom hook with TanStack Query
export function usePrescriptions(hospitalId: string) {
  const { status, data, error, refetch } = useQuery({
    queryKey: ['prescriptions', hospitalId], // Hospital-scoped key!
    queryFn: () => fetchPatientPrescriptions(hospitalId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2
  });

  const mutation = useMutation({
    mutationFn: (prescription: Prescription) =>
      updatePrescriptionStatus(prescription),
    onSuccess: () => refetch() // Refresh cache after mutation
  });

  return { prescriptions: data, status, error, updateStatus: mutation.mutate };
}
```

**Key Rules**:
- Use hospital-scoped cache keys to prevent data leaks
- Set appropriate `staleTime` to balance freshness vs performance
- Invalidate/refetch after mutations
- Handle both `status` ('pending', 'error', 'success') and data

---

### Error Handling

```typescript
// ✅ Proper Error Handling
export function LabResultApproval({ resultId }: Props) {
  const approveMutation = useMutation({
    mutationFn: approveLabResult,
    onError: (error) => {
      // Sanitize error before logging
      const sanitized = sanitizeForLog(error);
      console.error('Lab result approval failed:', sanitized);
      
      // Show friendly toast (no stack trace to user)
      toast.error('Could not approve lab result. Please try again.');
    },
    onSuccess: () => {
      toast.success('Lab result approved');
    }
  });

  return (
    <button onClick={() => approveMutation.mutate()}>
      {approveMutation.isPending ? 'Approving...' : 'Approve'}
    </button>
  );
}
```

---

## 🔐 Security & HIPAA

### Input Sanitization

```typescript
// ✅ Always sanitize user input
import { sanitizeForLog } from '@/utils/sanitize';

function handlePatientSearch(searchTerm: string) {
  const sanitized = sanitizeForLog(searchTerm); // Removes PHI markers
  console.log(`User searched: ${sanitized}`);
}
```

### PHI Protection

```typescript
// ✅ Use encryption hooks for sensitive data
export function PatientProfileView({ patientId }: Props) {
  const { encryptedData, decrypted } = useHIPAACompliance(patientId);
  
  // Display only decrypted data in UI
  return <div>{decrypted.firstName} {decrypted.lastName}</div>;
}
```

### Role-Based Access

```typescript
// ✅ Check permissions before showing UI
import { usePermissions } from '@/hooks/usePermissions';

export function LabResultApprovalButton({ resultId }: Props) {
  const { canApproveLabResults } = usePermissions();
  
  if (!canApproveLabResults) {
    return <span className="text-gray-400">No permission</span>;
  }

  return <button>Approve Result</button>;
}
```

---

## ✅ Testing Standards

### Unit Tests with Vitest

```typescript
// ✅ Test with proper mocks and assertions
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePatients } from '@/lib/hooks/patients';

describe('usePatients', () => {
  it('should fetch patients on mount', async () => {
    const { result } = renderHook(() => usePatients());
    
    await act(async () => {
      await result.current.refetch();
    });
    
    expect(result.current.patients).toBeDefined();
    expect(result.current.status).toBe('success');
  });

  it('should handle errors gracefully', async () => {
    const { result } = renderHook(() => usePatients());
    
    expect(result.current.error).toBeNull();
  });
});
```

**Run Tests**:
```bash
npm run test:unit           # All unit tests
npm run test:security      # Security-focused tests
npm run test:accessibility # A11y tests
npm run test:integration   # Integration tests
npm run test:e2e          # End-to-end (Playwright)
```

---

## 📦 Import Path Conventions

### ✅ Use Alias Paths

```typescript
// ✅ GOOD - Clear, maintainable
import { usePatients } from '@/lib/hooks/patients';
import { sanitizeForLog } from '@/utils/sanitize';
import { PatientCard } from '@/components/common/PatientCard';
import { useAuth } from '@/contexts/AuthContext';

// ❌ BAD - Confusing relative paths
import { usePatients } from '../../../../lib/hooks/patients';
import { sanitizeForLog } from '../../../../utils/sanitize';
```

**Configured in tsconfig.json**:
```json
{
  "paths": {
    "@/*": ["./src/*"]
  }
}
```

---

## 🚀 Performance Optimization

### Memoization

```typescript
// ✅ Memoize expensive computations
const MedicationList = React.memo(function MedicationList({ medications }: Props) {
  return medications.map(med => <MedicationCard key={med.id} medication={med} />);
});

// ✅ UseMemo for derived data
const sortedMedications = useMemo(
  () => medications.sort((a, b) => a.name.localeCompare(b.name)),
  [medications]
);
```

### Code Splitting

```typescript
// ✅ Lazy-load less-critical routes
const LabResultsPage = lazy(() => import('@/pages/LabResults'));
const BillingPage = lazy(() => import('@/pages/Billing'));

// ✅ Wrap with Suspense
<Suspense fallback={<Spinner />}>
  <Outlet />
</Suspense>
```

---

## 📄 Documentation in Code

### JSDoc for Public APIs

```typescript
/**
 * Fetches prescriptions for a specific patient and validates them
 * against drug interactions and clinical guidelines.
 *
 * @param patientId - The ID of the patient
 * @param options - Query options (caching, retry behavior)
 * @returns Query result with prescriptions and error information
 *
 * @example
 * const { data: prescriptions, error } = usePrescriptions(patientId);
 * if (error) console.error('Failed to fetch:', error.message);
 *
 * @security Automatically scoped to hospital via RLS policy
 */
export function usePrescriptions(
  patientId: string,
  options?: QueryOptions
) { }
```

---

## 🚫 Code Review Checklist

Before submitting PRs, ensure:

- [ ] **TypeScript**: All strict mode checks pass (`npx tsc --noEmit`)
- [ ] **Naming**: Clear, domain-specific names (no `data`, `temp`, `thing`)
- [ ] **Types**: No `any` types (use specific types or `unknown`)
- [ ] **Errors**: All async errors handled with try/catch
- [ ] **Security**: PHI sanitized before logging
- [ ] **Performance**: No unnecessary re-renders, proper memoization
- [ ] **Testing**: Unit tests for new hooks/utilities
- [ ] **Import Paths**: All use `@/` alias path convention
- [ ] **Comments**: Brief domain-specific comments only (not obvious code)
- [ ] **Build**: `npm run build` completes without errors
- [ ] **Tests**: `npm run test:unit` all passing

---

## Further Reading

- **Form Standardization**: [FORMS_DEVELOPMENT_GUIDE.md](../../FORMS_DEVELOPMENT_GUIDE.md)
- **Error Handling Guide**:src/lib/errorHandling.ts documentation
- **HIPAA Compliance**: [RBAC_PERMISSIONS.md](./RBAC_PERMISSIONS.md#hipaa-compliance)
- **System Architecture**: [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)
- **Project Playbook**: [copilot-instructions.md](../../.github/copilot-instructions.md)

---

**Last Audit**: April 10, 2026  
**Status**: ✅ Current  
**Version**: 1.0  
**Applies To**: All frontend development going forward
