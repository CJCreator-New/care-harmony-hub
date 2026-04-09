# Business Requirements Document (BRD) Template

**Project/Feature**: [Name]  
**Version**: 1.0  
**Created**: [Date]  
**Last Updated**: [Date]  
**Document Owner**: [PM Name]  
**Status**: [Draft | In Review | Approved | In Development]

---

## Executive Summary

[2-3 sentences describing the feature, why it matters, and expected business impact]

**Example**: "*Enable doctors to electronically sign prescriptions directly in CareSync, reducing prescription errors by 40% and eliminating manual fax workflows. Expected to save 2-3 hours per doctor per week.*"

---

## 1. Business Case & Objectives

### Problem Statement
[Describe the current pain point, inefficiency, or limitation]

**Example**: 
- "*Doctors currently print prescriptions, sign them manually, then scan them to the pharmacy.*"
- "*Paper prescriptions are lost 5% of the time, causing medication delays.*"
- "*Pharmacists waste 30 minutes per day reconciling handwritten dosages.*"

### Business Objectives
- [ ] **Objective 1**: [Specific, measurable goal]
- [ ] **Objective 2**: [Specific, measurable goal]
- [ ] **Objective 3**: [Specific, measurable goal]

**Example**:
- Reduce prescription errors from 2% to <0.1%
- Eliminate manual fax workflows
- Improve patient satisfaction by 25%

### Success Metrics
- [ ] **Metric 1**: [How will we measure success?]
- [ ] **Metric 2**: [Baseline vs target]

**Example**:
- Prescription error rate: 2.0% → 0.1%
- Prescription fulfillment time: 4 hours → 30 minutes
- Doctor adoption: >80% within 3 months

---

## 2. Functional Requirements

### Requirements by Role

#### Role: Doctor
- [ ] **FR-D1**: Doctor can view pending prescription list filtered by patient
- [ ] **FR-D2**: Doctor can create/edit a prescription (drug name, dose, frequency, duration, special instructions)
- [ ] **FR-D3**: Doctor can review automatically-flagged drug interactions before signing
- [ ] **FR-D4**: Doctor can electronically sign prescription with single click (signature + timestamp logged)
- [ ] **FR-D5**: Doctor receives audit trail of all signed prescriptions (who, what, when)
- [ ] **FR-D6**: Doctor can void/recall a prescription within 1 hour of signing (with reason logged)

#### Role: Pharmacist
- [ ] **FR-P1**: Pharmacist receives real-time notification when prescription is signed
- [ ] **FR-P2**: Pharmacist can view full prescription details (drug, dose, patient allergies, interactions)
- [ ] **FR-P3**: Pharmacist can mark prescription as dispensed/filled with lot number and expiration date
- [ ] **FR-P4**: Pharmacist can reject prescription with reason (will notify doctor)

#### Role: Patient
- [ ] **FR-PT1**: Patient can view list of active/pending prescriptions in patient portal
- [ ] **FR-PT2**: Patient receives SMS/email notification when prescription is ready for pickup
- [ ] **FR-PT3**: Patient can print prescription label for pharmacy pickup

#### Role: Hospital Admin
- [ ] **FR-A1**: Admin can view reports of all signed prescriptions (by doctor, by date range)
- [ ] **FR-A2**: Admin can audit user activity (who signed, when, any voids/recalls)

---

## 3. Non-Functional Requirements

- [ ] **Performance**: Prescription sign/dispense flow <2 seconds end-to-end
- [ ] **Availability**: 99.9% uptime during business hours
- [ ] **Security**: All PHI encrypted at rest and in transit; signature cryptographically verified
- [ ] **Compliance**: HIPAA audit trail, legal prescription record retention (7 years)
- [ ] **Accessibility**: WCAG 2.1 AA for doctor interfaces
- [ ] **Scalability**: Support 1,000+ concurrent doctors, 50,000+ prescriptions/day

---

## 4. Use Cases & Workflows

### Use Case 1: Doctor Signs & Sends Prescription

```
Actor: Doctor
Precondition: Doctor is logged in; patient has active encounter
Trigger: Doctor clicks "Sign Prescription" button

Main Flow:
1. System displays prescription details (drug, dose, frequency, patient info)
2. System checks for drug interactions against patient's active medications
3. If interactions detected → system highlights them; doctor reviews and confirms
4. Doctor reviews signature preview (name, title, timestamp)
5. Doctor clicks "Confirm & Sign"
6. System cryptographically signs prescription
7. System records signature in audit log: [doctor_id, timestamp, signature_hash]
8. System sends notification to pharmacy + patient
9. System displays confirmation message: "Prescription signed and sent"

Postcondition: Prescription status = "Signed"; Pharmacy notified; Patient notified

Alternative Flow (Doctor Recalls):
3a. If doctor wants to make changes within 1 hour:
    - Doctor clicks "Recall Prescription"
    - System marks prescription as "Recalled"
    - System logs recall reason mandatory
    - Doctor can edit and re-sign
```

