# CareSync AI — Product Roadmap
## AroCord Hospital Information Management System

**Version**: 2.0  
**Last Updated**: 2025-07-17  
**Owner**: Product Team  
**Horizon**: 2025 (4 Quarters)

---

## Roadmap Philosophy

> **Ship value, measure impact, iterate.** Each quarter ships a meaningful, user-testable increment. Features are sequenced by clinical urgency, regulatory necessity, and revenue impact — not technical convenience.

**Guiding Principles**:
1. Clinical safety features are always P0 (block all other work)
2. HIPAA compliance is non-negotiable and woven into every feature
3. Ship thin slices to pilot hospitals; expand based on feedback
4. Maintain backward compatibility on all shared hooks and APIs

---

## Roadmap Summary (2025)

```
Q1 2025 ──────────── Q2 2025 ──────────── Q3 2025 ──────────── Q4 2025
  FOUNDATION              CLINICAL SUITE        INTELLIGENCE           SCALE
  • Auth & Roles          • Full EHR            • Analytics AI         • Mobile App
  • Patient Records       • Pharmacy v2         • Billing Engine       • Multi-Tenant
  • Appointments          • Lab Lifecycle       • Clinical AI Triage   • Enterprise Tier
  • Core Dashboards       • Role Polish         • Reporting Suite      • HL7/FHIR Prep
  • HIPAA Baseline        • Notifications       • NPS/Feedback         • Offline Mode
```

---

## Q1 2025 — Foundation

**Theme**: Build the secure core every hospital workflow depends on.  
**Target**: 3 pilot hospitals onboarded by end of Q1.  
**Capacity**: 2 FE + 1 BE + 1 Designer = ~45 story points/sprint

### Shipped / In Progress

| Feature | Owner | Priority | Status | Notes |
|---------|-------|----------|--------|-------|
| Email/password auth with Supabase | BE | P0 | ✅ Done | JWT + refresh tokens |
| Role selection on login | FE | P0 | ✅ Done | `RoleSelectionPage` with "Remember" checkbox |
| RoleProtectedRoute guard | FE | P0 | ✅ Done | All routes protected |
| Patient registration + HIPAA encryption | BE+FE | P0 | ✅ Done | `useHIPAACompliance()` hook |
| Appointment scheduling (basic) | FE+BE | P0 | ✅ Done | Conflict detection v1 |
| Doctor dashboard — patient queue | FE | P0 | ✅ Done | Role-scoped TanStack Query |
| Admin dashboard — KPI overview | FE | P0 | ✅ Done | StatsCard with formatStatValue |
| Dark mode + WCAG AA | FE | P1 | ✅ Done | CSS variables, badge contrast fixes |
| Accessible login error alerts | FE | P1 | ✅ Done | aria-live assertive Alert |
| Mobile-responsive layout | FE | P1 | ✅ Done | GroupedSidebar, DashboardLayout |
| Supabase RLS policies (all tables) | BE | P0 | ✅ Done | Hospital-scoped isolation |
| HIPAA audit log table | BE | P0 | ✅ Done | All PHI mutations tracked |

### Q1 Remaining (Sprint 3–4)

| Feature | Owner | Priority | Story Points |
|---------|-------|----------|-------------|
| Nurse dashboard — vitals entry | FE | P0 | 5 |
| Receptionist dashboard — appointment queue | FE | P0 | 5 |
| Patient portal — view own records | FE | P1 | 8 |
| E2E test suite — auth + role flows | QA | P0 | 5 |
| Pilot onboarding documentation | PM | P1 | 3 |

---

## Q2 2025 — Clinical Suite

**Theme**: Give every clinical role a complete, safe, and efficient workflow.  
**Target**: All 7 role dashboards production-ready; 10+ hospitals active.  
**Capacity**: 2 FE + 1 BE + 1 Designer + 1 QA = ~60 story points/sprint

| Epic | Features | Priority | Size |
|------|----------|----------|------|
| **EHR v1** | Clinical notes (SOAP format), ICD-10 diagnosis search, allergy management, vitals timeline | P0 | XL |
| **Pharmacy v2** | Prescription-to-dispense workflow, drug interaction alerts, inventory management, controlled substance log | P0 | L |
| **Lab Lifecycle** | Lab order creation, sample tracking, result entry, critical value alerts → doctor notification | P0 | L |
| **Appointment v2** | Recurring appointments, calendar view, SMS/email reminders, cancellation workflow | P1 | M |
| **Notifications** | In-app notification center, critical value push, appointment reminders | P1 | M |
| **Discharge Summary** | Auto-generated PDF discharge notes, medication list, follow-up instructions | P1 | M |
| **Role Polish** | Complete all P1 UX items from audit: session storage forms, step progress, page titles | P2 | S |

