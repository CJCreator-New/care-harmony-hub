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