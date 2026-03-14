# Phase 2B Audit Component Integration Plan

**Status:** Implementation Strategy  
**Date:** March 13, 2026  
**Scope:** Comprehensive integration of 7 Phase 2B audit components across 4 clinical workflows  
**Estimated Effort:** 8-12 developer days for full implementation  

---

## 1. Workflow Integration Points

### 1.1 Prescription Workflow Integration

**Workflow States & Amendment Opportunities:**

```
CREATED (Draft)
    ↓ Doctor Submits
PENDING (Awaiting Approval)
    ↓ Doctor can AMEND dosage/qty before approval (via AmendmentModal)
    ↓ Pharmacist Approves/Rejects
APPROVED (Ready for Dispensing)
    ↓ Doctor can AMEND dosage/qty after approval (requires pharmacist review)
    ↓ Pharmacist Dispenses
DISPENSED (Pharmacy Fulfilled)
    ↓ Doctor/Pharmacist can REQUEST REVERSAL (special amendment type)
REVERSED (Voided - keeps immutable history)
```

**Amendment Use Cases:**
- **Pre-Approval:** Doctor realizes dosage error → Quick correction (no approval delay)
- **Post-Approval:** Clinical event (e.g., patient develops renal dysfunction) → Dosage reduction (flags pharmacist for immediate review)
- **Drug Interaction:** Detected during prescription review → Adjust quantity/duration
- **Allergy Update:** Patient reports new allergy → Change medication entirely

**Audit Components Integration:**
| Component | When Used | User Role |
|-----------|-----------|-----------|
| **AmendmentModal** | Doctor clicks "Edit Dosage" on prescription detail | Doctor (initiator) |
| **useAmendmentAlert** | Real-time notification of high-risk changes | Pharmacist (reviewer) |
| **ForensicTimeline** | View full amendment chain before dispensing | Doctor, Pharmacist, Compliance |
| **DataExportTool** | Export all prescriptions with amendment history | Compliance Officer |

---

### 1.2 Lab Order Workflow Integration

**Workflow States & Amendment Opportunities:**

```
ORDERED (Test requested by doctor)
    ↓ Lab Tech receives sample
SAMPLE_RECEIVED (In lab queue)
    ↓ Lab Tech processes sample
PROCESSING (Running analyzer)
    ↓ Lab Technician enters initial result
RESULT_ENTERED (Raw value recorded)
    ↓ Lab Technician reviews for errors (e.g., wrong patient name, decimal error)
    ↓ Can AMEND if obvious data entry error
RESULT_VERIFIED (Validated by supervisor)
    ↓ Doctor reviews critical results
CRITICAL_ALERT (If abnormal)
    ↓ Notifications sent to doctor
REPORTED (Final result to patient)
    ↓ Can REQUEST CORRECTION if lab error discovered post-reporting
CORRECTED (Immutable amendment record created)
```

**Amendment Use Cases:**
- **Data Entry Typo:** Lab tech enters "250 mg/dL" instead of "25 mg/dL" → Amend before verification
- **Quality Control Failure:** Analyzer malfunction detected → Lab supervisor amends all results from batch
- **Patient ID Mismatch:** Wrong patient linked to result → Reversal + reorder
- **Reference Range Update:** Lab updates normal ranges for new population → Amend historical records (special case)

**Audit Components Integration:**
| Component | When Used | User Role |
|-----------|-----------|-----------|
| **AmendmentModal** | Lab supervisor "Correct Result" during verification | Lab Tech / Supervisor |
| **useLabResultAmendmentHistory** (derived from useForensicQueries) | View all corrections for a test | Lab Supervisor, Doctor, Compliance |
| **ForensicTimeline** | Display lab result amendment chain | Lab Tech, Doctor, Compliance |
| **DataExportTool** | Export all lab results with amendment audit trail | Compliance, Lab Manager |

---

### 1.3 Appointment Workflow Integration

**Workflow States & Amendment Opportunities:**

```
SCHEDULED (Booked)
    ↓ Patient/Reception confirms attendance
CONFIRMED (Patient acknowledged)
    ↓ Day before: Automated reminder sent
REMINDER_SENT
    ↓ Patient arrives
IN_PROGRESS (Doctor-patient session)
    ↓ Doctor can RESCHEDULE (amendment-like: time/date change)
    ↓ Doctor can CANCEL (creates immutable record)
COMPLETED (Session finished)
    ↓ Doctor notes consultation outcomes
NOTES_ADDED
    ↓ Can REQUEST AMENDMENT if incorrect time/date recorded
AMENDED (Metadata corrected, history preserved)
```

**Amendment Use Cases:**
- **Reschedule (Resource Optimization):** Patient calls to reschedule → Record shows original + new time
- **No-Show Tracking:** Patient misses appointment → Mark with amendment (flags for follow-up)
- **Time Recording Correction:** Doctor records wrong appointment start time → Lab can detect resource gaps
- **Cancellation Reason Audit:** Doctor cancels appointment → Reason tracked (emergency, duplicate, etc.)

**Audit Components Integration:**
| Component | When Used | User Role |
|-----------|-----------|-----------|
| **AmendmentModal** | Doctor clicks "Reschedule" or "Note Correction" | Doctor / Receptionist |
| **ForensicTimeline** | Show appointment history (original schedule → reschedule → completion) | Doctor, Compliance, Resource Mgmt |
| **useAuditQuery** (filtered queries) | Query by date range to detect scheduling anomalies | Operations Manager |
| **DataExportTool** | Export appointment audit for capacity planning | Operations, Compliance |

---

### 1.4 Patient Invoice Workflow Integration

**Workflow States & Amendment Opportunities:**

```
DRAFT (Services rendered, bill not generated)
    ↓ Billing staff generates invoice
GENERATED (Line items created from prescribed services)
    ↓ Billing reviews for accuracy
REVIEW_PENDING
    ↓ Billing enters discounts (insurance, hospital waiver)
DISCOUNTS_APPLIED
    ↓ Patient makes payment
PAYMENT_RECEIVED
    ↓ Accounting reconciles with bank
RECONCILED
    ↓ Insurance claim filed
CLAIM_FILED
    ↓ Weeks later: Insurance denial received
CLAIM_ISSUE_DETECTED
    ↓ Billing staff can AMEND (e.g., reverse charge, apply credit)
AMENDED (Immutable credit note created)
    ↓ Patient refund or account credit
RESOLVED
```

**Amendment Use Cases:**
- **Duplicate Charge:** Two invoices generated for same service → Reverse one (keeps audit)
- **Insurance Rejection:** Claim denied for wrong CPT code → Correct code, re-file
- **Discount Error:** Applied 10% instead of 20% → Add correction adjustment (immutable record)
- **Service Cancellation:** Patient cancels elective procedure → Reverse and document reason
- **Payment Reversal:** Credit card chargeback → Log amendment with dispute details

**Audit Components Integration:**
| Component | When Used | User Role |
|-----------|-----------|-----------|
| **AmendmentModal** | Billing "Apply Credit" or "Correction" button | Billing Officer / Accountant |
| **useInvoiceAuditTrail** (derived from useForensicQueries) | Full financial history including corrections | Finance Manager, Auditor, Compliance |
| **ForensicTimeline** | Display invoice amendment chain (immutable for audit) | Accounting, Compliance |
| **DataExportTool** | Export invoices with all amendments (tax/audit prep) | Finance Director, External Auditors |
| **AuditLogViewer** | Monitor all financial transactions for anomalies | CFO, Compliance Officer |

---

## 2. Component Placement Strategy by Workflow

### 2.1 Prescription Workflow Pages

#### Page 1: `src/pages/pharmacy/PrescriptionDetail.tsx` (NEW or ENHANCED)
**Purpose:** Show single prescription with full patient context and edit/audit features

**Component Placement:**
```
┌─ Header Section ────────────────────────────────────────┐
│ Patient Name | MRN | Status Badge                        │
│ [Edit Dosage Button] [View Audit Trail Button]           │
└─────────────────────────────────────────────────────────┘

┌─ Prescription Display Card ─────────────────────────────┐
│ Medication 1: Amoxicillin                                │
│   - Dosage (current): 500mg TID × 7 days                 │
│   - Quantity: 21 tablets                                  │
│   - Prescribed by: Dr. Smith                              │
│   - Date: 2026-03-12                                      │
│                                                            │
│ [Amendment Status Badge] if amendments exist              │
└─────────────────────────────────────────────────────────┘

┌─ AmendmentModal (Conditional) ──────────────────────────┐
│ [Trigger: "Edit Dosage" button]                           │
│ Modal opens:                                              │
│  - Medication selector (if multi-item Rx)                │
│  - Current dosage (read-only): 500mg                      │
│  - New dosage (required input)                            │
│  - Change reason (dropdown)                               │
│  - Clinical justification (textarea)                      │
│  [Submit Amendment] [Cancel]                              │
└─────────────────────────────────────────────────────────┘

┌─ ForensicTimeline (Conditional) ────────────────────────┐
│ [Trigger: "View Audit Trail" button]                      │
│ Table showing:                                            │
│ Seq | Date/Time | Action | Role | Changes | Reason       │
│  1  | 3/12 9am  | CREATE | Dr.S | - | Patient request    │
│  2  | 3/12 10am | AMEND  | Dr.S | 500→250mg | Interaction│
│  3  | 3/12 11am |APPROVE |Ph.J  | - | Verified          │
│ [Expandable rows] [CSV Export]                            │
└─────────────────────────────────────────────────────────┘
```

**Visibility Rules (Role-Based):**
- **Doctor:** Can see own prescriptions (prescribed_by = current_user_id), can edit dosage, can see own amendments only (showOwnOnly=true)
- **Pharmacist:** Can see all prescriptions for review, can see all amendments, no edit ability
- **Nurse:** Can see prescriptions for dispensing, read-only view
- **Admin/Compliance:** Can see all, full amendment details

**Props Configuration:**
```typescript
interface PrescriptionDetailPageProps {
  prescriptionId: string;
}

// AmendmentModal props
<AmendmentModal
  isOpen={amendmentModalOpen}
  onClose={() => setAmendmentModalOpen(false)}
  prescriptionId={prescriptionId}
  items={prescription.items}
  patientName={`${prescription.patient?.first_name} ${prescription.patient?.last_name}`}
  onAmendmentSuccess={() => {
    // Refresh prescription & close modal
    refetchPrescription();
    setAmendmentModalOpen(false);
  }}
/>

// ForensicTimeline props
<ForensicTimeline
  prescriptionId={prescriptionId}
  showOwnOnly={profile?.primary_role === 'doctor'}
/>
```

---

#### Page 2: `src/pages/pharmacy/PharmacistDashboard.tsx` (ENHANCED)
**Purpose:** Dashboard for pharmacists with real-time alerts and queue management

