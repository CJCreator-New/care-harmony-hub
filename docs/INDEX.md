# CareSync HIMS — Documentation Index

Last reviewed: 2026-11-05. Audit reports, dated status reports, superseded plans and
duplicate guides have been removed. Only the documents listed below are kept.

## Architecture decisions
- [adr/](./adr) — accepted architecture decision records (ADR-0001 to ADR-0005)

## Product and engineering reference
- [DATABASE.md](./DATABASE.md) — schema, tables and relationships
- [RBAC_PERMISSIONS.md](./RBAC_PERMISSIONS.md) — roles, permissions and access control
- [product/SYSTEM_ARCHITECTURE.md](./product/SYSTEM_ARCHITECTURE.md) — system design
- [product/DATA_MODEL.md](./product/DATA_MODEL.md) — data model and database schema
- [product/API_REFERENCE.md](./product/API_REFERENCE.md) — edge functions and endpoints
- [product/BACKEND_DEVELOPMENT.md](./product/BACKEND_DEVELOPMENT.md) — backend guide
- [product/FRONTEND_DEVELOPMENT.md](./product/FRONTEND_DEVELOPMENT.md) — frontend guide
- [product/DEVELOPMENT_STANDARDS.md](./product/DEVELOPMENT_STANDARDS.md) — coding standards
- [product/FORMS_DEVELOPMENT_GUIDE.md](./product/FORMS_DEVELOPMENT_GUIDE.md) — standardized form patterns
- [product/FORMS_QUICK_REFERENCE.md](./product/FORMS_QUICK_REFERENCE.md) — forms quick reference
- [product/TESTING_STRATEGY.md](./product/TESTING_STRATEGY.md) — test strategy and CI

## Integrations
- [integrations/lab-equipment-integration.md](./integrations/lab-equipment-integration.md)
- [integrations/pharmacy-systems-integration.md](./integrations/pharmacy-systems-integration.md)
- [integrations/telemedicine-integration.md](./integrations/telemedicine-integration.md)

## Security
- [SECURITY_ROTATION_GUIDE.md](./SECURITY_ROTATION_GUIDE.md) — secrets management and key rotation
- [product/SECURITY_CHECKLIST.md](./product/SECURITY_CHECKLIST.md) — security review checklist
- [security/MFA_MIGRATION.md](./security/MFA_MIGRATION.md) — MFA migration

## Operations runbooks
- [operations/CRITICAL_RESULT_ESCALATION_SOP.md](./operations/CRITICAL_RESULT_ESCALATION_SOP.md) — critical lab result escalation
- [operations/SECRET_ROTATION_AND_HISTORY_PURGE.md](./operations/SECRET_ROTATION_AND_HISTORY_PURGE.md) — secret rotation and git history purge
- [operations/CI_REQUIRED_CHECKS.md](./operations/CI_REQUIRED_CHECKS.md) — required CI checks
- [operations/STAGING_DEPLOYMENT_VALIDATION.md](./operations/STAGING_DEPLOYMENT_VALIDATION.md) — staging deployment validation
- [operations/DISASTER_RECOVERY_RUNBOOK.md](./operations/DISASTER_RECOVERY_RUNBOOK.md) — disaster recovery

## Role workflows
See [workflows/](./workflows): [WORKFLOW_OVERVIEW.md](./workflows/WORKFLOW_OVERVIEW.md),
and per-role guides for doctor, nurse, pharmacist, receptionist, lab technician, admin and patient.

## Agent and repository conventions
- [agents/](./agents) — issue tracker, triage labels and domain docs used by agent workflows
- [../CONTEXT.md](../CONTEXT.md) — domain glossary
