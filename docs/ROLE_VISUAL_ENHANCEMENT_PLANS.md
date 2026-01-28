# CareSync HMS - Role-Based Visual Enhancement Plans

## Overview

This document provides comprehensive visual enhancement plans for each role in the CareSync Healthcare Management System. Each plan leverages the established design system components:

- **Spacing System:** `spacing.css` (8px grid)
- **Color Palette:** `colors.css` (semantic color scales)
- **Typography:** `typography.css` (Inter font, 1.6 line-height)
- **Icons:** `icon.tsx` (standardized sizes and colors)
- **Micro-interactions:** `micro-interactions.tsx` (animations and feedback)
- **Accessibility:** `focus-ring.tsx` and `useReducedMotion.ts`

---

## Role Matrix Summary

| Role | Primary Color | Priority | Core Responsibilities |
|------|--------------|----------|----------------------|
| **Admin** | Red (`--admin`) | Critical | System management, user roles, analytics, security |
| **Doctor** | Blue (`--doctor`) | Critical | Patient care, prescriptions, consultations |
| **Nurse** | Green (`--nurse`) | High | Patient monitoring, medication administration |
| **Pharmacist** | Purple (`--pharmacy`) | High | Inventory, dispensing, drug interactions |
| **Receptionist** | Orange (`--receptionist`) | Medium | Appointments, patient registration, billing |
| **Patient** | Teal (`--patient`) | Medium | Portal access, appointments, health records |

---

# 1. ADMIN ROLE

## Core Responsibilities

### Primary Functions
- **User Management:** Create, edit, deactivate users across all roles
- **Role Assignment:** Manage role-based access control (RBAC)
- **System Configuration:** Hospital settings, departments, workflows
- **Analytics Dashboard:** System-wide metrics, usage statistics
- **Security Management:** Audit logs, security policies, 2FA enforcement
- **Backup & Recovery:** Data backup scheduling, disaster recovery

### Interdependencies
- **All Roles:** Manages permissions for every role
- **Doctor:** Configures specialty departments
- **Receptionist:** Sets up appointment workflows
- **System:** Integrates with all modules

## Visual Enhancement Plan

### Color Scheme
```css
/* Admin-specific semantic colors */
--admin-primary: var(--admin);           /* Red - attention/critical */
--admin-primary-light: var(--admin-light);
--admin-surface: var(--destructive-50);   /* Light red for alerts */
--admin-text: var(--destructive-900);
--admin-border: var(--destructive-200);
```

### UI Components Needed

#### 1.1 Admin Dashboard Layout
```tsx
// Components: AdminDashboardLayout
// File: src/components/admin/AdminDashboardLayout.tsx

interface AdminDashboardLayoutProps {
  children: React.ReactNode;
  activeSection: 'users' | 'analytics' | 'security' | 'settings';
}

// Spacing: Uses --space-sidebar-padding for sidebar
// Colors: --admin for active states, --gray-200 for borders
```

**Specifications:**
- **Layout:** Fixed sidebar (280px) + scrollable content area
- **Spacing:** Sidebar padding `--space-4`, content padding `--space-6`
- **Colors:** Sidebar background `--sidebar-background`, active item `--admin`
- **Icons:** Use `IconBox` with `variant="primary"` for nav items

#### 1.2 User Management Table
```tsx
// Components: UserManagementTable, UserRow, RoleBadge
// File: src/components/admin/UserManagementTable.tsx

interface UserRowProps {
  user: User;
  onEdit: (user: User) => void;
  onDeactivate: (userId: string) => void;
}

// Uses: StaggeredList for row animations
// Uses: PulseBadge for pending approvals
```

**Specifications:**
- **Table:** Full-width with sticky header
- **Spacing:** Row padding `--space-3`, gap between actions `--space-2`
- **Colors:** Role badges use semantic colors (doctor=blue, nurse=green, etc.)
- **Interactions:** 
  - Hover: Row highlight `--accent`
  - Actions: `InteractiveButton` with `size="sm"`
  - Deactivate: Confirm with `Toast` notification

#### 1.3 Analytics Cards
```tsx
// Components: MetricCard, TrendIndicator, ChartContainer
// File: src/components/admin/MetricCard.tsx

interface MetricCardProps {
  title: string;
  value: number | string;
  trend: 'up' | 'down' | 'neutral';
  trendValue: string;
  icon: LucideIcon;
}

// Uses: HoverCard for lift effect
// Uses: IconBox for icon display
```

**Specifications:**
- **Card:** `HoverCard` with `liftAmount={4}`
- **Spacing:** Padding `--space-5`, internal gap `--space-4`
- **Colors:** 
  - Positive trend: `--success-500`
  - Negative trend: `--destructive-500`
  - Neutral: `--gray-500`
- **Typography:** Value uses `text-3xl font-bold`, trend uses `text-sm`