### Use Case 2: Pharmacist Receives & Dispenses Prescription

```
Actor: Pharmacist
Precondition: Doctor has signed prescription; pharmacist is logged in

Main Flow:
1. Pharmacist receives real-time notification "New Rx ready for review"
2. Pharmacist clicks notification → opens prescription details
3. Pharmacist verifies patient allergies and drug interactions
4. Pharmacist confirms inventory available for dose
5. Pharmacist physically dispenses medication, scans lot number
6. Pharmacist clicks "Mark as Dispensed"
7. System records: [pharmacist_id, lot_number, dispensed_at, timestamp]
8. System notifies patient "Your prescription is ready for pickup"
9. System updates prescription status = "Dispensed"

Postcondition: Prescription ready for patient pickup; Patient notified via SMS/email

Alternative Flow (Pharmacist Rejects):
3a. If pharmacist cannot fulfill (allergy, no inventory, error):
    - Pharmacist clicks "Reject Prescription"
    - Pharmacist provides reason (mandatory)
    - System notifies doctor with rejection reason
    - System notifies patient "Please wait for doctor to contact you"
```

---

## 5. Data Requirements & Model Changes

### New Tables / Schema Changes

#### `prescriptions` Table (New)
```sql
id (UUID, PK)
patient_id (UUID, FK → patients.id)
doctor_id (UUID, FK → users.id)
created_by (UUID, FK → users.id)
drug_id (UUID, FK → drugs.id) -- Reference to drug library with interactions
dose_value (NUMERIC) -- e.g., 500
dose_unit (VARCHAR) -- e.g., "mg", "ml"
frequency (VARCHAR) -- e.g., "twice daily", "every 8 hours"
duration_days (INT) -- e.g., 7, 30
special_instructions (TEXT)
status (ENUM) -- "Draft", "Signed", "Dispensed", "Recalled"
signed_at (TIMESTAMP) -- When doctor signed
signed_by (UUID, FK → users.id)
signature_hash (TEXT) -- Cryptographic signature for legal verification
dispensed_at (TIMESTAMP)
dispensed_by (UUID, FK → users.id) -- Pharmacist
lot_number (VARCHAR)
created_at (TIMESTAMP)
updated_at (TIMESTAMP)
encryption_metadata (JSONB) -- For HIPAA compliance
```

#### `prescription_audit_log` Table (New)
```sql
id (UUID, PK)
prescription_id (UUID, FK → prescriptions.id)
action (ENUM) -- "created", "signed", "dispensed", "recalled", "modified"
actor_id (UUID, FK → users.id)
actor_role (VARCHAR)
old_values (JSONB) -- For audit trail of changes
new_values (JSONB)
timestamp (TIMESTAMP)
ip_address (INET)
user_agent (TEXT)
```

#### Modifications to `patients` Table
- Add `drug_allergies` (JSONB array) -- List of allergies for interaction checking

---

## 6. External Integrations & Dependencies

### External Systems

| System | Purpose | API/Protocol | Status |
|--------|---------|-------------|--------|
| Drug Database | Verify valid drugs, check interactions | REST API or local reference | Existing |
| Pharmacy Management | Sync dispensed prescriptions | HL7 v2.5 or REST | Planned Q3 |
| Patient SMS/Email | Notifications | Twilio + SendGrid | Existing |
| eSignature Provider | Legal signature verification (optional) | DocuSign or similar | Future |

### Dependencies

- [ ] Existing drug library must include interaction data
- [ ] Patient allergies must be populated in patient records
- [ ] Doctor and pharmacist roles must be configured in Supabase RLS
- [ ] Notification infrastructure (SMS/Email) must be tested

---

## 7. Role-Based Access Control (RBAC)

| Role | Can Create | Can Sign | Can Dispense | Can Audit | Can Recall |
|------|-----------|---------|-------------|-----------|-----------|
| Doctor | Yes | Yes (their own) | No | No | Yes (own, <1hr) |
| Pharmacist | No | No | Yes | No | No |
| Consultant Doc | Yes | Yes | No | No | No |
| Hospital Admin | No | No | No | Yes (all) | No |
| Patient | No | No | No | No | No |

---

## 8. Acceptance Criteria & Success Metrics

### Functional Acceptance Criteria

