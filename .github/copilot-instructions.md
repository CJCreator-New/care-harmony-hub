# CareSync AI Coding Guidelines

## Project Overview
CareSync is a comprehensive Hospital Management System built with React 18, TypeScript, and Supabase. It supports role-based workflows for healthcare staff (Admin, Doctor, Nurse, Receptionist, Pharmacist, Lab Tech) and patient portals.

## Architecture & Data Flow
- **Frontend**: React SPA with feature-based component organization (`src/components/{role}/`)
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions) with Row Level Security (RLS)
- **State**: TanStack Query for caching, AuthContext for user/hospital context
- **Clinical Workflow**: Patient check-in → Queue → Nurse prep → Doctor consultation → Pharmacy/Lab → Billing → Discharge

## Key Patterns
- **Data Hooks**: Use TanStack Query hooks like `usePatients()` with hospital-scoped queries
  ```typescript
  const { data: patients } = usePatients(); // Automatically scoped to user's hospital
  ```
- **Authentication**: Access user/hospital via `useAuth()` context
- **Forms**: React Hook Form + Zod validation
- **UI**: Shadcn/UI components from `src/components/ui/`
- **Routing**: Role-protected routes with `RoleProtectedRoute`
- **Supabase API**: Use client from `@/integrations/supabase/client` for database operations
  ```typescript
  const { data, error } = await supabase.from('patients').select('*').eq('hospital_id', hospitalId);
  ```

## Database Schema
- Multi-tenant: Hospital-level data isolation via RLS
- Core entities: `hospitals`, `profiles`, `patients`, `appointments`, `consultations`, `prescriptions`, `lab_orders`
- Relationships: Patients belong to hospitals, staff linked via profiles

## Development Workflow
- **Start**: `npm run dev` (Vite dev server on :5173)
- **Build**: `npm run build` (production build)
- **Lint**: `npm run lint` (ESLint)
- **Test**: Vitest for unit/integration tests (>80% coverage target)
- **Branch Naming**: `feature/add-feature`, `bugfix/fix-issue`, `hotfix/security-patch`
- **Commits**: Follow Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`)

## Code Standards
- **TypeScript**: Explicit types, avoid `any`
  ```typescript
  interface Patient { id: string; firstName: string; lastName: string; }
  ```
- **React Components**: Functional with typed props, use `cn()` for class merging
  ```tsx
  interface Props { patient: Patient; onSelect?: (id: string) => void; }
  export function PatientCard({ patient, onSelect }: Props) { ... }
  ```
- **File Organization**: Feature-based with index.ts exports
- **Styling**: Design system tokens, avoid hard-coded colors
  ```tsx
  <div className="bg-card text-card-foreground border border-border">
  ```

## Security & Compliance
- **HIPAA Ready**: Encrypt sensitive data, log access, validate inputs
- **RBAC**: Enforce permissions at component/route level
- **Session Management**: 30min timeout, JWT with refresh rotation
- **Password Policy**: 8+ chars, uppercase/lowercase/number/symbol
- **Audit**: All changes logged via activity logs

## Testing Strategy
- **Unit Tests**: Vitest for components/hooks/utilities
- **Integration**: Component interactions with React Testing Library
- **E2E**: Playwright for critical user workflows
- **Coverage**: >80% overall, 90% for auth/prescriptions
- **E2E Commands**: `npm run test:e2e`, `npm run test:e2e:ui`, `npm run test:e2e:headed`

## Key Files
- `docs/ARCHITECTURE.md`: System design and data flows
- `docs/DATABASE.md`: Schema and relationships
- `docs/SECURITY.md`: Security & compliance patterns
- `docs/CONTRIBUTING.md`: Code standards and workflow
- `tests/e2e/`: Complete E2E test suite with 155+ tests covering all critical workflows
- `src/hooks/usePatients.ts`: Example data fetching pattern
- `src/contexts/AuthContext.tsx`: Authentication state management

## Advanced Patterns & Conventions

### Component Architecture
- **Lazy Loading**: Use `React.lazy()` for route components with `Suspense` boundaries
- **Error Boundaries**: Wrap async components with `ErrorBoundary` for graceful failures
- **Role-Based Rendering**: Use `hasAnyRole()` hook for conditional UI elements
- **Performance**: Implement `React.memo()` for expensive components, use `useMemo()` for computed values

### Data Fetching Patterns
- **Hospital Scoping**: All queries automatically filter by `hospital_id` from auth context
- **Query Keys**: Use descriptive keys like `['patients', hospitalId]` for cache management
- **Optimistic Updates**: Use TanStack Query mutations with `onMutate` for immediate UI feedback
- **Error Handling**: Use `toast.error()` from Sonner for user-friendly error messages

### Form Validation
- **Schema Validation**: Define Zod schemas for form data validation
- **React Hook Form**: Use `useForm()` with `zodResolver()` for type-safe forms
- **Field Arrays**: Use `useFieldArray()` for dynamic form sections (medications, allergies)

### Supabase Integration
- **RLS Policies**: All tables have hospital-scoped Row Level Security
- **Edge Functions**: Use for complex business logic (AI recommendations, notifications)
- **Real-time**: Subscribe to changes with `supabase.channel()` for live updates
- **Type Safety**: Use generated `Database` types from Supabase

### Testing Patterns
- **Mock Setup**: Mock `@/contexts/AuthContext` and `@/hooks/usePermissions` in tests
- **Query Client**: Wrap tests with `QueryClientProvider` for TanStack Query
- **E2E Coverage**: Focus on critical patient flows (check-in → consultation → discharge)
- **Role Testing**: Test each role's access patterns and UI restrictions

### Deployment & CI/CD
- **Build Optimization**: Use `vite.config.production.ts` for production builds
- **Environment Config**: Separate configs for staging/production deployments
- **Health Checks**: Automated health checks with `scripts/health-check.sh`
- **Rollback**: Automated rollback procedures with `scripts/rollback.sh`

### Integration Points
- **External APIs**: FHIR integration for healthcare interoperability
- **File Uploads**: Use Supabase Storage for secure file handling
- **Notifications**: Real-time notifications via Supabase Realtime
- **Analytics**: Custom analytics engine for KPI tracking and reporting

### Performance Considerations
- **Bundle Splitting**: Lazy load route components to reduce initial bundle size
- **Image Optimization**: Use `optimized-image.tsx` component for responsive images
- **Caching Strategy**: Leverage TanStack Query's intelligent caching (5min stale time)
- **PWA Features**: Service worker for offline functionality and fast loading