# CareSync HIMS - System Architecture & Technical Overview

**Last Updated**: April 10, 2026  
**Scope**: Complete technical architecture of CareSync HIMS  

---

## 📚 Navigation & Quick Links

This document provides an overview of CareSync's technical system. For detailed information, see:

- **Complete Technical Guide**: See [EXECUTION_FRAMEWORK_MASTER_GUIDE.md](./EXECUTION_FRAMEWORK_MASTER_GUIDE.md)
- **Component Architecture**: See [Component Library](../src/components/) folder structure  
- **Data Model & Schema**: See [DATA_MODEL Reference](./FEATURE_REQUIREMENTS.md#-data-model) section
- **Multi-Tenancy**: See [RBAC_PERMISSIONS.md](./RBAC_PERMISSIONS.md#-hospital-scoping)
- **Deployment**: See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## Quick Facts

| Aspect | Detail |
|--------|--------|
| **Frontend Framework** | React 18 + TypeScript (Strict Mode) |
| **State Management** | TanStack Query v4 (React Query) |
| **UI Library** | Shadcn/ui + Tailwind CSS |
| **Backend** | Supabase (PostgreSQL + Auth + Real-time) |
| **Multi-Tenancy** | Hospital-scoped with RLS policies |
| **Authentication** | Supabase Auth + JWT + 2FA |
| **Authorization** | 7 roles with 40+ permission matrix |
| **Database Encryption** | AES-256-GCM for PHI at rest |
| **Transport Security** | TLS 1.3 enforced |
| **Deployment** | Docker + Kubernetes + CI/CD |

---

## Architecture Layers

### 1. **Presentation Layer** (src/components/)
- 150+ React components
- Forms (using React Hook Form + Zod)
- Rich data tables and visualizations
- Real-time updates via WebSocket

**Key Folders**:
- `audit/` - Audit trail components
- `common/` - Shared UI components
- `pharmacy/`, `lab/`, `billing/` - Role-specific components

**See**: [Component Architecture](../src/components)

---

### 2. **State Management Layer** (src/lib/hooks/)
- 50+ custom hooks
- TanStack Query integration
- Hospital-scoped caching
- Real-time data synchronization

**Key Patterns**:
- `usePatients()` - Patient data management
- `usePrescriptions()` - Pharmacy workflow
- `useLabOrders()` - Lab test ordering
- `useAuth()` - Authentication context

**See**: [Hooks Library](../src/lib/hooks/)

---

### 3. **Data Access Layer** (src/integrations/)
- Supabase client integration
- Type-safe query helpers
- RLS policy enforcement
- Hospital-scoped multi-tenancy

**Key Files**:
- `supabase/client.ts` - Supabase connection
- Prepared statements for all queries
- Row-Level Security (RLS) enabled

**See**: [integrations/supabase/](../src/integrations/supabase/)

---

### 4. **Backend Layer** (Supabase)
- PostgreSQL database (11+ tables)
- Real-time subscriptions
- Edge Functions for business logic
- Audit logging (immutable append-only)

**Key Tables**:
- `hospitals` - Multi-tenant scoping
- `users` - User profiles with role assignment
- `patients` - Patient demographics + encryption metadata
- `prescriptions` - Prescription records
- `lab_orders`, `lab_results` - Lab workflows
- `billing_encounters`, `billing_line_items` - Billing data
- `activity_logs` - Audit trail (immutable)

**See**: [Supabase Schema](../supabase/migrations), [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)

---

## Core Workflows

### 1. **Appointment Workflow** (Clinical)
Patient Check-in → Vital Signs Entry → Doctor Consultation → Prescription/Lab Orders → Discharge

**Components**: AppointmentCheckin, VitalSignsEntry, ConsultationNotes
**See**: [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md#appointment-workflow)

---

### 2. **Prescription Workflow** (Pharmacy)
Create Prescription → Clinical Validation → Doctor Signature → Pharmacist Dispense → Patient Pickup

**Components**: PrescriptionCreate, PrescriptionApproval, PharmacyDispense
**See**: [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md#prescription-workflow)

---

### 3. **Lab Order Workflow** (Laboratory)
Create Lab Order → Sample Collection → Lab Processing → Result Entry → Approval → Patient View

**Components**: LabOrderCreate, LabResultEntry, LabResultApproval
**See**: [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md#lab-workflow)

---

### 4. **Billing Workflow** (Finance)
Encounter Closure → Charge Capture → Insurance Claim Submission → Payment Reconciliation

**Components**: BillingCharge, ClaimSubmission, PaymentTracking
**See**: [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md#billing-workflow)

---

## Multi-Tenancy & Authorization

### Hospital Scoping
Every query is scoped to the authenticated user's hospital:
```sql
SELECT * FROM patients WHERE hospital_id = auth.jwt() -> 'hospital_id'
```

**See**: [RBAC_PERMISSIONS.md](./RBAC_PERMISSIONS.md#hospital-scoping)

---

### Role-Based Access Control (RBAC)
7 roles with specific permissions:
- **Admin** - Hospital administration
- **Doctor** - Clinical care provider
- **Nurse** - Patient care support
- **Pharmacist** - Medication management
- **Lab Tech** - Laboratory operations
- **Receptionist** - Front desk operations
- **Patient** - Self-service portal

**See**: [RBAC_PERMISSIONS.md](./RBAC_PERMISSIONS.md)

---

## Security & Compliance

### HIPAA Compliance
- ✅ **PHI Encryption**: AES-256-GCM at rest with Supabase pgcrypto
- ✅ **Transport Security**: TLS 1.3 enforced for all connections
- ✅ **Audit Logging**: Immutable append-only logs for all PHI access
- ✅ **User Verification**: Strong authentication with 2FA support
- ✅ **Access Controls**: Row-Level Security (RLS) policies per hospital
- ✅ **Data Minimization**: Only necessary PHI fields displayed per role

**See**: [RBAC_PERMISSIONS.md](./RBAC_PERMISSIONS.md#hipaa-compliance)

---

### OWASP Top 10
- ✅ All SQL queries parameterized (no injection risk)
- ✅ CORS properly configured with security headers
- ✅ Dependencies scanned for vulnerabilities (zero critical)
- ✅ Input validation via Zod schemas
- ✅ Rate limiting via Kong API gateway
- ✅ Authentication: JWT + optional 2FA
- ✅ Authorization: Row-Level Security + Frontend checks

**See**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md#security-checklist)

---

## Performance Characteristics

### Frontend Performance
- **Bundle Size**: ~400 KB (gzipped ~160 KB)
- **Time to Interactive**: <3 seconds
- **Web Vitals**: All green (LCP <2.5s, CLS <0.1)

### Backend Performance
- **API Response Time**: <500ms p95
- **Simple Queries**: <100ms
- **Complex Queries**: <1s (with caching)
- **Concurrent Users**: 1000+ with auto-scaling Kubernetes

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | 18.x |
| **Language** | TypeScript | 5.x |
| **State Mgmt** | TanStack Query | 4.x |
| **UI Framework** | Shadcn/ui | Latest |
| **Styling** | Tailwind CSS | 3.x |
| **Forms** | React Hook Form | 7.x |
| **Validation** | Zod | 3.x |
| **Backend** | Supabase/PostgreSQL | Latest |
| **Real-time** | Supabase Real-time | Enabled |
| **Auth** | Supabase Auth | JWT + 2FA |
| **Deployment** | Kubernetes | 1.x |
| **Monitoring** | Prometheus + Grafana | Latest |
| **CI/CD** | GitHub Actions | v3+ |

---

## Development Standards

For coding standards, patterns, and best practices, see:  
**→ [DEVELOPMENT_STANDARDS.md](./DEVELOPMENT_STANDARDS.md)**

---

## Further Reading

- **Full Technical Guide**: [EXECUTION_FRAMEWORK_MASTER_GUIDE.md](./EXECUTION_FRAMEWORK_MASTER_GUIDE.md)
- **Data Schema**: See Supabase migrations in `supabase/migrations/`
- **Deployment**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Permissions & RBAC**: [RBAC_PERMISSIONS.md](./RBAC_PERMISSIONS.md)
- **Features & Workflows**: [FEATURE_REQUIREMENTS.md](./FEATURE_REQUIREMENTS.md)

---

**Last Audit**: April 10, 2026  
**Status**: ✅ Current  
**Next Review**: April 30, 2026 (Phase 1 completion)
