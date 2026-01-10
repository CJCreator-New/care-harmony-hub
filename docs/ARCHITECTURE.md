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
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Lazy Loading Layer                           │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │ React.lazy() │  │ Suspense     │  │ Error        │          │   │
│  │  │ Components   │  │ Boundaries   │  │ Boundaries   │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          LOVABLE CLOUD (Supabase)                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        Edge Functions (15+)                       │   │
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐      │   │
│  │  │ Appointment    │ │ Lab Critical   │ │ AI Clinical    │      │   │
│  │  │ Reminders      │ │ Values Alert   │ │ Support        │      │   │
│  │  └────────────────┘ └────────────────┘ └────────────────┘      │   │
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐      │   │
│  │  │ Check Low      │ │ Monitoring     │ │ Analytics      │      │   │
│  │  │ Stock          │ │ & Alerting     │ │ Engine         │      │   │
│  │  └────────────────┘ └────────────────┘ └────────────────┘      │   │
│  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐      │   │
│  │  │ FHIR           │ │ Insurance      │ │ Backup         │      │   │
│  │  │ Integration    │ │ Integration    │ │ Manager        │      │   │
│  │  └────────────────┘ └────────────────┘ └────────────────┘      │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                      Authentication                               │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │ Email/Pass   │  │ Session Mgmt │  │ JWT Tokens   │          │   │
│  │  │ (30min TO)   │  │ (HIPAA)      │  │              │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                        PostgreSQL (46+ Tables)                    │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │ Core Tables  │  │ Clinical     │  │ Integration  │          │   │
│  │  │ (hospitals,  │  │ Tables       │  │ Tables       │          │   │
│  │  │  profiles,   │  │ (consults,   │  │ (tasks,      │          │   │
│  │  │  patients)   │  │  labs, rx)   │  │  care_gaps)  │          │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘          │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │   │
│  │  │ Reference    │  │ RLS Policies │  │ Functions    │          │   │
│  │  │ (ICD-10,     │  │ (Hospital-   │  │ & Triggers   │          │   │
│  │  │  CPT, LOINC) │  │  scoped)     │  │              │          │   │
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
│   │   ├── AdminAnalytics.tsx
│   │   ├── AdminRepairTool.tsx
│   │   ├── AuditTrailDashboard.tsx
│   │   ├── BackupRecoveryDashboard.tsx
│   │   ├── BusinessIntelligenceDashboard.tsx
│   │   ├── DepartmentManagement.tsx
│   │   ├── IntegrationDashboard.tsx
│   │   ├── ResourceManagement.tsx
│   │   ├── StaffOnboardingWizard.tsx
│   │   ├── SystemMonitoringDashboard.tsx
│   │   └── TestDataSeederCard.tsx
│   │
│   ├── analytics/                # Population health & quality
│   │   ├── PopulationHealthDashboard.tsx
│   │   └── QualityMeasuresDashboard.tsx
│   │
│   ├── appointments/             # Scheduling components
│   │   ├── MultiResourceScheduler.tsx
│   │   ├── RecurringAppointmentModal.tsx
│   │   ├── ScheduleAppointmentModal.tsx
│   │   └── WaitlistManagementCard.tsx
│   │
│   ├── audit/                    # Compliance & audit
│   │   ├── AuditLogViewer.tsx
│   │   └── DataExportTool.tsx
│   │
│   ├── auth/                     # Authentication
│   │   ├── BackupCodeVerifyModal.tsx
│   │   ├── PasswordStrengthMeter.tsx
│   │   ├── RoleProtectedRoute.tsx
│   │   ├── TwoFactorSetupModal.tsx
│   │   └── TwoFactorVerifyModal.tsx
│   │
│   ├── consultations/            # Clinical workflow
│   │   ├── steps/
│   │   │   ├── ChiefComplaintStep.tsx
│   │   │   ├── DiagnosisStep.tsx
│   │   │   ├── DiagnosisStepEnhanced.tsx
│   │   │   ├── PhysicalExamStep.tsx
│   │   │   ├── ReviewOfSystemsStep.tsx
│   │   │   ├── SummaryStep.tsx
│   │   │   └── TreatmentPlanStep.tsx
│   │   ├── CPTCodeMapper.tsx
│   │   ├── HPITemplateSelector.tsx
│   │   ├── ICD10Autocomplete.tsx
│   │   ├── PatientSidebar.tsx
│   │   └── StartConsultationModal.tsx
│   │
│   ├── dashboard/                # Role-based dashboards (7)
│   │   ├── AdminDashboard.tsx
│   │   ├── DoctorDashboard.tsx
│   │   ├── LabTechDashboard.tsx
│   │   ├── NurseDashboard.tsx
│   │   ├── PatientDashboard.tsx
│   │   ├── PharmacistDashboard.tsx
│   │   └── ReceptionistDashboard.tsx
│   │
│   ├── doctor/                   # Doctor-specific
│   │   └── AIClinicalSupportDashboard.tsx
│   │
│   ├── integration/              # Cross-role features
│   │   ├── InterRoleCommunicationHub.tsx
│   │   ├── RealTimeStatusBoard.tsx
│   │   └── TaskAssignmentSystem.tsx
│   │
│   ├── laboratory/               # Lab components
│   │   ├── CriticalResultNotification.tsx
│   │   ├── CriticalValueAlert.tsx
│   │   ├── LabResultEntryModal.tsx
│   │   ├── LabTrendVisualization.tsx
│   │   ├── LOINCSearch.tsx
│   │   └── SampleCollectionModal.tsx
│   │
│   ├── monitoring/               # System monitoring
│   │   ├── ErrorTrackingDashboard.tsx
│   │   ├── LoggingDashboard.tsx
│   │   └── PerformanceDashboard.tsx
│   │
│   ├── nurse/                    # Nurse workflow
│   │   ├── AllergiesVerificationModal.tsx
│   │   ├── ChiefComplaintModal.tsx
│   │   ├── MARComponent.tsx
│   │   ├── MedicationAdministrationModal.tsx
│   │   ├── MedicationReconciliationCard.tsx
│   │   ├── MedicationsReviewModal.tsx
│   │   ├── PatientPrepChecklistCard.tsx
│   │   ├── RecordVitalsModal.tsx
│   │   ├── ShiftHandoverModal.tsx
│   │   └── TriageAssessmentModal.tsx
│   │
│   ├── patient/                  # Patient portal
│   │   ├── AfterVisitSummaryGenerator.tsx
│   │   ├── DigitalCheckinWorkflow.tsx
│   │   ├── PatientBilling.tsx
│   │   ├── PatientBillingAccess.tsx
│   │   ├── PrescriptionRefillModal.tsx
│   │   ├── RequestAppointmentModal.tsx
│   │   ├── ScheduleAppointmentModal.tsx
│   │   └── SecureMessaging.tsx
│   │
│   ├── pharmacy/                 # Pharmacy components
│   │   ├── DrugInteractionAlert.tsx
│   │   └── PrescriptionDispensingModal.tsx
│   │
│   ├── prescriptions/            # Rx safety features
│   │   ├── DoseAdjustmentCalculator.tsx
│   │   ├── PediatricDosingCard.tsx
│   │   ├── PregnancyLactationWarnings.tsx
│   │   ├── PrescriptionSafetyAlerts.tsx
│   │   ├── RefillRequestModal.tsx
│   │   └── TherapeuticDuplicationAlert.tsx
│   │
│   └── ui/                       # Shared UI (40+ components)
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       └── ... (shadcn/ui components)
```

### Hook Architecture (60+ Hooks)

```typescript
hooks/
├── Core Data Hooks
│   ├── usePatients.ts          # Patient CRUD operations
│   ├── useAppointments.ts      # Appointment management
│   ├── useConsultations.ts     # Clinical workflows
│   ├── usePrescriptions.ts     # Rx management
│   ├── useLabOrders.ts         # Laboratory orders
│   ├── useBilling.ts           # Invoicing & payments
│   └── useMedications.ts       # Medication inventory
│
├── Clinical Hooks
│   ├── useICD10Codes.ts        # Diagnosis code lookup
│   ├── useCPTCodes.ts          # Billing code lookup
│   ├── useLoincCodes.ts        # Lab test codes
│   ├── useVitalSigns.ts        # Vitals recording
│   ├── usePrescriptionSafety.ts # Drug safety checks
│   └── useAIClinicalSupport.ts # AI diagnostics
│
├── Integration Hooks
│   ├── useTaskAssignments.ts   # Cross-role tasks
│   ├── useCareGaps.ts          # Population health
│   ├── useTriageAssessments.ts # ESI scoring
│   ├── useNurseWorkflow.ts     # Nurse-specific
│   └── useIntegration.ts       # General integration
│
├── Security & Compliance Hooks
│   ├── useSessionTimeout.ts    # 30-min HIPAA timeout
│   ├── useAuditLogger.ts       # Activity logging
│   ├── useActivityLog.ts       # Log viewing
│   ├── usePermissions.ts       # RBAC
│   └── useTwoFactorAuth.ts     # 2FA management
│
├── Performance Hooks
│   ├── usePaginatedQuery.ts    # Pagination wrapper
│   ├── usePerformanceMonitoring.ts # Metrics
│   ├── useErrorTracking.ts     # Error logging
│   └── useSystemMonitoring.ts  # System health
│
└── Portal Hooks
    ├── usePatientPortal.ts     # Portal features
    ├── useAppointmentRequests.ts # Request management
    ├── useRefillRequests.ts    # Refill workflow
    └── useSecureMessaging.ts   # Messaging
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
                      ┌──────────────────────────────────┤
                      │                                  │
                      ▼                                  ▼
               ┌──────────┐                       ┌──────────┐
               │ Session  │                       │  Route   │
               │ Timeout  │                       │ Protection│
               │ (30 min) │                       │  (RBAC)  │
               └──────────┘                       └──────────┘
