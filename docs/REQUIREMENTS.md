# CareSync Requirements Document (BRD/PRD)

## Document Information
| Field | Value |
|-------|-------|
| Project Name | CareSync - Hospital Management System |
| Version | 1.0 |
| Last Updated | January 2026 |
| Status | Approved |

---

## 1. Introduction

### 1.1 Purpose
This document defines the functional and non-functional requirements for CareSync, a comprehensive Hospital Management System designed for small to medium-sized healthcare facilities.

### 1.2 Scope
This document covers all features planned for CareSync v1.0, including core hospital operations, clinical workflows, and patient-facing features.

### 1.3 Definitions & Acronyms
| Term | Definition |
|------|------------|
| HMS | Hospital Management System |
| EMR | Electronic Medical Records |
| RLS | Row Level Security |
| RBAC | Role-Based Access Control |
| PWA | Progressive Web Application |
| MRN | Medical Record Number |

---

## 2. User Roles & Personas

### 2.1 Role Definitions

| Role | Description | Key Responsibilities |
|------|-------------|---------------------|
| Admin | Hospital administrator | System config, user management, reports |
| Doctor | Licensed physician | Patient consultations, prescriptions |
| Nurse | Registered nurse | Patient prep, vitals, medication |
| Receptionist | Front desk staff | Scheduling, check-in/out, billing |
| Pharmacist | Licensed pharmacist | Prescription dispensing, inventory |
| Lab Technician | Laboratory staff | Sample processing, results entry |
| Patient | Healthcare recipient | Appointments, records access |

### 2.2 User Stories by Role

#### Admin User Stories
```
US-A01: As an Admin, I want to manage staff accounts so that I can control system access
US-A02: As an Admin, I want to view analytics dashboards so that I can monitor operations
US-A03: As an Admin, I want to generate compliance reports so that I can meet regulatory requirements
US-A04: As an Admin, I want to configure hospital settings so that I can customize the system
US-A05: As an Admin, I want to manage departments so that I can organize staff and resources
```

#### Doctor User Stories
```
US-D01: As a Doctor, I want to view my appointment schedule so that I can plan my day
US-D02: As a Doctor, I want to conduct consultations with guided workflow so that I can document care efficiently
US-D03: As a Doctor, I want to prescribe medications with safety alerts so that I can avoid errors
US-D04: As a Doctor, I want to order lab tests so that I can diagnose conditions
US-D05: As a Doctor, I want to view patient history so that I can make informed decisions
US-D06: As a Doctor, I want to conduct video consultations so that I can serve remote patients
```

#### Nurse User Stories
```
US-N01: As a Nurse, I want to record patient vitals so that doctors have current health data
US-N02: As a Nurse, I want to complete patient prep checklists so that patients are ready for consultation
US-N03: As a Nurse, I want to administer medications so that I can track drug delivery
US-N04: As a Nurse, I want to hand off patients between shifts so that care continuity is maintained
```

#### Receptionist User Stories
```
US-R01: As a Receptionist, I want to register new patients so that they can receive care
US-R02: As a Receptionist, I want to schedule appointments so that patients can be seen
US-R03: As a Receptionist, I want to check in patients so that they can enter the queue
US-R04: As a Receptionist, I want to process payments so that bills are settled
US-R05: As a Receptionist, I want to manage walk-in registrations so that urgent cases are handled
```

#### Pharmacist User Stories
```
US-P01: As a Pharmacist, I want to view pending prescriptions so that I can prepare medications
US-P02: As a Pharmacist, I want to dispense medications and update inventory so that stock is accurate
US-P03: As a Pharmacist, I want to manage inventory so that we don't run out of medications
US-P04: As a Pharmacist, I want to verify prescriptions so that safety is ensured
```

#### Lab Technician User Stories
```
US-L01: As a Lab Tech, I want to view pending lab orders so that I can process samples
US-L02: As a Lab Tech, I want to enter test results so that doctors can access them
US-L03: As a Lab Tech, I want to flag critical values so that urgent cases are escalated
```