#### 1.4 Security Audit Log
```tsx
// Components: AuditLogViewer, AuditLogEntry, FilterBar
// File: src/components/admin/AuditLogViewer.tsx

interface AuditLogEntryProps {
  timestamp: Date;
  user: string;
  action: string;
  severity: 'info' | 'warning' | 'critical';
}

// Uses: StaggeredList for entry animations
// Uses: Badge colors for severity
```

**Specifications:**
- **List:** Virtual scrolling for large datasets
- **Spacing:** Entry padding `--space-3`, gap `--space-2`
- **Colors:**
  - Info: `--info-100` background, `--info-700` text
  - Warning: `--warning-100` background, `--warning-700` text
  - Critical: `--destructive-100` background, `--destructive-700` text
- **Icons:** `Shield`, `AlertTriangle`, `Info` from `icon.tsx`

### Interaction Patterns

#### User Creation Flow
1. **Trigger:** Click "Add User" button (`InteractiveButton`)
2. **Modal:** Slide-in with `PageTransition`
3. **Form:** `AnimatedInput` fields with validation
4. **Role Selection:** `AnimatedSwitch` toggles for permissions
5. **Submit:** Loading state with spinner, then `Toast` confirmation
6. **Success:** `StaggeredList` adds new user to table

#### Bulk Actions
- **Selection:** Checkbox column with indeterminate state
- **Toolbar:** Appears on selection with slide animation
- **Actions:** Dropdown with `Tooltip` explanations
- **Confirmation:** Modal with warning styling

### Accessibility Considerations

- **Focus Management:** `SkipToContent` link to main content
- **Keyboard Navigation:** Tab order follows visual hierarchy
- **Screen Readers:** 
  - Table: `aria-label` on sortable headers
  - Actions: `aria-describedby` linking to row data
  - Alerts: `role="alert"` for critical notifications
- **Reduced Motion:** All animations respect `useReducedMotion`

### Responsive Behavior

| Breakpoint | Layout Changes |
|------------|---------------|
| Desktop (>1024px) | Full sidebar, multi-column dashboard |
| Tablet (768-1024px) | Collapsible sidebar, 2-column grid |
| Mobile (<768px) | Bottom nav, single column, sheets for filters |

---

# 2. DOCTOR ROLE

## Core Responsibilities

### Primary Functions
- **Patient Consultations:** Video/in-person appointments
- **Medical Records:** View and update patient history
- **Prescriptions:** Create and manage medication orders
- **Lab Orders:** Request and review diagnostic tests
- **Clinical Decision Support:** AI-assisted diagnosis suggestions

### Interdependencies
- **Nurse:** Receives care instructions, reports vital signs
- **Pharmacist:** Sends prescriptions, receives clarifications
- **Patient:** Communicates via portal, views records
- **Admin:** Managed by admin, reports to department head

## Visual Enhancement Plan

### Color Scheme
```css
/* Doctor-specific semantic colors */
--doctor-primary: var(--doctor);          /* Blue - trust/professional */
--doctor-primary-light: var(--doctor-light);
--doctor-surface: var(--info-50);          /* Light blue for calm */
--doctor-text: var(--info-900);
--doctor-border: var(--info-200);
```

### UI Components Needed

#### 2.1 Patient Chart View
```tsx
// Components: PatientChart, VitalSignsPanel, MedicalHistoryTimeline
// File: src/components/doctor/PatientChart.tsx

interface PatientChartProps {
  patient: Patient;
  activeTab: 'overview' | 'history' | 'labs' | 'notes';
}

// Uses: HoverCard for section cards
// Uses: StaggeredList for timeline entries
```

**Specifications:**
- **Layout:** 3-column grid (vitals | main content | quick actions)
- **Spacing:** Section gap `--space-6`, card padding `--space-5`
- **Colors:** 
  - Vitals normal: `--success-500`
  - Vitals warning: `--warning-500`
  - Vitals critical: `--destructive-500`
- **Typography:** Patient name `text-2xl font-bold`, vitals `text-lg`

#### 2.2 Consultation Interface
```tsx
// Components: ConsultationRoom, VideoPlayer, NotesPanel, PrescriptionForm
// File: src/components/doctor/ConsultationRoom.tsx

interface ConsultationRoomProps {
  appointment: Appointment;
  onEnd: () => void;
}

// Uses: InteractiveButton for controls
// Uses: AnimatedInput for notes
```

**Specifications:**
- **Video:** 16:9 aspect ratio, rounded corners `--radius-lg`
- **Controls:** Bottom bar with `--space-3` padding
- **Notes:** Expandable panel with smooth height animation
- **Prescription:** Slide-out drawer with `PageTransition`

#### 2.3 Prescription Builder
```tsx
// Components: PrescriptionBuilder, DrugSearch, DosageSelector
// File: src/components/doctor/PrescriptionBuilder.tsx

interface PrescriptionBuilderProps {
  patientId: string;
  onSave: (prescription: Prescription) => void;
}

// Uses: AnimatedInput for search
// Uses: StaggeredList for medication list
// Uses: Toast for save confirmation
```

