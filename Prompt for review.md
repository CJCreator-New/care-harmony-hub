You are a senior healthcare software auditor conducting a comprehensive security, clinical-safety, RBAC, and quality audit of the CareSync HIMS codebase (also branded as AroCord-HIMS v1.2.0). This is a healthcare management system with 72+ users across 7 roles (admin, doctor, nurse, receptionist, pharmacist, lab_technician, patient) serving 18,000+ patients.

REPO STRUCTURE:
- Frontend: React 18 + Vite 6 + TypeScript 5.x + Tailwind CSS in src/ (25 directories)
- Backend: 43 Supabase Edge Functions in supabase/functions/
- Database: 60+ tables with Row-Level Security (RLS) in supabase/migrations/ (78 files)
- Testing: Vitest + Playwright + pytest
- Documentation: docs/ contains 14 existing audit reports
- Configuration: AGENTS.md, kilo.json, .kilo/command/*.md

YOUR TASK — Conduct a COMPREHENSIVE AUDIT across all audit domains. For each finding, verify against at least 2 sources (source code + existing audit docs + tests). Tag each finding as VERIFIED, DISCREPANCY, or NEW.

Conduct the following investigations IN FULL:

--- AUDIT DOMAIN 1: EXISTING AUDIT CONSOLIDATION ---
Read ALL existing audit reports in docs/ (14 files). Create a consolidated tracker of:
- What each audit found
- What was claimed as "Fixed" vs. actual status in code
- Any findings marked "Deferred" — re-evaluate these for current risk
- Cross-reference AUDIT_TRACKER.md (the 54-item sweep from June 2026)
Key files: docs/AUDIT_TRACKER.md, docs/SECURITY_HIPAA_AUDIT_REPORT.md, docs/RLS_AUDIT_REPORT.md, docs/DATABASE_SCHEMA_AUDIT_REPORT.md, docs/API_DESIGN_INTEGRATION_AUDIT_REPORT.md, docs/CLINICAL_ACCURACY_AUDIT_REPORT.md, docs/CICD_SECURITY_AUDIT_REPORT.md, docs/RBAC_PERMISSIONS.md, docs/PRODUCT_MASTER_DOCUMENT.md

--- AUDIT DOMAIN 2: RBAC & ACCESS CONTROL ---
Map the COMPLETE RBAC landscape:
1. Read src/types/rbac.ts (PermissionCategory enum + ROLE_PERMISSIONS map)
2. Read src/lib/permissions.ts (string-based permission system — note: DIFFERENT permissions than rbac.ts)
3. Read src/utils/abacManager.ts (ABAC policy engine)
4. Read ALL per-role RBAC manager files: src/utils/DoctorRBACManager.ts, NurseRBACManager.ts, ReceptionistRBACManager.ts, PharmacistRBACManager.ts, LabTechRBACManager.ts, AdminRBACManager.ts, PatientRBACManager.ts
5. Read src/hooks/usePermissions.ts and src/components/auth/RoleProtectedRoute.tsx
6. For EVERY edge function in supabase/functions/, read its AUTHORIZED_ROLES list and verify whether getAuthorizedActor() is actually called
7. List every edge function that accepts 'super_admin' or any non-canonical role
8. Cross-reference all findings with docs/RBAC_PERMISSIONS.md
CRITICAL: Identify and document ALL discrepancies between these systems — when System 1 says doctor CAN'T access billing but System 2 says doctor CAN, that's a privilege escalation finding.

--- AUDIT DOMAIN 3: EDGE FUNCTION AUTHENTICATION ---
For ALL 43 edge functions, determine:
- Does getAuthorizedActor() get called? (read the _shared/authorize.ts)
- Are roles in the authorizer list canonical? (compare to src/types/rbac.ts UserRole)
- Is input validated with Zod schemas?
- Is rate limiting applied?
- Any edge function that imports but does NOT call getAuthorizedActor = CRITICAL
Specifically check: critical-lab-check, drug-interaction-check, insurance-integration, prescription-approval, appointment-reminders, check-low-stock

--- AUDIT DOMAIN 4: CLINICAL SAFETY ---
Read and audit:
1. Pediatric dosing: src/components/prescriptions/PediatricDosingCard.tsx + src/hooks/useDrugInteractionChecker.ts + src/services/prescriptionValidation.ts
   - Compare formulas against AAP/WHO guidelines
   - Check for age-appropriate maximums
2. Drug interaction checker: src/hooks/useDrugInteractionChecker.ts
   - Count local interactions (should be 3-drug)
   - What's the timeout on the RxNorm API fallback?
   - Does it fail-open or fail-closed on timeout?
3. Lab critical value handling: supabase/functions/critical-lab-check/index.ts
   - Is the threshold configurable?
   - Does it escalate correctly to physicians?
   - Is there a retry mechanism?
4. Allergy alerts: src/hooks/useAllergyAlerts.ts
   - Exact name match vs. cross-referencing
5. Prescription approval workflow: supabase/functions/prescription-approval/index.ts
   - State machine: statuses, transitions, role requirements
   - Can a doctor approve their own prescription? (conflict of interest)
   - Can the pharmacist dispense without doctor approval?

--- AUDIT DOMAIN 5: LAB WORKFLOW ---
1. Read src/hooks/useLabOrders.ts, src/hooks/useLabWorkflow.ts
2. Read supabase/functions/lab-automation/index.ts
3. Map the complete state machine: ordered → collected → in_progress → completed → reported → cancelled
4. Check for the 'super_admin' role in authorizer (this is a known issue — re-verify)
5. Check critical value escalation path
6. Does the frontend state machine match the server-side state machine?

--- AUDIT DOMAIN 6: DISCHARGE WORKFLOW ---
1. Read src/hooks/useDischargeWorkflow.ts
2. Read supabase/functions/discharge-workflow/index.ts
3. Map the state machine: doctor → pharmacist → billing → nurse → completed
4. Verify STEP_ROLE_MAP and NEXT_STEP match between frontend and backend
5. Check the 'reject' action — does it route correctly to PREVIOUS_STEP?
6. Check for lost-update/race conditions in concurrent access
7. Is hospital scoping enforced via getAuthorizedActor()?

--- AUDIT DOMAIN 7: SECURITY & HIPAA ---
1. Secrets: Read .env, .gitignore — determine if secrets are tracked in git
   - Note: .env IS in .gitignore at line 14, but AUDIT_TRACKER F-046 says it was historically tracked
2. Encryption: Read src/services/phiCryptoService.ts — verify PHI encryption at rest
   - Is PHI_ENCRYPTION_KEY a VITE_* variable? (Should only be server-side)
3. JWT/token storage: Read src/contexts/AuthContext.tsx — localStorage or httpOnly cookies?
4. 2FA: Read src/hooks/useTwoFactorAuth.ts — is it enforced for clinical roles?
5. Audit log immutability: Search migrations for audit_logs table — is there a trigger preventing modification?
6. IDOR: Read supabase/functions/get-patient-record/index.ts — is hospital_id the only scoping? (department isolation?)
7. Security headers: Read supabase/functions/_shared/cors.ts — CSP, HSTS, X-Frame-Options
8. Input validation: Check edge functions for missing Zod schemas
9. CSRF: Check if origin headers are verified
10. Rate limiting: Check auth endpoints
11. Error messages: Read src/services/errorHandler.ts — do errors leak internal paths?

--- AUDIT DOMAIN 8: DATABASE SCHEMA & RLS ---
1. Read ALL migration files in supabase/migrations/ (78 files)
2. For each of these key tables, report the RLS policy:
   - patients
   - appointments
   - lab_orders / lab_results
   - prescriptions
   - audit_logs
   - users (staff)
   - billing_invoices
3. Check for: hospital_id scoping, department scoping, is_active flag enforcement
4. Check audit_logs for append-only trigger
5. Check for any migration that references 'super_admin'

--- AUDIT DOMAIN 9: TESTING ---
1. Read all test files in src/__tests__/, src/test/
2. Read all test files in tests/e2e/ (Playwright)
3. Read all test files in tests/security/
4. Run: npm run test:unit and report pass/fail counts
5. Run: npm run lint and npm run type-check
6. Run: npm run test:security
7. Identify critical coverage gaps:
   - RBAC cross-system tests (do all 4 systems agree?)
   - State machine race condition tests
   - Drug interaction timeout tests
   - Pediatric dosing tests
   - Audit log immutability tests
   - Edge function auth bypass tests (negative tests for unauthenticated calls)
   - RLS department isolation tests
   - Patient role E2E coverage

--- AUDIT DOMAIN 10: DEVOPS & CI/CD ---
1. Read .github/workflows/ (5 workflows)
2. Read supabase/functions/ for health-check, ready, metrics endpoints
3. Run npm audit — report vulnerability counts by severity
4. Check staging vs. production environment configuration
5. Report on CI/CD gate status (blocking vs non-blocking)

--- AUDIT DOMAIN 11: PERFORMANCE & RELIABILITY ---
1. Search for N+1 query patterns in frontend hooks (useAppointments, useLabResults, etc.)
2. Check for full page reloads vs. query invalidation
3. Check for unnecessary re-renders in billing/prescription components
4. Check edge function timeout handling and retry mechanisms
5. Check the getClientIP() implementation (known fake-return issue)

--- AUDIT DOMAIN 12: WORKFLOW INTERCONNECTIONS ---
Map the COMPLETE data flow from:
Patient admission → Appointment booking → Patient queue → Vital signs → Consultation → Lab order → Lab results → Prescription → Prescription approval → Pharmacy dispense → Discharge workflow → Billing

For each step, identify:
- Which roles can initiate
- Which roles can approve/complete
- How RBAC is enforced (frontend, edge function, RLS)
- Any gaps where a role can skip a required step

--- REPORT STRUCTURE ---
Produce a comprehensive markdown report with EXACTLY this structure:

1. Executive Summary (risk distribution table, priority action summary)
2. Audit Methodology & Scope
3. RBAC: Full Role Matrix, The Four Conflicting Permission Systems, Role-to-Workflow Mapping, RBAC Coverage Matrix
4. Clinical Workflows: Deep-Dive Data Flow Analysis (Lab, Prescription, Discharge, Admission, Billing, Messaging, Telemedicine)
5. Security Vulnerabilities (Critical, High, Medium, Low tables)
6. Test Coverage Gaps
7. Clinical Accuracy Issues
8. RBAC & RLS Issues
9. Performance & Reliability Issues
10. DevOps & CI/CD
11. Recommendations Summary & Timeline (P0/P1/P2/P3 with ETA and owners)
12. Appendices (Files Referenced, Audit References)

For each finding, include:
- Severity rating (Critical/High/Medium/Low)
- Exact file path and line numbers
- OWASP category (where applicable)
- Verification status (VERIFIED/DISCREPANCY/NEW)
- Patient Safety Impact (for clinical findings)
- Specific remediation recommendation
- Remediation owner and ETA suggestion

Tag each finding with a unique ID (SEC-001, CLIN-001, RBAC-001, PERF-001, REL-001, etc.)

DO NOT hallucinate file contents. Read every file you reference. Be exhaustive — this is a healthcare system where errors kill patients.