#### Patient User Stories
```
US-PT01: As a Patient, I want to request appointments so that I can schedule visits
US-PT02: As a Patient, I want to view my prescriptions so that I know my medications
US-PT03: As a Patient, I want to access my lab results so that I can track my health
US-PT04: As a Patient, I want to message my doctor so that I can ask questions
US-PT05: As a Patient, I want to request prescription refills so that I don't run out
```

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-AUTH-01 | Email/password authentication | Must Have | ✅ Done |
| FR-AUTH-02 | Secure password requirements (8+ chars, uppercase, number, symbol) | Must Have | ✅ Done |
| FR-AUTH-03 | Role-based access control (7 roles) | Must Have | ✅ Done |
| FR-AUTH-04 | Session timeout after inactivity | Must Have | ✅ Done |
| FR-AUTH-05 | Password reset via email | Must Have | ✅ Done |
| FR-AUTH-06 | Account lockout after failed attempts | Should Have | ✅ Done |
| FR-AUTH-07 | Two-factor authentication | Could Have | 🔲 Planned |

### 3.2 Patient Management

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-PAT-01 | Register new patients with demographics | Must Have | ✅ Done |
| FR-PAT-02 | Auto-generate unique MRN | Must Have | ✅ Done |
| FR-PAT-03 | Record insurance information | Should Have | ✅ Done |
| FR-PAT-04 | Track allergies and chronic conditions | Must Have | ✅ Done |
| FR-PAT-05 | Store emergency contact information | Should Have | ✅ Done |
| FR-PAT-06 | Patient search by name/MRN/phone | Must Have | ✅ Done |
| FR-PAT-07 | Deactivate patient records (soft delete) | Should Have | ✅ Done |

### 3.3 Appointment Management

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-APT-01 | Schedule appointments with doctor selection | Must Have | ✅ Done |
| FR-APT-02 | Define appointment types and durations | Must Have | ✅ Done |
| FR-APT-03 | Doctor availability management | Must Have | ✅ Done |
| FR-APT-04 | Appointment status tracking | Must Have | ✅ Done |
| FR-APT-05 | Appointment reminders (automated) | Should Have | ✅ Done |
| FR-APT-06 | Waitlist management | Could Have | ✅ Done |
| FR-APT-07 | Recurring appointments | Could Have | 🔲 Planned |

### 3.4 Clinical Workflows

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-CLN-01 | Multi-step consultation workflow | Must Have | ✅ Done |
| FR-CLN-02 | Chief complaint documentation | Must Have | ✅ Done |
| FR-CLN-03 | Physical examination recording | Must Have | ✅ Done |
| FR-CLN-04 | Diagnosis entry (provisional/final) | Must Have | ✅ Done |
| FR-CLN-05 | Treatment plan documentation | Must Have | ✅ Done |
| FR-CLN-06 | Auto-save consultation progress | Should Have | ✅ Done |
| FR-CLN-07 | Consultation handoff between providers | Should Have | ✅ Done |

### 3.5 Prescription Management

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-RX-01 | Create prescriptions with medications | Must Have | ✅ Done |
| FR-RX-02 | Drug interaction checking | Must Have | ✅ Done |
| FR-RX-03 | Allergy alerts | Must Have | ✅ Done |
| FR-RX-04 | Prescription verification workflow | Should Have | ✅ Done |
| FR-RX-05 | Prescription dispensing tracking | Must Have | ✅ Done |
| FR-RX-06 | Refill request handling | Should Have | ✅ Done |

### 3.6 Laboratory Management

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-LAB-01 | Order lab tests from consultation | Must Have | ✅ Done |
| FR-LAB-02 | Track sample collection | Should Have | ✅ Done |
| FR-LAB-03 | Enter and store test results | Must Have | ✅ Done |
| FR-LAB-04 | Critical value alerts | Must Have | ✅ Done |
| FR-LAB-05 | Result notification to ordering doctor | Should Have | ✅ Done |

### 3.7 Pharmacy & Inventory

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-INV-01 | Medication inventory tracking | Must Have | ✅ Done |
| FR-INV-02 | Low stock alerts | Must Have | ✅ Done |
| FR-INV-03 | Auto-reorder rules | Should Have | ✅ Done |
| FR-INV-04 | Expiry date tracking | Should Have | ✅ Done |
| FR-INV-05 | Purchase order management | Should Have | ✅ Done |
| FR-INV-06 | Supplier management | Should Have | ✅ Done |

