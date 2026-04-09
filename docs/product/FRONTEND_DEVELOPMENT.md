# Frontend Development Guide — CareSync HIMS

**Document Version**: 1.2.1  
**Last Updated**: April 8, 2026  
**Audience**: Frontend developers, UI developers, React component authors

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Component Architecture](#component-architecture)
3. [State Management](#state-management)
4. [Custom Hooks Library](#custom-hooks-library)
5. [Styling & Theming](#styling--theming)
6. [Forms & Validation](#forms--validation)
7. [Error Handling & User Feedback](#error-handling--user-feedback)
8. [Testing Frontend Code](#testing-frontend-code)

---

## Project Structure

### Directory Organization

```
src/
├── components/              # Reusable UI components (role-agnostic)
│   ├── shared-ui/          # shadcn/ui wrappers + customizations
│   │   ├── Button.tsx      # Enhanced button with loading states
│   │   ├── Dialog.tsx      # Modal dialog wrapper
│   │   ├── Form.tsx        # React Hook Form integration
│   │   └── ...
│   ├── vitals/             # Vital signs capture components
│   │   ├── VitalSignsInput.tsx
│   │   ├── VitalSignsDisplay.tsx
│   │   └── CriticalVitalAlert.tsx
│   ├── medications/        # Medication-related components
│   │   ├── MedicationForm.tsx
│   │   ├── MedicationList.tsx
│   │   └── DrugInteractionWarning.tsx
│   ├── patients/           # Patient UI components
│   │   ├── PatientCard.tsx
│   │   ├── PatientSearch.tsx
│   │   └── PatientHistory.tsx
│   └── layout/             # Layout components
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── MainLayout.tsx
│
├── pages/                  # Page-level components (route views)
│   ├── auth/
│   │   ├── LoginPage.tsx
│   │   ├── RegisterPage.tsx
│   │   └── 2FAPage.tsx
│   ├── dashboard/
│   │   ├── DoctorDashboard.tsx
│   │   ├── PatientDashboard.tsx
│   │   ├── NurseDashboard.tsx
│   │   └── AdminDashboard.tsx
│   ├── clinical/
│   │   ├── ConsultationPage.tsx
│   │   ├── PrescriptionPage.tsx
│   │   └── LabOrderPage.tsx
│   └── appointments/
│       ├── AppointmentBooking.tsx
│       ├── AppointmentList.tsx
│       └── AppointmentDetails.tsx
│
├── hooks/                  # Custom React hooks (data & logic)
│   ├── useAuth.ts          # Authentication state
│   ├── usePatient.ts       # Patient data fetching
│   ├── useAppointments.ts  # Appointment queries
│   ├── usePrescriptions.ts # Prescription commands
│   ├── useHIPAACompliance.ts
│   ├── usePermissions.ts   # Role-based access
│   ├── useNotifications.ts # Toast notifications
│   └── useFormValidation.ts
│
├── contexts/               # React Context providers
│   ├── AuthContext.tsx     # Auth state + hospital scoping
│   ├── NotificationContext.tsx
│   └── PermissionContext.tsx
│
├── lib/                    # Utility functions (no React)
│   ├── api-client.ts       # Supabase client & helpers
│   ├── sanitize.ts         # Input sanitization (PHI-safe)
│   ├── encryption.ts       # Client-side encryption utils
│   ├── validators.ts       # Form validation rules
│   ├── formatters.ts       # Date/number/currency formatting
│   └── constants.ts        # App-wide constants
│
├── styles/                 # Global stylesheets
│   ├── globals.css         # Tailwind + customizations
│   ├── themes.css          # Light/dark theme
│   └── animations.css      # Reusable animations
│
├── types/                  # TypeScript type definitions
│   ├── index.ts            # Global types
│   ├── patient.ts          # Patient entity types
│   ├── appointment.ts      # Appointment types
│   ├── prescription.ts     # Prescription types
│   └── api.ts              # API response types
│
├── utils/                  # Utility functions (organized by domain)
│   ├── date-utils.ts       # Date parsing/formatting
│   ├── string-utils.ts     # String manipulation
│   ├── array-utils.ts      # Array operations
│   └── error-utils.ts      # Error handling helpers
│
├── workers/                # Web Workers (background processing)
│   ├── encryption.worker.ts # CPU-intensive encryption
│   └── csv-parser.worker.ts # Large file parsing
│
├── App.tsx                 # Root component + routing
├── main.tsx                # Entry point
└── vite-env.d.ts           # Vite environment types

KEY PRINCIPLES:
├─ components/ = UI only (no business logic)
├─ hooks/ = Data fetching & state (React-aware)
├─ lib/ & utils/ = Pure functions (no React dependency)
├─ pages/ = Route containers (compose hooks + components)
└─ contexts/ = Global state (Auth, permissions, notifications)
```

---

## Component Architecture

### Component Organization

```
COMPONENT TYPES:

1. Presentational Components
   └─ Pure UI, props-only, no hooks
   └─ Example: Button, Badge, Card
   └─ Testable: Easy to snapshot test
   └─ Reusable: Works with any data

2. Container Components
   └─ Hooks + data fetching, compose presentational
   └─ Example: PatientList (renders list of patients)
   └─ Manages: Loading, error, data states
   └─ Passes: Data as props to child components

3. Page Components
   └─ Route-level containers
   └─ Compose global hooks (auth, permissions)
   └─ Handle: Redirects, breadcrumbs, page title

EXAMPLE: Patient Search Container

Presentational component (reusable):

// components/PatientSearch.tsx
interface PatientSearchProps {
  patients: Patient[];
  onSelect: (patient: Patient) => void;
  isLoading: boolean;
  error?: string;
}

export function PatientSearch(props: PatientSearchProps) {
  const [query, setQuery] = useState('');
  const filtered = props.patients.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="patient-search">
      <input
        type="text"
        placeholder="Search patients..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={props.isLoading}
      />
      
      {props.error && (
        <div className="error">{props.error}</div>
      )}
      
      {props.isLoading ? (
        <Skeleton />
      ) : (
        <ul>
          {filtered.map(p => (
            <li key={p.id}>
              <button onClick={() => props.onSelect(p)}>
                {p.name} (DOB: {formatDate(p.dob)})
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

Container component (data fetching):

// components/PatientSearchContainer.tsx
export function PatientSearchContainer() {
  const { hospitalId } = useAuth();
  const { data: patients, isLoading, error } = usePatients({
    hospital_id: hospitalId
  });

  const handleSelectPatient = (patient: Patient) => {
    navigate(`/patient/${patient.id}`);
  };

  return (
    <PatientSearch
      patients={patients ?? []}
      onSelect={handleSelectPatient}
      isLoading={isLoading}
      error={error?.message}
    />
  );
}

BENEFITS:
├─ Presentational component testable in isolation
├─ Easy to reuse in different data contexts
├─ Clear separation of concerns
└─ Debugging easier (data logic separate from render logic)
```

### Component Patterns

```
PATTERN 1: Render Props (for conditional rendering)

// Display critical vital alert if value out of range
<VitalSignAlert value={140} normalRange={[90, 120]}>
  {({ isCritical, color }) => (
    <div style={{ color }}>
      {isCritical ? '⚠️ HIGH' : '✓ Normal'}
    </div>
  )}
</VitalSignAlert>

PATTERN 2: Composition (preferred, simpler)

// Same logic, simpler syntax
const isCritical = value > 120;
return (
  <div style={{ color: isCritical ? 'red' : 'green' }}>
    {isCritical ? '⚠️ HIGH' : '✓ Normal'}
  </div>
);

PATTERN 3: Higher-Order Component (for cross-cutting concerns)

// Wrap component to add auth check
function withAuthRequired<P extends object>(
  Component: React.ComponentType<P>
) {
  return (props: P) => {
    const { user } = useAuth();
    
    if (!user) {
      return <Navigate to="/login" />;
    }
    
    return <Component {...props} />;
  };
}

// Usage
const ProtectedConsultation = withAuthRequired(ConsultationPage);

PATTERN 4: Compound Components (complex UIs)

// Complex component with internal coordination
<ConsultationForm>
  <ConsultationForm.PatientInfo />
  <ConsultationForm.VitalsSection />
  <ConsultationForm.AssessmentSection />
  <ConsultationForm.SubmitButton />
</ConsultationForm>

Benefit: Clear hierarchy, less prop drilling

ANTI-PATTERN: Prop Drilling

// ❌ BAD - Props passed through 5 levels
<Doctor>
  <Clinic>
    <AppointmentList>
      <AppointmentItem>
        <PatientInfo hospitalId={hospitalId} />
      </PatientItem>
    </AppointmentList>
  </Clinic>
</Doctor>

// ✅ GOOD - Use context
const ClinicContext = createContext();
<ClinicProvider>
  <Doctor> ... </Doctor>
</ClinicProvider>

// Inside component:
const { hospitalId } = useContext(ClinicContext);
```

---

## State Management

### Local vs. Global State

```
STATE HIERARCHY:

┌─────────────────────────────────────────────────────┐
│ Global State (Context/Zustand)                      │
│ └─ Authentication (user, roles, hospital)          │
│ └─ Permissions (what can user do)                  │
│ └─ Notifications (toasts, modals)                  │
│ └─ Theme (light/dark mode)                         │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│ Server State (TanStack Query / SWR)                 │
│ └─ Patient list (fetched from API)                 │
│ └─ Appointment details (live data)                 │
│ └─ Lab results (shared between users)              │
│ └─ Automatic caching & invalidation                │
└─────────────────────────────────────────────────────┘
           ↓
┌─────────────────────────────────────────────────────┐
│ Local State (useState)                              │
│ └─ Form inputs (before submission)                 │
│ └─ UI state (modal open/closed)                    │
│ └─ Expanded/collapsed sections                     │
│ └─ Dropdown menu visibility                        │
└─────────────────────────────────────────────────────┘

DECISION TREE:

Does data come from API server?
  ├─ Yes → Use TanStack Query (auto cache invalidation)
  └─ No → Continue

Is data used by multiple pages/components?
  ├─ Yes → Consider Context or Zustand (global)
  └─ No → Continue

Will data change frequently?
  ├─ Yes → Real-time subscription (useEffect on Supabase)
  └─ No → Continue

Store in local useState component state
```

### TanStack Query (React Query)

```
FOR SERVER STATE: Use React Query

Patient list query:

import { useQuery } from '@tanstack/react-query';

export function usePatients(hospitalId: string) {
  return useQuery({
    queryKey: ['patients', hospitalId],  // Cache key
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('hospital_id', hospitalId);
      
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,  // 5 min (consider data fresh)
    gcTime: 10 * 60 * 1000,    // 10 min (keep in cache)
  });
}

// Usage
function PatientList() {
  const { data: patients, isLoading, error } = usePatients(hospitalId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {patients.map(p => (
        <li key={p.id}>{p.name}</li>
      ))}
    </ul>
  );
}

MUTATION (Write operations):

import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreatePrescription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (prescription: NewPrescription) => {
      const { data, error } = await supabase
        .from('prescriptions')
        .insert([prescription])
        .select();
      
      if (error) throw error;
      return data[0];
    },
    onSuccess: (newPrescription) => {
      // Invalidate queries that might be affected
      queryClient.invalidateQueries({
        queryKey: ['prescriptions', newPrescription.doctor_id]
      });
      
      // Show success toast
      showToast('Prescription created', 'success');
    },
    onError: (error) => {
      showToast(`Error: ${error.message}`, 'error');
    }
  });
}

// Usage
function PrescriptionForm() {
  const { mutate: createPrescription, isPending } = useCreatePrescription();

  const handleSubmit = (data: NewPrescription) => {
    createPrescription(data);
  };

  return (
    <form onSubmit={handleSubmit}>
      ...
      <button disabled={isPending}>
        {isPending ? 'Saving...' : 'Create Prescription'}
      </button>
    </form>
  );
}

KEY BENEFITS:
├─ Automatic caching with stale tracking
├─ Request deduplication (same query twice = 1 request)
├─ Background refetching
├─ Cache invalidation strategies
└─ Integrated loading/error/success states
```

### Global Context (Authentication)

```
AUTHENTICATION CONTEXT:

// contexts/AuthContext.tsx
interface AuthContextType {
  user: User | null;
  hospital: Hospital | null;
  roles: string[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchUserData(session.user.id).then(userData => {
          setUser(userData.user);
          setHospital(userData.hospital);
        });
      }
      setIsLoading(false);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const userData = await fetchUserData(session.user.id);
          setUser(userData.user);
          setHospital(userData.hospital);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setHospital(null);
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      hospital,
      roles: user?.role ? [user.role] : [],
      isLoading,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

HOSPITAL SCOPING:
├─ All queries filtered by: hospital_id = user.hospital_id
├─ All mutations scoped to user's hospital
└─ RLS policies enforce at database level
```

---

## Custom Hooks Library

### Common Hooks Patterns

```
HOOK: useAsync (for async operations)

function useAsync<T>(
  asyncFn: () => Promise<T>,
  immediate = true
) {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [value, setValue] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async () => {
    setStatus('pending');
    setValue(null);
    setError(null);

    try {
      const response = await asyncFn();
      setValue(response);
      setStatus('success');
      return response;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus('error');
    }
  }, [asyncFn]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { status, value, error, execute };
}

// Usage
const { status, value: patients, error } = useAsync(
  () => fetchPatients(hospitalId)
);

---

HOOK: useLocalStorage (persistent state)

function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}

// Usage
const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light');

---

HOOK: usePrevious (compare with previous value)

function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}

// Usage
const previousPatientId = usePrevious(patientId);

if (patientId !== previousPatientId) {
  // Patient changed, reset form
  resetForm();
}

---

HOOK: useDebounce (delay state updates)

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// Usage - Search with API debounce
function PatientSearch({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length > 2) {
      onSearch(debouncedQuery);  // Calls API after 300ms wait
    }
  }, [debouncedQuery, onSearch]);

  return (
    <input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search..."
    />
  );
}
```

### Domain-Specific Hooks

```
// hooks/usePatient.ts
export function usePatient(patientId: string | undefined) {
  return useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single(),
    enabled: !!patientId,
  });
}

// hooks/usePrescriptions.ts
export function usePrescriptions(patientId: string) {
  return useQuery({
    queryKey: ['prescriptions', patientId],
    queryFn: () => supabase
      .from('prescriptions')
      .select('*')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false }),
  });
}

export function useCreatePrescription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rx: NewPrescription) => {
      // Validation done before mutation
      validatePrescription(rx);
      
      const { data, error } = await supabase
        .from('prescriptions')
        .insert([rx]);
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prescriptions'] });
    }
  });
}

// hooks/useHIPAACompliance.ts
export function useHIPAACompliance() {
  return {
    encryptPHI: async (data: any) => {
      return encrypt(data, process.env.HIPAA_KEY);
    },
    decryptPHI: async (encrypted: string) => {
      return decrypt(encrypted, process.env.HIPAA_KEY);
    },
    sanitizeForLog: (data: any) => {
      // Remove PII from logs
      return sanitizeForLog(data);
    }
  };
}

// hooks/usePermissions.ts
export function usePermissions() {
  const { user, roles } = useAuth();

  return {
    can: (permission: string) => {
      return hasPermission(user?.role || '', permission);
    },
    canAccessPatient: (patientId: string) => {
      // Check RLS-enforced permissions
      return checkPatientAccess(user?.id || '', patientId);
    },
    canEditPrescription: (prescription: Prescription) => {
      return prescription.created_by === user?.id ||
             hasPermission(user?.role || '', 'prescriptions:approve');
    }
  };
}
```

---

## Styling & Theming

### Tailwind CSS + shadcn/ui

```
DIRECTORY STRUCTURE:

styles/
├── globals.css        # Tailwind base + custom properties
├── themes.css         # Light/dark theme variables
└── animations.css     # @keyframes definitions

globals.css:

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --primary: 59, 130, 246;      /* blue-500 */
    --primary-muted: 219, 234, 254;
    --destructive: 239, 68, 68;
    --background: 255, 255, 255;
    --foreground: 15, 23, 42;
  }

  [data-theme="dark"] {
    --primary: 96, 165, 250;
    --background: 15, 23, 42;
    --foreground: 248, 250, 252;
  }

  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rounding" 1;
  }
}

@layer components {
  .btn-primary {
    @apply px-4 py-2 rounded-lg bg-primary text-white font-medium
           hover:opacity-90 transition-opacity disabled:opacity-50;
  }

  .vital-critical {
    @apply text-red-600 font-bold animate-pulse;
  }
}

animations.css:

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-4px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes pulse-soft {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

COMPONENT STYLING EXAMPLE:

// components/VitalSignDisplay.tsx
interface VitalSignDisplayProps {
  label: string;
  value: number;
  unit: string;
  normalRange: [number, number];
}

export function VitalSignDisplay({
  label,
  value,
  unit,
  normalRange: [min, max]
}: VitalSignDisplayProps) {
  const isCritical = value < min || value > max;
  const isSevere = value < min - 10 || value > max + 10;

  return (
    <div className="p-4 bg-white rounded-lg border border-gray-200">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-600">
          {label}
        </span>
        
        <div className={cn(
          'text-lg font-bold',
          isSevere && 'animate-pulse text-red-600',
          isCritical && !isSevere && 'text-orange-500',
          !isCritical && 'text-green-600'
        )}>
          {value.toFixed(1)} {unit}
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Normal: {min}–{max} {unit}
      </div>

      {isCritical && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-sm font-medium text-red-700">
            ⚠️ Value out of range
          </p>
        </div>
      )}
    </div>
  );
}

SHADCN/UI INTEGRATION:

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// All shadcn components available in @/components/ui/
// Fully typed with TypeScript
// Customizable via CSS variables
```

---

## Forms & Validation

### React Hook Form + Zod

```
FORM EXAMPLE: Create Prescription

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Validation schema
const prescriptionSchema = z.object({
  patientId: z.string().uuid('Invalid patient'),
  drugName: z.string().min(1, 'Drug required'),
  dose: z.number().min(0.1, 'Dose must be positive'),
  frequency: z.enum(['daily', 'BID', 'TID', 'QID']),
  duration: z.number().min(1, 'At least 1 day'),
  instructions: z.string().optional(),
  refills: z.number().min(0).max(11, 'Max 11 refills')
});

type PrescriptionFormData = z.infer<typeof prescriptionSchema>;

function CreatePrescriptionForm() {
  const { mutate: createRx, isPending } = useCreatePrescription();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset
  } = useForm<PrescriptionFormData>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: {
      frequency: 'daily',
      refills: 0
    }
  });

  const watchedDose = watch('dose');

  const onSubmit = (data: PrescriptionFormData) => {
    createRx(data, {
      onSuccess: () => {
        reset();
        showToast('Prescription created', 'success');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      
      {/* Patient Selection */}
      <div>
        <label className="block text-sm font-medium">Patient</label>
        <input
          {...register('patientId')}
          type="hidden"
        />
        <PatientSearchContainer />
        {errors.patientId && (
          <p className="text-red-500 text-sm">{errors.patientId.message}</p>
        )}
      </div>

      {/* Drug Name */}
      <div>
        <label className="block text-sm font-medium">Drug Name</label>
        <input
          {...register('drugName')}
          className={cn(
            'px-3 py-2 border rounded-lg w-full',
            errors.drugName && 'border-red-500'
          )}
          placeholder="e.g., Metformin HCl"
        />
        {errors.drugName && (
          <p className="text-red-500 text-sm">{errors.drugName.message}</p>
        )}
      </div>

      {/* Dose */}
      <div>
        <label className="block text-sm font-medium">
          Dose (mg)
          {watchedDose > 1000 && (
            <span className="text-orange-500 ml-2">⚠️ High dose</span>
          )}
        </label>
        <input
          {...register('dose', { valueAsNumber: true })}
          type="number"
          step="0.1"
          className="px-3 py-2 border rounded-lg w-full"
        />
        {errors.dose && (
          <p className="text-red-500 text-sm">{errors.dose.message}</p>
        )}
      </div>

      {/* Frequency */}
      <div>
        <label className="block text-sm font-medium">Frequency</label>
        <select {...register('frequency')} className="px-3 py-2 border rounded-lg w-full">
          <option value="daily">Once daily</option>
          <option value="BID">Twice daily</option>
          <option value="TID">Three times daily</option>
          <option value="QID">Four times daily</option>
        </select>
      </div>

      {/* Duration */}
      <div>
        <label className="block text-sm font-medium">Duration (days)</label>
        <input
          {...register('duration', { valueAsNumber: true })}
          type="number"
          min="1"
          className="px-3 py-2 border rounded-lg w-full"
        />
      </div>

      {/* Instructions */}
      <div>
        <label className="block text-sm font-medium">Special Instructions</label>
        <textarea
          {...register('instructions')}
          className="px-3 py-2 border rounded-lg w-full"
          placeholder="e.g., Take with food"
          rows={3}
        />
      </div>

      {/* Refills */}
      <div>
        <label className="block text-sm font-medium">Refills</label>
        <input
          {...register('refills', { valueAsNumber: true })}
          type="number"
          min="0"
          max="11"
          className="px-3 py-2 border rounded-lg w-full"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || isPending}
        className="btn-primary w-full"
      >
        {isPending ? 'Creating...' : 'Create Prescription'}
      </button>
    </form>
  );
}

KEY PATTERNS:
├─ Zod schema defines validation rules
├─ React Hook Form handles state & submission
├─ errors object auto-populated from schema
├─ watch() for real-time conditional rendering
├─ register() connects input to form state
└─ handleSubmit() validates before calling onSubmit
```

---

## Error Handling & User Feedback

### Error Boundaries

```
// components/ErrorBoundary.tsx
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  PropsWithChildren,
  ErrorBoundaryState
> {
  constructor(props: PropsWithChildren) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracking service
    logErrorToSentry(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-bold text-red-700">Something went wrong</h2>
          <p className="mt-2 text-red-600">{this.state.error?.message}</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Usage
<ErrorBoundary>
  <ConsultationPage />
</ErrorBoundary>

ASYNC ERROR HANDLING:

// Hook for handling API errors
export function useAsyncError() {
  const [error, setError] = useState<Error | null>(null);

  const throwAsyncError = useCallback((error: Error | string) => {
    const err = typeof error === 'string' ? new Error(error) : error;
    setError(err);
    
    // Rethrow to trigger Error Boundary
    setTimeout(() => { throw err; }, 0);
  }, []);

  return { error, throwAsyncError };
}
```

### Toast Notifications

```
// hooks/useNotifications.ts
type ToastType = 'success' | 'error' | 'warning' | 'info';

export function useNotifications() {
  const { toast } = useToast();  // shadcn/ui

  return {
    success: (message: string) => toast({
      title: 'Success',
      description: message,
      variant: 'default'
    }),
    error: (message: string) => toast({
      title: 'Error',
      description: message,
      variant: 'destructive'
    }),
    warning: (message: string) => toast({
      title: 'Warning',
      description: message,
      variant: 'outline'
    }),
    info: (message: string) => toast({
      title: 'Info',
      description: message,
      variant: 'default'
    })
  };
}

// Usage in mutations
const { mutate: createRx } = useMutation({
  mutationFn: createPrescription,
  onSuccess: () => {
    showNotification.success('Prescription created');
  },
  onError: (error: Error) => {
    showNotification.error(error.message);
  }
});

VALIDATION ERROR DISPLAY:

{errors.email && (
  <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
    {errors.email.message}
  </div>
)}
```

---

## Testing Frontend Code

### Unit Testing Components

```
// __tests__/VitalSignDisplay.test.tsx
import { render, screen } from '@testing-library/react';
import { VitalSignDisplay } from '@/components/VitalSignDisplay';

describe('VitalSignDisplay', () => {
  it('displays normal vital as green', () => {
    render(
      <VitalSignDisplay
        label="Blood Pressure"
        value={120}
        unit="mmHg"
        normalRange={[90, 140]}
      />
    );

    const display = screen.getByText(/120/);
    expect(display).toHaveClass('text-green-600');
  });

  it('displays critical vital with warning', () => {
    render(
      <VitalSignDisplay
        label="Hemoglobin"
        value={5}
        unit="g/dL"
        normalRange={[13, 17]}
      />
    );

    expect(screen.getByText('⚠️ Value out of range')).toBeInTheDocument();
  });
});

SETUP:

// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});

// src/test/setup.ts
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
```

### E2E Testing

```
// e2e/prescription-flow.spec.ts
import { test, expect } from '@playwright/test';

test('doctor can create and send prescription', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('input[name="email"]', 'doctor@test.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button:has-text("Sign in")');

  // Navigate to new prescription
  await page.goto('/prescriptions/new');

  // Fill form
  await page.click('input[placeholder="Search patient"]');
  await page.type('input', 'John Smith');
  await page.click('text=John Smith (DOB: 05/20/1975)');

  await page.fill('input[name="drugName"]', 'Metformin');
  await page.fill('input[name="dosage"]', '500');
  await page.selectOption('select[name="frequency"]', 'daily');
  await page.fill('input[name="duration"]', '30');

  // Submit
  await page.click('button:has-text("Create Prescription")');

  // Verify success
  await expect(page).toHaveURL('/prescriptions');
  await expect(page.locator('text=Prescription created')).toBeVisible();
});
```

---

**Related Documentation**:
- [DEVELOPMENT_STANDARDS.md](DEVELOPMENT_STANDARDS.md) - Code style & naming
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Test pyramid & CI/CD
- See [API_REFERENCE.md](API_REFERENCE.md) for backend API contracts

**Common Libraries**:
- TanStack Query: https://tanstack.com/query
- React Hook Form: https://react-hook-form.com
- Zod: https://zod.dev
- shadcn/ui: https://ui.shadcn.com
