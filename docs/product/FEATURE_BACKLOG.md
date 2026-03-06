# Feature Backlog with RICE Prioritization
## CareSync AI — AroCord HIMS

**Version**: 2.0  
**Last Updated**: 2025-07-17  
**Owner**: Product Team

---

## RICE Framework

```
RICE Score = (Reach × Impact × Confidence) / Effort

Reach:       # users affected per quarter
Impact:      Massive=3x | High=2x | Medium=1x | Low=0.5x | Minimal=0.25x
Confidence:  High=100% | Medium=80% | Low=50%
Effort:      XS=0.5 | S=1 | M=2 | L=3 | XL=5  (person-months)
```

---

## Value vs Effort Matrix

```
              Low Effort            High Effort
           ┌──────────────────────┬──────────────────────┐
High Value │   🟢 QUICK WINS      │   🔵 BIG BETS        │
           │   [Do First]          │   [Strategic]         │
           ├──────────────────────┼──────────────────────┤
Low Value  │   🟡 FILL-INS        │   🔴 TIME SINKS       │
           │   [Maybe]             │   [Avoid]             │
           └──────────────────────┴──────────────────────┘
```

---

## RICE-Scored Feature Backlog

### 🟢 Quick Wins (High Value, Low Effort)

| # | Feature | Reach | Impact | Conf | Effort | RICE | Quarter | Category |
|---|---------|-------|--------|------|--------|------|---------|----------|
| 1 | Drug interaction alert on prescription entry | 50 | 3x | 90% | 1 | 135 | Q2 | Pharmacy |
| 2 | Critical lab value → doctor notification | 80 | 3x | 90% | 1 | 216 | Q2 | Lab |
| 3 | Appointment reminder (SMS/email) | 200 | 2x | 80% | 1 | 320 | Q2 | Scheduling |
| 4 | Page title updates on route change | 500 | 1x | 100% | 0.5 | 1000 | Q1 | UX |
| 5 | Dark mode contrast fixes for all badges | 500 | 1x | 100% | 0.5 | 1000 | Q1 | UX/A11y |
| 6 | "Remember my role" on login | 500 | 1x | 100% | 0.5 | 1000 | Q1 | UX |
| 7 | Escape key closes mobile sidebar | 500 | 1x | 100% | 0.25 | 2000 | Q1 | UX |
| 8 | Patient record CSV import template | 30 | 2x | 80% | 1 | 48 | Q2 | Onboarding |
| 9 | Discharge summary PDF auto-generation | 100 | 2x | 80% | 2 | 80 | Q2 | EHR |
| 10 | Appointment cancellation workflow | 150 | 1x | 90% | 1 | 135 | Q2 | Scheduling |

### 🔵 Big Bets (High Value, High Effort)

| # | Feature | Reach | Impact | Conf | Effort | RICE | Quarter | Category |
|---|---------|-------|--------|------|--------|------|---------|----------|
| 11 | Full EHR with SOAP notes + ICD-10 | 200 | 3x | 80% | 5 | 96 | Q2 | EHR |
| 12 | Pharmacy dispensing queue + inventory | 100 | 3x | 80% | 3 | 80 | Q2 | Pharmacy |
| 13 | Lab order lifecycle (order→sample→result) | 80 | 3x | 80% | 3 | 64 | Q2 | Lab |
| 14 | Analytics dashboard (admin KPIs) | 50 | 3x | 90% | 3 | 45 | Q3 | Analytics |
| 15 | Billing engine (charge capture + invoices) | 100 | 3x | 80% | 5 | 48 | Q3 | Billing |
| 16 | React Native mobile app (Doctor + Nurse) | 300 | 3x | 70% | 5 | 126 | Q4 | Mobile |
| 17 | Multi-tenant architecture | 500 | 3x | 80% | 5 | 240 | Q4 | Platform |
| 18 | AI triage v1 (chief complaint → triage level) | 200 | 2x | 50% | 5 | 40 | Q3 | AI |
| 19 | HL7/FHIR R4 patient export | 100 | 2x | 70% | 3 | 47 | Q4 | Interop |
| 20 | Offline mode for clinical workflows | 200 | 2x | 60% | 5 | 48 | Q4 | Mobile |

### 🟡 Fill-Ins (Low–Medium Value, Low Effort)

