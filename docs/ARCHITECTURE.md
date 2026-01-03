# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │   Desktop   │  │   Mobile    │  │   Tablet    │  │   PWA       │    │
│  │   Browser   │  │   Browser   │  │   Browser   │  │   App       │    │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React SPA)                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                         React Router                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │
│  │  │ Hospital │ │ Patient  │ │Dashboard │ │ Settings │           │   │
│  │  │  Auth    │ │  Portal  │ │  Routes  │ │  Routes  │           │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      State Management                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │ Auth Context │  │ TanStack     │  │ React Hook   │          │   │
│  │  │              │  │ Query        │  │ Form         │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          LOVABLE CLOUD (Supabase)                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        Edge Functions                             │   │
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐      │   │
│  │  │ Appointment    │ │ Lab Critical   │ │ Send           │      │   │
│  │  │ Reminders      │ │ Values Alert   │ │ Notification   │      │   │
│  │  └────────────────┘ └────────────────┘ └────────────────┘      │   │
│  │  ┌────────────────┐                                             │   │
│  │  │ Check Low      │                                             │   │
│  │  │ Stock          │                                             │   │
│  │  └────────────────┘                                             │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Authentication                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │ Email/Pass   │  │ Session Mgmt │  │ JWT Tokens   │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        PostgreSQL                                 │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │ Tables       │  │ RLS Policies │  │ Functions    │          │   │
│  │  │ (20+ tables) │  │ (per table)  │  │ & Triggers   │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Feature-Based Organization

```
src/
├── components/
│   ├── admin/                    # Admin-specific components
│   │   ├── AdminAnalytics.tsx    # Analytics dashboard
│   │   ├── AdminRepairTool.tsx   # Setup wizard
│   │   ├── DepartmentManagement.tsx
│   │   ├── ResourceManagement.tsx
│   │   └── StaffOnboardingWizard.tsx
│   │
│   ├── dashboard/                # Role-based dashboards
│   │   ├── AdminDashboard.tsx
│   │   ├── DoctorDashboard.tsx
│   │   ├── NurseDashboard.tsx
│   │   ├── PatientDashboard.tsx
│   │   ├── PharmacistDashboard.tsx
│   │   ├── ReceptionistDashboard.tsx
│   │   └── LabTechDashboard.tsx
│   │
│   ├── consultations/            # Clinical workflow
│   │   ├── steps/
│   │   │   ├── ChiefComplaintStep.tsx
│   │   │   ├── PhysicalExamStep.tsx
│   │   │   ├── DiagnosisStep.tsx
│   │   │   ├── TreatmentPlanStep.tsx
│   │   │   └── SummaryStep.tsx
│   │   ├── PatientSidebar.tsx
│   │   └── StartConsultationModal.tsx
│   │
│   └── ui/                       # Shared UI components (shadcn)
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── ... (40+ components)
```

### Hook Pattern

```typescript
// Data fetching hooks follow consistent patterns
hooks/
├── usePatients.ts          # Patient CRUD operations
├── useAppointments.ts      # Appointment management
├── useConsultations.ts     # Clinical workflows
├── usePrescriptions.ts     # Rx management
├── useLabOrders.ts         # Laboratory orders
├── useBilling.ts           # Invoicing & payments
├── useInventory.ts         # Stock management
└── useNotifications.ts     # Real-time notifications
```

---

## Data Flow

### Authentication Flow

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Login   │────▶│ Supabase │────▶│  JWT     │────▶│  Auth    │
│  Form    │     │   Auth   │     │  Token   │     │ Context  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                                                         │
                                                         ▼
                                                  ┌──────────┐
                                                  │  Route   │
                                                  │ Protection│
                                                  └──────────┘
```

### Clinical Workflow

```
Patient Check-in ──▶ Queue Entry ──▶ Nurse Prep ──▶ Doctor Consultation
       │                  │               │                │
       ▼                  ▼               ▼                ▼
   Registration      Priority         Vitals          Diagnosis
   Verification      Assignment       Recording       Prescription
                                                      Lab Orders
                                                           │
       ┌───────────────────────────────────────────────────┘
       ▼
   Pharmacy ──▶ Lab ──▶ Billing ──▶ Checkout
   Dispensing   Tests    Invoice    Discharge
```

---

## Security Architecture

### Row Level Security (RLS)

```sql
-- Example: Patients can only view their own records
CREATE POLICY "patients_own_records" ON patients
  FOR SELECT
  USING (user_id = auth.uid());

-- Staff can view patients from their hospital
CREATE POLICY "staff_hospital_patients" ON patients
  FOR SELECT
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles 
      WHERE user_id = auth.uid()
    )
  );
```

### Role-Based Access Control

```
┌─────────────────────────────────────────────────────────────┐
│                        RBAC Matrix                           │
├──────────────┬─────┬────────┬───────┬───────────┬──────────┤
│ Resource     │Admin│ Doctor │ Nurse │Receptionist│ Patient  │
├──────────────┼─────┼────────┼───────┼───────────┼──────────┤
│ Patients     │ RWD │  RW    │  R    │    RW     │   R*     │
│ Appointments │ RWD │  RW    │  R    │    RWD    │   RW*    │
│ Consultations│ RWD │  RWD   │  R    │    -      │   R*     │
│ Prescriptions│ RWD │  RWD   │  R    │    -      │   R*     │
│ Lab Orders   │ RWD │  RWD   │  RW   │    -      │   R*     │
│ Billing      │ RWD │  R     │  -    │    RW     │   R*     │
│ Settings     │ RWD │  -     │  -    │    -      │   -      │
└──────────────┴─────┴────────┴───────┴───────────┴──────────┘
* Patient access limited to own records only
R = Read, W = Write, D = Delete
```

---

## Performance Considerations

### Caching Strategy

- **TanStack Query** for client-side caching
- **Stale-while-revalidate** for frequently accessed data
- **Optimistic updates** for better UX

### Database Optimization

- Indexed columns for frequent queries
- Materialized views for complex reports
- Connection pooling via Supabase

### Bundle Optimization

- Code splitting by route
- Lazy loading for non-critical components
- Tree shaking unused code

---

## Scalability

### Horizontal Scaling

```
                    ┌─────────────────┐
                    │  Load Balancer  │
                    └────────┬────────┘
           ┌─────────────────┼─────────────────┐
           ▼                 ▼                 ▼
    ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
    │   CDN       │   │   CDN       │   │   CDN       │
    │  (Lovable)  │   │  (Lovable)  │   │  (Lovable)  │
    └─────────────┘   └─────────────┘   └─────────────┘
           │                 │                 │
           └─────────────────┼─────────────────┘
                             ▼
                    ┌─────────────────┐
                    │ Supabase Cloud  │
                    │   (PostgreSQL)  │
                    └─────────────────┘
```

### Multi-Tenancy

- Hospital-level data isolation
- Shared infrastructure, separate data
- RLS enforced at database level