```

### Clinical Workflow (Enhanced)

```
Patient Check-in ──▶ Triage (ESI) ──▶ Queue Entry ──▶ Nurse Prep
       │                  │                │              │
       ▼                  ▼                ▼              ▼
   Registration      ESI Scoring      Priority        Vitals
   Verification      (1-5 Level)     Assignment      Recording
                                                     Medication
                                                     Reconciliation
                                                          │
                      ┌───────────────────────────────────┘
                      ▼
              Doctor Consultation (SOAP)
                      │
    ┌─────────────────┼─────────────────┐
    ▼                 ▼                 ▼
Chief Complaint   Physical Exam     Diagnosis
(HPI Templates)   (Structured)     (ICD-10)
OLDCARTS/OPQRST      + ROS         AI Support
                                        │
                      ┌─────────────────┘
                      ▼
              Treatment Plan
                      │
    ┌─────────────────┼─────────────────┐
    ▼                 ▼                 ▼
Prescriptions     Lab Orders       Referrals
(Drug Safety)    (LOINC Codes)    (Task System)
                      │
    ┌─────────────────┼─────────────────┐
    ▼                 ▼                 ▼
 Pharmacy           Lab             Billing
 Dispensing       Testing         (CPT Codes)
                      │
                      ▼
               After Visit
                Summary
                      │
                      ▼
               Patient Portal
