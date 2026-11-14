# CareHarmony HIMS — Documentation Index

Last reviewed: 2026-11-13. Audit reports, dated status reports, superseded plans and
duplicate guides have been removed. Only the documents listed below are kept.

## Start here

- [PRODUCT_GUIDE.md](./PRODUCT_GUIDE.md) — **consolidated end-to-end guide**: product,
  roles, patient journey, architecture, local setup, testing, operations, ADR register
  and the known documentation gaps (read this first)

## Architecture decisions

- [adr/](./adr) — accepted architecture decision records (ADR-0001 to ADR-0015)

## Product and engineering reference

- [RBAC_PERMISSIONS.md](./RBAC_PERMISSIONS.md) — roles, permissions and access control
- [product/SYSTEM_ARCHITECTURE.md](./product/SYSTEM_ARCHITECTURE.md) — system design and Supabase-native deployment model
- [product/DATA_MODEL.md](./product/DATA_MODEL.md) — consolidated data model, core schema and relationships
- [product/FRONTEND_DEVELOPMENT.md](./product/FRONTEND_DEVELOPMENT.md) — frontend architecture and patterns
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
