# OKRs & KPIs — CareSync AI
## AroCord Hospital Information Management System

**Period**: FY 2025 (Q1–Q4)  
**Last Updated**: 2025-07-17  
**Owner**: Product Team  
**Review Cadence**: Monthly check-in; quarterly reset

---

## OKR Framework Overview

> **Objectives** are qualitative, inspirational goals.  
> **Key Results** are quantitative, time-bound, measurable outcomes.  
> Score: 0.0 (not started) → 0.7 (good) → 1.0 (exceptional). Target 0.7–0.9.

---

## Annual Objectives (FY 2025)

### O1 — Become the trusted clinical OS for emerging-market hospitals

| Key Result | Target | Q1 | Q2 | Q3 | Q4 | Notes |
|-----------|--------|-----|-----|-----|-----|-------|
| KR1.1: Hospitals onboarded (paying) | 25 | 3 | 10 | 18 | 25 | |
| KR1.2: DAU across all hospitals | 500 | 30 | 120 | 300 | 500 | |
| KR1.3: Patient records digitized | 10,000 | 500 | 2,000 | 6,000 | 10,000 | |
| KR1.4: Hospital NPS | ≥ 45 | Baseline | 30 | 40 | 45 | |

### O2 — Achieve and maintain gold-standard HIPAA compliance

| Key Result | Target | Q1 | Q2 | Q3 | Q4 | Notes |
|-----------|--------|-----|-----|-----|-----|-------|
| KR2.1: HIPAA incidents (data breaches) | 0 | 0 | 0 | 0 | 0 | Zero tolerance |
| KR2.2: PHI encryption coverage | 100% | 100% | 100% | 100% | 100% | Audit quarterly |
| KR2.3: RLS policy coverage (tables) | 100% | 95% | 100% | 100% | 100% | |
| KR2.4: Independent security audit passed | 1 | — | Q2 audit | — | Reaudit | |

### O3 — Deliver a product clinicians love and rely on daily

| Key Result | Target | Q1 | Q2 | Q3 | Q4 | Notes |
|-----------|--------|-----|-----|-----|-----|-------|
| KR3.1: System uptime | 99.9% | 99.5% | 99.8% | 99.9% | 99.9% | |
| KR3.2: P95 page load time | < 2s | 2.5s | 2.2s | 2.0s | 1.8s | |
| KR3.3: User satisfaction (CSAT) | ≥ 4.2/5 | Survey | 3.8 | 4.0 | 4.2 | |
| KR3.4: Critical bug resolution time | < 24h | < 48h | < 36h | < 24h | < 24h | |
| KR3.5: Accessibility WCAG AA | 100% core flows | 80% | 90% | 100% | 100% | |

### O4 — Build a sustainable and growing revenue stream

| Key Result | Target | Q1 | Q2 | Q3 | Q4 | Notes |
|-----------|--------|-----|-----|-----|-----|-------|
| KR4.1: Monthly Recurring Revenue (MRR) | $50K | $0 | $5K | $25K | $50K | |
| KR4.2: Customer Acquisition Cost (CAC) | < $2,000 | TBD | Baseline | $3K | $2K | |
| KR4.3: Churn rate (hospitals) | < 5%/year | — | — | Track | < 5% | |
| KR4.4: Pilot-to-paid conversion | ≥ 70% | — | Track | 60% | 70% | |

---

## Quarterly OKRs

### Q1 2025 OKRs — Foundation

**Objective**: Launch a secure, stable MVP that 3 pilot hospitals can use daily.

| Key Result | Target | Owner | Status |
|-----------|--------|-------|--------|
| 3 pilot hospitals fully onboarded | 3 | PM | 🔄 In Progress |
| All 7 role dashboards render without errors | 100% | Engineering | ✅ Done |
| Zero critical P0 bugs in production | 0 bugs for 2 consecutive weeks | QA | 🔄 In Progress |
| HIPAA audit log capturing 100% of PHI mutations | 100% | BE | ✅ Done |
| E2E test coverage for all auth + role flows | > 80% | QA | 🔄 In Progress |
| Pilot user training completed | 100% of pilot staff | PM | ⏳ Not Started |

### Q2 2025 OKRs — Clinical Suite

**Objective**: Make CareSync AI the single clinical system across all hospital departments.