**Component Placement:**
```
┌─ Pharmacist Dashboard Header ───────────────────────────┐
│ Welcome, Pharmacist John                                 │
│ [Refresh] [Settings]                                     │
└─────────────────────────────────────────────────────────┘

┌─ Real-Time Amendment Alerts (useAmendmentAlert) ────────┐
│ ⚠️  Dr. Smith amended Rx #3421 (500→250mg)               │
│     Reason: Drug interaction detected                     │
│     Patient: Jane Doe | MRN: 123456                       │
│     [Review] [Mark as Reviewed] [Dismiss]                 │
│                                                            │
│ ℹ️  Dr. Williams amended Rx #3398 (qty 30→60)            │
│     Reason: Duration extended (infection persisting)      │
│     Patient: John Smith | MRN: 789012                     │
│     [Review] [Mark as Reviewed] [Dismiss]                 │
│                                                            │
│ [2 new amendments] [View All]                             │
└─────────────────────────────────────────────────────────┘

┌─ Pending Prescriptions Queue ──────────────────────────┐
│ Rx#3420 | Amoxicillin | PENDING (1 amend) | [Review]     │
│ Rx#3419 | Metformin | PENDING | [Approve] [Reject]       │
│ Rx#3418 | Lisinopril | APPROVED | [View Changes]         │
│                                                            │
│ [View Full Queue] [Filter by Status/Amendments]           │
└─────────────────────────────────────────────────────────┘

┌─ Statistics Card ──────────────────────────────────────┐
│ Prescriptions Today: 42 | Amendments: 3 | Pending: 8      │
└─────────────────────────────────────────────────────────┘
```

**Hook Usage:**
```typescript
const { alerts, acknowledgeAlert, dismissAlert } = useAmendmentAlert({
  enabled: profile?.primary_role === 'pharmacist',
  showToasts: true,
  messageFormatter: (alert) => 
    `Dr. ${alert.doctor_name} amended Rx #${alert.prescription_id.substring(0,4)} ` +
    `(${alert.dosage_before}→${alert.dosage_after}). Reason: ${alert.change_reason}`
});

// Subscribe to updates
const { data: pendingRx } = usePrescriptions({
  status: 'pending',
  hospital_id: profile?.hospital_id,
});
```

---

#### Page 3: `src/pages/pharmacy/ClinicalPharmacyPage.tsx` (ENHANCED)
**Purpose:** Clinical pharmacist DUR (Drug Utilization Review) with amendments integration

**Component Placement:**
```
┌─ Clinical Pharmacy: Drug Utilization Review ────────────┐

┌─ Patient Search ────────────────────────────────────────┐
│ Search patient: [Jane Doe                    ]            │
│ MRN: 123456 | Age: 45 | Allergies: PCN                   │
└─────────────────────────────────────────────────────────┘

┌─ Active Medications + Amendment History ────────────────┐
│ Amoxicillin 500mg TID × 7 days                            │
│   - Prescribed: 2026-03-12 by Dr. Smith                   │
│   - Amended: 2026-03-12 (500mg → 250mg) ⚠️ [See Details] │
│   - Reason: Interaction with current Metformin           │
│   - Pharmacist: John Johnson | Timestamp: 2026-03-12 10am │
│   - Status: APPROVED                                      │
│   [View Amendment Timeline]                               │
│                                                            │
│ Metformin 500mg BID × ongoing                             │
│   - Prescribed: 2024-06-15 by Dr. Williams                │
│   - No amendments                                          │
│   - Status: APPROVED                                      │
└─────────────────────────────────────────────────────────┘

┌─ Drug Interaction Check Results ────────────────────────┐
│ ✅ Amoxicillin + Metformin = No major interaction         │
│ ⚠️  Amoxicillin may reduce oral contraceptive efficacy    │
│    [Patient advised?] [Document in notes]                │
└─────────────────────────────────────────────────────────┘

┌─ Audit Trail for All Amendments ───────────────────────┐
│ [Expand to see ForensicTimeline]                          │
└─────────────────────────────────────────────────────────┘
```

---

### 2.2 Lab Order Workflow Pages

#### Page 4: `src/pages/laboratory/LaboratoryPage.tsx` (ENHANCED)
**Purpose:** Lab management with order tracking and result amendments

**Component Placement:**
```
┌─ Laboratory Dashboard ──────────────────────────────────┐

┌─ Lab Queue Tabs ────────────────────────────────────────┐
│ [SAMPLE_RECEIVED] [PROCESSING] [RESULT_ENTERED]           │
│ [VERIFICATION_PENDING] [REPORTED] [CRITICAL_ALERTS]       │
└─────────────────────────────────────────────────────────┘

┌─ SAMPLE_RECEIVED Tab ───────────────────────────────────┐
│ Order #2340 | CBC | Patient: John D. | Collected: 3/12    │
│ [Start Processing]                                        │
│                                                            │
│ Order #2339 | Chem Panel | Patient: Sarah... | [Process] │
└─────────────────────────────────────────────────────────┘

┌─ RESULT_ENTERED Tab ────────────────────────────────────┐
│ Order #2335 | Chem Panel | 9:15 AM | Tech: Lisa           │
│   - Glucose: 125 mg/dL ✓                                  │
│   - BUN: 18 mg/dL ✓                                       │
│   - Creatinine: 1.2 mg/dL ✓                               │
│ [Edit Result] [Verify & Lock] [View Amendment History]    │
│                                                            │
│ Order #2334 | CBC | 8:45 AM | Tech: Mike                  │
│   - WBC: 7.2 K/uL ✓                                       │
│   - RBC: 4.8 M/uL (amended ⚠️) [See Details]              │
│   - Hgb: 14.5 g/dL ✓                                      │
│ [View Amendment Timeline] [Verify & Lock]                 │
└─────────────────────────────────────────────────────────┘

┌─ VERIFICATION_PENDING Tab ──────────────────────────────┐
│ Order #2333 | Thyroid Panel | Awaiting supervisor review  │
│   - Entered by: Tech Johnson | Timestamp: 2026-03-12 2pm  │
│   - [Has 1 amendment] [View Details]                      │
│ [Approve] [Request Correction] [View Amendment Timeline]  │
└─────────────────────────────────────────────────────────┘

┌─ CRITICAL_ALERTS Tab ──────────────────────────────────┐
│ 🚨 Order #2331 | Glucose: 45 mg/dL (Hypoglycemic!)        │
│    Patient: Martha K. | Doctor: Dr. Chen | [Notify]       │
│    Entered by: Tech Lisa | Amended: No                    │
│    [View Full Result] [View Patient Record]               │
│                                                            │
│ ⚠️  Order #2330 | Potassium: 6.8 mEq/L (Hyperkalemia)      │
│    Patient: Robert M. | Doctor: Dr. Patel | [Notifying...] │
│    Entered by: Tech Mike | Amended: Yes [See Details]     │
└─────────────────────────────────────────────────────────┘

┌─ Statistics Card ──────────────────────────────────────┐
│ Today: 34 orders | Processed: 28 | Critical: 2            │
│ Amendments: 5 (14.7%)                                     │
└─────────────────────────────────────────────────────────┘
```

**Component Integration:**

For **Result Correction Modals** (similar to AmendmentModal):

```typescript
interface LabResultDetailProps {
  labOrderId: string;
}