| # | Feature | Reach | Impact | Conf | Effort | RICE | Quarter | Category |
|---|---------|-------|--------|------|--------|------|---------|----------|
| 21 | Patient portal — view own appointments | 300 | 1x | 80% | 1 | 240 | Q1 | Patient |
| 22 | QR code patient check-in | 100 | 1x | 80% | 1 | 80 | Q2 | Scheduling |
| 23 | Staff directory (hospital-scoped) | 200 | 0.5x | 90% | 0.5 | 180 | Q2 | Admin |
| 24 | In-app notification bell | 500 | 1x | 90% | 1 | 450 | Q2 | UX |
| 25 | Print prescription slip | 80 | 1x | 100% | 0.5 | 160 | Q2 | Pharmacy |
| 26 | Session storage for multi-step forms | 300 | 1x | 100% | 0.5 | 600 | Q1 | UX |
| 27 | Weekly email digest (admin) | 50 | 0.5x | 80% | 1 | 20 | Q3 | Analytics |
| 28 | Dark mode toggle in user settings | 500 | 0.5x | 100% | 0.5 | 500 | Q1 | UX |
| 29 | Bed occupancy status board | 50 | 1x | 80% | 1 | 40 | Q3 | Admin |

### 🔴 Time Sinks (Low Value, High Effort — Deferred/Declined)

| # | Feature | Rationale |
|---|---------|-----------|
| 30 | Blockchain health records | Overcomplicated; no clear patient benefit over encrypted DB |
| 31 | AI diagnostic imaging | Requires FDA pathway; multi-year horizon |
| 32 | Full telemedicine platform | WebRTC + compliance overhead exceeds current ROI |
| 33 | Deep social media integrations | Not a clinical need |
| 34 | Native desktop app (Electron) | Web app covers use case; waste of effort |
| 35 | Custom PACS (radiology imaging) | Specialist niche; integrate with existing PACS instead |

---

## MoSCoW for v2.0 Launch

### Must Have (launch blockers)
- [ ] Complete auth + role-based access (all 7 roles)
- [ ] Patient CRUD with HIPAA-compliant encryption
- [ ] Appointment scheduling with conflict detection
- [ ] EHR clinical notes (basic SOAP format)
- [ ] Pharmacy prescription receipt and dispensing
- [ ] Lab order to result workflow
- [ ] PHI audit log 100% coverage
- [ ] WCAG AA on all core flows
- [ ] 99.9% uptime SLA infrastructure

### Should Have (v2.0 quality)
- [ ] Drug interaction alerts
- [ ] Critical lab notifications
- [ ] Appointment SMS reminders
- [ ] Analytics dashboard for admins
- [ ] Patient portal (read-only own records)
- [ ] Discharge summary PDF
- [ ] Billing / invoice generation

### Could Have (v2.1 candidates)
- [ ] AI triage v1
- [ ] HL7/FHIR export
- [ ] In-app video consultation (basic)
- [ ] Multi-language support
- [ ] QR code patient check-in
- [ ] Mobile app (React Native)

### Won't Have (v2.0)
- FHIR interoperability full implementation
- Native iOS/Android app
- Insurance EDI (X12) integration
- AI diagnostic imaging

---

## Quarterly Capacity Plan

```
Q1: FOUNDATION
  Total capacity: ~90 story points
  P0 features: 65 pts (72%)
  P1 features: 20 pts (22%)
  P2/Tech debt: 5 pts (6%)

Q2: CLINICAL SUITE
  Total capacity: ~120 story points
  EHR Epic: 40 pts
  Pharmacy Epic: 25 pts
  Lab Epic: 25 pts
  Scheduling v2: 15 pts
  Buffer (unexpected): 15 pts

Q3: INTELLIGENCE
  Total capacity: ~110 story points
  Analytics: 35 pts
  Billing: 30 pts
  AI Triage: 25 pts
  Reporting: 20 pts

Q4: SCALE
  Total capacity: ~130 story points
  Mobile App: 50 pts
  Multi-tenant: 30 pts
  Enterprise Tier: 25 pts
  Tech Debt / Hardening: 25 pts
```

---

## Backlog Scoring Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Done |
| 🔄 | In Progress |
| ⏳ | Not Started |
| ⚠️ | Blocked |
| ❌ | Declined |
| 🔵 | Under Research |