**Specifications:**
- **Search:** Autocomplete with `AnimatedInput`, results in `HoverCard`
- **Drug Card:** Shows interactions with warning colors
- **Dosage:** Stepper control with `InteractiveButton`
- **Spacing:** Form gap `--space-form-gap`, field gap `--space-4`

#### 2.4 Lab Results Viewer
```tsx
// Components: LabResultsViewer, ResultChart, AbnormalIndicator
// File: src/components/doctor/LabResultsViewer.tsx

interface LabResultProps {
  test: LabTest;
  result: number;
  referenceRange: { min: number; max: number };
}

// Uses: IconBox for test type icons
// Uses: Tooltip for reference range info
```

**Specifications:**
- **Result Display:** Large number with unit below
- **Indicator:** Dot color-coded (green/yellow/red)
- **Chart:** Sparkline showing trend over time
- **Spacing:** Result card padding `--space-4`, gap `--space-3`

### Interaction Patterns

#### Patient Search
1. **Input:** `AnimatedInput` with focus glow
2. **Results:** Dropdown with `StaggeredList` animation
3. **Selection:** Navigates to patient chart with `PageTransition`
4. **Recent:** Shows last 5 patients as quick chips

#### Prescription Workflow
1. **Initiate:** Click "Prescribe" in patient chart
2. **Search:** Type drug name, see autocomplete with icons
3. **Select:** Drug card expands showing details
4. **Dosage:** Interactive stepper with validation
5. **Review:** Summary card with all medications
6. **Submit:** `InteractiveButton` with loading state
7. **Confirm:** `Toast` with success message

### Accessibility Considerations

- **Focus Rings:** Clear focus indicators on all interactive elements
- **Color Contrast:** All text meets WCAG AA (4.5:1 ratio)
- **Screen Readers:** 
  - Vitals: `aria-live="polite"` for updates
  - Charts: Alternative data table view
  - Videos: Captions support indicator
- **Keyboard:** Full navigation without mouse

### Responsive Behavior

| Breakpoint | Layout Changes |
|------------|---------------|
| Desktop (>1024px) | 3-column layout, video + notes side-by-side |
| Tablet (768-1024px) | 2-column, collapsible panels |
| Mobile (<768px) | Single column, tabbed interface, floating action button |

---

# 3. NURSE ROLE

## Core Responsibilities

### Primary Functions
- **Patient Monitoring:** Vital signs, intake/output tracking
- **Medication Administration:** MAR (Medication Administration Record)
- **Care Documentation:** Nursing notes, care plans
- **Shift Handover:** Report generation, task delegation
- **Emergency Response:** Rapid assessment, protocol activation

### Interdependencies
- **Doctor:** Receives orders, reports changes
- **Patient:** Direct care provider, education
- **Pharmacist:** Medication questions, inventory
- **Receptionist:** Bed management, admissions

## Visual Enhancement Plan

### Color Scheme
```css
/* Nurse-specific semantic colors */
--nurse-primary: var(--nurse);            /* Green - care/growth */
--nurse-primary-light: var(--nurse-light);
--nurse-surface: var(--success-50);        /* Light green for calm */
--nurse-text: var(--success-900);
--nurse-border: var(--success-200);
```

### UI Components Needed

#### 3.1 Patient Assignment Board
```tsx
// Components: AssignmentBoard, PatientCard, ShiftSelector
// File: src/components/nurse/AssignmentBoard.tsx

interface PatientCardProps {
  patient: Patient;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tasks: Task[];
}

// Uses: HoverCard for patient details
// Uses: PulseBadge for overdue tasks
// Uses: StaggeredList for task list
```

**Specifications:**
- **Board:** Kanban-style columns by priority
- **Card:** Compact design with key vitals preview
- **Spacing:** Card padding `--space-3`, gap `--space-3`
- **Colors:**
  - Critical: `--destructive-500` border
  - High: `--warning-500` border
  - Medium: `--info-500` border
  - Low: `--gray-300` border

#### 3.2 Vital Signs Entry
```tsx
// Components: VitalSignsForm, VitalInput, TrendSparkline
// File: src/components/nurse/VitalSignsForm.tsx

interface VitalInputProps {
  type: 'temperature' | 'bp' | 'pulse' | 'respiration' | 'spo2';
  value: number;
  unit: string;
  normalRange: { min: number; max: number };
}

// Uses: AnimatedInput with validation
// Uses: Tooltip for normal range
```

**Specifications:**
- **Input:** Large touch targets (min 44px), numeric keypad
- **Validation:** Real-time with color feedback
  - Normal: `--success-500` border
  - Warning: `--warning-500` border
  - Critical: `--destructive-500` border with pulse
- **Trend:** Sparkline showing last 24 hours
- **Spacing:** Input gap `--space-4`, section gap `--space-6`

#### 3.3 Medication Administration
```tsx
// Components: MARViewer, MedicationCard, AdminConfirmation
// File: src/components/nurse/MARViewer.tsx

interface MedicationCardProps {
  medication: Medication;
  status: 'due' | 'administered' | 'late' | 'prn';
  scheduledTime: Date;
}

// Uses: InteractiveButton for administer action
// Uses: AnimatedSwitch for PRN toggle
// Uses: Toast for confirmation
```

