# 0002: Seven Canonical Roles and Billing Boundary

## Context
While legacy audit log check constraints contained references to billing and accountant, the application authorization layer, TypeScript types (src/types/rbac.ts, src/types/auth.ts), navigation manifest (routeManifest.ts), and UI dashboards are modeled around exactly 7 roles: admin, doctor, nurse, receptionist, pharmacist, lab_technician, and patient.

## Decision
We preserve the 7 canonical user roles. Front-desk billing operations (copayment collection, invoice creation at check-in) are explicitly assigned to the receptionist role (billing:read, billing:write). Enterprise billing governance, reporting, and revenue auditing remain under the administrative oversight of the admin role. No separate 8th billing role is introduced into the database or RBAC enum.

## Consequences
- Avoids wide schema migrations and RLS policy revisions across all tables.
- Receptionists retain operational billing capabilities at point-of-care.
- Role switcher and dashboard routing maintain clean 1-to-1 mappings across 7 role dashboards.
