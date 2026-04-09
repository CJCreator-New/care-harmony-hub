# Discovery Checklist

Use this checklist **before** starting your BRD to ensure you have all the context you need.

## Stakeholder & Team Alignment

- [ ] **Primary stakeholder** identified (who requested this feature?)
- [ ] **Clinical stakeholder** identified (e.g., head of pharmacy, chief of medicine)
- [ ] **Engineering lead** informed; initial feasibility check done
- [ ] **Compliance/Security** consulted if PHI involved
- [ ] **UX/Design** has preliminary input on workflow
- [ ] Team kickoff meeting scheduled to review discovery outcomes

## Current State Analysis

- [ ] **Document existing workflow**: How is this done today? (manual, system, hybrid?)
- [ ] **Identify pain points**: What's broken? (time, errors, user frustration?)
- [ ] **Quantify problems**: How many users affected? How often? Cost impact?
- [ ] **List workarounds**: What do people do to get around the current limitation?
- [ ] **Interview 3+ end users**: Doctors, nurses, staff; understand their needs, concerns

**Example Interview Questions**:
- "What takes you the longest about the current process?"
- "Where do errors happen most often?"
- "If you could change one thing, what would it be?"

## Patient/Clinical Impact

- [ ] **Does this touch PHI?** (Patient names, medical records, test results, medications?)
- [ ] **Does this require HIPAA audit trail?** (Any clinical decision or billing action?)
- [ ] **Medical accuracy concerns?** (Drug dosing, lab ranges, age-appropriateness?)
- [ ] **Workflow safety risks?** (Can a dangerous action be prevented?)
- [ ] **Consent required?** (Patient permission to share data?)
- [ ] **Data retention requirement?** (How long must records be kept?)

## Technical & Integration Context

- [ ] **Existing systems** that must integrate (pharmacy, lab, billing?)
- [ ] **Data source**: Where will data come from? (manual entry, external API, import?)
- [ ] **Data storage**: New table needed? Modify existing schema?
- [ ] **Real-time requirements**: Must this be instant notification, or batch OK?
- [ ] **Performance expectations**: How many users? How many transactions/day?
- [ ] **External dependencies**: Third-party APIs, hardware, or legacy system integrations?

## User Roles & Permissions

- [ ] **All affected roles identified** (doctor, nurse, pharmacist, lab, billing, receptionist, admin, patient?)
- [ ] **Each role's responsibilities** clear (who creates, who approves, who executes?)
- [ ] **Permission boundaries** defined (what can each role see/do?)
- [ ] **Approval chains needed?** (Hierarchical signoff? Concurrent approvers?)

## Definition of Success

- [ ] **Clear success metrics** defined (time saved, error reduction, adoption rate?)
- [ ] **Baseline measurements** recorded (current state performance)
- [ ] **Target state metrics** set (realistic 30/60/90-day targets?)
- [ ] **How will we measure?** (system logs, surveys, user interviews?)

## Risks & Constraints

- [ ] **Timeline**: When is this needed? (ASAP, this quarter, next year?)
- [ ] **Budget**: Cost constraints? Licensing needed for third-party tools?
- [ ] **Regulatory**: Compliance requirements beyond HIPAA?
- [ ] **Technical debt**: Will this create future maintenance burden?
- [ ] **Competing priorities**: How does this rank vs. other requests?

## Assumptions & Dependencies

- [ ] **List all assumptions**: "We assume doctors will use e-signatures", "We assume patient allergies are accurate"
- [ ] **List all dependencies**: External systems, data quality, team availability
- [ ] **External approvals needed**: Legal, compliance, clinical leadership sign-off?

---

**Outcome**: Complete this checklist → Schedule kickoff with engineering & stakeholders → Ready to start BRD