**Specifications:**
- **Timeline:** Vertical timeline with time slots
- **Card:** Shows drug name, dose, route, time
- **Status Colors:**
  - Due: `--info-100` background
  - Administered: `--success-100` background
  - Late: `--warning-100` background with pulse
  - PRN: `--gray-100` background
- **Actions:** Swipe or button to administer

#### 3.4 Shift Handover Report
```tsx
// Components: HandoverReport, PatientSummary, TaskList
// File: src/components/nurse/HandoverReport.tsx

interface PatientSummaryProps {
  patient: Patient;
  keyEvents: Event[];
  pendingTasks: Task[];
  criticalNotes: string;
}

// Uses: StaggeredList for patient summaries
// Uses: IconText for quick stats
```

**Specifications:**
- **Layout:** Accordion-style patient sections
- **Summary:** SBAR format (Situation, Background, Assessment, Recommendation)
- **Spacing:** Section padding `--space-4`, gap `--space-3`
- **Colors:** Critical notes highlighted with `--destructive-50` background

### Interaction Patterns

#### Vital Signs Entry
1. **Select Patient:** From assignment board
2. **Open Form:** Modal with `PageTransition`
3. **Enter Values:** `AnimatedInput` with real-time validation
4. **Visual Feedback:** Border color changes based on value
5. **Save:** `InteractiveButton` with loading state
6. **Confirmation:** `Toast` with success
7. **Auto-close:** Returns to board after 2 seconds

#### Medication Administration
1. **View MAR:** Timeline of scheduled medications
2. **Due Alert:** `PulseBadge` on overdue items
3. **Administer:** Tap medication card
4. **Confirm:** Modal with patient verification (barcode/photo)
5. **Document:** Optional notes field
6. **Complete:** Card updates to green with timestamp

### Accessibility Considerations

- **Touch Targets:** All buttons minimum 44x44px
- **High Contrast:** Vital signs use bold colors for quick scanning
- **Screen Readers:** 
  - Priority levels announced first
  - Vital signs: "Temperature 98.6, normal"
  - Medications: "Due now, Lisinopril 10mg"
- **Voice Input:** Support for hands-free documentation

### Responsive Behavior

| Breakpoint | Layout Changes |
|------------|---------------|
| Desktop (>1024px) | Full assignment board, side-by-side MAR |
| Tablet (768-1024px) | 2-column board, modal MAR |
| Mobile (<768px) | List view, swipe actions, floating vitals button |

---

# 4. PHARMACIST ROLE

## Core Responsibilities

### Primary Functions
- **Prescription Review:** Verify orders, check interactions
- **Inventory Management:** Stock levels, reordering, expiry tracking
- **Drug Dispensing:** Prepare medications, labeling
- **Clinical Consultation:** Drug information, dosing questions
- **Compounding:** Custom medication preparation

### Interdependencies
- **Doctor:** Receives prescriptions, sends clarifications
- **Nurse:** Medication questions, administration timing
- **Admin:** Inventory budgets, supplier management
- **Patient:** Counseling, medication education

## Visual Enhancement Plan

### Color Scheme
```css
/* Pharmacist-specific semantic colors */
--pharmacy-primary: var(--pharmacy);      /* Purple - wisdom/knowledge */
--pharmacy-primary-light: var(--pharmacy-light);
--pharmacy-surface: hsl(271, 81%, 97%);    /* Very light purple */
--pharmacy-text: hsl(271, 81%, 25%);
--pharmacy-border: hsl(271, 81%, 85%);
```

### UI Components Needed

#### 4.1 Prescription Queue
```tsx
// Components: PrescriptionQueue, PrescriptionCard, PriorityIndicator
// File: src/components/pharmacy/PrescriptionQueue.tsx

interface PrescriptionCardProps {
  prescription: Prescription;
  priority: 'stat' | 'urgent' | 'routine';
  status: 'pending' | 'verified' | 'preparing' | 'ready';
  interactions: DrugInteraction[];
}

// Uses: StaggeredList for queue
// Uses: HoverCard for drug details
// Uses: PulseBadge for stat orders
```

**Specifications:**
- **Queue:** Sortable by priority and time
- **Card:** Shows patient, drugs, prescriber, flags
- **Spacing:** Card padding `--space-4`, gap `--space-3`
- **Colors:**
  - Stat: `--destructive-500` with pulse animation
  - Urgent: `--warning-500`
  - Routine: `--gray-500`
- **Interactions:** Warning icon with `Tooltip` on hover

#### 4.2 Drug Interaction Checker
```tsx
// Components: InteractionChecker, InteractionAlert, AlternativeSuggestions
// File: src/components/pharmacy/InteractionChecker.tsx

interface InteractionAlertProps {
  severity: 'contraindicated' | 'major' | 'moderate' | 'minor';
  drugs: [string, string];
  description: string;
  recommendation: string;
}

// Uses: Alert variants from colors.css
// Uses: InteractiveButton for actions
```

