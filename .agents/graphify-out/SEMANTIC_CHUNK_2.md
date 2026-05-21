# Semantic Extraction: Chunk 2 (Auth, Billing, Forms)

## Semantic Nodes

- **RoleProtectedRoute** | Component | Enforces RBAC + middleware route guard before child render
- **MiddlewareRouteGuard** | Middleware | Checks permission via `checkRouteAccess(pathname, roles)` 
- **RoleSwitcher** | Component | Validates role transitions + persists dev test role
- **TwoFactorSetup** | Component | Generates TOTP secret, QR code, backup codes via Edge Functions
- **CreateInvoiceModal** | Component | Zod-validated invoice form with dynamic line items + live subtotal
- **CreateLabOrderModal** | Component | Lab order form with patient search + priority selection
- **PatientRegistrationModal** | Component | Multi-tab form with HIPAA encryption + activity logging
- **InvoiceItemFieldArray** | Form Array | Dynamic field array with live `form.watch()` subtotal recalc
- **PermissionDenialAudit** | Hook | Logs RBAC violations to activity audit trail
- **TestRolePersistence** | Utility | Stores dev test role in localStorage via `getDevTestRole()`
- **FormValidationPipeline** | Pattern | Zod schema → React Hook Form → UI errors
- **PHIEncryption** | Service | Sanitize input + call `encryptPHI()` before Supabase insert

## Semantic Edges

1. RoleProtectedRoute → useAuth (get roles, primaryRole, user)
2. RoleProtectedRoute → checkRouteAccess (middleware guard check)
3. RoleProtectedRoute → usePermissionAudit (log permission denials)
4. RoleSwitcher → isValidRoleTransition (validate role change feasibility)
5. RoleSwitcher → useAuth.switchRole (commit role change)
6. TwoFactorSetup → supabase.functions.invoke("generate-2fa-secret")
7. TwoFactorSetup → supabase.functions.invoke("verify-2fa")
8. TwoFactorSetup → supabase.functions.invoke("store-2fa-secret")
9. CreateInvoiceModal → usePatients (load patient list)
10. CreateInvoiceModal → useCreateInvoice (submit)
11. CreateInvoiceModal → formatCurrency (display formatting)
12. CreateLabOrderModal → useAuth (get hospitalId)
13. CreateLabOrderModal → useCreateLabOrder (submit)
14. CreateLabOrderModal → useFeatureFlags (check lab_flow_v2 gate)
15. PatientRegistrationModal → useHIPAACompliance.encryptPHI (encrypt fields)
16. PatientRegistrationModal → useActivityLog.logActivity (log creation event)
17. PatientRegistrationModal → sanitizeInput (clean inputs before validation)
18. PermissionDenialAudit → logActivity (persist deny record)
19. InvoiceItemFieldArray → form.watch("items") (live recalc)

## Architecture Risks

1. **Race condition in role switching**: `switchRole()` in RoleSwitcher doesn't wait for full auth sync before children re-render; stale permission checks may occur mid-transition.
2. **HIPAA metadata persistence gap**: PatientRegistrationModal sanitizes & encrypts but doesn't explicitly verify `encryption_metadata` persists to DB; usePatients may silently degrade on missing metadata.
3. **Test role localStorage leakage**: `getDevTestRole()` persists test override; if not cleared on logout, test role can replay cross-tab or into production session.

## Deep-Dive Questions

1. How does middleware `checkRouteAccess()` coordinate with Supabase RLS policies? Could conflicting allow/deny logic expose race conditions?
2. Does invoice line-item subtotal (via `form.watch()`) validate against Supabase-side billing rules before submission?
3. If 2FA secret generation succeeds but `store-2fa-secret` fails, are orphaned backup codes/secrets cleaned up?
