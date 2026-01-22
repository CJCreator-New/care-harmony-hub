# CareSync AI Coding Guidelines

## Architecture Overview
CareSync is a multi-tenant Hospital Management System. Key architectural decisions:
- **Multi-tenancy**: All data scoped by `hospital_id` via Supabase RLS policies
- **Role-based workflows**: 6 clinical roles (Admin, Doctor, Nurse, Receptionist, Pharmacist, Lab Tech) + Patient portal
- **Lazy loading**: All routes use `React.lazy()` in [App.tsx](../src/App.tsx) for 96% bundle reduction

## Critical Patterns

### Data Hooks (MUST follow)
All data queries go through TanStack Query hooks that auto-scope to current hospital:
```typescript
// ✅ Correct - uses hospital context automatically
const { data: patients } = usePatients();

// ❌ Wrong - never query Supabase directly in components
const { data } = await supabase.from('patients').select('*');
```
Query keys always include `hospitalId`: `['patients', hospital?.id]`. See [usePatients.ts](../src/hooks/usePatients.ts).

### Authentication & Permissions
```typescript
const { user, hospital, roles, profile } = useAuth();  // User context
const { canViewPatients, canPrescribe } = usePermissions();  // Permission checks
const hasAccess = hasAnyRole(roles, ['doctor', 'nurse']);  // Role checks
```
Protect routes with `<RoleProtectedRoute allowedRoles={['doctor', 'nurse']}>`. See [RoleProtectedRoute.tsx](../src/components/auth/RoleProtectedRoute.tsx).

### Security (HIPAA Compliance)
- **Log sanitization**: Use `sanitizeForLog()` for any logged data containing potential PHI
- **Input sanitization**: Use `sanitizeInput()` from [src/utils/sanitize.ts](../src/utils/sanitize.ts)
- **PHI encryption**: Use `useHIPAACompliance()` hook for encryption/decryption

## Development Commands
```bash
npm run dev              # Start dev server (localhost:5173)
npm run test             # Vitest unit tests
npm run test:e2e         # Playwright tests (requires dev server on :8080)
npm run test:e2e:ui      # Playwright with UI
npm run build:prod       # Production build with vite.config.production.ts
npm run analyze          # Bundle analysis
```

## Testing
- **Unit tests**: `src/test/` with Vitest - mock `AuthContext` and `usePermissions`
- **E2E tests**: `tests/e2e/` with Playwright - test users defined in [test-data.ts](../tests/e2e/fixtures/test-data.ts)
- **E2E base URL**: `http://localhost:8080` (see [playwright.config.ts](../playwright.config.ts))

## Project Structure
```
src/
├── components/{role}/   # Role-specific components (admin/, doctor/, nurse/, etc.)
├── components/ui/       # Shadcn/UI primitives
├── hooks/use*.ts        # Data hooks (100+ specialized hooks)
├── contexts/            # AuthContext, ThemeContext
├── integrations/supabase/  # Supabase client + generated types
└── utils/               # sanitize.ts, encryption, validators
```

## Code Style
- **UI Components**: Use Shadcn from `@/components/ui/`, style with design tokens (`bg-card`, `text-muted-foreground`)
- **Forms**: React Hook Form + Zod: `useForm<FormData>({ resolver: zodResolver(schema) })`
- **Toasts**: Use `toast.success()` / `toast.error()` from Sonner
- **Class merging**: Use `cn()` utility for conditional Tailwind classes