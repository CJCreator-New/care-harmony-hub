# CareSync Scope Statement

## Document Information
| Field | Value |
|-------|-------|
| Project Name | CareSync - Hospital Management System |
| Version | 1.0 |
| Last Updated | January 2026 |
| Approved By | [Project Sponsor] |

---

## 1. Project Overview

CareSync is a comprehensive, cloud-native Hospital Management System designed for small to medium-sized healthcare facilities. This document defines the boundaries of work included in the CareSync v1.0 release.

---

## 2. In-Scope

### 2.1 Core Modules

#### ✅ Authentication & Access Control
- Hospital registration and onboarding
- User authentication (email/password)
- Role-based access control (7 roles)
- Password reset functionality
- Session management
- Account lockout protection

#### ✅ Patient Management
- Patient registration with demographics
- Auto-generated MRN
- Insurance information capture
- Allergy and condition tracking
- Emergency contact management
- Patient search and filtering
- Patient deactivation

#### ✅ Appointment Management
- Appointment scheduling
- Multiple appointment types
- Doctor availability management
- Appointment status workflow
- Automated reminders
- Waitlist functionality

#### ✅ Clinical Workflows
- 5-step consultation wizard
- Chief complaint documentation
- Physical examination recording
- Diagnosis entry (ICD coding ready)
- Treatment planning
- Auto-save functionality
- Consultation handoff

#### ✅ Prescription Management
- Prescription creation
- Drug interaction checking
- Allergy alerts
- Verification workflow
- Dispensing tracking
- Refill requests

#### ✅ Laboratory Management
- Lab order creation
- Sample collection tracking
- Result entry
- Critical value alerts
- Result notifications

#### ✅ Pharmacy & Inventory
- Medication inventory
- Stock level tracking
- Low stock alerts
- Auto-reorder rules
- Expiry tracking
- Purchase orders
- Supplier management

#### ✅ Billing & Payments
- Invoice generation
- Line item management
- Tax and discount support
- Payment recording
- Insurance claims
- Payment plans

#### ✅ Queue Management
- Patient check-in
- Queue number assignment
- Priority queuing
- Real-time queue display
- Department queues

#### ✅ Reporting & Analytics
- Appointment reports
- Revenue reports
- Staff performance
- Inventory reports
- Export functionality

#### ✅ Communication
- In-app notifications
- Secure messaging
- Notification preferences

#### ✅ Telemedicine
- Video consultations
- Telemedicine appointments
- Waiting room

### 2.2 User Interfaces

| Interface | Platform | Status |
|-----------|----------|--------|
| Web Application | Desktop browsers | ✅ In Scope |
| Mobile Web | Mobile browsers (PWA) | ✅ In Scope |
| Admin Dashboard | Desktop | ✅ In Scope |
| Patient Portal | Web/Mobile | ✅ In Scope |

### 2.3 Technical Scope

| Component | Technology | Status |
|-----------|------------|--------|
| Frontend | React + TypeScript + Tailwind | ✅ In Scope |
| Backend | Supabase (Lovable Cloud) | ✅ In Scope |
| Database | PostgreSQL | ✅ In Scope |
| Authentication | Supabase Auth | ✅ In Scope |
| Real-time | Supabase Realtime | ✅ In Scope |
| Edge Functions | Deno | ✅ In Scope |
| File Storage | Supabase Storage | ✅ In Scope |

### 2.4 Compliance & Security

| Requirement | Status |
|-------------|--------|
| HIPAA Compliance Framework | ✅ In Scope |
| NABH Compliance Framework | ✅ In Scope |
| Row Level Security | ✅ In Scope |
| Audit Logging | ✅ In Scope |
| Data Encryption | ✅ In Scope |

### 2.5 Supported Browsers

| Browser | Minimum Version | Status |
|---------|-----------------|--------|
| Chrome | 90+ | ✅ In Scope |
| Firefox | 88+ | ✅ In Scope |
| Safari | 14+ | ✅ In Scope |
| Edge | 90+ | ✅ In Scope |

---

## 3. Out of Scope

### 3.1 Explicitly Excluded Features

#### ❌ Native Mobile Applications
- iOS native app
- Android native app
- *Rationale: PWA provides sufficient mobile experience for v1.0*

#### ❌ Advanced Integrations
- HL7 FHIR integration
- PACS/DICOM imaging
- External EHR/EMR integration
- Government health portals (ABDM)
- *Rationale: Planned for v2.0*

#### ❌ Advanced Clinical Features
- Clinical decision support (AI)
- E-prescribing (external pharmacies)
- Radiology module
- Blood bank management
- OT scheduling
- Inpatient management
- *Rationale: Focused on outpatient workflows for v1.0*

#### ❌ Financial Features
- General ledger
- Payroll management
- Accounts receivable/payable
- Financial statements
- *Rationale: Integration with accounting software preferred*

#### ❌ Hardware Integration
- Barcode scanners
- Biometric devices
- Medical devices
- POS terminals
- *Rationale: Requires hardware partnerships*

#### ❌ Multi-Language Support
- Hindi translation
- Regional languages
- RTL support
- *Rationale: Planned for v1.1*

#### ❌ Advanced Analytics
- Predictive analytics
- Machine learning models
- Business intelligence dashboards
- *Rationale: Planned for v2.0*

