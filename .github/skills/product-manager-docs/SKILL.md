---
name: product-manager-docs
description: 'Guide for product managers to create comprehensive documentation for CareSync HIMS. Use when drafting Business Requirements Documents, Product Requirements Documents, architecture specifications, and project planning artifacts. Includes BRD templates, healthcare workflow context, and document organization standards.'
argument-hint: 'Specify document type: BRD, PRD, architecture, workflow, etc.'
---

# Product Manager Documentation for CareSync HIMS

A complete workflow for creating production-ready product documentation for the CareSync Healthcare Information Management System.

## When to Use

- Creating Business Requirements Documents (BRD) for new clinical workflows
- Drafting Product Requirements Documents (PRD) for feature releases
- Designing multi-role healthcare workflows (doctor, nurse, receptionist, billing, laboratory, pharmacy)
- Planning integration with external systems (billing, laboratory equipment, appointment scheduling)
- Documenting release roadmaps and feature prioritization
- Establishing acceptance criteria and QA test plans

## System Overview

**CareSync HIMS** is a production healthcare information management system with:

- **Multi-role access control**: Doctor, Nurse, Receptionist, Billing, Laboratory Technician, Pharmacist, Hospital Admin
- **HIPAA-compliant** patient data handling (encrypted, PHI-protected, audit logged)
- **Real-time workflows**: Appointments, vital signs, lab orders, prescriptions, billing claims
- **Supabase backend** with Row-Level Security (RLS) for authorization
- **React frontend** with TypeScript, TanStack Query caching, Sonner error toast notifications
- **Audit trails** append-only, tamper-evident logging for all clinical and billing events
- **External integrations**: Laboratory systems, pharmacy dispensing, billing insurers, appointment reminders

## Quick Documentation Checklist

### Phase 1: Discovery & Planning (1-2 hours)
- [ ] **Identify stakeholders**: Which roles are affected? (doctor, patient, billing, lab, pharmacy?)
- [ ] **Map current state**: What workflow exists today? What pain points?
- [ ] **Define target state**: What should the system do after this feature?
- [ ] **Assess HIPAA impact**: Will this handle PHI? Does it need encryption, audit logging, consent?
- [ ] **List dependencies**: External systems, approvals, user research?

**Checklist**: [./references/discovery-checklist.md](./references/discovery-checklist.md)

### Phase 2: Requirements Definition (2-4 hours)
- [ ] **Create the BRD**: Use [BRD template](./templates/brd-template.md)
  - Business case & objectives
  - Functional requirements (per role)
  - Non-functional requirements (performance, compliance, security)
  - Use cases & workflows (step-by-step)
  - Data model changes (if any)
  - External integrations
  - Acceptance criteria & success metrics

- [ ] **Validate with domain expert**: Ensure medical accuracy, workflow feasibility
- [ ] **Get stakeholder sign-off**: PMs, clinical leads, security, engineering leads

### Phase 3: Technical Handoff (1-2 hours)
- [ ] **Create PRD or technical specification** (optional, for complex features)
- [ ] **Define acceptance criteria** using [QA Checklist](./references/qa-acceptance-checklist.md)
- [ ] **Identify test scenarios** from [healthcare edge cases](./references/healthcare-edge-cases.md)
- [ ] **Plan audit logging** for new clinical/billing workflows

### Phase 4: Storage & Handoff
- [ ] **Save BRD** to: `docs/product/BRD/<feature-name>.md`
- [ ] **Save PRD** to: `docs/product/PRD/<feature-name>.md` (if applicable)
- [ ] **Save workflow diagram** to: `docs/product/workflows/<feature-name>.md`
- [ ] **Link from roadmap**: Update `docs/product/roadmap.md` with feature link & status
- [ ] **Share with engineering team**: Pin in Slack, add to sprint planning

## Document Templates

### Business Requirements Document (BRD)
[Full template](./templates/brd-template.md) — Use for all feature requests and workflow changes.

### Section Breakdown