```

---

## Security Architecture

### Row Level Security (RLS)

```sql
-- All 46 tables have hospital-scoped RLS policies

-- Example: Patients can only be accessed by hospital staff
CREATE POLICY "hospital_staff_patients" ON patients
  FOR ALL
  TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Example: Patients can only view their own records
CREATE POLICY "patients_own_records" ON patients
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Example: Task assignments scoped to hospital
CREATE POLICY "hospital_tasks" ON task_assignments
  FOR ALL
  TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles 
      WHERE user_id = auth.uid()
    )
  );
```

### Role-Based Access Control (RBAC)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RBAC Matrix (7 Roles)                         │
├──────────────┬─────┬────────┬───────┬───────────┬────────┬─────────┤
│ Resource     │Admin│ Doctor │ Nurse │Receptionist│ Pharm │ LabTech │
├──────────────┼─────┼────────┼───────┼───────────┼────────┼─────────┤
│ Patients     │ RWD │  RW    │  R    │    RW     │   R    │   R     │
│ Appointments │ RWD │  RW    │  R    │    RWD    │   -    │   -     │
│ Consultations│ RWD │  RWD   │  RW   │    -      │   R    │   R     │
│ Prescriptions│ RWD │  RWD   │  R    │    -      │  RWD   │   -     │
│ Lab Orders   │ RWD │  RWD   │  RW   │    -      │   -    │  RWD    │
│ Billing      │ RWD │  R     │  -    │    RW     │   R    │   -     │
│ Inventory    │ RWD │  -     │  -    │    -      │  RWD   │   R     │
│ Tasks        │ RWD │  RW    │  RW   │    RW     │  RW    │  RW     │
│ Settings     │ RWD │  -     │  -    │    -      │   -    │   -     │
│ Audit Logs   │ R   │  -     │  -    │    -      │   -    │   -     │
└──────────────┴─────┴────────┴───────┴───────────┴────────┴─────────┘
R = Read, W = Write, D = Delete
Patient access limited to own records only
```

---

## Performance Architecture

### Caching Strategy

```typescript
// TanStack Query configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Lazy Loading

```typescript
// All 50+ pages use React.lazy()
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const PatientsPage = lazy(() => import('@/pages/patients/PatientsPage'));

// Suspense wrapper with loading state
<Suspense fallback={<LoadingSpinner />}>
  <Routes>
    <Route path="/dashboard" element={<Dashboard />} />
  </Routes>
</Suspense>
```

### Pagination

```typescript
// usePaginatedQuery prevents 1000-row limits
const { data, page, setPage, totalPages } = usePaginatedQuery(
  'patients',
  { hospitalId },
  { pageSize: 25 }
);
```

---

## Scalability

### Multi-Tenancy Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Load Balancer                           │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │   CDN       │ │   CDN       │ │   CDN       │
   │  (Lovable)  │ │  (Lovable)  │ │  (Lovable)  │
   └─────────────┘ └─────────────┘ └─────────────┘
          │               │               │
          └───────────────┼───────────────┘
                          ▼
   ┌─────────────────────────────────────────────────────────┐
   │                 Supabase Cloud                           │
   │  ┌─────────────────────────────────────────────────┐   │
   │  │              PostgreSQL Database                 │   │
   │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐           │   │
   │  │  │Hospital │ │Hospital │ │Hospital │           │   │
   │  │  │   A     │ │   B     │ │   C     │           │   │
   │  │  │  Data   │ │  Data   │ │  Data   │           │   │
   │  │  └─────────┘ └─────────┘ └─────────┘           │   │
   │  │            (RLS Isolation)                      │   │
   │  └─────────────────────────────────────────────────┘   │
   └─────────────────────────────────────────────────────────┘
```

### Data Isolation

- Hospital-level data isolation via RLS
- Shared infrastructure, separate data
- All queries automatically filtered by hospital_id
- Cross-hospital data access prevented at database level
