# Comprehensive Role Test Cases

This suite aligns current implementation in `src/App.tsx`, `src/lib/permissions.ts`, `src/contexts/AuthContext.tsx`, and role-critical hooks.

## Execution Order

1. `npm run type-check`
2. `npm run test:security`
3. `npm run test:api`
4. `npm run test:e2e:roles`
5. `npx playwright test tests/e2e/role-workflows-comprehensive.spec.ts --project=chromium --workers=1`
6. `npx playwright test tests/e2e/cross-role-handoffs.spec.ts --project=chromium --workers=1`

## Role Cases

- `DOC-TC-01`: Doctor dashboard, consultations, patients allowed; pharmacy/patient portal denied.
- `NUR-TC-01`: Nurse dashboard, queue, consultations allowed; inventory/patient portal denied.
- `REC-TC-01`: Receptionist dashboard, appointments, queue, billing allowed; consultations denied.
- `PHA-TC-01`: Pharmacist dashboard, pharmacy, inventory allowed; consultations/billing denied.
- `LAB-TC-01`: Lab technician dashboard, laboratory, lab automation allowed; pharmacy/billing denied.
- `PAT-TC-01`: Patient portal routes allowed; staff routes denied.

## Cross-Role Cases

- `XRF-TC-01`: Receptionist -> Nurse -> Doctor -> Pharmacist route handoff contract.
- `XRF-TC-02`: Doctor -> Lab Technician lab critical route chain and receptionist denial.
- `XRF-TC-03`: Patient refill context -> Pharmacist processing context with patient denial on pharmacy route.

## Dependency Validation Focus

- Staff invitation acceptance path is server-side function mediated (`accept-invitation-signup`).
- Patient role assignment is RPC mediated (`assign_patient_role`).
- Lab order creation requires `lab_queue` insertion as part of write path.

