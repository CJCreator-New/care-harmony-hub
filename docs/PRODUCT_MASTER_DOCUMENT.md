# AROCORD-HIMS — Product Master Document

**Document Version**: 1.0.0  
**Last Updated**: June 2026  
**Status**: Production-Ready  
**Purpose**: Single source of truth for product architecture, features, and implementation details

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Technology Stack](#2-technology-stack)
3. [Architecture Overview](#3-architecture-overview)
4. [User Roles & Permissions](#4-user-roles--permissions)
5. [Core Features](#5-core-features)
6. [Database Schema](#6-database-schema)
7. [API & Edge Functions](#7-api--edge-functions)
8. [Security & Compliance](#8-security--compliance)
9. [Clinical Workflows](#9-clinical-workflows)
10. [Component Library](#10-component-library)
11. [Testing Strategy](#11-testing-strategy)
12. [Deployment & Infrastructure](#12-deployment--infrastructure)
13. [Performance Metrics](#13-performance-metrics)
14. [Known Issues & Roadmap](#14-known-issues--roadmap)

---

## 1. Product Overview

### 1.1 Executive Summary

**AROCORD-HIMS** (also branded as **CareSync** in marketing materials) is an enterprise-grade Hospital Information Management System designed to streamline healthcare operations from patient registration to discharge. Built with modern cloud-native technologies, it serves clinics, hospitals, and multi-facility healthcare systems.

### 1.2 Key Highlights

| Capability | Description |
|------------|-------------|
| **Unified Operations** | OPD, IPD, OT, Pharmacy, Laboratory, Billing — all in one platform |
| **Enterprise Security** | Role-based access, audit logs, encryption, HIPAA-ready |
| **Real-time Analytics** | Live dashboards and KPI tracking |
| **Smart Billing** | Insurance claims, payment plans, automated invoicing |
| **Patient Portal** | Self-service appointments, prescriptions, lab results |
| **AI Integration** | Differential diagnosis, predictive analytics, voice clinical notes |

### 1.3 Target Users

| User Type | Description |
|-----------|-------------|
| **Hospital Administrators** | Multi-facility management, analytics, compliance |
| **Clinical Staff** | Doctors, nurses, pharmacists, lab technicians |
| **Administrative Staff** | Receptionists, billing officers |
| **Patients** | Self-service portal access |

### 1.4 Brand Identity

- **Product Name**: AROCORD-HIMS
- **Marketing Name**: CareSync HIMS (used in landing page, SEO)
- **Tagline**: Modern Hospital Management Built for Safer Patient Care

---

## 2. Technology Stack

### 2.1 Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3 | UI Framework |
| TypeScript | 5.7 | Type Safety (Strict Mode) |
| Tailwind CSS | 3.4 | Styling |
| Shadcn/ui | Latest | Component Library |
| Framer Motion | Latest | Animations |
| React Router | 6.x | Navigation |
| TanStack Query | 4.x | Data Fetching & Caching |
| React Hook Form | 7.x | Form Handling |
| Zod | 3.x | Schema Validation |

### 2.2 Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Supabase | Latest | Backend-as-a-Service |
| PostgreSQL | 15.1+ | Relational Database |
| Supabase Auth | Latest | JWT + 2FA Authentication |
| Supabase Realtime | Latest | WebSocket subscriptions |
| Supabase Edge Functions | Deno | Serverless API logic |
| pgcrypto | Native | PHI Encryption |

### 2.3 Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Kubernetes | Orchestration (Production) |
| Kong API Gateway | Rate Limiting, Auth Forwarding |
| Prometheus + Grafana | Monitoring & Alerting |
| GitHub Actions | CI/CD Pipeline |

### 2.4 Key Metrics

| Metric | Value |
|--------|-------|
| Initial Bundle Size | ~400 KB (96% reduction via lazy loading) |
| Time to Interactive | <3 seconds |
| API Response Time p95 | <500ms |
| Concurrent Users | 1000+ validated |
| Test Coverage | 500+ E2E tests |

---

## 3. Architecture Overview

### 3.1 System Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                            │
│  React 18 + TypeScript + TailwindCSS + shadcn/ui              │
│  ├─ Role-based dashboards (lazy-loaded)                       │
│  ├─ Patient portal                                            │
│  └─ Mobile-responsive PWA                                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  STATE MANAGEMENT LAYER                                        │
│  ├─ TanStack Query (HTTP cache)                               │
│  ├─ Context API (Auth, Theme, Testing)                        │
│  └─ Supabase Realtime (WebSocket subscriptions)               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  API LAYER                                                     │
│  Kong API Gateway (8000) → Supabase REST API                  │
│  ├─ Real-time subscriptions (WebSocket)                       │
│  ├─ Auth (JWT, 2FA, Biometric)                                │
│  └─ File storage (buckets)                                    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND SERVICES (Docker Microservices)                      │
│  ├─ patient-service (patient registry, demographics)          │
│  ├─ appointment-service (scheduling, queue management)        │
│  ├─ clinical-service (vitals, consultation notes, orders)     │
│  ├─ laboratory-service (lab orders, results, critical values) │
│  └─ pharmacy-service (dispensing, inventory, interactions)    │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  DATABASE LAYER                                                │
│  PostgreSQL (Supabase-hosted)                                 │
│  ├─ 50+ migrations with RLS policies                          │
│  ├─ Audit trail tables (append-only)                          │
│  ├─ Hospital-scoped multi-tenancy                             │
│  └─ Encryption metadata for PHI protection                    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Project Structure

```
care-harmony-hub/
├── src/
│   ├── components/          # 150+ React components
│   │   ├── admin/          # Admin dashboard (26 components)
│   │   ├── ai/             # AI clinical support (8 components)
│   │   ├── analytics/      # Analytics dashboards (4 components)
│   │   ├── appointments/   # Scheduling UI (4 components)
│   │   ├── audit/          # Audit trail (7 components)
│   │   ├── auth/           # Authentication (8 components)
│   │   ├── billing/        # Billing & invoicing (2 components)
│   │   ├── dashboard/      # Role-based dashboards (13 components)
│   │   ├── doctor/         # Doctor workspace (12 components)
│   │   ├── lab/            # Laboratory workflows (8 components)
│   │   ├── landing/        # Marketing pages (14 components)
│   │   ├── nurse/          # Nursing workflow (35+ components)
│   │   ├── patient/        # Patient portal (18 components)
│   │   ├── pharmacy/       # Pharmacy workflows (5 components)
│   │   ├── ui/             # Shadcn UI primitives (60+ components)
│   │   └── ...             # Additional feature components
│   │
│   ├── hooks/              # 150+ custom hooks
│   ├── contexts/           # Global state (Auth, Theme, Testing)
│   ├── lib/                # Utilities & helpers
│   ├── pages/              # Route handlers (lazy-loaded)
│   ├── services/           # API clients
│   ├── types/              # TypeScript types (auto-synced)
│   └── utils/              # Helper functions
│
├── supabase/
│   ├── functions/          # 30+ Edge Functions
│   └── migrations/         # 50+ database migrations
│
├── tests/
│   ├── e2e/               # 500+ Playwright tests
│   ├── security/          # Security test suite
│   └── unit/              # Unit tests
│
└── docs/                   # Documentation
```

---

## 4. User Roles & Permissions

### 4.1 Role Definitions

| Role | Primary Dashboard | Key Capabilities |
|------|-------------------|------------------|
| **Admin** | Admin Console | Full system access, user management, settings, analytics |
| **Doctor** | Doctor Workspace | Consultations, prescriptions, lab orders, diagnosis |
| **Nurse** | Nurse Dashboard | Vitals, medication administration, patient prep, triage |
| **Receptionist** | Reception Queue | Registration, scheduling, check-in/out, queue management |
| **Pharmacist** | Pharmacy Queue | Dispensing, inventory, drug interaction checking |
| **Lab Tech** | Lab Dashboard | Sample collection, result entry, critical value alerts |
| **Patient** | Patient Portal | Appointments, prescriptions, lab results, medical history |

### 4.2 Permission Matrix

```typescript
// Location: src/lib/permissions.ts
type Permission = 
  // Patient Management
  | 'patients:read' | 'patients:write' | 'patients:delete'
  // Appointments
  | 'appointments:read' | 'appointments:write' | 'appointments:checkin'
  // Prescriptions
  | 'prescriptions:read' | 'prescriptions:write' | 'prescriptions:sign' | 'prescriptions:dispense'
  // Laboratory
  | 'laboratory:read' | 'laboratory:write' | 'laboratory:approve'
  // Billing
  | 'billing:read' | 'billing:write' | 'billing:submit_claims'
  // Admin
  | 'admin:manage_users' | 'admin:view_audit_logs' | 'admin:system_config'
  // Reports
  | 'reports:generate' | 'reports:read'
```

### 4.3 Role-Permission Mapping

| Permission | Admin | Doctor | Nurse | Receptionist | Pharmacist | Lab Tech | Patient |
|------------|:-----:|:------:|:-----:|:------------:|:----------:|:--------:|:-------:|
| patients:read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | Own only |
| patients:write | ✅ | ✅ | Limited | ✅ | ❌ | ❌ | ❌ |
| prescriptions:sign | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| prescriptions:dispense | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| laboratory:approve | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| admin:manage_users | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 5. Core Features

### 5.1 Patient Management

| Feature | Description | Components |
|---------|-------------|------------|
| **Patient Registration** | Demographics, insurance, emergency contacts | `PatientRegistrationModal`, `EnhancedPatientRegistrationForm` |
| **Patient Search** | Fuzzy search, MRN lookup | `GlobalSearchDialog` |
| **Medical History** | Allergies, conditions, medications | `AllergyRecords`, `MedicationHistory`, `HealthTimeline` |
| **Patient Timeline** | Visual journey through care episodes | `PatientTimeline` |

### 5.2 Appointment Scheduling

| Feature | Description | Components |
|---------|-------------|------------|
| **Smart Scheduling** | Provider availability, conflict detection | `SmartScheduler`, `MultiResourceScheduler` |
| **Recurring Appointments** | Weekly/monthly patterns | `RecurringAppointmentModal`, `AppointmentRecurrenceModal` |
| **Queue Management** | Waitlist, priority queuing | `WaitlistManagementCard`, `QueueOptimizer` |
| **Check-in Kiosk** | Self-service check-in | `CheckInKiosk`, `EnhancedCheckIn` |

### 5.3 Clinical Workflows

| Feature | Description | Components |
|---------|-------------|------------|
| **Consultation Notes** | HPI, examination, assessment, plan | `ConsultationTemplateSelector`, `QuickConsultationModal` |
| **Vital Signs** | Recording, trending, critical alerts | `VitalSignsForm`, `VitalsTrendChart`, `RecordVitalsModal` |
| **ICD-10 Coding** | Autocomplete, code suggestions | `ICD10Autocomplete`, `ICD10CodeSuggestions` |
| **CPT Code Mapping** | Procedure code selection | `CPTCodeMapper`, `CPTCodeSuggestions` |

### 5.4 Pharmacy

| Feature | Description | Components |
|---------|-------------|------------|
| **Prescription Queue** | Pending, verified, dispensed | `PrescriptionQueue`, `EnhancedPrescriptionQueue` |
| **Drug Interactions** | Real-time checking | `DrugInteractionAlert`, `InteractionChecker` |
| **Dispensing Workstation** | Lot tracking, expiry | `DispensingWorkstation`, `PrescriptionDispensingModal` |
| **Inventory Management** | Stock levels, reorder alerts | `InventoryDashboard`, `LowStockAlertCard` |
| **Dose Calculators** | Pediatric, renal adjustment | `DoseAdjustmentCalculator`, `PediatricDosingCard` |

### 5.5 Laboratory

| Feature | Description | Components |
|---------|-------------|------------|
| **Lab Order Entry** | LOINC-coded tests | `CreateLabOrderModal`, `EnhancedLabOrderForm` |
| **Sample Tracking** | Barcode scanning | `BarcodeSampleScanner`, `SampleTracking` |
| **Result Entry** | Reference ranges, critical flags | `LabResultEntryModal`, `LabTrendVisualization` |
| **Critical Values** | Immediate alerts to providers | `CriticalValueAlert`, `CriticalResultNotification` |
| **QC Dashboard** | Quality control tracking | `QCDashboard` |

### 5.6 Billing & Insurance

| Feature | Description | Components |
|---------|-------------|------------|
| **Invoice Generation** | Automated charge capture | `BillingInvoiceGenerator`, `CreateInvoiceModal` |
| **Insurance Claims** | X12 837 submission | `InsuranceClaimUI`, `InsurancePanel` |
| **Payment Processing** | Multi-method payments | `CheckoutModal`, `QuickPaymentWidget` |
| **Claim Tracking** | Status, denials, appeals | `BillingDashboard` |

### 5.7 Patient Portal

| Feature | Description | Components |
|---------|-------------|------------|
| **Appointment Booking** | Self-scheduling | `AppointmentScheduler`, `RequestAppointmentModal` |
| **Prescription Refills** | Refill requests | `PrescriptionRefillModal` |
| **Lab Results** | View results with explanations | `TestResultsViewer` |
| **Secure Messaging** | Provider communication | `SecureMessaging` |
| **Health Timeline** | Care history visualization | `HealthTimeline` |
| **Medication Reminders** | Adherence tracking | `MedicationReminders` |

### 5.8 AI & Analytics

| Feature | Description | Components |
|---------|-------------|------------|
| **Differential Diagnosis** | AI-powered suggestions | `DifferentialDiagnosisEngine` |
| **Predictive Analytics** | Readmission risk, LOS prediction | `PredictiveAnalyticsEngine`, `LengthOfStayForecastingEngine` |
| **Treatment Recommendations** | Evidence-based suggestions | `TreatmentRecommendationsEngine` |
| **Voice Documentation** | Speech-to-text for notes | `VoiceDocumentation` |
| **Clinical Decision Support** | Real-time alerts | `ClinicalDecisionSupportPanel`, `AIClinicalAssistant` |

---

## 6. Database Schema

### 6.1 Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `hospitals` | Multi-tenant scoping | id, name, settings, branding |
| `users` | Hospital staff | id, hospital_id, email, role, license_number |
| `patients` | Patient demographics | id, hospital_id, demographics, insurance, allergies |
| `appointments` | Scheduling | id, patient_id, provider_id, time, status |
| `consultations` | Clinical encounters | id, patient_id, doctor_id, HPI, assessment, plan |
| `vital_signs` | Measurements | id, patient_id, BP, HR, temp, SpO2, weight |
| `prescriptions` | Medications | id, patient_id, drug, dose, status, signatures |
| `lab_orders` | Test requests | id, patient_id, test_code, specimen, status |
| `lab_results` | Test results | id, order_id, value, reference, critical_flag |
| `billing_encounters` | Billing sessions | id, patient_id, charges, insurance, claim_status |
| `activity_logs` | Audit trail | id, user_id, action, entity, timestamp |

### 6.2 Multi-Tenancy Pattern

Every table has `hospital_id` foreign key for data isolation:

```sql
-- RLS Policy Example
CREATE POLICY "Hospital Isolation" ON patients
  USING (hospital_id = auth.jwt() -> 'hospital_id');
```

### 6.3 Encryption

**PHI fields encrypted with AES-256-GCM:**

| Table | Encrypted Fields |
|-------|-----------------|
| `patients` | first_name, last_name, email, phone, address |
| `users` | email (sensitive) |
| `consultations` | HPI notes (optional) |

### 6.4 Key Indexes

```sql
-- Performance-critical indexes
CREATE INDEX idx_patients_hospital ON patients(hospital_id);
CREATE INDEX idx_appointments_provider_date ON appointments(provider_id, appointment_time);
CREATE INDEX idx_vital_signs_patient_date ON vital_signs(patient_id, recorded_at DESC);
CREATE INDEX idx_prescriptions_status ON prescriptions(status, hospital_id);
CREATE INDEX idx_lab_results_critical ON lab_results(result_status) WHERE result_status = 'Critical';
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
```

---

## 7. API & Edge Functions

### 7.1 Edge Functions List

| Function | Purpose | Phase |
|----------|---------|-------|
| `ai-clinical-support` | Differential diagnosis, suggestions | Core |
| `analytics-engine` | Dashboard metrics, reports | Phase 7 |
| `appointment-reminders` | SMS/email reminders | Core |
| `audit-logger` | Immutable audit logging | Security |
| `billing-reconciliation` | Payment matching | Billing |
| `check-low-stock` | Inventory alerts | Pharmacy |
| `critical-lab-check` | Critical value detection | Laboratory |
| `discharge-workflow` | Discharge orchestration | Clinical |
| `drug-interaction-check` | Interaction detection | Pharmacy |
| `fhir-integration` | FHIR R4 API | Integration |
| `generate-2fa-secret` | TOTP setup | Security |
| `health-check` | System status | Monitoring |
| `insurance-integration` | Claims processing | Billing |
| `lab-automation` | Equipment integration | Laboratory |
| `lab-critical-values` | Critical result alerts | Laboratory |
| `lab-result-notify` | Patient notifications | Laboratory |
| `optimize-queue` | Queue optimization | Scheduling |
| `predict-deterioration` | Clinical deterioration prediction | AI |
| `prescription-approval` | Multi-step approval workflow | Pharmacy |
| `send-email` | Email delivery | Communication |
| `send-notification` | Push notifications | Communication |
| `store-2fa-secret` | TOTP secret storage | Security |
| `symptom-analysis` | AI symptom checker | Patient |
| `telemedicine` | Video consultation support | Telehealth |
| `verify-2fa` | TOTP verification | Security |
| `verify-backup-code` | Backup code verification | Security |
| `verify-totp` | TOTP validation | Security |
| `workflow-automation` | Task routing, orchestration | Workflow |

### 7.2 API Patterns

```typescript
// Standard query pattern
const { data, error } = await supabase
  .from('patients')
  .select('*')
  .eq('hospital_id', hospitalId)  // ← Required for multi-tenancy
  .order('last_name')
  .limit(50);

// Real-time subscription
const channel = supabase
  .channel('prescription-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'prescriptions',
    filter: `hospital_id=eq.${hospitalId}`
  }, (payload) => handleUpdate(payload))
  .subscribe();
```

---

## 8. Security & Compliance

### 8.1 HIPAA Compliance

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| **Encryption at Rest** | AES-256-GCM via pgcrypto | ✅ |
| **Encryption in Transit** | TLS 1.3 enforced | ✅ |
| **Audit Trails** | Immutable activity_logs table | ✅ |
| **Access Control** | RLS + RBAC enforcement | ✅ |
| **Consent Management** | patient_consents table | ✅ |
| **Data Retention** | Configurable per hospital | ✅ |
| **Password Policy** | Min 12 chars, complexity, rotation | ✅ |
| **Session Management** | JWT + 30 min idle timeout | ✅ |
| **2FA Support** | TOTP + WebAuthn | ✅ |

### 8.2 Security Features

| Feature | Description |
|---------|-------------|
| **Row-Level Security (RLS)** | 50+ policies enforcing hospital/role isolation |
| **Rate Limiting** | Kong API Gateway rate limits |
| **Input Sanitization** | Zod schemas, prepared statements |
| **CORS Protection** | Strict origin policies |
| **Security Headers** | CSP, X-Frame-Options, HSTS |
| **PHI Sanitization** | Automatic stripping in logs |

### 8.3 Security Test Suites

| Test Suite | Purpose | Location |
|------------|---------|----------|
| `authentication.test.ts` | Auth flow security | tests/security/ |
| `hipaa-compliance.test.ts` | HIPAA requirements | tests/security/ |
| `owasp-top-10.test.ts` | OWASP vulnerability scan | tests/security/ |
| `rls-enforcement.test.ts` | Row-Level Security | tests/security/ |
| `penetration/*.test.ts` | CSRF, SQL injection, XSS | tests/security/penetration/ |

---

## 9. Clinical Workflows

### 9.1 Prescription Workflow

```
Doctor creates prescription (draft)
    ↓
Drug interaction check (automatic)
    ↓
Allergy verification (automatic)
    ↓
Doctor signs (e-signature + timestamp)
    ↓
Notification → Pharmacist + Patient
    ↓
Pharmacist verifies stock
    ↓
Pharmacist dispenses (lot, expiry logged)
    ↓
Notification → Patient "Ready for pickup"
    ↓
[AUDIT TRAIL: All actions logged]
```

### 9.2 Lab Order Workflow

```
Doctor orders test (specify priority, fasting)
    ↓
Lab Tech receives notification
    ↓
Specimen collected (logged with collector)
    ↓
Lab equipment processes sample
    ↓
Result entered (reference ranges auto-applied)
    ↓
If critical: Immediate alert to doctor
If normal: Pending approval
    ↓
Doctor reviews & approves
    ↓
Patient notified (portal + SMS/email)
    ↓
[AUDIT TRAIL: Status changes, approvals]
```

### 9.3 Discharge Workflow

```
Doctor initiates discharge order
    ↓
Nurse confirms patient readiness
    ↓
Pharmacy verifies medication reconciliation
    ↓
Billing generates final invoice
    ↓
Insurance claim submitted (if applicable)
    ↓
Patient pays outstanding balance
    ↓
Discharge summary generated
    ↓
Patient released
    ↓
[AUDIT TRAIL: Complete discharge timeline]
```

---

## 10. Component Library

### 10.1 UI Primitives (shadcn/ui)

60+ components in `src/components/ui/`:

- Forms: `input`, `select`, `checkbox`, `radio-group`, `textarea`, `form`
- Layout: `card`, `dialog`, `sheet`, `sidebar`, `tabs`, `accordion`
- Feedback: `alert`, `toast`, `progress`, `skeleton`, `spinner`
- Navigation: `breadcrumb`, `navigation-menu`, `pagination`
- Data: `table`, `chart`, `calendar`, `date-range-picker`

### 10.2 Feature Components by Module

| Module | Component Count | Key Components |
|--------|----------------|----------------|
| Admin | 26 | AdminDashboard, UserManagement, AuditLogViewer, SystemConfiguration |
| AI | 8 | AIClinicalDashboard, DifferentialDiagnosisEngine, PredictiveAnalyticsEngine |
| Nurse | 35+ | MARComponent, VitalSignsForm, TriageChecklist, HandoffPanel |
| Doctor | 12 | PatientChart, PrescriptionBuilder, LabResultsViewer, AIClinicalAssistant |
| Pharmacy | 5 | DispensingWorkstation, DrugInteractionAlert, InventoryDashboard |
| Lab | 8 | CreateLabOrderModal, LabResultEntryModal, CriticalValueAlert |
| Patient | 18 | AppointmentScheduler, TestResultsViewer, SecureMessaging, HealthTimeline |
| Landing | 14 | HeroDashboardMockup, MetricsSection, WorkflowTabs, PricingSection |

### 10.3 Lazy Loading Strategy

```typescript
// Dashboard lazy loading (96% bundle reduction)
const AdminDashboard = lazy(() => import('@/components/dashboard/AdminDashboard'));
const DoctorDashboard = lazy(() => import('@/components/dashboard/DoctorDashboard'));
const NurseDashboard = lazy(() => import('@/components/dashboard/NurseDashboard'));
const PatientDashboard = lazy(() => import('@/components/dashboard/PatientDashboard'));
```

---

## 11. Testing Strategy

### 11.1 Test Types

| Type | Framework | Coverage | Command |
|------|-----------|----------|---------|
| Unit | Vitest | Business logic, hooks | `npm run test:unit` |
| Integration | Vitest | Hook + service integration | `npm run test:integration` |
| Security | Vitest | Auth, RLS, encryption | `npm run test:security` |
| Accessibility | Vitest + axe | WCAG compliance | `npm run test:accessibility` |
| E2E | Playwright | Full user workflows | `npm run test:e2e` |
| Performance | k6 | Load testing | `npm run test:performance` |

### 11.2 E2E Test Structure

```
tests/e2e/
├── roles/
│   ├── admin/          # 80+ tests
│   ├── doctor/         # 120+ tests
│   ├── nurse/          # 100+ tests
│   ├── receptionist/   # 60+ tests
│   ├── pharmacist/     # 90+ tests
│   ├── lab_technician/ # 70+ tests
│   └── patient/        # 50+ tests
│
├── workflows/          # Cross-role workflows
│   ├── prescription-workflow.spec.ts
│   ├── lab-order-workflow.spec.ts
│   ├── discharge-workflow.spec.ts
│   └── billing-workflow.spec.ts
│
└── critical/           # Patient-safety paths
    ├── medication-safety.spec.ts
    ├── critical-values.spec.ts
    └── rbac-enforcement.spec.ts
```

**Total: 500+ E2E tests**

---

## 12. Deployment & Infrastructure

### 12.1 Environments

| Environment | URL | Infrastructure | Secrets |
|-------------|-----|----------------|---------|
| Development | localhost:5173 | Docker Compose | .env.local |
| Staging | staging.caresync.com | Kubernetes (single zone) | Sealed Secrets |
| Production | caresync.com | Kubernetes (multi-zone HA) | HashiCorp Vault |

### 12.2 CI/CD Pipeline

```yaml
# GitHub Actions Workflow
on: [push, pull_request]

jobs:
  test:
    - Lint (ESLint)
    - Unit tests (Vitest)
    - Security scan (OWASP)
    - Accessibility audit (axe)
    - Build verification

  e2e:
    - Smoke tests
    - Critical path tests
    - Full E2E suite (500+ tests)

  deploy:
    (main branch only)
    - Build Docker image
    - Push to registry
    - Kubernetes deployment
    - Smoke tests on live
```

### 12.3 Monitoring

| Tool | Purpose |
|------|---------|
| Prometheus | Metrics collection |
| Grafana | Dashboards |
| PagerDuty | On-call alerting |
| OTEL | Distributed tracing |

---

## 13. Performance Metrics

### 13.1 Frontend Performance

| Metric | Target | Current |
|--------|--------|---------|
| Bundle Size (main.js) | <500 KB | ~400 KB |
| LCP | <2.5s | ~2.0s |
| FID | <100ms | ~50ms |
| CLS | <0.1 | <0.05 |
| Time to Interactive | <3s | ~2.5s |

### 13.2 Backend Performance

| Metric | Target | Current |
|--------|--------|---------|
| API Response p95 | <500ms | ~300ms |
| Simple Queries | <100ms | ~50ms |
| Complex Queries | <1s | ~700ms |
| Cache Hit Rate | >70% | ~75% |
| Concurrent Users | 1000+ | Validated |

### 13.3 Availability

| Metric | Target | Current |
|--------|--------|---------|
| Uptime SLA | 99.5% | 99.8% |
| Error Rate | <0.5% | <0.2% |
| Recovery Time (DB failover) | <2 min | ~90 sec |
| Recovery Time (App crash) | <30 sec | ~20 sec |

---

## 14. Known Issues & Roadmap

### 14.1 Known Issues

| Issue | Status | Workaround |
|-------|--------|------------|
| Branding inconsistency (CareSync vs AROCORD-HIMS) | Planned | Update landing page |
| Excessive animations on landing page | Planned | Redesign for enterprise tone |
| Multiple CTAs on landing page | Planned | Consolidate to single "Book Demo" |

### 14.2 Roadmap

| Quarter | Focus | Features |
|---------|-------|----------|
| Q3 2026 | Expansion | Multi-hospital rollout, advanced analytics |
| Q4 2026 | Mobile | Native mobile apps (iOS/Android) |
| Q1 2027 | AI | Enhanced AI diagnostics, voice-first interface |
| Q2 2027 | Integration | FHIR R4 complete, HL7v2 legacy support |

### 14.3 Phase Completion Status

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 1 | Foundation & Authentication | ✅ Complete |
| Phase 2 | Core Operations & Patient Management | ✅ Complete |
| Phase 3 | Clinical Workflows & Consultations | ✅ Complete |
| Phase 4 | Operations Management & Billing | ✅ Complete |
| Phase 5 | Pharmacy & Laboratory Automation | ✅ Complete |
| Phase 6 | Patient Portal & Mobile Experience | ✅ Complete |
| Phase 7 | Analytics & Reporting System | ✅ Complete |
| Phase 8 | Cross-Role Integration & Workflow Automation | ✅ Complete |

---

## Document Maintenance

### Update Schedule

- **Weekly**: Update known issues and roadmap
- **Monthly**: Review and update component lists
- **Quarterly**: Full architecture review

### Related Documents

- [System Architecture](./product/SYSTEM_ARCHITECTURE.md)
- [Data Model](./product/DATA_MODEL.md)
- [API Reference](./product/API_REFERENCE.md)
- [RBAC Permissions](./RBAC_PERMISSIONS.md)
- [Security Checklist](./product/SECURITY_CHECKLIST.md)
- [Testing Strategy](./product/TESTING_STRATEGY.md)

---

**Document Owner**: Product Team  
**Last Review**: June 2026  
**Next Review**: July 2026