### Q2 Key Milestones
- Week 4: EHR clinical notes in production with 2 pilot hospital doctors
- Week 8: Pharmacy workflow replacing paper-based process at pilot site
- Week 10: Lab lifecycle end-to-end tested with real orders
- Week 12: All 7 role dashboards demo-ready for full launch

---

## Q3 2025 — Intelligence & Analytics

**Theme**: Turn operational data into decisions. Begin AI-assisted features.  
**Target**: 20+ hospitals, first revenue milestone ($50K MRR).  
**Capacity**: Full team + 1 Data Engineer

| Epic | Features | Priority | Size |
|------|----------|----------|------|
| **Analytics Dashboard** | Hospital KPIs, patient flow, revenue analytics, bed occupancy, department performance | P0 | XL |
| **Billing Engine** | Charge capture, invoice generation, payment tracking, insurance claim workflow | P0 | L |
| **Reporting Suite** | Scheduled reports (daily census, weekly revenue, HIPAA audit), PDF/CSV export | P1 | M |
| **AI Triage v1** | Chief complaint → likely triage level (ML model, low-risk assist only) | P1 | L |
| **Clinical Decision Support** | Drug-drug interaction alerts, allergy contradictions, abnormal lab flagging | P1 | M |
| **Patient Feedback** | NPS survey post-visit, in-app feedback, satisfaction scoring | P2 | S |
| **Advanced Search** | Cross-module search (patient, appointment, lab, prescription) | P2 | M |

### Q3 Key Milestones
- Week 2: Analytics dashboard live for admin roles
- Week 6: Billing engine operational (replacing spreadsheet billing at pilots)
- Week 8: AI triage v1 in limited beta (3 hospitals, doctor review required)
- Week 12: $50K MRR target review

---

## Q4 2025 — Scale & Mobile

**Theme**: Reach patients and clinicians anywhere. Enable enterprise-grade multi-tenancy.  
**Target**: 25+ paying hospitals; app store launch; first enterprise contract.  
**Capacity**: Full team + Mobile Engineer (React Native)

| Epic | Features | Priority | Size |
|------|----------|----------|------|
| **React Native App** | Doctor + Nurse mobile app with offline notes, push critical alerts | P0 | XL |
| **Multi-Tenant Architecture** | Tenant isolation, hospital-specific branding, per-tenant configuration | P0 | L |
| **Enterprise Tier** | SSO (SAML/OIDC), dedicated support SLA, advanced audit exports, data residency | P1 | L |
| **Offline Mode** | Critical clinical workflows work without internet (sync on reconnect) | P1 | L |
| **HL7/FHIR Prep** | FHIR R4 patient resource export, groundwork for EHR integrations | P2 | M |
| **Telemedicine MVP** | Video consultation via WebRTC, in-app messaging | P3 | XL |
| **Multi-Language** | Yoruba, Hausa, French localization (i18n framework) | P2 | M |

### Q4 Key Milestones
- Week 4: React Native app TestFlight + Android beta
- Week 8: Multi-tenant architecture deployed; enterprise pilot contract signed
- Week 10: App store submissions (iOS + Android)
- Week 12: v2.0 public launch announcement

---

## Backlog (Not Yet Scheduled)

| Feature | Status | Rationale for Deferral |
|---------|--------|----------------------|
| Telemedicine video | Considering | High dev cost; telehealth regs vary by market |
| Insurance EDI (X12) | Backlog | Complex integration; partner opportunity |
| AI diagnostic imaging | Research | Requires FDA/regulatory pathway |
| Patient CRM (marketing) | Backlog | Not core clinical value |
| Wearable device integration | Research | Market validation needed |
| Blockchain health records | Declined | Overcomplicated; no clear patient benefit |

---

## Dependency Map

```
Auth & RLS ──► Patient Records ──► EHR ──► Clinical Decision Support ──► AI Triage
                    │
                    ├──► Appointments ──► Notifications ──► Reminders
                    │
                    ├──► Lab Orders ──► Lab Results ──► Critical Alerts
                    │
                    └──► Pharmacy ──► Drug Interaction ──► Inventory

Analytics Dashboard requires: Patient Records + Appointments + Lab + Pharmacy + Billing
Billing Engine requires: Appointments + Pharmacy + Lab
Mobile App requires: Core API stable + Offline sync infrastructure
```

---

## Roadmap Review Cadence

| Meeting | Frequency | Participants | Purpose |
|---------|-----------|-------------|---------|
| Sprint Planning | Biweekly | Full team | Commit sprint work |
| Roadmap Review | Monthly | PM + Engineering Lead + Clinical Advisor | Adjust priorities |
| Quarterly Planning | Quarterly | All stakeholders | Set next quarter goals |
| Pilot Feedback | Biweekly | PM + Hospital Champions | Customer voice |
| Exec Readout | Monthly | PM + Leadership | Progress, risks, decisions |