export function LabResultDetail({ labOrderId }: LabResultDetailProps) {
  const { data: labResult } = useLabOrders(labOrderId);
  const { profile } = useAuth();
  const [amendmentModalOpen, setAmendmentModalOpen] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  return (
    <>
      {/* Result Display */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3>Test Results for {labResult?.patient_name}</h3>
            {profile?.primary_role === 'lab_tech' && 
              labResult?.status === 'result_entered' && (
              <Button 
                variant="secondary"
                onClick={() => setAmendmentModalOpen(true)}
              >
                Correct Result
              </Button>
            )}
            {(profile?.primary_role === 'lab_supervisor' || 
              profile?.primary_role === 'doctor') && (
              <Button 
                variant="outline"
                onClick={() => setShowTimeline(!showTimeline)}
              >
                View Amendment History
              </Button>
            )}
          </div>
        </CardHeader>
        {/* ... result display ... */}
      </Card>

      {/* Lab-Specific Amendment Modal */}
      <LabResultAmendmentModal
        isOpen={amendmentModalOpen}
        onClose={() => setAmendmentModalOpen(false)}
        labOrderId={labOrderId}
        labResult={labResult}
        onSuccess={() => {
          // Refresh and close
          refetchLabResult();
          setAmendmentModalOpen(false);
        }}
      />

      {/* Amendment Timeline */}
      {showTimeline && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Result Amendment History</CardTitle>
          </CardHeader>
          <CardContent>
            <ForensicTimeline
              prescriptionId={labOrderId}  
              // Note: ForensicTimeline can be reused for any entity
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
```

---

### 2.3 Appointment Workflow Pages

#### Page 5: `src/pages/appointments/AppointmentsPage.tsx` (ENHANCED)
**Purpose:** Appointment calendar with rescheduling and audit trail

**Component Placement:**
```
┌─ Appointments Dashboard ────────────────────────────────┐

┌─ Calendar View (Week or Month) ──────────────────────┐
│ Mar 12, 2026 (Wednesday)                               │
│ 9:00 AM  - Dr. Smith + Jane Doe (Follow-up)            │
│          Status: COMPLETED | [View Details] [Edit]     │
│                                                         │
│ 10:00 AM - Dr. Williams + John Smith (New Patient)     │
│          Status: IN_PROGRESS | [View Details]          │
│                                                         │
│ 2:00 PM  - Dr. Patel + Sarah J. (Consultation)         │
│          Status: SCHEDULED | [Confirm] [Reschedule]    │
│                                                         │
│ 3:30 PM  - Dr. Chen + Robert M. (Check-up)             │
│          Status: CANCELLED (Rescheduled to 3/13)        │
│          Reason: Patient requested               │
│          [View Reschedule History]                     │
└─────────────────────────────────────────────────────────┘

┌─ Appointment Detail View (Click on appointment) ───────┐
│ Jane Doe | DOB: 1980-05-15 | MRN: 789456                │
│ Doctor: Dr. Smith | Specialization: Internal Medicine  │
│ Original Scheduled: 2026-03-12 09:00 AM                 │
│ Actual Start: 2026-03-12 09:05 AM                       │
│ Duration: 45 minutes                                    │
│ Status: COMPLETED                                       │
│ Notes: Follow-up for diabetes management                │
│                                                         │
│ [Reschedule] [Cancel] [View Reschedule Timeline]        │
│                                                         │
│ └─ Reschedule Timeline (if applicable)                  │
│    Original: 2026-03-12 09:00 AM                        │
│      Reason: Patient request                            │
│      Action: Rescheduled to 2026-03-13 02:00 PM         │
│      By: Receptionist Lisa                              │
│      Time: 2026-03-11 03:45 PM                          │
│      [Show in ForensicTimeline]                         │
└─────────────────────────────────────────────────────────┘

┌─ Reschedule Modal ──────────────────────────────────────┐
│ [Trigger: Reschedule button]                             │
│ Current: 2026-03-12 09:00 AM (Dr. Smith)                │
│ New Date: [Date Picker]                                  │
│ New Time: [Time Picker]                                  │
│ Reason for reschedule:                                   │
│  ○ Patient request                                       │
│  ○ Doctor conflict                                       │
│  ○ Room unavailable                                      │
│  ○ Other: ___________                                    │
│ Additional notes: [text field]                           │
│ [Submit Reschedule] [Cancel]                             │
│                                                          │
│ ⚠️  Warning: Creates immutable audit record              │
└─────────────────────────────────────────────────────────┘

┌─ Full Appointment Timeline ─────────────────────────────┐
│ [Trigger: View Reschedule Timeline]                      │
│ Seq | Date/Time | Action | User | Changes | Notes        │
│ 1   |3/10 2pm  | CREATE | Recep.L |Scheduled| Request     │
│ 2   |3/11 3:45pm| RESCHEDULE|Recep.L|3/12→3/13|Patient call│
│ 3   |3/12 9am  | CONFIRM | Dr.Smith | - | Session start  │
│ 4   |3/12 9:45am| COMPLETE| Dr.Smith | - | Finished      │
│                                                           │
│ [CSV Export] [PDF Report]                                │
└─────────────────────────────────────────────────────────┘
```

**Hook Usage for Appointment Reschedule:**
```typescript
interface AppointmentDetailProps {
  appointmentId: string;
}

export function AppointmentDetail({ appointmentId }: AppointmentDetailProps) {
  const { data: appointment } = useAppointments(appointmentId);
  const { profile } = useAuth();
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const { refreshAppointmentChain } = useRefreshAmendmentChain();

  const handleReschedule = async (newDateTime: Date, reason: string) => {
    // Call RPC: reschedule_appointment()
    // Creates amendment record linking old → new appointment
    await supabase.rpc('reschedule_appointment', {
      p_appointment_id: appointmentId,
      p_new_scheduled_time: newDateTime.toISOString(),
      p_reschedule_reason: reason,
    });
    
    // Refresh timeline
    refreshAppointmentChain();
    setRescheduleModalOpen(false);
  };

  return (
    <>
      {/* Appointment display card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <h3>{appointment?.patient_name} - {appointment?.doctor_name}</h3>
            {canEdit && (
              <>
                <Button onClick={() => setRescheduleModalOpen(true)}>
                  Reschedule
                </Button>
                <Button onClick={() => setShowTimeline(!showTimeline)}>
                  View Timeline
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        {/* ... appointment details ... */}
      </Card>

      <RescheduleModal
        isOpen={rescheduleModalOpen}
        onClose={() => setRescheduleModalOpen(false)}
        currentTime={appointment?.scheduled_time}
        onSubmit={handleReschedule}
      />

      {showTimeline && (
        <ForensicTimeline
          prescriptionId={appointmentId}  // Reuse component
          showOwnOnly={false}
        />
      )}
    </>
  );
}
```

---

### 2.4 Invoice Workflow Pages

#### Page 6: `src/pages/billing/BillingPage.tsx` (ENHANCED)
**Purpose:** Invoice management with amendments and audit trail

**Component Placement:**
```
┌─ Billing Dashboard ─────────────────────────────────────┐

┌─ Invoice Search & Filters ──────────────────────────────┐
│ Search: [Invoice #121344        ] [Search]               │
│ Date Range: [03/01 - 03/13] | Status: [All ▼]           │
│ Amount: [$0 - $5000] | [Apply Filters]                   │
└─────────────────────────────────────────────────────────┘

┌─ Invoice List (with amendments) ────────────────────────┐
│ Inv#121344 | Patient: Jane Doe | $1,250.00 | RECONCILED  │
│   Services: Consultation + Lab (with 2 amendments ⚠️)     │
│   [View Detail] [View Amendments] [Print]                │
│                                                          │
│ Inv#121343 | Patient: John Smith | $850.50 | PAID        │
│   Services: Surgery follow-up (no amendments)            │
│   [View Detail] [Print]                                  │
│                                                          │
│ Inv#121342 | Patient: Sarah K. | $2,100.00 | DRAFT       │
│   [Edit] [Finalize] [Delete]                             │
│                                                          │
│ Inv#121341 | Patient: Robert M. | -$150.00 | AMENDED     │
│   Original: $3,200.00 | Correction applied (insurance)    │
│   [View Detail] [View Amendment Chain]                   │
└─────────────────────────────────────────────────────────┘

┌─ Total Statistics ──────────────────────────────────────┐
│ Total Revenue (Today): $12,450.50 | Amended: $450.00     │
│ Pending: $3,200 | Paid: $9,250.50                        │
└─────────────────────────────────────────────────────────┘
```

#### Page 7: `src/pages/billing/InvoiceDetail.tsx` (NEW or ENHANCED)
**Purpose:** Single invoice detail with full amendment audit trail

**Component Placement:**
```
┌─ Invoice Header ─────────────────────────────────────────┐
│ INVOICE #121344                                           │
│ Date: 2026-03-12 | Due: 2026-03-27                       │
│ Patient: Jane Doe | MRN: 123456                          │
│ Status: RECONCILED ✓                                      │
│ Last Amendment: 2026-03-13 10:15 AM (Remove duplicate)   │
│ [Edit Invoice] [Apply Credit] [View Amendments]          │
│                                                           │
│ [Timeline showing: Generated → Discounted → Amended]     │
└─────────────────────────────────────────────────────────┘

┌─ Invoice Line Items ──────────────────────────────────────┐
│ ┌─ Service: Consultation (Dr. Smith) ──────────────────┐ │
│ │ CPT Code: 99213 | Rate: $250.00 | Qty: 1            │ │
│ │ Subtotal: $250.00                                    │ │
│ │ No amendments                                         │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                           │
│ ┌─ Service: Lab Test (CBC) ────────────────────────────┐ │
│ │ CPT Code: 85025 | Rate: $125.00 | Qty: 1            │ │
│ │ Original: $125.00 → Amended to $100.00 (discount)   │ │
│ │ Amendment: 2026-03-12 02:30 PM by Billing Officer   │ │
│ │ Reason: Insurance tier 2 (verified)                 │ │
│ │ [View Amendment Details]                             │ │
│ │ Final: $100.00                                        │ │
│ └──────────────────────────────────────────────────────┘ │
│                                                           │
│ ┌─ Service: Pharmacy (Amoxicillin) ────────────────────┐ │
│ │ NPD Code: 00135-0500 | Rate: $35.00 | Qty: 1        │ │
│ │ Original: $35.00                                     │ │
│ │ Amended: $0.00 (Removed - duplicate charge)          │ │
│ │ Amendment: 2026-03-13 10:15 AM by Finance Manager   │ │
│ │ Reason: Duplicate line item removed                  │ │
│ │ [View Full Amendment History]                        │ │
│ │ Credit Note Generated: #CN-121344-001                │ │
│ │ Final: $0.00 (Reversed)                              │ │
│ └──────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

┌─ Invoice Totals ──────────────────────────────────────────┐
│ Subtotal:                   (Original) $410.00  → $350.00 │
│ Discount (Insurance):       -$41.00    → -$35.00          │
│ Tax (8%):                   $29.60     → $25.20           │
│ ────────────────────────────────────────────────          │
│ TOTAL AMOUNT DUE:           $398.60    → $340.20          │
│                                                           │
│ Note: [2 amendments] with $58.40 net reduction            │
│ [View Full Amendment Audit Trail] [Generate Credit Note] │
└─────────────────────────────────────────────────────────┘

┌─ Amendment Audit Trail (useInvoiceAuditTrail) ───────────┐
│ [Expand to show ForensicTimeline]                         │
│ Seq | Date/Time | Action | User | Change | Reason        │
│ 1   |3/12 2pm  | CREATE | Billn.J | Generated | Services  │
│ 2   |3/12 2:15pm| DISCOUNT| Billn.J | $41→$35 | Verified  │
│ 3   |3/12 2:30pm| AMEND | Billn.J | Lab $125→$100| Disc  │
│ 4   |3/13 10:15am| REVERSAL| FinMgr | Pharm $35→$0| Dup  │
│ 5   |3/13 10:20am| CREDIT_NOTE| FinMgr | -$58.40 | Issued │
│                                                           │
│ [CSV Export for Audit] [PDF Report]                      │
└─────────────────────────────────────────────────────────┘
```

**Amendment Modal for Invoices:**

```typescript
interface InvoiceAmendmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceId: string;
  invoiceTotal: number;
  onSuccess?: () => void;
}

export function InvoiceAmendmentModal({
  isOpen,
  onClose,
  invoiceId,
  invoiceTotal,
  onSuccess,
}: InvoiceAmendmentModalProps) {
  const [formData, setFormData] = useState({
    amendmentType: '', // 'DISCOUNT', 'CREDIT', 'REVERSAL'
    amount: 0,
    reason: '',
    details: '', // Detailed justification
  });

  const handleSubmit = async () => {
    // Call RPC: amend_invoice_amount()
    await supabase.rpc('amend_invoice_amount', {
      p_invoice_id: invoiceId,
      p_amendment_type: formData.amendmentType,
      p_amount: formData.amount,
      p_reason: formData.reason,
      p_details: formData.details,
    });
    
    onSuccess?.();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply Amendment to Invoice #{invoiceId}</DialogTitle>
          <DialogDescription>
            Current Total: ${invoiceTotal.toFixed(2)}
            Creates immutable audit record
          </DialogDescription>
        </DialogHeader>

        {/* Amendment type selector */}
        <div className="space-y-4">
          <div>
            <Label>Amendment Type</Label>
            <Select 
              value={formData.amendmentType} 
              onValueChange={(v) => setFormData({...formData, amendmentType: v})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DISCOUNT">Apply Discount</SelectItem>
                <SelectItem value="CREDIT">Issue Credit</SelectItem>
                <SelectItem value="REVERSAL">Reverse Charge</SelectItem>
                <SelectItem value="ADJUSTMENT">Adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Amount</Label>
            <Input 
              type="number" 
              placeholder="0.00"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: parseFloat(e.target.value)})}
            />
            <p className="text-sm text-gray-500 mt-1">
              New Total: ${(invoiceTotal - formData.amount).toFixed(2)}
            </p>
          </div>

          <div>
            <Label>Reason</Label>
            <Select 
              value={formData.reason}
              onValueChange={(v) => setFormData({...formData, reason: v})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DUPLICATE">Duplicate Charge</SelectItem>
                <SelectItem value="INSURANCE_CORRECTION">Insurance Correction</SelectItem>
                <SelectItem value="CLAIM_DENIAL">Claim Denial</SelectItem>
                <SelectItem value="PATIENT_REQUEST">Patient Request</SelectItem>
                <SelectItem value="BILLING_ERROR">Billing Error</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Detailed Justification (for audit)</Label>
            <Textarea 
              placeholder="Explain the business reason for this amendment..."
              value={formData.details}
              onChange={(e) => setFormData({...formData, details: e.target.value})}
              rows={4}
            />
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Audit Trail</AlertTitle>
            <AlertDescription>
              This amendment will be recorded in the immutable forensic audit trail. 
              All amendments can be reviewed for compliance audits.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Apply Amendment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 3. Integration Checklist

### 3.1 Pages to Create/Modify (Estimated 10-12 Total)

**Pharmacy Workflow (3 pages):**
- [ ] `src/pages/pharmacy/PrescriptionDetail.tsx` — **NEW** or enhance existing
  - [ ] Import AmendmentModal
  - [ ] Import ForensicTimeline
  - [ ] Add "Edit Dosage" button (doctor only)
  - [ ] Add "View Audit Trail" button
  - [ ] Implement role-based visibility
  - [ ] Add amendment status indicators

- [ ] `src/pages/pharmacy/PharmacistDashboard.tsx` — **ENHANCE**
  - [ ] Import useAmendmentAlert
  - [ ] Add real-time alert section at top
  - [ ] Implement alert acknowledgment logic
  - [ ] Show amendment count per prescription in queue

- [ ] `src/pages/pharmacy/ClinicalPharmacyPage.tsx` — **ENHANCE**
  - [ ] Add amendment history to medication list
  - [ ] Link to ForensicTimeline for each medication

**Laboratory Workflow (2 pages):**
- [ ] `src/pages/laboratory/LaboratoryPage.tsx` — **ENHANCE**
  - [ ] Add "RESULT_ENTERED" tab with amendment indicators
  - [ ] Import LabResultAmendmentModal (NEW - derived from AmendmentModal)
  - [ ] Add "Correct Result" button for lab tech
  - [ ] Import useLabResultAmendmentHistory hook

- [ ] `src/pages/laboratory/LabResultDetail.tsx` — **NEW**
  - [ ] Create result detail page with amendment modal
  - [ ] Import ForensicTimeline
  - [ ] Show critical value flags + amendment status

**Appointments Workflow (2 pages):**
- [ ] `src/pages/appointments/AppointmentsPage.tsx` — **ENHANCE**
  - [ ] Add reschedule modal similar to AmendmentModal
  - [ ] Show reschedule timeline for each appointment
  - [ ] Add amendment count to appointment list items

- [ ] `src/pages/appointments/AppointmentDetail.tsx` — **NEW** or enhance
  - [ ] Import RescheduleModal
  - [ ] Import ForensicTimeline (reuse for reschedule history)
  - [ ] Show full reschedule chain

**Billing Workflow (3-4 pages):**
- [ ] `src/pages/billing/BillingPage.tsx` — **ENHANCE**
  - [ ] Add amendment count to invoice list
  - [ ] Show "AMENDED" status badge
  - [ ] Filter by amendments

- [ ] `src/pages/billing/InvoiceDetail.tsx` — **NEW** or enhance
  - [ ] Import InvoiceAmendmentModal (NEW)
  - [ ] Show amendment history per line item
  - [ ] Import useInvoiceAuditTrail
  - [ ] Show credit notes linked to amendments

- [ ] `src/pages/billing/FinancialReports.tsx` — **ENHANCE** (if exists)
  - [ ] Add amendment summary report
  - [ ] Show total amendments by type/reason

**Admin/Compliance (1-2 pages):**
- [ ] `src/pages/admin/ComplianceAuditDashboard.tsx` — **NEW** or enhance
  - [ ] Central view of all amendments across system
  - [ ] Hospital-wide AuditLogViewer
  - [ ] DataExportTool for audit export
  - [ ] Query filters by entity type (prescription, lab, invoice, appointment)

---

### 3.2 Import Statements by Page

#### Pharmacy Pages

**PrescriptionDetail.tsx:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { usePrescription } from '@/hooks/usePrescriptions';
import { usePrescriptionAmendmentChain } from '@/hooks/useForensicQueries';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { AmendmentModal } from '@/components/audit/AmendmentModal';
import { ForensicTimeline } from '@/components/audit/ForensicTimeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit, History } from 'lucide-react';
import { useState } from 'react';
```

**PharmacistDashboard.tsx:**
```typescript
import { useAmendmentAlert } from '@/hooks/useAmendmentAlert';
import { usePrescriptions } from '@/hooks/usePrescriptions';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
```

**ClinicalPharmacyPage.tsx:**
```typescript
import { usePrescriptionAmendmentChain } from '@/hooks/useForensicQueries';
import { ForensicTimeline } from '@/components/audit/ForensicTimeline';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
```

#### Laboratory Pages

**LaboratoryPage.tsx:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { LabResultAmendmentModal } from '@/components/audit/LabResultAmendmentModal'; // NEW
import { ForensicTimeline } from '@/components/audit/ForensicTimeline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
```

**LabResultDetail.tsx (NEW):**
```typescript
import { useLabOrders } from '@/hooks/useLabOrders';
import { useLabResultAmendmentHistory } from '@/hooks/useForensicQueries';
import { ForensicTimeline } from '@/components/audit/ForensicTimeline';
import { LabResultAmendmentModal } from '@/components/audit/LabResultAmendmentModal';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
```

#### Appointments Pages

**AppointmentsPage.tsx:**
```typescript
import { useAppointments } from '@/hooks/useAppointments';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { RescheduleModal } from '@/components/audit/RescheduleModal'; // NEW (derived from AmendmentModal)
import { ForensicTimeline } from '@/components/audit/ForensicTimeline';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Edit, History } from 'lucide-react';
```

**AppointmentDetail.tsx (NEW):**
```typescript
import { useAppointments } from '@/hooks/useAppointments';
import { useAuth } from '@/contexts/AuthContext';
import { RescheduleModal } from '@/components/audit/RescheduleModal';
import { ForensicTimeline } from '@/components/audit/ForensicTimeline';
import { useRefreshAmendmentChain } from '@/hooks/useForensicQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
```

#### Billing Pages

**BillingPage.tsx:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInvoiceAuditTrail } from '@/hooks/useForensicQueries';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
```

**InvoiceDetail.tsx (NEW or ENHANCE):**
```typescript
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useInvoiceAuditTrail } from '@/hooks/useForensicQueries';
import { InvoiceAmendmentModal } from '@/components/audit/InvoiceAmendmentModal'; // NEW
import { ForensicTimeline } from '@/components/audit/ForensicTimeline';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
```

---

### 3.3 Hook Usage Examples per Workflow

#### Prescription Amendment Chain Refresh

```typescript
// In PrescriptionDetail.tsx or any component handling amendments
import { useRefreshAmendmentChain } from '@/hooks/useForensicQueries';
import { usePrescriptionAmendmentChain } from '@/hooks/useForensicQueries';

export function PrescriptionDetail({ prescriptionId }: Props) {
  const { refreshPrescriptionChain } = useRefreshAmendmentChain();
  const { data: amendmentChain, refetch } = usePrescriptionAmendmentChain(prescriptionId);

  // When amendment succeeds:
  const handleAmendmentSuccess = () => {
    // Method 1: Direct refetch
    refetch();
    
    // Method 2: Invalidate all amendment queries
    refreshPrescriptionChain();
  };

  return (
    <AmendmentModal
      prescriptionId={prescriptionId}
      onAmendmentSuccess={handleAmendmentSuccess}
    />
  );
}
```

#### Real-Time Alert Subscription (Pharmacist)

```typescript
// In PharmacistDashboard.tsx
import { useAmendmentAlert } from '@/hooks/useAmendmentAlert';
import { useAuth } from '@/contexts/AuthContext';

export function PharmacistDashboard() {
  const { profile } = useAuth();
  const { alerts, acknowledgeAlert, dismissAlert } = useAmendmentAlert({
    enabled: profile?.primary_role === 'pharmacist',
    showToasts: true,
    messageFormatter: (alert) => 
      `⚠️ Dr. ${alert.doctor_name} amended Rx #${alert.prescription_id.substring(0, 4)} (${alert.dosage_before}→${alert.dosage_after}). Reason: ${alert.change_reason}`,
    onAlertReceived: (alert) => {
      // Custom handler if needed
      console.log('New amendment alert:', alert);
    },
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">Real-Time Amendment Alerts ({alerts.length})</h2>
      
      {alerts.length === 0 ? (
        <p className="text-gray-500">No recent amendments</p>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Card key={alert.id} className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold">
                      {alert.doctor_name} amended prescription #{alert.prescription_id.substring(0, 4)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {alert.dosage_before} → {alert.dosage_after}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      Reason: {alert.change_reason}
                    </p>
                    {alert.amendment_justification && (
                      <p className="text-sm text-gray-600 mt-1">
                        Justification: {alert.amendment_justification}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="default"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      Review
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => dismissAlert(alert.id)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

#### Lab Result Amendment with Validation

```typescript
// In LabResultDetail.tsx - custom modal for lab-specific amendments
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useLabResultAmendmentHistory } from '@/hooks/useForensicQueries';
import { toast } from 'sonner';

interface LabResultAmendmentForm {
  testName: string;
  originalValue: string;
  correctedValue: string;
  correctionReason: string; // e.g., "Data entry error"
  qualityIssue?: string; // e.g., "Analyzer malfunction"
  justification: string;
}

export function LabResultAmendmentModal({
  isOpen,
  onClose,
  labOrderId,
  labResult,
  onSuccess,
}: LabResultAmendmentModalProps) {
  const { profile } = useAuth();
  const [formData, setFormData] = useState<LabResultAmendmentForm>({
    testName: labResult?.test_name || '',
    originalValue: labResult?.value || '',
    correctedValue: '',
    correctionReason: '',
    justification: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!profile?.hospital_id) return;

    setIsSubmitting(true);
    try {
      // Validate correction is medically appropriate
      const originalNumeric = parseFloat(formData.originalValue);
      const correctedNumeric = parseFloat(formData.correctedValue);
      
      if (Math.abs(originalNumeric - correctedNumeric) > 50) {
        // >50% change - require supervisor approval
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.user_metadata?.role !== 'lab_supervisor') {
          toast.error('Large corrections require supervisor approval');
          setIsSubmitting(false);
          return;
        }
      }

      // Call RPC to amend result
      const { error } = await supabase.rpc('amend_lab_result', {
        p_lab_order_id: labOrderId,
        p_original_value: formData.originalValue,
        p_corrected_value: formData.correctedValue,
        p_correction_reason: formData.correctionReason,
        p_quality_issue: formData.qualityIssue || null,
        p_justification: formData.justification,
      });

      if (error) throw error;

      toast.success('Result amendment recorded in audit trail');
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Amendment failed:', error);
      toast.error('Amendment failed - check with lab supervisor');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Correct Lab Result</DialogTitle>
          <DialogDescription>
            Creates an immutable audit record. Corrections >50% require supervisor approval.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Original value - read only */}
          <div>
            <Label>Original Value</Label>
            <Input 
              value={formData.originalValue} 
              disabled 
              className="bg-gray-100"
            />
          </div>

          {/* Corrected value */}
          <div>
            <Label>Corrected Value*</Label>
            <Input 
              value={formData.correctedValue}
              onChange={(e) => setFormData({...formData, correctedValue: e.target.value})}
              placeholder="Enter corrected value"
            />
          </div>

          {/* Reason dropdown */}
          <div>
            <Label>Reason for Correction*</Label>
            <Select 
              value={formData.correctionReason}
              onValueChange={(v) => setFormData({...formData, correctionReason: v})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DATA_ENTRY_ERROR">Data Entry Error</SelectItem>
                <SelectItem value="DECIMAL_POINT_ERROR">Decimal Point Error</SelectItem>
                <SelectItem value="UNIT_CONVERSION">Unit Conversion Error</SelectItem>
                <SelectItem value="WRONG_PATIENT">Wrong Patient Linked</SelectItem>
                <SelectItem value="ANALYZER_ERROR">Analyzer Malfunction</SelectItem>
                <SelectItem value="SAMPLE_ISSUE">Sample Quality Issue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Detailed justification */}
          <div>
            <Label>Detailed Justification*</Label>
            <Textarea 
              value={formData.justification}
              onChange={(e) => setFormData({...formData, justification: e.target.value})}
              placeholder="Explain why this correction is necessary..."
              rows={4}
            />
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Audit Record Created</AlertTitle>
            <AlertDescription>
              This correction will be permanently recorded in the forensic audit trail.
              Doctor will be notified of the change.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !formData.correctedValue || !formData.justification}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Correction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

#### Appointment Reschedule with Timeline

```typescript
// In AppointmentDetail.tsx
import { useAppointments } from '@/hooks/useAppointments';
import { useRefreshAmendmentChain } from '@/hooks/useForensicQueries';
import { supabase } from '@/integrations/supabase/client';

export function AppointmentDetail({ appointmentId }: Props) {
  const { data: appointment } = useAppointments(appointmentId);
  const { refreshPrescriptionChain } = useRefreshAmendmentChain();
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);

  const handleReschedule = async (newDateTime: Date, reason: string) => {
    try {
      // Call RPC to reschedule
      const { error } = await supabase.rpc('reschedule_appointment', {
        p_appointment_id: appointmentId,
        p_new_scheduled_time: newDateTime.toISOString(),
        p_reschedule_reason: reason,
      });

      if (error) throw error;

      // Refresh amendment chain to show new reschedule record
      refreshPrescriptionChain(); // Works for any entity tracked in amendments table
      
      toast.success('Appointment rescheduled');
      setShowRescheduleModal(false);
    } catch (error) {
      console.error('Reschedule failed:', error);
      toast.error('Failed to reschedule appointment');
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between">
            <div>
              <h3 className="font-bold">{appointment?.patient_name}</h3>
              <p className="text-sm text-gray-600">
                Scheduled: {new Date(appointment?.scheduled_time).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              {appointment?.status === 'scheduled' && (
                <Button 
                  variant="secondary"
                  onClick={() => setShowRescheduleModal(true)}
                >
                  Reschedule
                </Button>
              )}
              <Button 
                variant="outline"
                onClick={() => setShowTimeline(!showTimeline)}
              >
                View History
              </Button>
            </div>
          </div>
        </CardHeader>
        {/* ... appointment details ... */}
      </Card>

      <RescheduleModal
        isOpen={showRescheduleModal}
        onClose={() => setShowRescheduleModal(false)}
        currentTime={appointment?.scheduled_time}
        onSubmit={handleReschedule}
      />

      {showTimeline && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Appointment History</CardTitle>
            <CardDescription>Original scheduling, reschedules, and confirmations</CardDescription>
          </CardHeader>
          <CardContent>
            <ForensicTimeline
              prescriptionId={appointmentId}  // Reuse timeline component
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
```

#### Invoice Audit Trail Query

```typescript
// In InvoiceDetail.tsx
import { useInvoiceAuditTrail } from '@/hooks/useForensicQueries';
import { ForensicTimeline } from '@/components/audit/ForensicTimeline';

export function InvoiceDetail({ invoiceId }: Props) {
  const { data: invoiceAuditTrail, isLoading } = useInvoiceAuditTrail(invoiceId);

  if (isLoading) return <Skeleton />;

  return (
    <>
      {/* Invoice line items display */}
      <div className="space-y-4">
        {/* ... invoice lines ... */}
      </div>

      {/* Amendment history section */}
      {invoiceAuditTrail?.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Invoice Amendment & Payment History</CardTitle>
            <CardDescription>
              Complete audit trail of all changes to this invoice (immutable)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Display summary */}
            <div className="mb-4 p-3 bg-blue-50 rounded">
              <p className="text-sm font-semibold">
                Total Amendments: {invoiceAuditTrail.length}
              </p>
              {invoiceAuditTrail.some(r => r.action_type === 'REVERSAL') && (
                <p className="text-sm text-blue-700">
                  Credit notes issued for reversals
                </p>
              )}
            </div>

            {/* Forensic timeline */}
            <ForensicTimeline
              prescriptionId={invoiceId}
              showOwnOnly={false}
            />
          </CardContent>
        </Card>
      )}
    </>
  );
}
```

---

### 3.4 Component Prop Configurations

#### AmendmentModal - Standard Prescription Amendment

```typescript
<AmendmentModal
  isOpen={amendmentModalOpen}
  onClose={() => setAmendmentModalOpen(false)}
  prescriptionId={prescriptionId}
  items={prescription.items}
  patientName={`${prescription.patient?.first_name} ${prescription.patient?.last_name}`}
  onAmendmentSuccess={(amendmentId) => {
    console.log('Amendment created:', amendmentId);
    // Refresh prescription details
    queryClient.invalidateQueries({ 
      queryKey: ['prescription', prescriptionId] 
    });
    // Refresh timeline
    queryClient.invalidateQueries({
      queryKey: ['prescription_amendment_chain', prescriptionId]
    });
    toast.success(`Amendment recorded (ID: ${amendmentId})`);
  }}
/>
```

#### ForensicTimeline - Full History with Export

```typescript
<ForensicTimeline
  prescriptionId={prescriptionId}    // Can be any tracked entity ID
  showOwnOnly={
    profile?.primary_role === 'doctor'  // Doctors see only their amendments
      ? true 
      : false  // Pharmacists/admins see all
  }
  // Additional props (if available)
  // dateRangeFilter={{ from: new Date('2026-03-01'), to: new Date() }}
  // roleFilter={['doctor', 'pharmacist']}
/>
```

#### useAmendmentAlert - Pharmacist Real-Time Monitoring

```typescript
const { 
  alerts, 
  acknowledgeAlert, 
  dismissAlert, 
  acknowledgeAll,
  dismissAll 
} = useAmendmentAlert({
  enabled: profile?.primary_role === 'pharmacist',
  showToasts: true,
  messageFormatter: (alert) => {
    const changePercent = Math.abs(
      (parseFloat(alert.dosage_after) - parseFloat(alert.dosage_before)) / 
      parseFloat(alert.dosage_before) * 100
    ).toFixed(0);
    
    return `⚠️ ${alert.doctor_name} amended Rx #${alert.prescription_id.substring(0,4)} ` +
           `(${alert.dosage_before}→${alert.dosage_after}, ${changePercent}% change). ` +
           `Reason: ${alert.change_reason}. ` +
           `Patient: ${alert.patient_name}`;
  },
  onAlertReceived: (alert) => {
    // Custom logic - e.g., mark prescription as high-priority in queue
    if (Math.abs(parseFloat(alert.dosage_after) - parseFloat(alert.dosage_before)) / 
        parseFloat(alert.dosage_before) > 0.25) {
      // >25% change - flag for manual review
      console.log('HIGH-RISK amendment:', alert);
    }
  },
});
```

#### useInvoiceAuditTrail - Financial Compliance

```typescript
const { 
  data: invoiceAudit, 
  isLoading, 
  error 
} = useInvoiceAuditTrail(invoiceId);

// Sample output structure:
// [
//   {
//     sequence_number: 1,
//     audit_id: 'aud_12345',
//     event_time: '2026-03-12T14:30:00Z',
//     actor_email: 'billing@hospital.com',
//     actor_role: 'billing_officer',
//     action_type: 'CHARGE_CREATED',
//     amount_before: null,
//     amount_after: 398.60,
//     change_reason: 'Consultation + Lab + Pharmacy',
//   },
//   {
//     sequence_number: 2,
//     audit_id: 'aud_12346',
//     event_time: '2026-03-12T14:35:00Z',
//     actor_email: 'billing@hospital.com',
//     actor_role: 'billing_officer',
//     action_type: 'DISCOUNT_APPLIED',
//     amount_before: 398.60,
//     amount_after: 358.74, // 10% insurance discount
//     change_reason: 'Insurance tier 2 verified',
//   },
// ]
```

---

## 4. Real-Time Workflow - Amendment Flow Through System

### 4.1 Complete Amendment Flow Diagram

```
┌─ DOCTOR INITIATES ──────────────────────────────────────┐
│                                                           │
│ 1. Doctor views approved prescription                    │
│ 2. Clicks "Edit Dosage" button                           │
│ 3. Opens AmendmentModal                                  │
│    - Current: 500mg TID × 7 days                         │
│    - New: 250mg TID × 7 days                             │
│    - Reason: Drug interaction                            │
│    - Justification: Patient on Keto, reduces GFR        │
│ 4. Submits form                                          │
│                                                           │
└─────────────────────────────────────────────────────────┘
                         ↓
          Calls RPC: amend_prescription_dosage()
          (backend validation + audit trigger)
                         ↓
┌─ BACKEND PROCESSING ────────────────────────────────────┐
│                                                           │
│ 1. Supabase RPC validates:                               │
│    - Prescription exists & belongs to hospital           │
│    - Doctor has permission (prescribed_by)               │
│    - Status is 'approved'                                │
│    - Dosage change is medically plausible               │
│                                                           │
│ 2. Creates amendment_chain record:                       │
│    {                                                      │
│      id: 'amd_54321',                                    │
│      prescription_id: 'rx_12345',                        │
│      amends_audit_id: 'aud_12340', // Original CREATE    │
│      amendment_type: 'DOSAGE_CHANGE',                    │
│      old_dosage: '500mg',                                │
│      new_dosage: '250mg',                                │
│      change_reason: 'Drug interaction',                  │
│      amendment_justification: 'Patient on Keto...',      │
│      amended_by: 'doctor_uuid',                          │
│      amended_at: NOW(),                                  │
│      hospital_id: 'hospital_uuid'                        │
│    }                                                      │
│                                                           │
│ 3. Audit trigger fires:                                  │
│    INSERT INTO audit_logs (                              │
│      action_type: 'AMEND',                               │
│      entity_type: 'prescription',                        │
│      entity_id: 'rx_12345',                              │
│      details: { ... amendment data ... },                │
│      hospital_id: 'hospital_uuid'                        │
│    )                                                     │
│                                                           │
│ 4. Realtime trigger published:                           │
│    BROADCAST: amendment_alerts_{hospital_id}            │
│    {                                                      │
│      prescription_id: 'rx_12345',                        │
│      type: 'AMENDMENT_CREATED',                          │
│      doctor_name: 'Dr. Smith',                           │
│      dosage_before: '500mg',                             │
│      dosage_after: '250mg',                              │
│      change_reason: 'Drug interaction',                  │
│      risk_level: 'medium', // >20% change               │
│    }                                                      │
│                                                           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─ FRONTEND UPDATE (DOCTOR) ──────────────────────────────┐
│                                                           │
│ 1. RPC succeeds, returns amendment_id                    │
│ 2. Toast: "Amendment submitted (ID: amd_54321)"          │
│ 3. Close AmendmentModal                                  │
│ 4. usePrescriptionAmendmentChain refetch triggered       │
│    ↓ Shows new timeline entry:                           │
│    │ Sequence 3: AMEND | Dr. Smith | 500→250mg | 15:22  │
│ 5. PrescriptionDetail re-renders                         │
│    ↓ Amendment badge appears:                            │
│    │ ⚠️ [1 Amendment] [View Details]                     │
│                                                           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─ REAL-TIME PHARMACIST ALERT ────────────────────────────┐
│                                                           │
│ 1. Realtime subscription fires:                          │
│    amendment_alerts_{hospital_id}                        │
│                                                           │
│ 2. useAmendmentAlert hook receives event                 │
│                                                           │
│ 3. Risk assessment (in hook):                            │
│    - Dosage change: 500mg → 250mg (50% reduction)        │
│    - High-risk threshold: >25% → Flag for review         │
│    - Risk level: MEDIUM                                  │
│                                                           │
│ 4. Toast notification shown:                             │
│    ⚠️ "Dr. Smith amended Rx #1234 (500→250mg).           │
│         Reason: Drug interaction. Review?"               │
│                                                           │
│ 5. Alert card added to PharmacistDashboard:              │
│    ┌────────────────────────────────┐                    │
│    │ ⚠️ Dr. Smith amended Rx #1234   │                    │
│    │ 500mg → 250mg (50% change)      │                    │
│    │ Reason: Drug interaction        │                    │
│    │ Patient: Jane Doe | MRN: 123456 │                    │
│    │ [Review Prescription]           │                    │
│    │ [Mark Reviewed] [Dismiss]       │                    │
│    └────────────────────────────────┘                    │
│                                                           │
│ 6. Pharmacist clicks [Review Prescription]               │
│                                                           │
│ 7. Navigate to PrescriptionDetail                        │
│    ↓ Shows:                                               │
│    │ Current Status: APPROVED                            │
│    │ Amendment: 500→250mg (Drug interaction)             │
│    │ Timeline showing original + amendment               │
│    │ [Verify Amendment] [Request Further Review]         │
│                                                           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─ PHARMACIST VALIDATION ─────────────────────────────────┐
│                                                           │
│ Pharmacist reviews:                                      │
│ 1. Patient context:                                      │
│    - Age: 45, CKD Stage 2, on Metformin                 │
│ 2. Amendment justification:                              │
│    - "Patient on Keto, reduces GFR"                     │
│    - Clinical reasoning: Sound                           │
│ 3. Drug interaction check:                               │
│    - Amoxicillin 250mg + Metformin = No issues           │
│ 4. Dosage appropriateness:                               │
│    - 250mg TID = appropriate for CKD                     │
│                                                           │
│ Decision: ✅ Approve amendment / Amend to even lower     │
│                                                           │
│ Action: Dispense medication OR request further review    │
│                                                           │
│ Creates log entry:                                       │
│ {                                                        │
│   action: 'AMENDMENT_REVIEWED',                          │
│   amendment_id: 'amd_54321',                             │
│   reviewer: 'pharmacist_uuid',                           │
│   status: 'APPROVED',                                    │
│   notes: 'Dosage appropriate for renal function',        │
│   timestamp: NOW()                                       │
│ }                                                        │
│                                                           │
│ Pharmacist clicks [Dispense]:                            │
│ ↓ Prescription marked DISPENSED                          │
│ ↓ Immutable timeline updated:                            │
│   Seq 4: DISPENSE | Pharmacist Johnson | 15:35          │
│   "Dispensed amended dose (250mg TID)"                   │
│                                                           │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─ FORENSIC TIMELINE (PERMANENT RECORD) ──────────────────┐
│                                                           │
│ ForensicTimeline component shows complete chain:        │
│                                                           │
│ Seq │ Date/Time  │ Action   │ Role        │ Change       │
│─────┼────────────┼──────────┼─────────────┼──────────────│
│ 1   │ 3/12 14:20 │ CREATE   │ Dr. Smith   │ 500mg TID    │
│ 2   │ 3/12 14:30 │ APPROVE  │ Ph. Johnson │ ─            │
│ 3   │ 3/12 15:22 │ AMEND    │ Dr. Smith   │ 500→250mg    │
│ 4   │ 3/12 15:35 │ DISPENSE │ Ph. Johnson │ 250mg TID    │
│                                                           │
│ Additional metadata per row:                             │
│ - Amendment justification (for AMEND rows)              │
│ - Sequence number (immutable order)                      │
│ - Audit ID (links to forensic_audit_logs)                │
│ - Actor email (sanitized for PHI)                        │
│                                                           │
│ No deletion possible - complete immutable chain         │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Subscription Lifecycle

```typescript
// Hook subscription management (in useAmendmentAlert)

useEffect(() => {
  if (!enabled || !profile?.hospital_id) return;

  // Subscribe to realtime channel
  const channel = supabase.channel(`amendment_alerts_${profile.hospital_id}`);

  channel
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'prescriptions',
        filter: `hospital_id=eq.${profile.hospital_id}`,
      },
      handleAmendmentNotification // Handle payload
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('Subscribed to amendment alerts');
      }
    });

  // Cleanup on unmount
  return () => {
    supabase.removeChannel(channel);
  };
}, [enabled, profile?.hospital_id]);
```

---

## 5. Critical Integration Points - Amendment Enforcement Rules

### 5.1 Dosage Change Thresholds

```typescript
// Backend RPC validation (amend_prescription_dosage)

-- Validate dosage change is within acceptable bounds
IF ABS((new_dosage_numeric - old_dosage_numeric) / old_dosage_numeric) > 0.50 THEN
  -- >50% change - requires explicit doctor justification
  IF amendment_justification IS NULL OR LENGTH(amendment_justification) < 20 THEN
    RAISE EXCEPTION 'Large dosage changes (>50%) require detailed justification';
  END IF;
END IF;

-- >25% change triggers pharmacist alert
IF ABS((new_dosage_numeric - old_dosage_numeric) / old_dosage_numeric) > 0.25 THEN
  SET audit_risk_level = 'MEDIUM_PRIORITY';
END IF;

-- >75% reduction triggers clinical review
IF (old_dosage_numeric - new_dosage_numeric) / old_dosage_numeric > 0.75 THEN
  RAISE EXCEPTION 'Reductions >75% require clinical supervisor review';
END IF;
```

**Frontend Enforcement:**
```typescript
// In AmendmentModal - real-time validation

const validateDosageChange = (oldDosage: string, newDosage: string): ValidationResult => {
  const old = parseFloat(oldDosage);
  const new_val = parseFloat(newDosage);
  const changePercent = Math.abs((new_val - old) / old);

  return {
    isValid: changePercent <= 0.75,
    riskLevel: 
      changePercent > 0.5 ? 'HIGH' :
      changePercent > 0.25 ? 'MEDIUM' :
      'LOW',
    warning: 
      changePercent > 0.75 ? 'This reduction exceeds 75% - requires clinical review' :
      changePercent > 0.5 ? 'Large dosage change - detailed justification required' :
      changePercent > 0.25 ? 'Amendment will trigger pharmacist review' :
      '',
  };
};

// Display warning in modal
{validationResult.riskLevel !== 'LOW' && (
  <Alert variant="destructive" className={riskLevelClass}>
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>Risk Level: {validationResult.riskLevel}</AlertTitle>
    <AlertDescription>{validationResult.warning}</AlertDescription>
  </Alert>
)}
```

---

### 5.2 Drug Interaction Detection

```typescript
// Check drug interactions before allowing amendment

const checkDrugInteractions = async (
  medicationId: string,
  newDosage: string,
  patientId: string
): Promise<InteractionResult> => {
  // 1. Get patient's active medications
  const { data: activeMeds } = await supabase
    .from('prescriptions')
    .select('medication_id, dosage, medication:medications(*)')
    .eq('patient_id', patientId)
    .eq('status', 'approved');

  // 2. Check interactions against new dosage
  const interactions = await checkInteractionDatabase(
    medicationId,
    newDosage,
    activeMeds
  );

  // 3. If critical interaction: Flag in amendment
  if (interactions.some(i => i.severity === 'CRITICAL')) {
    // Require additional clinical note
    return {
      hasInteraction: true,
      severity: 'CRITICAL',
      requiresClinicalReview: true,
    };
  }

  return { hasInteraction: false };
};
```

---

### 5.3 Cost Amendment Thresholds

```typescript
// Invoice amendment cost validation

IF amendment_type = 'DISCOUNT' AND amount > invoice_total * 0.25 THEN
  -- >25% discount requires supervisor approval
  RAISE EXCEPTION 'Discounts >25% require accounting supervisor approval';
END IF;

IF amendment_type = 'CREDIT' AND amount > invoice_total * 0.50 THEN
  -- >50% credit requires finance director approval
  RAISE EXCEPTION 'Credits >50% require finance director approval';
END IF;

-- All amendments create credit note for audit trail
INSERT INTO credit_notes (
  invoice_id,
  amendment_id,
  credit_amount,
  reason,
  approved_by,
  created_at
) VALUES (...)
```

---

### 5.4 Lab Result Correction Constraints

```typescript
// Lab result amendment validation

-- Error: >50% change without supervisor approval
IF ABS((corrected_value - original_value) / original_value) > 0.50 THEN
  SELECT role INTO actor_role FROM profiles WHERE id = current_user_id;
  IF actor_role != 'lab_supervisor' THEN
    RAISE EXCEPTION 'Large corrections (>50%) require supervisor approval';
  END IF;
END IF;

-- If outside normal range → Critical alert for doctor
IF corrected_value NOT BETWEEN normal_range_low AND normal_range_high THEN
  INSERT INTO critical_alerts (
    lab_order_id,
    alert_type: 'ABNORMAL_RESULT',
    alert_level: CASE WHEN out_of_range_severity = 'critical' THEN 'URGENT' ELSE 'ROUTINE' END,
    recipient_doctor_id,
  );
END IF;

-- Immutable record created
INSERT INTO lab_result_amendment_chain (
  lab_order_id,
  original_value,
  corrected_value,
  correction_reason,
  quality_issue,
  justification,
  amended_by,
  amended_at,
  sequence_number -- ensure immutable order
);
```

---

## 6. Risk Assessment - Integration Hazards

### 6.1 Risk: RLS Isolation Breakdown

**Scenario:** Amendment in Hospital A visible to users in Hospital B

**Prevention:**
```sql
-- All forensic queries must include hospital_id check
CREATE POLICY "amendments_hospital_scoped" ON amendment_chain
  USING (hospital_id = auth.uid()::hospital_id);  -- Via session JWT

-- Test in test suite:
describe('Phase 2B: RLS Isolation', () => {
  it('forbids accessing amendments from other hospital', async () => {
    // Login as hospital_a_user
    // Create amendment
    
    // Switch to hospital_b_user
    // Try to fetch amendment via RPC
    const { error } = await supabase.rpc(
      'get_prescription_amendment_chain',
      { p_prescription_id: amendment_from_hospital_a }
    );
    
    expect(error?.message).toContain('hospital_id');
    expect(amendmentData).toBeNull();
  });
});
```

---

### 6.2 Risk: Amendment Permissions Not Validated

**Scenario:** Lab tech creates amendment that should require supervisor approval

**Prevention:**
```typescript
// RPC validates actor role before allowing amendment
const { error } = await supabase.rpc('amend_lab_result', {
  p_lab_order_id: labOrderId,
  p_corrected_value: newValue,
  // ... RPC inherently enforces role via session JWT
});

// Frontend validates role first
const canAmendResult = hasRole('lab_tech') || hasRole('lab_supervisor');

if (!canAmendResult) {
  toast.error('Only lab staff can amend results');
  return;
}

// Backend RPC adds additional check
-- In RPC: amend_lab_result
SELECT role INTO actor_role FROM profiles 
  WHERE id = auth.uid();

IF actor_role NOT IN ('lab_tech', 'lab_supervisor') THEN
  RAISE EXCEPTION 'Only lab staff can amend results';
END IF;
```

---

### 6.3 Risk: Real-Time Subscriptions Not Cleaned Up (Memory Leak)

**Scenario:** Component unmounts but subscription persists, causing memory leak

**Prevention:**
```typescript
export function useAmendmentAlert(options: UseAmendmentAlertOptions = {}) {
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase.channel(`amendment_alerts_${hospital_id}`);

    channel
      .on('postgres_changes', { ... }, handleNotification)
      .subscribe();

    // Store unsubscribe function
    unsubscribeRef.current = () => {
      supabase.removeChannel(channel);  // Explicit cleanup
    };

    // Cleanup on unmount
    return () => {
      unsubscribeRef.current?.();  // Call cleanup
    };
  }, [enabled, hospital_id]);

  // Test memory cleanup
  describe('useAmendmentAlert: Memory Management', () => {
    it('unsubscribes from realtime on unmount', async () => {
      const { unmount } = renderHook(() => useAmendmentAlert({ enabled: true }));
      
      expect(subscriptionActive).toBe(true);
      
      unmount();
      
      // Verify channel removed
      expect(subscriptionActive).toBe(false);
    });
  });
}
```

---

### 6.4 Risk: Deleted Records Still Visible in Timeline

**Scenario:** Prescription deleted but appears in forensic timeline

**Prevention:**
```sql
-- Soft delete only, never hard delete
-- Only mark as deleted:
UPDATE prescriptions 
SET deleted_at = NOW(), is_deleted = true
WHERE id = $1 AND hospital_id = $2;

-- Timeline query includes ONLY non-deleted records
-- (or shows "DELETED" marker with timestamp)
SELECT 
  sequence_number,
  action_type,
  CASE 
    WHEN action_type = 'DELETE' THEN '[DELETED]'
    ELSE actor_email
  END as actor,
  -- ... show deletion in timeline
FROM forensic_audit_logs
WHERE entity_id = $prescription_id
  AND hospital_id = $hospital_id
  AND is_deleted = false;  -- Filter out deleted entities

-- Audit log itself is immutable (never deleted)
-- But references to deleted entities are hidden
```

---

### 6.5 Risk: Concurrent Amendment Race Condition

**Scenario:** Two doctors amend same prescription simultaneously

**Prevention:**
```typescript
// RPC uses optimistic locking
-- In RPC: amend_prescription_dosage
-- Check that amendment_id is unique
-- Use sequence_number to enforce order

INSERT INTO amendment_chain (
  id,
  prescription_id,
  sequence_number,  -- Database generates next sequence
  old_dosage,
  new_dosage,
  amended_by,
  amended_at
) VALUES (
  gen_random_uuid(),
  $p_prescription_id,
  (SELECT COALESCE(MAX(sequence_number), 0) + 1 
   FROM amendment_chain 
   WHERE prescription_id = $p_prescription_id),
  ...
);

-- In frontend: Show conflict on refetch
const { data: updatedChain } = await refetchAmendmentChain();
if (updatedChain.length > expectedLength) {
  toast.warning('Another user amended this prescription. Refreshed view.');
}
```

---

## 7. Testing Strategy for Integration

### 7.1 Unit Tests per Component

```typescript
describe('Phase 2B: Amendment Component Integration', () => {
  describe('AmendmentModal', () => {
    it('validates dosage change within thresholds', () => {
      // Test >75% reduction rejection
      // Test >50% change requires justification
      // Test <25% change shows no warning
    });

    it('disables submit if required fields empty', () => {
      // Test: justified is required
      // Test: corrected dosage is required
    });

    it('calls RPC with correct parameters', async () => {
      // Mock supabase.rpc
      // Verify called with: prescription_id, old, new, reason, justification
    });

    it('refreshes timeline on success', async () => {
      // Verify query invalidation after success
    });
  });

  describe('ForensicTimeline', () => {
    it('displays all amendments in order', () => {
      // Mock usePrescriptionAmendmentChain with 3 records
      // Verify sequence numbers 1, 2, 3 displayed
    });

    it('expands row to show full details', async () => {
      // Click expand
      // Verify amendment justification visible
      // Verify before/after state visible
    });

    it('exports to CSV', async () => {
      // Click [CSV Export]
      // Verify file download
      // Verify headers and data correct
    });

    it('filters by role', () => {
      // showOwnOnly=true: show only authenticated user's amendments
      // showOwnOnly=false: show all
    });

    it('hides timeline if no amendments', () => {
      // When usePrescriptionAmendmentChain returns []
      // Component should not render table
    });
  });

  describe('useAmendmentAlert', () => {
    it('subscribes to realtime channel on mount', () => {
      // Verify supabase.channel called with `amendment_alerts_${hospital_id}`
      // Verify .on('postgres_changes', ...) configured
    });

    it('receives amendment notifications', async () => {
      // Simulate payload from realtime
      // Verify handleAmendmentNotification called
      // Verify alert added to state
    });

    it('shows toast notification', async () => {
      // Simulate notification
      // Verify toast.warning called with formatted message
    });

    it('acknowledges alert', async () => {
      // Call acknowledgeAlert(alert.id)
      // Verify alert removed from list
    });

    it('unsubscribes on unmount', () => {
      // Render hook
      // Unmount
      // Verify supabase.removeChannel called
    });

    it('auto-enables for pharmacist role', () => {
      // Mock profile.primary_role = 'pharmacist'
      // Verify subscription active
    });

    it('stays disabled for non-pharmacist roles', () => {
      // Mock profile.primary_role = 'doctor'
      // Verify subscription not created
    });
  });

  describe('Integration: Full Amendment Workflow', () => {
    it('doctor amends → pharmacist alerted → timeline updates', async () => {
      // Render PrescriptionDetail (doctor context)
      // Click "Edit Dosage"
      // Fill AmendmentModal
      // Submit

      // Verify:
      // 1. RPC called successfully
      // 2. Toast shown "Amendment submitted"
      // 3. ForensicTimeline refetched
      // 4. New amendment visible in timeline

      // Switch to pharmacist context
      // Verify useAmendmentAlert fires
      // Verify alert toast shown
    });

    it('handles RPC errors gracefully', async () => {
      // Mock RPC to fail
      // Submit amendment
      // Verify user-friendly error toast shown
      // Modal stays open for retry
    });

    it('maintains RLS isolation', async () => {
      // Render with hospital_a context
      // Create amendment
      // Switch to hospital_b context
      // Try to fetch amendment
      // Verify error (hospital_id mismatch)
    });
  });
});
```

### 7.2 E2E Tests (Playwright)

```typescript
// tests/e2e/amendment-workflow.spec.ts

test.describe('Phase 2B: Amendment Workflow E2E', () => {
  test('Doctor amends prescription → Pharmacist reviews → Dispenses', async ({ 
    page, 
    doctorContext, 
    pharmacistContext 
  }) => {
    // === DOCTOR: Create prescription ===
    await page.goto('/clinic/patient/123');
    await page.click('[data-testid="btn-new-prescription"]');
    await page.fill('[data-testid="medication-input"]', 'Amoxicillin');
    await page.fill('[data-testid="dosage-input"]', '500mg');
    await page.click('[data-testid="btn-create-rx"]');
    
    const prescriptionId = extractIdFromURL(page.url());

    // === DOCTOR: Amend prescription ===
    await page.click('[data-testid="btn-edit-dosage"]');
    await page.fill('[data-testid="corrected-dosage"]', '250mg');
    await page.fill('[data-testid="change-reason"]', 'Drug interaction');
    await page.fill('[data-testid="justification"]', 'Patient on Keto');
    await page.click('[data-testid="btn-submit-amendment"]');
    
    // Verify success toast
    await expect(page.locator('text=Amendment submitted')).toBeVisible();

    // === PHARMACIST: Receive real-time alert ===
    await pharmacistContext.goto('/pharmacy');
    await expect(page.locator('[data-testid="alert-amendment"]')).toBeVisible();
    await expect(page.locator('text=Dr. Smith amended')).toBeVisible();

    // === PHARMACIST: Review amendment ===
    await page.click('[data-testid="btn-review-amendment"]');
    await expect(page.locator('[data-testid="timeline-amendment"]')).toBeVisible();

    // === PHARMACIST: Approve & dispense ===
    await page.click('[data-testid="btn-dispense"]');
    await expect(page.locator('text=Prescription dispensed')).toBeVisible();

    // === Verify immutable timeline ===
    await page.click('[data-testid="btn-view-timeline"]');
    const rows = await page.locator('[data-testid="timeline-row"]').count();
    expect(rows).toBe(4); // CREATE, APPROVE, AMEND, DISPENSE
  });

  test('Large dosage amendment requires detailed justification', async ({ page }) => {
    // Dosage >75% reduction should error
    await page.goto(`/prescription/${prescriptionId}/edit`);
    await page.fill('[data-testid="corrected-dosage"]', '50mg'); // 90% reduction
    await page.fill('[data-testid="justification"]', 'Too much'); // Too short
    
    await page.click('[data-testid="btn-submit-amendment"]');
    
    await expect(page.locator('text=changes require detailed justification')).toBeVisible();
  });
});
```

### 7.3 Security Tests

```typescript
describe('Phase 2B: Security & Compliance Tests', () => {
  test('RLS: Cannot access amendments from other hospital', async () => {
    // Setup: Create amendment in hospital_a
    const amendment_a = await createAmendmentAsHospitalA();

    // Switch to hospital_b user
    const { data, error } = await supabaseHospitalB.rpc(
      'get_prescription_amendment_chain',
      { p_prescription_id: amendment_a.prescription_id }
    );

    expect(error?.message).toContain('hospital');
    expect(data).toEqual([]);
  });

  test('Cannot amend without prescribing doctor role', async () => {
    // Login as nurse (not doctor)
    const { error } = await supabase.rpc('amend_prescription_dosage', {
      p_prescription_id: prescriptionId,
      p_old_dosage: '500mg',
      p_new_dosage: '250mg',
      // ... other params
    });

    expect(error?.message).toContain('permission');
  });

  test('PHI not logged in plain text', async () => {
    // Create amendment
    await createAmendmentAsDoctor();

    // Check activity logs
    const { data: logs } = await supabase
      .from('activity_logs')
      .select('details')
      .match({ entity_type: 'prescription' })
      .limit(1);

    const logged = JSON.stringify(logs[0].details);
    expect(logged).not.toContain('patient_phone');
    expect(logged).not.toContain('patient_ssn');
    expect(logged).not.toContain('patient_full_name'); // Only MRN
  });

  test('Amendment is immutable', async () => {
    // Create amendment
    const amendment = await createAmendment();

    // Try to update amendment record
    const { error } = await supabase
      .from('amendment_chain')
      .update({ new_dosage: '500mg' })
      .eq('id', amendment.id);

    expect(error?.message).toContain('Policy violation');
  });

  test('Deleted amendments still visible in timeline', async () => {
    // Create amendment
    const amendment = await createAmendment();

    // Soft-delete prescription
    await supabase
      .from('prescriptions')
      .update({ is_deleted: true, deleted_at: new Date() })
      .eq('id', amendment.prescription_id);

    // Fetch timeline
    const { data: timeline } = await supabase.rpc(
      'get_prescription_amendment_chain',
      { p_prescription_id: amendment.prescription_id }
    );

    // Timeline should still show all amendments
    expect(timeline.length).toBeGreaterThan(0);
    expect(timeline[timeline.length - 1].action_type).toBe('DELETE');
  });
});
```

---

## 8. Deployment Checklist

### Pre-Deployment

- [ ] **Database & RLS**
  - [ ] All Phase 2A migrations applied (amendment_chain, forensic_audit_logs tables)
  - [ ] RLS policies enabled and tested
  - [ ] Hospital_id scoping verified in all RPC functions
  - [ ] Foreign keys and indexes created

- [ ] **Backend (Edge Functions / RPC)**
  - [ ] `amend_prescription_dosage()` RPC implemented
  - [ ] `reschedule_appointment()` RPC implemented
  - [ ] `amend_lab_result()` RPC implemented
  - [ ] `amend_invoice_amount()` RPC implemented
  - [ ] All amendments validated (dosage thresholds, permissions, drug interactions)
  - [ ] All RPCs return amendment_id on success
  - [ ] All amendments trigger audit logging
  - [ ] All amendments broadcast realtime events
  - [ ] Error messages user-friendly (no stack traces)

- [ ] **Frontend Components**
  - [ ] `AmendmentModal` created and tested
  - [ ] `ForensicTimeline` created and tested
  - [ ] `LabResultAmendmentModal` created (derived from AmendmentModal)
  - [ ] `RescheduleModal` created (derived from AmendmentModal)
  - [ ] `InvoiceAmendmentModal` created (derived from AmendmentModal)
  - [ ] `AuditLogViewer` enhanced with amendment filters
  - [ ] `DataExportTool` includes amendment data

- [ ] **Frontend Hooks**
  - [ ] `useAmendmentAlert` hook complete with subscription lifecycle
  - [ ] `usePrescriptionAmendmentChain` tested and documented
  - [ ] `useInvoiceAuditTrail` tested
  - [ ] `useLabResultAmendmentHistory` tested
  - [ ] `useRefreshAmendmentChain` working (query invalidation)
  - [ ] All hooks include error handling

- [ ] **Pages Integrated**
  - [ ] `PrescriptionDetail` - Amendment modal + Timeline
  - [ ] `PharmacistDashboard` - Real-time alerts
  - [ ] `ClinicalPharmacyPage` - Amendment history in med list
  - [ ] `LaboratoryPage` - Result amendment workflow
  - [ ] `LabResultDetail` - Amendment modal for results
  - [ ] `AppointmentsPage` - Reschedule modal
  - [ ] `AppointmentDetail` - Reschedule timeline
  - [ ] `BillingPage` - Amendment count + filters
  - [ ] `InvoiceDetail` - Amendment modal + audit trail

- [ ] **Testing**
  - [ ] Unit tests: All components & hooks (>80% coverage)
  - [ ] Integration tests: Full amendment workflows
  - [ ] E2E tests: Playwright smoke tests for critical paths
  - [ ] Security tests: RLS isolation, permission validation
  - [ ] Performance tests: Timeline renders large datasets (<1s)
  - [ ] All tests passing

- [ ] **Documentation**
  - [ ] API docs updated (RPC function signatures)
  - [ ] Component prop interfaces documented
  - [ ] Hook usage examples in comments
  - [ ] Deployment steps documented
  - [ ] Troubleshooting guide created

- [ ] **Compliance & Security**
  - [ ] PHI sanitization verified (no patient SSN/phone logged)
  - [ ] Immutability enforced (no update/delete on amendment records)
  - [ ] Rate limiting on amendment endpoints (prevent abuse)
  - [ ] Audit trail verified (all amendments logged with actor/timestamp)
  - [ ] HIPAA compliance reviewed

- [ ] **Performance**
  - [ ] Query optimization: amendment_chain queries <500ms
  - [ ] Realtime subscriptions: <100ms latency for alerts
  - [ ] Component renders: <300ms for 100+ timeline entries
  - [ ] Memory leaks tested (subscription cleanup)

### Staging Deployment

- [ ] Deploy to staging environment
- [ ] Run full test suite in staging
- [ ] Load test: 100 concurrent users, 10 amendments/min
- [ ] Security scanning: OWASP Top 10
- [ ] Database backup before applying migrations
- [ ] Data export test (CSV files valid)

### Production Deployment

- [ ] Database backups created
- [ ] Migrations applied to production
- [ ] Feature flags enabled for phase 2B components
- [ ] Canary release: 5% of traffic
- [ ] Monitor error rates (target: <0.1% for amendments)
- [ ] Monitor performance (amendment RPC latency <1s)
- [ ] Health checks: Timeline queries, realtime subscriptions
- [ ] Rollback plan ready (feature flag to disable amendments)
- [ ] Notify all users of amendment feature availability
- [ ] Compliance team sign-off

### Post-Deployment

- [ ] Monitor amendment creation rates (detect unusual patterns)
- [ ] Monitor alert delivery (realtime subscriptions healthy)
- [ ] Collect user feedback (amendment UI/UX)
- [ ] Verify HIPAA compliance logging
- [ ] Run compliance audit on amendment records
- [ ] Document lessons learned
- [ ] Plan Phase 2C enhancements (if needed)

---

## 9. File Manifest - What to Create/Modify

### NEW Files (Components)

```
src/components/audit/
├── AmendmentModal.tsx (ALREADY EXISTS - verify implementation)
├── ForensicTimeline.tsx (ALREADY EXISTS - verify implementation)
├── AuditLogViewer.tsx (ALREADY EXISTS - verify implementation)
├── DataExportTool.tsx (ALREADY EXISTS - verify implementation)
├── LabResultAmendmentModal.tsx (NEW - derived from AmendmentModal.tsx)
├── RescheduleModal.tsx (NEW - derived from AmendmentModal.tsx)
└── InvoiceAmendmentModal.tsx (NEW - derived from AmendmentModal.tsx)
```

### NEW Files (Hooks)

```
src/hooks/
├── useForensicQueries.ts (ALREADY EXISTS - verify implementation)
├── useAmendmentAlert.tsx (ALREADY EXISTS - verify implementation)
└── __tests__/
    └── useAmendmentPhase2B.test.ts (ALREADY EXISTS - verify coverage)
```

### MODIFIED Pages

```
src/pages/pharmacy/
├── PrescriptionDetail.tsx (NEW - or enhance existing)
├── PharmacistDashboard.tsx (ENHANCE - add amendments section)
└── ClinicalPharmacyPage.tsx (ENHANCE - add amendment history)

src/pages/laboratory/
├── LaboratoryPage.tsx (ENHANCE - add amendment tabs)
└── LabResultDetail.tsx (NEW - or enhance existing)

src/pages/appointments/
├── AppointmentsPage.tsx (ENHANCE - add reschedule flow)
└── AppointmentDetail.tsx (NEW - or enhance existing)

src/pages/billing/
├── BillingPage.tsx (ENHANCE - add amendment filters)
└── InvoiceDetail.tsx (NEW - or enhance existing invoice page)

src/pages/admin/
└── ComplianceAuditDashboard.tsx (NEW - or create compliance view)
```

### Types & Interfaces (Update/Verify)

```
src/integrations/supabase/types.ts
- Verify amendment_chain type definition
- Verify forensic_audit_logs type definition
- Add types for: LoabResultAmendmentRecord, AppointmentAmendmentRecord
```

---

## Summary

This integration plan provides:
1. ✅ Clear mapping of 4 clinical workflows to Phase 2B components
2. ✅ Detailed component placement for 8-12 pages
3. ✅ Step-by-step integration checklist with imports & hooks
4. ✅ Real-time workflow diagrams showing amendment flow
5. ✅ Role-based visibility rules for each component
6. ✅ 5 critical enforcement points (dosage, interactions, costs, lab, concurrency)
7. ✅ 5 major risk assessments with mitigation strategies
8. ✅ Comprehensive testing strategy (unit, integration, E2E, security)
9. ✅ Full deployment checklist with pre/staging/prod phases
10. ✅ File manifest showing all files to create/modify

**Estimated Development Timeline:** 8-12 days for a 2-person team