| Key Result | Target | Owner | Status |
|-----------|--------|-------|--------|
| EHR clinical notes used by ≥ 80% of pilot doctors | 80% | FE+BE | ⏳ Not Started |
| Pharmacy dispensing errors reduced at pilot sites | -50% vs baseline | Clinical Advisor | ⏳ Not Started |
| Lab order-to-result TAT tracked electronically | 100% of lab orders | BE | ⏳ Not Started |
| Appointment no-show rate reduced via reminders | -20% | FE | ⏳ Not Started |
| 10 hospitals onboarded (cumulative) | 10 | PM | ⏳ Not Started |
| Zero medication dispensing errors from drug interaction checks | 0 | Pharmacist validation | ⏳ Not Started |

### Q3 2025 OKRs — Intelligence

**Objective**: Transform CareSync AI from a data system to a decision-support platform.

| Key Result | Target | Owner | Status |
|-----------|--------|-------|--------|
| Analytics dashboard used weekly by 100% of admins | 100% | FE | ⏳ Not Started |
| Billing engine replaces paper billing at ≥ 70% of hospitals | 70% | BE | ⏳ Not Started |
| AI triage v1 deployed to 3 hospitals (physician-reviewed) | 3 hospitals | Data+BE | ⏳ Not Started |
| $50K MRR milestone achieved | $50K | Business | ⏳ Not Started |
| NPS ≥ 40 from hospital administrators | 40 | PM | ⏳ Not Started |

### Q4 2025 OKRs — Scale

**Objective**: Reach 25 hospitals and launch on mobile — becoming the platform hospitals grow with.

| Key Result | Target | Owner | Status |
|-----------|--------|-------|--------|
| React Native app in production (iOS + Android) | App store approval | Mobile | ⏳ Not Started |
| Multi-tenant architecture live with zero data leaks | 0 cross-tenant incidents | BE | ⏳ Not Started |
| First enterprise contract signed | 1 contract | Sales | ⏳ Not Started |
| 25 paying hospitals (total) | 25 | PM | ⏳ Not Started |
| v2.0 public launch completed | Launch event + press | PM | ⏳ Not Started |

---

## KPI Dashboard

### Product Health KPIs
| KPI | Metric | Frequency | Owner | Target |
|-----|--------|-----------|-------|--------|
| DAU/MAU Ratio | DAU ÷ MAU | Daily | Analytics | > 0.4 |
| Feature Adoption Rate | Users using EHR / total doctors | Weekly | PM | > 80% |
| Session Duration | Average minutes per session | Weekly | Analytics | > 10 min |
| Error Rate | JS errors / total sessions | Daily | Engineering | < 0.1% |
| API Latency (P95) | ms | Daily | DevOps | < 500ms |
| Uptime | % | Real-time | DevOps | > 99.9% |

### Clinical Quality KPIs
| KPI | Metric | Frequency | Owner | Target |
|-----|--------|-----------|-------|--------|
| HIPAA Incidents | Count | Real-time | Security | 0 |
| Patient Record Completeness | Fields filled / required fields | Weekly | PM | > 90% |
| Medication Error Rate | Errors / dispensing events | Monthly | Clinical | 0 |
| Critical Lab Alert Response | Avg time doctor acknowledged | Daily | Clinical | < 30 min |
| Appointment Adherence | Attended / scheduled | Weekly | PM | > 75% |

### Business KPIs
| KPI | Metric | Frequency | Owner | Target |
|-----|--------|-----------|-------|--------|
| MRR | $ | Monthly | Finance | $50K (Q4) |
| New Hospitals | Count | Monthly | Sales | +3/month (Q3+) |
| Churn Rate | Cancelled / total | Monthly | PM | < 5%/year |
| CAC | $ spent / new hospitals | Monthly | Marketing | < $2,000 |
| NPS | Net Promoter Score | Quarterly | PM | ≥ 45 |
| Support Ticket Volume | Tickets / hospital | Weekly | Support | < 5/week |

---

## OKR Scoring Guide

| Score | Meaning | Action |
|-------|---------|--------|
| 0.0–0.3 | Significant miss | Root cause analysis; replanning |
| 0.4–0.6 | Partial progress | Identify blockers; accelerate |
| 0.7–0.9 | Strong progress | ✅ Target zone |
| 1.0 | Full achievement | Review if KR was ambitious enough |

> **Rule**: Never game OKRs. If a KR is too easy (repeatedly 1.0), raise the bar. If consistently < 0.5, the target was unrealistic — diagnose systemic blockers.