#### ❌ White-Labeling
- Custom branding per hospital
- Custom domains per hospital
- *Rationale: Enterprise feature for later*

### 3.2 Technical Exclusions

| Excluded | Reason |
|----------|--------|
| On-premise deployment | Cloud-first strategy |
| Legacy browser support (IE) | EOL browser |
| Offline-first capability | Complex for v1.0 |
| Multi-region deployment | Cost optimization |
| Custom SSO (SAML/LDAP) | Enterprise feature |

### 3.3 Process Exclusions

| Excluded | Reason |
|----------|--------|
| Data migration services | Customer responsibility |
| Custom development | Standard product focus |
| 24/7 phone support | Email/chat support only |
| On-site training | Remote training only |
| Custom SLA | Standard SLA for v1.0 |

---

## 4. Assumptions

### 4.1 Technical Assumptions
1. Users have stable internet connectivity (minimum 1 Mbps)
2. Users have modern web browsers (within 2 years of current version)
3. Lovable Cloud infrastructure remains available and reliable
4. Email delivery services function correctly
5. Video call functionality depends on WebRTC browser support

### 4.2 Business Assumptions
1. Target users have basic computer literacy
2. Hospitals will provide necessary data for setup
3. Regulatory requirements remain stable during development
4. English language is acceptable for initial deployment
5. Pricing model is viable for target market

### 4.3 Resource Assumptions
1. Development resources are available as planned
2. Design assets are provided on schedule
3. Testing resources are adequate for quality assurance
4. Cloud infrastructure costs remain within estimates

---

## 5. Constraints

### 5.1 Technical Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| Lovable platform capabilities | Feature limitations | Design within platform |
| Serverless architecture | No long-running processes | Use queues and webhooks |
| Browser security policies | Limited hardware access | PWA capabilities only |
| Supabase query limits | Performance at scale | Optimize queries, caching |

### 5.2 Business Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| Budget limitations | Feature prioritization | MVP approach |
| Time-to-market pressure | Quality vs. speed | Phased releases |
| Competitive pricing | Revenue limits | Usage-based model |
| Small team size | Limited parallelism | Efficient tooling |

### 5.3 Regulatory Constraints

| Constraint | Impact | Mitigation |
|------------|--------|------------|
| HIPAA requirements | Design complexity | Security-first design |
| NABH standards | Documentation needs | Compliance framework |
| Data localization | Infrastructure costs | India-based hosting |

---

## 6. Dependencies

### 6.1 External Dependencies

| Dependency | Type | Risk Level |
|------------|------|------------|
| Lovable Cloud (Supabase) | Infrastructure | Medium |
| Email service | Communication | Low |
| Video call provider | Telemedicine | Medium |
| Domain registrar | Hosting | Low |
| SSL certificates | Security | Low |

### 6.2 Internal Dependencies

| Dependency | Type | Risk Level |
|------------|------|------------|
| UI/UX designs | Design | Medium |
| Content/copy | Marketing | Low |
| Test data | QA | Low |
| Documentation | Training | Low |

---

## 7. Deliverables

### 7.1 Product Deliverables

| Deliverable | Format | Audience |
|-------------|--------|----------|
| Web Application | URL | End Users |
| Patient Portal | URL | Patients |
| Admin Dashboard | URL | Administrators |
| API Documentation | Markdown | Developers |

### 7.2 Documentation Deliverables

| Deliverable | Format | Audience |
|-------------|--------|----------|
| User Guide | PDF/Web | End Users |
| Admin Guide | PDF/Web | Administrators |
| API Reference | Markdown | Developers |
| Training Materials | Video/PDF | All |

### 7.3 Support Deliverables

| Deliverable | Format | Audience |
|-------------|--------|----------|
| FAQ | Web | All |
| Troubleshooting Guide | PDF | Support Team |
| Release Notes | Markdown | All |

---

## 8. Acceptance Criteria

### 8.1 Functional Acceptance
- All "Must Have" requirements implemented
- No critical or high-severity defects
- User acceptance testing passed
- All workflows function end-to-end

### 8.2 Non-Functional Acceptance
- Page load time < 3 seconds
- System uptime > 99.9%
- Security audit passed
- Accessibility audit passed (WCAG 2.1 AA)

### 8.3 Documentation Acceptance
- User documentation complete
- API documentation complete
- Training materials ready
- Release notes prepared

---

## 9. Change Control

### 9.1 Scope Change Process

1. **Request**: Submit scope change request with justification
2. **Analysis**: Impact assessment (time, cost, quality, risk)
3. **Review**: Steering committee review
4. **Decision**: Approve, reject, or defer
5. **Update**: Update project documents if approved

### 9.2 Change Request Template

```
Change Request ID: CR-XXX
Requested By: [Name]
Date: [Date]

Description:
[Describe the proposed change]

Justification:
[Why is this change needed?]

Impact Assessment:
- Schedule: [Days added/removed]
- Cost: [Budget impact]
- Resources: [Additional needs]
- Risk: [New risks introduced]

Recommendation:
[Approve/Reject/Defer with rationale]
```

---

## 10. Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Project Sponsor | [TBD] | _________ | _____ |
| Project Manager | [TBD] | _________ | _____ |
| Technical Lead | [TBD] | _________ | _____ |
| Product Owner | [TBD] | _________ | _____ |

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Jan 2026 | [Author] | Initial release |