**Specifications:**
- **Alert Levels:**
  - Contraindicated: `--destructive` alert style
  - Major: `--warning` alert style
  - Moderate: `--info` alert style
  - Minor: `--gray` subtle style
- **Layout:** Alert banner at top of prescription
- **Actions:** "Contact Prescriber", "Suggest Alternative" buttons

#### 4.3 Inventory Dashboard
```tsx
// Components: InventoryDashboard, StockCard, ReorderAlert
// File: src/components/pharmacy/InventoryDashboard.tsx

interface StockCardProps {
  drug: Drug;
  currentStock: number;
  reorderPoint: number;
  expiryWarning: boolean;
}

// Uses: MetricCard for key numbers
// Uses: TrendIndicator for usage trends
// Uses: IconBox for drug category icons
```

**Specifications:**
- **Cards:** Grid layout with status colors
  - Critical low: `--destructive-100` background
  - Low: `--warning-100` background
  - Expiring soon: `--warning-50` with clock icon
  - Normal: `--success-50` background
- **Charts:** Bar chart for usage trends
- **Spacing:** Grid gap `--space-4`, card padding `--space-4`

#### 4.4 Dispensing Workstation
```tsx
// Components: DispensingWorkstation, LabelPreview, VerificationCheck
// File: src/components/pharmacy/DispensingWorkstation.tsx

interface DispensingWorkstationProps {
  prescription: Prescription;
  onVerify: () => void;
  onPrint: () => void;
}

// Uses: AnimatedSwitch for verification steps
// Uses: InteractiveButton for actions
// Uses: Toast for completion
```

**Specifications:**
- **Workflow:** Stepper showing 4 stages
  1. Verify prescription
  2. Prepare medication
  3. Print label
  4. Final check
- **Progress:** Visual indicator with checkmarks
- **Label Preview:** Real-time preview of printed label
- **Safety:** Double-check confirmation modal

### Interaction Patterns

#### Prescription Verification
1. **Select:** Click prescription from queue
2. **Review:** Full prescription details with interaction alerts
3. **Verify:** Check each drug with `AnimatedSwitch`
4. **Flag Issues:** Add notes or contact prescriber
5. **Approve:** `InteractiveButton` with confirmation
6. **Queue:** Moves to "Preparing" status

#### Inventory Management
1. **Dashboard:** Overview cards with key metrics
2. **Drill Down:** Click category to see items
3. **Low Stock:** Filter to show only items below reorder point
4. **Reorder:** Generate purchase order with one click
5. **Receive:** Update stock when shipment arrives

### Accessibility Considerations

- **Color Coding:** Never rely solely on color (icons + text)
- **Large Numbers:** Inventory counts use `text-2xl` for visibility
- **Screen Readers:** 
  - Queue: "3 prescriptions pending, 1 stat"
  - Interactions: "Major interaction between Drug A and Drug B"
- **Keyboard:** Full navigation for verification workflow

### Responsive Behavior

| Breakpoint | Layout Changes |
|------------|---------------|
| Desktop (>1024px) | 3-panel layout (queue | details | inventory) |
| Tablet (768-1024px) | 2-panel with tabs |
| Mobile (<768px) | Single panel, bottom sheet for details |

---

# 5. RECEPTIONIST ROLE

## Core Responsibilities

### Primary Functions
- **Patient Registration:** New patient intake, demographics
- **Appointment Scheduling:** Book, reschedule, cancel appointments
- **Check-in/Check-out:** Arrival processing, billing initiation
- **Insurance Verification:** Eligibility checks, authorization
- **Phone Management:** Call routing, message taking

### Interdependencies
- **Doctor:** Schedules appointments, manages calendar
- **Nurse:** Bed assignments, admissions
- **Patient:** First point of contact, assistance
- **Admin:** Reporting, workflow optimization

## Visual Enhancement Plan

### Color Scheme
```css
/* Receptionist-specific semantic colors */
--receptionist-primary: var(--receptionist);  /* Orange - warmth/welcome */
--receptionist-primary-light: var(--receptionist-light);
--receptionist-surface: hsl(25, 95%, 97%);     /* Very light orange */
--receptionist-text: hsl(25, 95%, 25%);
--receptionist-border: hsl(25, 95%, 85%);
```

### UI Components Needed

#### 5.1 Appointment Calendar
```tsx
// Components: AppointmentCalendar, TimeSlot, AppointmentCard
// File: src/components/receptionist/AppointmentCalendar.tsx

interface TimeSlotProps {
  time: Date;
  appointment?: Appointment;
  available: boolean;
  provider: Provider;
}

// Uses: HoverCard for appointment preview
// Uses: InteractiveButton for booking
// Uses: StaggeredList for day view
```