```
1. Executive Summary (1 page)
2. Business Case & Objectives
3. Functional Requirements (by role/workflow)
4. Non-Functional Requirements (performance, security, compliance)
5. Use Cases & Workflows (swim lanes, step-by-step)
6. Data Requirements & Model Changes
7. External Integrations & Dependencies
8. Acceptance Criteria & Success Metrics
9. Risks & Mitigation
10. Timeline & Resource Estimation
```

## CareSync-Specific Guidance

### Healthcare Domain Context
- **HIPAA compliance**: All patient data requires encryption at rest and in transit
- **Audit trail requirement**: Clinical decisions, medication orders, and billing changes must be immutable
- **Role-based access**: Users only see/do what their role permits (enforced at Supabase RLS + frontend)
- **Data validation**: Lab values, drug doses, patient ages must fall within medical ranges
- **Workflow invariants**: A patient cannot be discharged without closing all open orders; prescriptions must reference valid drugs

Use the [Domain Expert Checklist](./references/domain-expert-checklist.md) to validate medical accuracy.

### Multi-Role Workflow Design
When defining workflows that involve multiple roles:
1. **Map each step** to the responsible role (e.g., Doctor enters order → Lab Technician executes → Doctor reviews result)
2. **Define transitions**: What triggers the next step? (approval, time delay, system event?)
3. **Handle rejection scenarios**: What happens if a Lab rejects a test? If Billing denies a claim?
4. **Plan notifications**: Which roles get notified at each step?

See [workflow creation guide](./references/workflow-design-guide.md) for detailed examples.

### Integration Points
- **Lab integration**: Receive test results from external lab equipment via HL7 or API
- **Pharmacy**: Dispense prescriptions, manage inventory, track controlled substances
- **Billing/Insurance**: Submit claims, track denials, manage co-pays and deductibles
- **Appointment system**: Sync with third-party schedulers, send reminders

Document all integrations in the "External Dependencies" section of the BRD.

## Reference Materials

| Document | Purpose |
|----------|---------|
| [Discovery Checklist](./references/discovery-checklist.md) | Before writing requirements |
| [Domain Expert Checklist](./references/domain-expert-checklist.md) | Validate medical accuracy |
| [Workflow Design Guide](./references/workflow-design-guide.md) | Plan multi-role workflows |
| [QA Acceptance Checklist](./references/qa-acceptance-checklist.md) | Define test coverage |
| [Healthcare Edge Cases](./references/healthcare-edge-cases.md) | Identify risky scenarios |
| [Data Model Patterns](./references/data-model-patterns.md) | Schema & audit design |

## Example Workflow

### To create a BRD for "Lab Result Approval Workflow"

1. **Discovery** (Sprint planning): Identify stakeholders (Doctor, Lab Tech, Admin)
2. **Define requirements** (BRD): Doctor receives notification → reviews result → approves/rejects → patient notified
3. **Add domain rules** (Validation): Only board-certified doctors can approve; results outside normal range auto-flag for review
4. **Plan data storage** (Schema): Add `lab_result_approvals` table with `approved_by`, `approved_at`, `notes`, audit trail
5. **Design notifications** (Workflow): Lab Tech submits → Doctor notified → Doctor approves → Patient's patient portal updated
6. **Write acceptance criteria**: "All lab result approvals logged to audit trail with user ID and timestamp"
7. **Handoff to engineering**: Create technical spec or PRD if needed, link to sprint ticket

## Next Steps

1. **Start a new BRD**: Copy [BRD template](./templates/brd-template.md) → `docs/product/BRD/my-feature.md`
2. **Work through the checklist** in Phase 1 & Phase 2 above
3. **Validate with domain expert** using [Domain Expert Checklist](./references/domain-expert-checklist.md)
4. **Get stakeholder sign-off** before handing to engineering
5. **Link from project roadmap** and Jira/Linear issues

---

**Questions?** Review the reference materials, or ask the team for examples of past BRDs in `docs/product/`.
