# Product Manager Documentation Files Index

## Quick Navigation

This skill provides a complete workflow for product managers to create production-grade documentation for CareSync HIMS.

### Main Skill File
- **[SKILL.md](../SKILL.md)** — Master workflow and overview (read first)

### Templates
- **[BRD Template](../templates/brd-template.md)** — Business Requirements Document template with all sections pre-filled for healthcare context

### Reference Guides (Use During BRD Creation)

| Guide | When to Use | Time |
|-------|-----------|------|
| [Discovery Checklist](discovery-checklist.md) | **Before** writing requirements; gather stakeholder input | 1-2 hours |
| [Domain Expert Checklist](domain-expert-checklist.md) | **During** requirements; validate medical accuracy | Integrated |
| [Workflow Design Guide](workflow-design-guide.md) | **During** requirements; design multi-role workflows | Integrated |
| [QA & Acceptance Checklist](qa-acceptance-checklist.md) | **During** requirements; define test coverage | Integrated |
| [Healthcare Edge Cases](healthcare-edge-cases.md) | **During** requirements; identify failure scenarios | Integrated |
| [Data Model Patterns](data-model-patterns.md) | **During** technical handoff; schema design | As needed |

---

## Workflow Overview

### Phase 1: Discovery & Planning (1-2 hours)
```
Start → Identify Stakeholders → Map Current State → Assess HIPAA Impact → Ready for BRD
```
**Use**: [Discovery Checklist](discovery-checklist.md)

### Phase 2: Requirements Definition (2-4 hours)
```
Create BRD → Validate Medical Accuracy → Get Stakeholder Sign-Off → Ready for Engineering
```
**Use**: 
- [BRD Template](../templates/brd-template.md) for structure
- [Domain Expert Checklist](domain-expert-checklist.md) for clinical validation
- [Workflow Design Guide](workflow-design-guide.md) for multi-role flows
- [Healthcare Edge Cases](healthcare-edge-cases.md) for failure scenarios
- [QA & Acceptance Checklist](qa-acceptance-checklist.md) for acceptance criteria

### Phase 3: Technical Handoff (1-2 hours)
```
Create Technical Spec → Define Acceptance Criteria → Plan Audit Logging → Ready for Dev
```
**Use**: 
- [Data Model Patterns](data-model-patterns.md) for schema guidance
- [Workflow Design Guide](workflow-design-guide.md) for technical workflow details

### Phase 4: Storage & Handoff
```
Save BRD → Save Workflow Diagram → Link from Roadmap → Share with Team
```

**Document Storage Convention**:
```
/docs/product/BRD/<feature-name>.md
/docs/product/workflows/<feature-name>.md
/docs/product/roadmap.md (links to all BRDs)
```

---

## CareSync HIMS Context

### Key Facts About the System

- **Multi-role HIMS**: Doctor, Nurse, Pharmacist, Lab Tech, Billing, Receptionist, Admin, Patient
- **HIPAA-compliant**: All PHI encrypted, audit-logged, consent-tracked
- **Real-time clinical workflows**: Appointments, vital signs, prescriptions, lab orders, billing claims
- **Tech stack**: Supabase (PostgreSQL + RLS), React (TypeScript), TanStack Query, Sonner toasts
- **Audit trail**: Tamper-evident, append-only logging for all clinical & billing decisions
- **Integrations**: Laboratory equipment, pharmacy dispensing, insurance claims, appointment reminders

### Workflow Examples Already in System

| Workflow | Status | Documentation |
|----------|--------|---|
| Appointment scheduling | Live | `/docs/product/workflows/appointments.md` |
| Prescription signature | Live | `/docs/product/workflows/prescriptions.md` |
| Lab result approval | Live | `/docs/product/workflows/lab-results.md` |
| Billing & claims | Live | `/docs/product/workflows/billing.md` |

### Common Medical Workflows to Plan

- **Vital signs monitoring**: Nurse enters → Doctor alerted if abnormal → Doctor acts
- **Drug interaction checking**: System validates before prescription sign
- **Pediatric dosing**: Age-adjusted calculations for children
- **Multi-approval procedures**: High-cost surgery requires doctor + financial approval
- **Critical value alerts**: Abnormal lab results trigger immediate escalation

---

## How to Create Your First BRD

1. **Download the template**: Use [BRD Template](../templates/brd-template.md)
2. **Complete discovery**: Work through [Discovery Checklist](discovery-checklist.md) with stakeholders
3. **Write requirements**: Fill in template sections; use [Workflow Design Guide](workflow-design-guide.md) for workflows
4. **Validate medical accuracy**: Go through [Domain Expert Checklist](domain-expert-checklist.md) with clinical lead
5. **Plan edge cases**: Reference [Healthcare Edge Cases](healthcare-edge-cases.md) for failure scenarios
6. **Define acceptance criteria**: Use [QA & Acceptance Checklist](qa-acceptance-checklist.md)
7. **Get sign-offs**: Clinical lead, Engineering lead, Compliance
8. **Save & share**: `docs/product/BRD/<feature-name>.md` → Share with team in Slack

---

## Key Principles from CareSync HIMS

### For PMs Creating Requirements

✅ **DO**:
- Think in terms of roles (Who does what?)
- Consider approval chains (Who signs off on what?)
- Plan audit logging (What must be recorded?)
- Validate with domain expert (Is this medically safe?)
- Define SLAs (How fast must this happen?)
- Test edge cases (What if X fails?)

❌ **DON'T**:
- Design UI in requirements (leave to UX team)
- Assume perfect data (handle missing/invalid data)
- Forget error paths (what if approval times out?)
- Skip medical validation (wrong dose = patient harm)
- Ignore HIPAA (encryption, consent, retention)
- Create ambiguous workflows (every step must be clear)

---

## FAQ

**Q: Do I have to fill in every section of the BRD template?**  
A: No. Remove sections that don't apply. Clinical workflows typically need all sections; admin workflows may skip some.

**Q: Who is the "Domain Expert"?**  
A: Chief Medical Officer, Head of Clinical Operations, or senior clinician in that specialty area.

**Q: How long does a typical BRD take?**  
A: 4–8 hours of work spread over 1–2 weeks (discovery + stakeholder meetings + refinement).

**Q: Can I use this skill for non-clinical features (e.g., reporting, admin tools)?**  
A: Yes. The BRD template is generic; just adapt sections as needed for your feature.

**Q: Where do I store the finished BRD?**  
A: `docs/product/BRD/<feature-name>.md` in the repo. Link from `/docs/product/roadmap.md` and Jira tickets.

---

## Next Steps

1. **Pick a feature** you want to document
2. **Read**: [SKILL.md](../SKILL.md) main workflow
3. **Complete**: [Discovery Checklist](discovery-checklist.md)
4. **Draft**: [BRD Template](../templates/brd-template.md)
5. **Validate**: [Domain Expert Checklist](domain-expert-checklist.md)
6. **Finalize**: Get stakeholder sign-offs
7. **Share**: Save to `docs/product/BRD/` and notify team

---

## Support

- **Questions about medical workflows?** → Ask Chief Medical Officer
- **Questions about system architecture?** → Ask Engineering Lead
- **Questions about user roles or permissions?** → Ask RBAC Specialist (see copilot-instructions.md)
- **Questions about compliance?** → Ask Security/Compliance Lead

---

**Last Updated**: April 8, 2026  
**Skill Version**: 1.0
