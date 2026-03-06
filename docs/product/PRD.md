# Product Requirements Document (PRD)
## CareSync AI — AroCord Hospital Information Management System

**Version**: 2.0  
**Date**: 2025-07-17  
**Author**: Product Team  
**Status**: Approved  
**Document Type**: Standard PRD

---

## 1. Executive Summary

### Problem Statement
Healthcare facilities struggle with fragmented workflows across clinical, administrative, pharmacy, and laboratory departments. Paper-based processes, siloed data systems, and lack of real-time visibility create operational inefficiencies, patient safety risks, and HIPAA compliance burdens.

### Proposed Solution
CareSync AI is a cloud-native, HIPAA-compliant Hospital Information Management System that unifies clinical care, patient records, pharmacy dispensing, laboratory tracking, appointment scheduling, and billing into a single role-aware web application — eliminating silos and giving every caregiver the right information at the right time.

### Business Impact
- Reduce patient wait times by **40%** through intelligent appointment scheduling and queue management
- Decrease medication errors by **60%** via digital pharmacy workflow and drug interaction alerts
- Achieve **HIPAA audit-readiness** by default through end-to-end PHI encryption, RLS-enforced data access, and audit logging
- Cut administrative overhead by **30%** through automated billing reconciliation, lab order routing, and discharge documentation

### Success Metrics (KPIs)
| KPI | Baseline | Target (12 months) |
|-----|----------|-------------------|
| Monthly Active Hospitals | 0 | 25 |
| Daily Active Users (DAU) | 0 | 500+ |
| Patient Record Digitization Rate | — | 95%+ |
| System Uptime | — | 99.9% |
| HIPAA Incident Rate | — | 0 |
| Net Promoter Score (NPS) | — | 45+ |

### Timeline (High-Level)
| Phase | Duration | Milestone |
|-------|----------|-----------|
| Phase 1 — Core Platform | Q1 2025 | Patient + Appointment + Auth |
| Phase 2 — Clinical Suite | Q2 2025 | EHR, Pharmacy, Lab |
| Phase 3 — Analytics & AI | Q3 2025 | Dashboards, AI Triage, Billing |
| Phase 4 — Mobile & Scale | Q4 2025 | React Native App, Multi-tenant |

---

## 2. Problem Definition

### 2.1 Customer Problem
| Dimension | Detail |
|-----------|--------|
| **Who** | Hospital administrators, doctors, nurses, pharmacists, lab technicians, and patients |
| **What** | Disconnected paper systems, manual handoffs, poor prescription tracking, no real-time lab status |
| **When** | Every patient encounter — admission, diagnosis, prescription, lab order, discharge |
| **Where** | Nursing stations, outpatient clinics, pharmacies, lab departments, billing offices |
| **Why** | Legacy systems are module-isolated, expensive, non-mobile, and not built for modern workflows |
| **Impact** | Delayed care, billing errors, compliance risk, staff burnout, patient dissatisfaction |

### 2.2 Market Opportunity
- **TAM**: $36.1B — Global Hospital Information Management market (2024)
- **SAM**: $4.2B — Emerging markets (Africa, Southeast Asia) underserved by legacy vendors
- **SOM**: $85M — SME hospitals (50–500 beds) in target regions over 3 years
- **Growth Rate**: 9.4% CAGR through 2030 (Global Market Insights)
- **Timing**: Post-COVID digitization mandates + increased HIPAA enforcement create urgency

### 2.3 Business Case
- **Revenue Potential**: SaaS per-seat licensing ($49/user/month) × 500 users = $294K MRR at scale
- **Cost Savings**: Replacing 4–6 siloed tools with one platform saves hospitals $60K–$200K/year
- **Strategic Value**: First-mover in Africa/SEA with HIPAA-grade security at SME price point
- **Risk of Inaction**: Competitors (Epic, Meditech) targeting same growth markets by 2026

---

## 3. Solution Overview

### 3.1 Core Product
CareSync AI is a multi-tenant, role-based web application built on:
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (PostgreSQL + Auth + RLS + Realtime)
- **Security**: HIPAA-compliant PHI encryption via `useHIPAACompliance()`, audit logs, session management
- **Mobile**: React Native companion app (Phase 4)

### 3.2 Core Capabilities
| Module | Description |
|--------|-------------|
| **Patient Management** | Registration, HIPAA-encrypted records, medical history, demographics |
| **Appointment Scheduling** | Doctor availability, patient queue, conflict detection, reminders |
| **Electronic Health Records (EHR)** | Clinical notes, diagnoses (ICD-10), vitals, allergies, care plans |
| **Pharmacy Management** | Prescription intake, dispensing queue, drug interaction checks, inventory |
| **Laboratory Management** | Test orders, sample tracking, results entry, critical value alerts |
| **Billing & Insurance** | Charge capture, insurance verification, invoice generation, payment tracking |
| **Role-Based Dashboards** | Tailored views for Admin, Doctor, Nurse, Receptionist, Pharmacist, Lab Tech, Patient |
| **Analytics & Reporting** | Operational metrics, revenue analytics, quality indicators |

