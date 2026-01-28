# Admin Workflow (2026)

## Overview
Administrators manage system configuration, security, and hospital-wide governance. This workflow complements the admin section in consolidated docs.

**Back to consolidated:** [CONSOLIDATED_ROLE_WORKFLOWS.md](../CONSOLIDATED_ROLE_WORKFLOWS.md#admin-workflow)

---

## 1. Access & Dashboard
- RBAC-scoped with hospital isolation; dashboard shows system health, alerts, user stats, audit summaries.

## 2. User & Role Management
- Create/edit/deactivate users; assign roles and hospitals.
- Approve escalated role requests and override department-level decisions when needed.

## 3. System Configuration
- Hospital settings, feature toggles, notification templates, billing/insurance integrations.
- Manage environment keys/secrets (do not expose in client).

## 4. Security & Compliance
- Enforce 2FA, session policies, and least-privilege checks.
- Review audit logs and incident reports; coordinate with security.

## 5. Operations & Maintenance
- Monitor performance; trigger backups and maintenance windows.
- Oversee deployments and DR readiness.

## 6. Reporting
- Generate compliance and performance reports; share with stakeholders.

## Technical Notes
- RLS enforces hospital scope; admin overrides remain hospital-bound unless explicitly elevated.
- Workflow automation: can trigger or approve escalations; notifications filtered by hospital.
- Pending: automated policy drift detection and self-healing configs.