**Specifications:**
- **Views:** Day, week, month toggle
- **Time Slots:** 15-minute increments
- **Colors:**
  - Available: `--success-100`
  - Booked: `--info-100`
  - Blocked: `--gray-200`
  - Urgent slot: `--destructive-100`
- **Drag & Drop:** Reschedule by dragging appointments

#### 5.2 Patient Registration Form
```tsx
// Components: RegistrationForm, DemographicsSection, InsuranceSection
// File: src/components/receptionist/RegistrationForm.tsx

interface RegistrationFormProps {
  onSubmit: (data: RegistrationData) => void;
  prefillData?: Partial<RegistrationData>;
}

// Uses: AnimatedInput for all fields
// Uses: StaggeredList for form sections
// Uses: Toast for save confirmation
```

**Specifications:**
- **Layout:** Multi-step wizard with progress indicator
- **Sections:**
  1. Demographics (required)
  2. Contact info (required)
  3. Insurance (optional)
  4. Emergency contacts (optional)
- **Validation:** Real-time with inline errors
- **Spacing:** Section gap `--space-6`, field gap `--space-4`

#### 5.3 Check-in Kiosk Interface
```tsx
// Components: CheckInKiosk, PatientLookup, ConfirmationScreen
// File: src/components/receptionist/CheckInKiosk.tsx

interface CheckInKioskProps {
  onCheckIn: (patientId: string) => void;
  onNewRegistration: () => void;
}

// Uses: Large touch-friendly buttons
// Uses: AnimatedInput for search
// Uses: PageTransition between screens
```

**Specifications:**
- **Design:** Large fonts, high contrast for accessibility
- **Flow:** 
  1. Search (name, DOB, or scan)
  2. Confirm identity (photo display)
  3. Verify info (update if needed)
  4. Confirm check-in
- **Touch:** All targets minimum 48x48px
- **Feedback:** Clear success animation

#### 5.4 Insurance Verification Panel
```tsx
// Components: InsurancePanel, EligibilityCheck, AuthorizationTracker
// File: src/components/receptionist/InsurancePanel.tsx

interface EligibilityResultProps {
  status: 'active' | 'inactive' | 'pending' | 'error';
  coverage: CoverageDetails;
  copay: number;
  deductible: number;
}

// Uses: IconBox for insurance type
// Uses: MetricCard for financials
// Uses: Badge for status
```

**Specifications:**
- **Status Display:**
  - Active: `--success` badge
  - Inactive: `--destructive` badge
  - Pending: `--warning` badge with spinner
  - Error: `--destructive` with retry button
- **Details:** Expandable sections for coverage
- **Actions:** "Verify Eligibility", "Request Auth" buttons

### Interaction Patterns

#### Appointment Booking
1. **Select Date:** Calendar view with availability
2. **Choose Time:** Click available slot
3. **Select Provider:** Dropdown with specialties
4. **Enter Reason:** `AnimatedInput` with autocomplete
5. **Patient Search:** Find or register new
6. **Confirm:** Summary modal with all details
7. **Book:** `InteractiveButton` with loading
8. **Success:** `Toast` with appointment details

#### Patient Check-in
1. **Arrival:** Patient approaches desk or uses kiosk
2. **Lookup:** Search by name, phone, or scan ID
3. **Verify:** Confirm identity with photo
4. **Update:** Quick edit for changed info
5. **Insurance:** Re-verify if needed
6. **Complete:** Print or digital check-in pass
7. **Notify:** System alerts provider of arrival

### Accessibility Considerations

- **High Visibility:** Large text, clear icons for busy environment
- **Multilingual:** Language selector prominently displayed
- **Screen Readers:** 
  - Calendar: "Monday, January 15th, 3 slots available"
  - Forms: Clear labels with required indicators
- **Physical Access:** Kiosk at wheelchair height

### Responsive Behavior

| Breakpoint | Layout Changes |
|------------|---------------|
| Desktop (>1024px) | Full calendar, side panel for details |
| Tablet (768-1024px) | Split view calendar and list |
| Mobile (<768px) | List view, modal for booking, optimized for kiosk mode |

---

# 6. PATIENT ROLE

## Core Responsibilities

### Primary Functions
- **Portal Access:** View health records, test results
- **Appointment Management:** Schedule, reschedule, view history
- **Communication:** Message providers, request refills
- **Health Tracking:** Vitals, symptoms, medication adherence
- **Education:** Access health resources, care instructions

### Interdependencies
- **Doctor:** Views notes, receives messages
- **Nurse:** Care instructions, follow-up
- **Receptionist:** Schedules appointments
- **Pharmacist:** Prescription status, refill requests

## Visual Enhancement Plan

### Color Scheme
```css
/* Patient-specific semantic colors */
--patient-primary: var(--patient);        /* Teal - calm/health */
--patient-primary-light: var(--patient-light);
--patient-surface: hsl(173, 58%, 97%);     /* Very light teal */
--patient-text: hsl(173, 58%, 20%);
--patient-border: hsl(173, 58%, 85%);
```

### UI Components Needed