### 3.3 In Scope (v2.0)
- All 7 role-specific dashboards
- Patient CRUD with encryption metadata
- Appointment scheduling with conflict detection
- Pharmacy dispensing workflow
- Lab order-to-result lifecycle
- Basic billing and invoice generation
- HIPAA audit log
- Mobile-responsive web app
- Dark mode + WCAG AA accessibility

### 3.4 Out of Scope (v2.0)
- Native mobile app (Phase 4)
- AI-assisted diagnosis (Phase 3)
- HL7/FHIR interoperability (Phase 3)
- Insurance EDI integration (Phase 3)
- Telemedicine video consultation (Future)

### 3.5 MVP Definition
- **Core Features**: Auth + Patient Management + Appointments + Basic EHR
- **Success Criteria**: 5 pilot hospitals onboarded with >20 DAU each
- **Timeline**: Q1 2025 MVP delivery

---

## 4. User Stories & Requirements

### 4.1 Personas
| Persona | Role | Primary Need |
|---------|------|-------------|
| **Dr. Amara** | Doctor | Instant access to patient history and lab results during rounds |
| **Nurse Joy** | Nurse | Track vital signs, flag critical values, update care plans |
| **Receptionist Tolu** | Receptionist | Register patients, schedule appointments, verify insurance |
| **Pharmacist Emeka** | Pharmacist | Process prescriptions, check interactions, manage stock |
| **Lab Tech Kemi** | Lab Technician | Receive orders, log results, flag criticals |
| **Admin Chidi** | Hospital Admin | View system analytics, manage staff, configure hospital settings |
| **Patient Amaka** | Patient | View own records, upcoming appointments, test results |

### 4.2 Functional Requirements
| ID | Requirement | Priority | Role |
|----|------------|----------|------|
| FR-01 | User authenticates with email/password + role selection | P0 | All |
| FR-02 | Patient records encrypted at rest using HIPAA compliance hooks | P0 | All |
| FR-03 | Doctors can view full patient history and create clinical notes | P0 | Doctor |
| FR-04 | Nurses can update vitals and flag abnormal values | P0 | Nurse |
| FR-05 | Receptionists can register patients and schedule appointments | P0 | Receptionist |
| FR-06 | Pharmacists can receive, verify, and dispense prescriptions | P0 | Pharmacist |
| FR-07 | Lab technicians can receive orders, enter results, flag criticals | P0 | Lab Tech |
| FR-08 | Admins can manage users, roles, and hospital configuration | P0 | Admin |
| FR-09 | Role-based access enforced at database level via RLS policies | P0 | All |
| FR-10 | All PHI access logged to HIPAA audit table | P0 | All |
| FR-11 | Appointment scheduling with conflict detection | P1 | Receptionist/Doctor |
| FR-12 | Drug interaction alerts during prescription entry | P1 | Pharmacist/Doctor |
| FR-13 | Critical lab value automatic notification to ordering doctor | P1 | Lab Tech |
| FR-14 | Patient portal: view own records and upcoming appointments | P1 | Patient |
| FR-15 | Analytics dashboard with hospital-wide KPIs | P1 | Admin |
| FR-16 | Invoice generation and payment status tracking | P2 | Admin/Receptionist |
| FR-17 | Multi-language support (English, Yoruba, Hausa, French) | P2 | All |
| FR-18 | Offline mode for essential workflows (React Native, Phase 4) | P3 | Doctor/Nurse |

### 4.3 Non-Functional Requirements
| Category | Requirement |
|----------|-------------|
| **Performance** | P95 page load < 2s; API response < 500ms |
| **Scalability** | Support 10,000 concurrent users per hospital tenant |
| **Security** | HIPAA-compliant; AES-256 PHI encryption; RBAC + ABAC |
| **Reliability** | 99.9% uptime SLA; automated daily backups; point-in-time recovery |
| **Usability** | WCAG 2.1 AA; mobile-first responsive design; dark mode |
| **Compliance** | HIPAA, GDPR (EU patients), NDPR (Nigeria) |
| **Auditability** | All data mutations logged with user ID, role, timestamp, hospital ID |

---

## 5. Design & User Experience

### 5.1 Design Principles
1. **Clarity over density** — clinical workflows demand fast scanning; reduce cognitive load
2. **Role-awareness** — each user sees only what they need; no information overload
3. **Accessibility first** — WCAG AA compliance supports diverse healthcare settings
4. **Trust through consistency** — teal primary brand, stable layout patterns, predictable interactions

### 5.2 Key Screens
- Login/Signup with role selection
- Role-specific dashboard (7 variants)
- Patient record (demographics, timeline, notes, labs, prescriptions)
- Appointment scheduler (calendar/list view)
- Pharmacy queue (receive → verify → dispense)
- Lab request/result workflow
- Admin analytics overview