### 3.8 Billing & Payments

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-BIL-01 | Generate invoices from consultations | Must Have | ✅ Done |
| FR-BIL-02 | Add line items (services, medications) | Must Have | ✅ Done |
| FR-BIL-03 | Apply discounts and taxes | Should Have | ✅ Done |
| FR-BIL-04 | Record payments | Must Have | ✅ Done |
| FR-BIL-05 | Insurance claim submission | Should Have | ✅ Done |
| FR-BIL-06 | Payment plan setup | Could Have | ✅ Done |

### 3.9 Queue Management

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-QUE-01 | Patient check-in to queue | Must Have | ✅ Done |
| FR-QUE-02 | Priority-based queuing | Should Have | ✅ Done |
| FR-QUE-03 | Queue number assignment | Must Have | ✅ Done |
| FR-QUE-04 | Real-time queue display | Should Have | ✅ Done |
| FR-QUE-05 | Department-wise queues | Should Have | ✅ Done |

### 3.10 Reporting & Analytics

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-RPT-01 | Daily appointment reports | Must Have | ✅ Done |
| FR-RPT-02 | Revenue reports | Must Have | ✅ Done |
| FR-RPT-03 | Staff performance metrics | Should Have | ✅ Done |
| FR-RPT-04 | Inventory reports | Should Have | ✅ Done |
| FR-RPT-05 | Export to CSV/PDF | Should Have | ✅ Done |
| FR-RPT-06 | Custom date range filtering | Must Have | ✅ Done |

### 3.11 Communication

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-COM-01 | In-app notifications | Must Have | ✅ Done |
| FR-COM-02 | Secure messaging (doctor-patient) | Should Have | ✅ Done |
| FR-COM-03 | Staff messaging | Could Have | ✅ Done |
| FR-COM-04 | Notification preferences | Should Have | ✅ Done |

### 3.12 Telemedicine

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-TLM-01 | Video consultation capability | Should Have | ✅ Done |
| FR-TLM-02 | Telemedicine appointment type | Should Have | ✅ Done |
| FR-TLM-03 | Waiting room functionality | Could Have | ✅ Done |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| NFR-PERF-01 | Page load time | < 3 seconds | Must Have |
| NFR-PERF-02 | API response time | < 500ms (95th percentile) | Must Have |
| NFR-PERF-03 | Concurrent users support | 500 per hospital | Should Have |
| NFR-PERF-04 | Database query time | < 100ms | Should Have |

### 4.2 Security

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-SEC-01 | HTTPS encryption for all traffic | Must Have |
| NFR-SEC-02 | Row Level Security on all tables | Must Have |
| NFR-SEC-03 | Password hashing with bcrypt | Must Have |
| NFR-SEC-04 | SQL injection prevention | Must Have |
| NFR-SEC-05 | XSS attack prevention | Must Have |
| NFR-SEC-06 | CSRF protection | Must Have |
| NFR-SEC-07 | Audit logging for sensitive actions | Must Have |
| NFR-SEC-08 | Data encryption at rest | Must Have |

### 4.3 Reliability

| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| NFR-REL-01 | System uptime | 99.9% | Must Have |
| NFR-REL-02 | Data backup frequency | Every 24 hours | Must Have |
| NFR-REL-03 | Recovery Point Objective (RPO) | 24 hours | Must Have |
| NFR-REL-04 | Recovery Time Objective (RTO) | 4 hours | Should Have |

### 4.4 Usability

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-USE-01 | Mobile-responsive design | Must Have |
| NFR-USE-02 | WCAG 2.1 AA accessibility | Should Have |
| NFR-USE-03 | Maximum 3 clicks to any feature | Should Have |
| NFR-USE-04 | Consistent UI patterns | Must Have |
| NFR-USE-05 | Loading states for all async operations | Must Have |

### 4.5 Scalability