#### 6.1 Patient Dashboard
```tsx
// Components: PatientDashboard, HealthSummary, UpcomingAppointments
// File: src/components/patient/PatientDashboard.tsx

interface HealthSummaryProps {
  latestVitals: VitalSigns;
  activeMedications: number;
  upcomingAppointments: number;
  unreadMessages: number;
}

// Uses: MetricCard for stats
// Uses: HoverCard for appointment details
// Uses: PulseBadge for unread messages
```

**Specifications:**
- **Welcome:** Personalized greeting with name
- **Quick Stats:** 4 cards showing key health metrics
- **Colors:** Calm teal palette for reduced anxiety
- **Spacing:** Card grid gap `--space-4`, padding `--space-5`
- **Accessibility:** Simple language, clear icons

#### 6.2 Health Timeline
```tsx
// Components: HealthTimeline, TimelineEvent, ResultDetail
// File: src/components/patient/HealthTimeline.tsx

interface TimelineEventProps {
  date: Date;
  type: 'appointment' | 'lab' | 'medication' | 'note';
  title: string;
  description: string;
  provider?: string;
}

// Uses: StaggeredList for events
// Uses: IconBox for event type
// Uses: Tooltip for provider info
```

**Specifications:**
- **Layout:** Vertical timeline with alternating sides
- **Events:** Color-coded by type
  - Appointment: `--primary-500`
  - Lab: `--info-500`
  - Medication: `--success-500`
  - Note: `--gray-500`
- **Expandable:** Click to see full details
- **Filter:** By date range or event type

#### 6.3 Appointment Booking (Patient)
```tsx
// Components: PatientAppointmentBooking, ProviderSelector, TimePicker
// File: src/components/patient/PatientAppointmentBooking.tsx

interface ProviderSelectorProps {
  providers: Provider[];
  selectedProvider?: Provider;
  onSelect: (provider: Provider) => void;
}

// Uses: HoverCard for provider profiles
// Uses: InteractiveButton for time selection
// Uses: PageTransition between steps
```

**Specifications:**
- **Step 1:** Select provider (photo, specialty, rating)
- **Step 2:** Choose date from calendar
- **Step 3:** Pick available time slot
- **Step 4:** Enter reason for visit
- **Step 5:** Confirm and book
- **Design:** Friendly, reassuring language

#### 6.4 Secure Messaging
```tsx
// Components: PatientMessaging, MessageThread, ComposeMessage
// File: src/components/patient/PatientMessaging.tsx

interface MessageThreadProps {
  provider: Provider;
  messages: Message[];
  onReply: (content: string) => void;
}

// Uses: StaggeredList for messages
// Uses: AnimatedInput for compose
// Uses: Toast for send confirmation
```

**Specifications:**
- **Layout:** Chat-style interface
- **Messages:** 
  - Patient: Right-aligned, `--primary-100` background
  - Provider: Left-aligned, `--gray-100` background
- **Features:**
  - Attach files (lab reports, photos)
  - Request prescription refills
  - Schedule follow-up
- **Privacy:** Clear indicators of secure transmission

#### 6.5 Test Results Viewer
```tsx
// Components: TestResultsViewer, ResultCard, ReferenceRange
// File: src/components/patient/TestResultsViewer.tsx

interface ResultCardProps {
  test: LabTest;
  result: number;
  unit: string;
  referenceRange: { min: number; max: number };
  status: 'normal' | 'abnormal' | 'critical';
}

// Uses: IconBox for test type
// Uses: Tooltip for explanations
// Uses: Alert for abnormal results
```

**Specifications:**
- **Display:** Clear, jargon-free explanations
- **Visual:** Color-coded results
  - Normal: `--success` with checkmark
  - Abnormal: `--warning` with explanation
  - Critical: `--destructive` with "Contact provider" prompt
- **Trend:** Simple graph showing history
- **Education:** "What does this mean?" expandable section

### Interaction Patterns

#### Viewing Test Results
1. **Notification:** `Toast` when new results available
2. **Access:** Click from dashboard or timeline
3. **Review:** Results displayed with explanations
4. **Abnormal:** Clear call-to-action if follow-up needed
5. **Questions:** Direct link to message provider
6. **Download:** Option to save PDF

#### Requesting Prescription Refill
1. **Current Meds:** List of active prescriptions
2. **Select:** Tap medication to refill
3. **Pharmacy:** Confirm or change pharmacy
4. **Request:** Submit with optional note
5. **Track:** Status updates (pending → approved → ready)
6. **Pickup:** Notification when ready

### Accessibility Considerations

- **Health Literacy:** Grade 6-8 reading level for all content
- **Anxiety Reduction:** Calm colors, reassuring language
- **Screen Readers:** 
  - Results: "Your blood sugar is 120, which is in the normal range"
  - Navigation: Clear landmarks and headings
- **Cognitive:** Simple, consistent layouts
- **Vision:** High contrast mode option

### Responsive Behavior

