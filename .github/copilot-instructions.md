# CareSync AI Development Playbook

## Code Quality & Standards
- Follow SOLID and DRY principles; keep functions under ~50 lines and name symbols explicitly for the clinical domain.
- Reuse shared hooks and helpers from the central hooks library and shared utilities in the lib suite instead of duplicating logic in components.
- Default to self-explanatory code; add brief comments only for domain rules or RLS constraints that are not obvious.

## Error Handling & Security
- Always sanitize inputs with the sanitize utilities module and log through sanitizeForLog to strip PHI.
- Wrap Supabase calls in try/catch, surface friendly Sonner toasts, and avoid leaking stack traces to end users.
- Encrypt and decrypt PHI via useHIPAACompliance(); persist encryption_metadata when mutating patient data (see the patients data hook for examples).
- Protect routes with the RoleProtectedRoute component and respect role checks from usePermissions().

## Performance & Optimization
- Use TanStack Query caching with hospital-scoped keys to prevent redundant Supabase calls.
- Keep React routes lazy-loaded as demonstrated in the main App composition and paginate heavy lists through existing hooks (patients, appointments, etc.).
- Prefer memoized selectors or derived data functions instead of recomputing inside render when dealing with analytics dashboards.

## Testing & Documentation
- Targeted commands: npm run dev, npm run test:unit, npm run test:security, npm run test:accessibility, npm run test:integration, npm run test:e2e (configured in Playwright’s project file).
- Add Vitest specs under the dedicated frontend test tree and mock AuthContext/permissions using the shared E2E fixtures.
- Document new cross-role flows in the consolidated workflow guide and update README sections only if behavior changes materially.

## Modern Best Practices
- Use async/await for Supabase calls, prefer immutable updates, and manage side effects through hooks rather than within components.
- Adhere to project TypeScript settings (strict mode) and use const/let consistently; leverage Zod schemas with React Hook Form for validation.
- Apply principle of least privilege by checking hospital identifiers and allowed roles before exposing controls.

## Code Organization
- Keep data access in hooks (hospital context lives within the AuthContext provider) and UI primitives in the shared UI component library.
- Group role-specific features under dedicated folders (patients, pharmacy, laboratory, etc.) and share utilities via the lib toolbox.
- Store environment-dependent configuration in Vite env files; do not hardcode URLs or keys.

## Version Control Considerations
- When schema changes are required, add migrations in the Supabase migrations folder and regenerate Supabase types before committing.
- Keep commits focused (feature, fix, or refactor) and avoid mixing RLS policy updates with unrelated UI changes.
- Ensure backward compatibility for shared hooks and exported types; update downstream consumers when signatures change.