| ID | Requirement | Target | Priority |
|----|-------------|--------|----------|
| NFR-SCL-01 | Horizontal scaling capability | Auto-scale | Should Have |
| NFR-SCL-02 | Database scalability | Up to 1M patients | Should Have |
| NFR-SCL-03 | Multi-tenant architecture | Single instance | Must Have |

### 4.6 Compliance

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-CMP-01 | HIPAA compliance | Must Have |
| NFR-CMP-02 | NABH compliance | Must Have |
| NFR-CMP-03 | GDPR compliance (data portability) | Should Have |
| NFR-CMP-04 | Data retention policies | Must Have |

### 4.7 Maintainability

| ID | Requirement | Priority |
|----|-------------|----------|
| NFR-MNT-01 | Modular component architecture | Must Have |
| NFR-MNT-02 | TypeScript for type safety | Must Have |
| NFR-MNT-03 | Automated testing coverage > 70% | Should Have |
| NFR-MNT-04 | Code documentation | Should Have |

---

## 5. Interface Requirements

### 5.1 User Interface

- Modern, clean design using Tailwind CSS
- Dark/light mode support
- Responsive breakpoints: mobile, tablet, desktop
- Consistent iconography using Lucide icons
- Toast notifications for user feedback
- Modal dialogs for focused interactions

### 5.2 API Interface

- RESTful API via Supabase
- Real-time subscriptions for live updates
- JWT-based authentication
- Rate limiting: 100 requests/minute
- Error responses with meaningful messages

### 5.3 External Integrations

| Integration | Purpose | Priority |
|-------------|---------|----------|
| Email Service | Notifications, password reset | Must Have |
| SMS Gateway | Appointment reminders | Could Have |
| Payment Gateway | Online payments | Could Have |
| Video Platform | Telemedicine | Should Have |

---

## 6. Data Requirements

### 6.1 Data Entities

```
Core Entities:
├── hospitals
├── profiles (users)
├── patients
├── appointments
├── consultations
├── prescriptions
├── prescription_items
├── lab_orders
├── medical_records
├── vital_signs
└── documents

Operational Entities:
├── medications
├── invoices
├── invoice_items
├── payments
├── insurance_claims
├── patient_queue
└── notifications

Supporting Entities:
├── departments
├── doctor_availability
├── suppliers
├── purchase_orders
└── activity_logs
```

### 6.2 Data Retention

| Data Type | Retention Period | Justification |
|-----------|------------------|---------------|
| Medical Records | 10 years | NABH requirement |
| Billing Records | 7 years | Tax compliance |
| Audit Logs | 3 years | Compliance |
| Messages | 2 years | Communication |
| Session Logs | 90 days | Security |

---

## 7. Acceptance Criteria

### 7.1 General Criteria
- All must-have requirements implemented and tested
- No critical or high-severity bugs
- Performance targets met
- Security audit passed
- User acceptance testing completed

### 7.2 Feature-Specific Criteria
Each feature must:
- Work across all supported browsers
- Be fully responsive on mobile
- Have proper error handling
- Include loading states
- Follow security guidelines
- Be documented

---

## 8. Traceability Matrix

| Requirement ID | User Story | Test Case | Status |
|----------------|------------|-----------|--------|
| FR-AUTH-01 | US-A01 | TC-AUTH-01 | ✅ |
| FR-PAT-01 | US-R01 | TC-PAT-01 | ✅ |
| FR-APT-01 | US-R02 | TC-APT-01 | ✅ |
| FR-CLN-01 | US-D02 | TC-CLN-01 | ✅ |
| FR-RX-01 | US-D03 | TC-RX-01 | ✅ |
| FR-LAB-01 | US-D04 | TC-LAB-01 | ✅ |
| ... | ... | ... | ... |

---

## Appendix

### A. Glossary
- **Consultation**: A documented patient-doctor encounter
- **Prescription**: A formal medication order
- **MRN**: Medical Record Number - unique patient identifier
- **Vitals**: Patient vital signs (BP, temperature, etc.)

### B. References
- NABH Accreditation Standards
- HIPAA Security Rule
- HL7 FHIR Standards (future)