| Breakpoint | Layout Changes |
|------------|---------------|
| Desktop (>1024px) | Full dashboard, side-by-side messaging |
| Tablet (768-1024px) | Stacked layout, tabbed navigation |
| Mobile (<768px) | Mobile-optimized, bottom navigation, touch-friendly |

---

# Shared Components Across Roles

## Universal UI Elements

### 1. Navigation Components
```tsx
// Components: RoleSidebar, TopNavigation, Breadcrumb
// Files: src/components/navigation/

// All roles use:
// - Consistent sidebar width (280px desktop, 64px collapsed)
// - Role-specific color accent on active items
// - Icon + text labels (text hidden when collapsed)
```

### 2. Notification System
```tsx
// Components: NotificationCenter, NotificationItem
// Files: src/components/notifications/

// Features:
// - Real-time updates via WebSocket
// - Role-specific notification types
// - Priority-based sorting (critical first)
// - Mark as read/unread
```

### 3. Search Components
```tsx
// Components: GlobalSearch, SearchResults, FilterPanel
// Files: src/components/search/

// Features:
// - Command palette (Cmd+K)
// - Role-specific search scopes
// - Recent searches
// - Filter by type, date, status
```

### 4. Data Tables
```tsx
// Components: DataTable, TableHeader, TableRow, Pagination
// Files: src/components/data/

// Features:
// - Sortable columns
// - Filterable headers
// - Bulk actions
// - Export functionality
// - Responsive (cards on mobile)
```

---

# Integration with Design System

## Spacing System Usage

| Component | Spacing Application |
|-----------|-------------------|
| Cards | Padding: `--space-5`, Gap: `--space-4` |
| Forms | Field gap: `--space-4`, Section gap: `--space-6` |
| Tables | Row padding: `--space-3`, Cell gap: `--space-2` |
| Navigation | Item padding: `--space-3`, Gap: `--space-1` |
| Modals | Padding: `--space-6`, Header gap: `--space-4` |

## Color System Usage

| Role | Primary | Surface | Border | Hover |
|------|---------|---------|--------|-------|
| Admin | `--admin` | `--destructive-50` | `--destructive-200` | `--destructive-100` |
| Doctor | `--doctor` | `--info-50` | `--info-200` | `--info-100` |
| Nurse | `--nurse` | `--success-50` | `--success-200` | `--success-100` |
| Pharmacist | `--pharmacy` | Purple-50 | Purple-200 | Purple-100 |
| Receptionist | `--receptionist` | `--warning-50` | `--warning-200` | `--warning-100` |
| Patient | `--patient` | Teal-50 | Teal-200 | Teal-100 |

## Typography Usage

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Page Title | `text-3xl` | Bold (700) | 1.2 |
| Section Header | `text-xl` | Semibold (600) | 1.3 |
| Card Title | `text-lg` | Semibold (600) | 1.4 |
| Body Text | `text-base` | Normal (400) | 1.6 |
| Label | `text-sm` | Medium (500) | 1.5 |
| Caption | `text-xs` | Normal (400) | 1.5 |

## Micro-interactions Usage

| Interaction | Component | Animation |
|-------------|-----------|-----------|
| Button Press | `InteractiveButton` | Scale 0.98, lift on hover |
| Card Hover | `HoverCard` | Y: -4px, shadow increase |
| Input Focus | `AnimatedInput` | Border color + glow |
| List Load | `StaggeredList` | Fade + slide up, 50ms stagger |
| Notification | `Toast` | Slide in from right |
| Toggle | `AnimatedSwitch` | Spring animation |
| Badge Pulse | `PulseBadge` | Scale + opacity pulse |

---

# Implementation Roadmap

## Phase 1: Foundation (Week 1)
- [ ] Create role-specific layout components
- [ ] Implement navigation with role-based routing
- [ ] Set up color themes for each role

## Phase 2: Core Features (Weeks 2-3)
- [ ] Admin: User management, analytics dashboard
- [ ] Doctor: Patient chart, consultation interface
- [ ] Nurse: Assignment board, vital signs
- [ ] Pharmacist: Prescription queue, inventory
- [ ] Receptionist: Calendar, registration
- [ ] Patient: Dashboard, health timeline

## Phase 3: Polish (Week 4)
- [ ] Add micro-interactions to all components
- [ ] Implement responsive layouts
- [ ] Accessibility audit and fixes
- [ ] Performance optimization

## Phase 4: Integration (Week 5)
- [ ] Connect to backend APIs
- [ ] Real-time updates (WebSocket)
- [ ] Cross-role notifications
- [ ] End-to-end testing

---

# Success Metrics

### Usability
- Task completion rate > 95%
- Time on task reduced by 30%
- User satisfaction score > 4.5/5

### Accessibility
- WCAG 2.1 AA compliance
- Screen reader compatibility
- Keyboard navigation complete

### Performance
- First contentful paint < 1.5s
- Time to interactive < 3s
- Lighthouse score > 90

---

**Document Version:** 1.0
**Last Updated:** 2026-01-28
**Status:** Ready for Implementation