### 5.3 Design System
- **Component Library**: shadcn/ui (Radix primitives)
- **Colors**: Teal primary (#0D9488), role-specific accents, WCAG AA contrast
- **Typography**: Inter (Google Fonts)
- **Icons**: Lucide React
- **Animation**: Framer Motion (reduced motion support)
- **Dark Mode**: Full dark mode via CSS custom properties

---

## 6. Technical Specifications

### 6.1 Architecture Overview
```
Browser (React 18 + Vite)
    ↓ HTTPS
Supabase Edge (Auth + RLS + PostgREST + Realtime)
    ↓
PostgreSQL (Supabase)
    ↓
Storage (PHI documents, lab attachments)
```

### 6.2 Key Technical Decisions
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend | Supabase | Instant REST + Realtime; built-in RLS for HIPAA |
| State | TanStack Query | Caching, background refresh, hospital-scoped keys |
| Forms | React Hook Form + Zod | TypeScript-safe validation |
| PHI Encryption | Custom `useHIPAACompliance()` hook | Client-side encryption before storage |
| Auth | Supabase Auth + role claim | JWT roles enforced at RLS layer |
| Deployment | Docker + nginx + optional Kong | Self-hosted or cloud deployment |

### 6.3 Security Considerations
- PHI encrypted before Supabase write using `useHIPAACompliance()`
- `encryption_metadata` stored alongside patient records
- All Supabase calls wrapped in try/catch; errors sanitized via `sanitizeForLog`
- RLS policies per table enforce hospital_id isolation
- Routes protected via `RoleProtectedRoute` component
- Session management: automatic timeout + refresh token rotation

---

## 7. Go-to-Market Strategy

> See [GO_TO_MARKET.md](./GO_TO_MARKET.md) for full GTM plan.

### 7.1 Launch Plan
- **Beta**: 3 pilot hospitals (Q1 2025) — free onboarding + white-glove support
- **Soft Launch**: 10 hospitals (Q2 2025) — pilot-to-paid conversion
- **Full Launch**: 25+ hospitals (Q3–Q4 2025) — partner channel + direct sales

### 7.2 Pricing Model
| Tier | Price | Users | Features |
|------|-------|-------|---------|
| **Starter** | $299/mo | Up to 10 users | All modules, 1 location |
| **Professional** | $799/mo | Up to 50 users | All modules, 3 locations, analytics |
| **Enterprise** | Custom | Unlimited | All modules, multi-location, SLA, training |

---

## 8. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| HIPAA audit failure | Low | Critical | Independent security audit before launch |
| Clinical workflow mismatch | Medium | High | Co-design sessions with 3+ hospitals in beta |
| Performance at scale | Medium | High | Load testing to 10K concurrent users before launch |
| Scope creep in Phase 2 | High | Medium | Strict P0/P1/P2 enforcement; biweekly scope review |
| Data migration complexity | High | High | Provide CSV import templates + migration support |
| Staff adoption resistance | Medium | Medium | In-app onboarding, training materials, role champions |

---

## 9. Timeline & Milestones

| Milestone | Target Date | Deliverables | Success Criteria |
|-----------|------------|--------------|-----------------|
| MVP Complete | Q1 2025 | Auth, Patient, Appointments | 3 pilot hospitals using system |
| Phase 2 — Clinical Suite | Q2 2025 | EHR, Pharmacy, Lab | All 7 role dashboards functional |
| Phase 3 — Analytics | Q3 2025 | Reports, Billing, AI Triage | 15+ hospitals active |
| Phase 4 — Mobile | Q4 2025 | React Native app | iOS/Android in app stores |
| v2.0 Launch | Q4 2025 | Multi-tenant, Enterprise tier | 25+ paying hospitals |

---

## 10. Team & Resources

### 10.1 Team Structure
| Role | Responsibility |
|------|---------------|
| Product Manager | Roadmap, prioritization, stakeholder alignment |
| Engineering Lead | Architecture, code review, technical decisions |
| Frontend Engineers (2) | React components, UX implementation |
| Backend/Supabase Engineer (1) | Schema, RLS, migrations, API |
| UI/UX Designer | Design system, wireframes, accessibility |
| QA Engineer | Test automation (Vitest + Playwright) |
| DevOps | Docker, CI/CD, monitoring, deployment |
| Clinical Advisor | Healthcare domain expertise, workflow validation |

---

## 11. Appendix

- [User Stories by Role](./USER_STORIES.md)
- [Feature Backlog with RICE Scores](./FEATURE_BACKLOG.md)
- [Product Roadmap](./ROADMAP.md)
- [OKRs & KPIs](./OKRs.md)
- [Go-to-Market Strategy](./GO_TO_MARKET.md)
- [Customer Discovery Guide](./CUSTOMER_DISCOVERY.md)
- [Stakeholder Communication Plan](./STAKEHOLDER_COMMS.md)
- [HIPAA Compliance Documentation](../HIPAA_COMPLIANCE.md)
- [Database Architecture](../DATABASE.md)
- [Security Documentation](../SECURITY.md)