- [ ] **AC-1**: A doctor can sign a prescription and it appears in the pharmacy queue within 2 seconds
- [ ] **AC-2**: Pharmacist receives notification (email + in-app alert) within 1 second of doctor signing
- [ ] **AC-3**: All prescription changes (before/after signing) are logged to audit trail with actor, timestamp, IP
- [ ] **AC-4**: A doctor cannot sign a prescription for a patient they don't have access to (permission denied)
- [ ] **AC-5**: Drug interaction check catches 95%+ of known dangerous interactions
- [ ] **AC-6**: Recall only allowed within 1 hour of signing; recall reason is mandatory
- [ ] **AC-7**: Patient can view signed prescriptions in patient portal real-time
- [ ] **AC-8**: All PHI (patient name, drugs, doses) encrypted at rest and in transit

### Security & Compliance Acceptance Criteria

- [ ] **AC-SEC-1**: Prescription signature is cryptographically verified (legal admissibility)
- [ ] **AC-SEC-2**: All events logged to HIPAA audit trail: actor, action, timestamp, result
- [ ] **AC-SEC-3**: No PHI in error messages shown to users
- [ ] **AC-SEC-4**: Encryption keys rotated every 90 days
- [ ] **AC-SEC-5**: Role-based access cannot be bypassed (RLS enforced at DB level)

### Performance Acceptance Criteria

- [ ] **AC-PERF-1**: Prescription sign operation completes in <2 seconds
- [ ] **AC-PERF-2**: Dashboard loads with 100+ prescriptions in <3 seconds
- [ ] **AC-PERF-3**: Search by patient name returns results in <500ms

### Business Success Metrics (30-day post-launch)

- [ ] **Metric-1**: >80% of doctors using e-signature (vs. manual signing)
- [ ] **Metric-2**: Prescription fulfillment time reduced from 4 hours to 30 minutes
- [ ] **Metric-3**: Prescription error rate reduced to <0.1%
- [ ] **Metric-4**: Zero security incidents related to prescriptions
- [ ] **Metric-5**: User satisfaction score >4.2/5 from doctors and pharmacists

---

## 9. Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Doctor forgets to sign; patient delays medication | High | Medium | SMS reminder after 2 hours of unsigned prescription |
| Pharmacy system integration fails; manual workaround needed | High | Low | Fallback: Print prescription for manual pharmacist entry |
| Legal dispute over digital signature validity | High | Low | Use certified eSignature provider (DocuSign); store signature hash |
| Drug interaction check is incomplete; harmful prescription signed | Critical | Low | Implement double-check: pharmacist verifies before dispensing |
| Prescription data leak due to unencrypted backup | Critical | Low | Encrypt all backups; limit DB access to 2 admins; audit all access |

---

## 10. Timeline & Resource Estimation

### Development Phases

| Phase | Tasks | Timeline | Resources |
|-------|-------|----------|-----------|
| **Phase 1: Backend** | DB schema, RLS policies, audit logging | 2 weeks | 1 Senior Eng, 1 QA |
| **Phase 2: Frontend** | Doctor UI, signature flow, notifications | 3 weeks | 2 Frontend Eng, 1 Designer |
| **Phase 3: Pharmacy** | Pharmacist UI, dispensing, notifications | 2 weeks | 1 Frontend Eng, 1 QA |
| **Phase 4: Integration & Testing** | Pharmacy integration, E2E tests, performance  | 2 weeks | 1 Eng, 1 QA, 1 Security |
| **Phase 5: UAT & Launch** | Doctor/pharmacist UAT, docs, training | 1 week | Full team |

**Total**: ~10 weeks, 6 FTE equivalent

### Resource Requirements

- 2 Backend Engineers (API, DB, RLS, audit)
- 2 Frontend Engineers (React UIs)
- 1 Designer (Figma mockups)
- 1 QA Engineer (test plans, manual testing)
- 1 Security/Compliance Lead (HIPAA review, eSignature legal)
- 1 Product Manager (requirements, launch)

---

## 11. Sign-Off & Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Manager | [Name] | [Date] | |
| Engineering Lead | [Name] | [Date] | |
| Clinical Lead | [Name] | [Date] | |
| Hospital Admin | [Name] | [Date] | |
| Security/Compliance | [Name] | [Date] | |

---

## Appendix: Assumptions & Constraints

### Assumptions
- Drug database is maintained and accurate
- Patient allergies are populated in the system
- SMS/Email notifications are available 24/7
- Doctor and pharmacist roles are already configured in Supabase

### Constraints
- Must maintain 99.9% uptime during business hours (8am-6pm)
- Cannot modify existing patient or user tables without migration
- eSignature must be HIPAA-compliant and legally admissible
- Budget capped at $100K; cannot hire external consultants

---

**Document Version Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | [Date] | [PM] | Initial draft |
| 1.1 | [Date] | [PM] | Feedback from clinical lead |

---

*For questions, contact: [PM Name] at [email]*
