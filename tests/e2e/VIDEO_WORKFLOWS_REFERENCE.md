# Video Workflow Recordings - Complete Reference

## 📹 Generate All Role Videos

```bash
npx playwright test tests/e2e/video-workflow-recordings.spec.ts --workers=1
```

---

## 📊 7-Role Complete Workflow Overview

### Role Matrix: Who Does What

| Role | Check-in | Vitals | Diagnosis | Prescription | Lab | Dispensing | Results |
|------|:--------:|:------:|:---------:|:------------:|:---:|:----------:|:-------:|
| 👨‍💼 Receptionist | ✅ | ➡️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| 👩‍⚕️ Nurse | ❌ | ✅ | ➡️ | ❌ | ❌ | ❌ | ❌ |
| 👨‍⚕️ Doctor | ❌ | ⬅️ | ✅ | ✅ | ✅ | ❌ | ❌ |
| 💊 Pharmacist | ❌ | ❌ | ⬅️ | ✅ | ❌ | ✅ | ❌ |
| 🧪 Lab Tech | ❌ | ❌ | ❌ | ⬅️ | ✅ | ❌ | ✅ |
| 🧑‍🦽 Patient | ❌ | ❌ | ⬅️ | ⬅️ | ❌ | ⬅️ | ✅ |
| 🔐 Admin | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ | 👁️ |

**Legend:**
- ✅ = Primary action
- ➡️ = Assigns to next role
- ⬅️ = Receives from previous role
- ❌ = No access
- 👁️ = View-only (Admin)

---

## 🎬 Individual Role Videos

### 1. 👨‍💼 RECEPTIONIST WORKFLOW VIDEO

**Run single video:**
```bash
npx playwright test tests/e2e/video-workflow-recordings.spec.ts -g "Receptionist"
```

**What you'll see (7 steps):**
1. Dashboard with patient queue overview
2. Check-in queue with waiting patients
3. Patient check-in process
4. New patient registration form
5. Registration data entry
6. Vitals queue assignment
7. Patient handoff to nurse

**Key screens:**
- `receptionist-01-dashboard.png` - Overview dashboard
- `receptionist-02-queue.png` - Check-in queue
- `receptionist-03-checkin.png` - Active check-in
- `receptionist-04-patients.png` - Patient list
- `receptionist-05-registered.png` - New patient confirmed
- `receptionist-06-vitals-queue.png` - Vitals assignment

**Duration:** 30-45 seconds  
**File:** `receptionist-complete-workflow.webm`

---

### 2. 👩‍⚕️ NURSE WORKFLOW VIDEO

**Run single video:**
```bash
npx playwright test tests/e2e/video-workflow-recordings.spec.ts -g "Nurse"
```

**What you'll see (7 steps):**
1. Nurse dashboard with vitals queue
2. Patient queue with pending vitals
3. Patient selection from queue
4. Vital signs recording form
5. Data entry (BP, Temp, HR, SpO2, RR)
6. Vitals saved confirmation
7. Patient monitoring dashboard

**Key screens:**
- `nurse-01-dashboard.png` - Nurse dashboard
- `nurse-02-queue.png` - Vitals work queue
- `nurse-03-patient-detail.png` - Patient detail view
- `nurse-04-vitals-form.png` - Vitals data entry
- `nurse-05-vitals-recorded.png` - Confirmation
- `nurse-06-monitoring.png` - Monitoring dashboard
- `nurse-07-alerts.png` - Alert system

**Critical vitals recorded:**
- Systolic: 120 mmHg
- Diastolic: 80 mmHg
- Temperature: 37.0°C
- Heart Rate: 72 bpm
- Respiratory Rate: 16/min
- SpO2: 98%

**Duration:** 45-60 seconds  
**File:** `nurse-complete-workflow.webm`

---

### 3. 👨‍⚕️ DOCTOR WORKFLOW VIDEO

**Run single video:**
```bash
npx playwright test tests/e2e/video-workflow-recordings.spec.ts -g "Doctor"
```

**What you'll see (9 steps):**
1. Doctor dashboard with consultation queue
2. Waiting patients in consultation queue
3. Patient consultation initiation
4. Patient medical history review
5. Diagnosis recording
6. Prescription creation
7. Prescription submission to pharmacy
8. Lab order creation
9. Lab order submission to laboratory

**Key screens:**
- `doctor-01-dashboard.png` - Doctor dashboard
- `doctor-02-queue.png` - Consultation queue
- `doctor-03-consultation.png` - Active consultation
- `doctor-04-history.png` - Medical history
- `doctor-05-diagnosis.png` - Diagnosis entry
- `doctor-06-prescription.png` - Prescription form
- `doctor-07-prescription-sent.png` - Prescription sent
- `doctor-08-lab-order.png` - Lab order form
- `doctor-09-labs-ordered.png` - Orders submitted

**Services ordered:**
- Medication: Lisinopril 10mg, once daily, 30 days
- Lab tests: CBC, Metabolic Panel

**Duration:** 60-90 seconds  
**File:** `doctor-complete-workflow.webm`

---

### 4. 💊 PHARMACIST WORKFLOW VIDEO

**Run single video:**
```bash
npx playwright test tests/e2e/video-workflow-recordings.spec.ts -g "Pharmacist"
```

**What you'll see (8 steps):**
1. Pharmacy dashboard with pending prescriptions
2. Pending prescriptions list
3. Prescription selection and review
4. Drug interaction checking
5. Prescription approval
6. Medication dispensing process
7. Batch number and expiry entry
8. Inventory tracking update

**Key screens:**
- `pharmacist-01-dashboard.png` - Pharmacy dashboard
- `pharmacist-02-prescriptions.png` - Prescription list
- `pharmacist-03-prescription-detail.png` - Detail view
- `pharmacist-04-interactions.png` - Interaction check
- `pharmacist-05-approved.png` - Approval confirmed
- `pharmacist-06-dispense.png` - Dispensing form
- `pharmacist-07-dispensed.png` - Dispensing confirmed
- `pharmacist-08-inventory.png` - Inventory update

**Dispensing data:**
- Batch: BATCH-2026-001
- Expiry: 2028-12-31

**Duration:** 60-90 seconds  
**File:** `pharmacist-complete-workflow.webm`

---

### 5. 🧪 LAB TECHNICIAN WORKFLOW VIDEO

**Run single video:**
```bash
npx playwright test tests/e2e/video-workflow-recordings.spec.ts -g "Lab Technician"
```

**What you'll see (7 steps):**
1. Lab dashboard with pending orders
2. Lab orders queue
3. Order selection and processing
4. Lab results entry form
5. Multiple result data entry
6. Critical value flagging
7. Quality control review

**Key screens:**
- `labtech-01-dashboard.png` - Lab dashboard
- `labtech-02-orders.png` - Order queue
- `labtech-03-order-detail.png` - Order detail
- `labtech-04-results.png` - Results form
- `labtech-05-results-entered.png` - Results confirmed
- `labtech-06-critical-values.png` - Critical value check
- `labtech-07-qc.png` - QC review

**Lab results entered:**
- WBC: 7.5 K/μL
- RBC: 4.8 M/μL
- Hemoglobin: 14.5 g/dL
- Glucose: 95 mg/dL
- Creatinine: 0.8 mg/dL

**Duration:** 45-60 seconds  
**File:** `labtech-complete-workflow.webm`

---

### 6. 🧑‍🦽 PATIENT WORKFLOW VIDEO

**Run single video:**
```bash
npx playwright test tests/e2e/video-workflow-recordings.spec.ts -g "Patient"
```

**What you'll see (8 steps):**
1. Patient portal dashboard
2. Appointments view
3. Appointment booking interface
4. Doctor selection
5. Appointment confirmation
6. Medical records access
7. Prescription viewing and download
8. Lab results and health summary

**Key screens:**
- `patient-01-dashboard.png` - Patient portal
- `patient-02-appointments.png` - Appointments list
- `patient-03-book-appointment.png` - Booking form
- `patient-04-records.png` - Medical records
- `patient-05-prescriptions.png` - Prescription list
- `patient-06-download.png` - Download action
- `patient-07-lab-results.png` - Lab results
- `patient-08-health-summary.png` - Health summary

**Patient actions:**
- View upcoming appointments
- Book new follow-up checkup
- Access medical history
- Download active prescriptions
- View recent lab results

**Duration:** 60-90 seconds  
**File:** `patient-complete-workflow.webm`

---

### 7. 🔐 ADMINISTRATOR WORKFLOW VIDEO

**Run single video:**
```bash
npx playwright test tests/e2e/video-workflow-recordings.spec.ts -g "Administrator"
```

**What you'll see (9 steps):**
1. Admin dashboard overview
2. User management interface
3. Create new user
4. New user role assignment
5. System configuration access
6. Reports generation interface
7. Report type and date selection
8. System health monitoring
9. Audit logs review

**Key screens:**
- `admin-01-dashboard.png` - Admin dashboard
- `admin-02-users.png` - User management
- `admin-03-new-user.png` - New user creation
- `admin-04-settings.png` - Configuration
- `admin-05-reports.png` - Reports interface
- `admin-06-report-config.png` - Report setup
- `admin-07-report-generated.png` - Report result
- `admin-08-system-health.png` - System health
- `admin-09-audit-logs.png` - Audit logs

**Admin capabilities:**
- User account management
- Role assignment
- System configuration
- Report generation
- Performance monitoring
- Audit trail review

**Duration:** 90-120 seconds  
**File:** `admin-complete-workflow.webm`

---

## 🚀 Quick Start Examples

### Scenario 1: Complete Patient Journey (All Roles)
```bash
# Record all 7 role workflows
npx playwright test tests/e2e/video-workflow-recordings.spec.ts --workers=1

# View results
ls tests/e2e/.recordings/*.webm

# Total time: ~5 minutes
# Total files: 7 videos + 50+ screenshots
```

### Scenario 2: Clinical Workflow Only (Doctor → Lab → Pharmacy)
```bash
# Run specific roles
npx playwright test tests/e2e/video-workflow-recordings.spec.ts -g "Doctor|Pharmacist|Lab"

# Total time: ~3 minutes
```

### Scenario 3: Single Role Deep Dive
```bash
# Focus on doctor's workflow
npx playwright test tests/e2e/video-workflow-recordings.spec.ts -g "Doctor"

# Analyze doctor-*.png screenshots in detail
```

### Scenario 4: Generate for Documentation
```bash
# Generate with HTML report
npx playwright test tests/e2e/video-workflow-recordings.spec.ts \
  --reporter=html \
  --output=readme-videos

# View HTML report
npx playwright show-report
```

---

## 📋 Video Output Files

Each role generates:
- **1 WebM video file** (~50-100 MB) - Full workflow recording
- **6-9 PNG screenshots** - Key workflow steps

**Total deliverables:**
- 7 WebM videos
- ~50 PNG screenshots
- 57 total files
- ~600 MB total size

---

## 🎯 Use Cases

### Training & Onboarding
1. New staff watches their role's video
2. Reviews associated screenshots
3. Understands complete workflow context

### Demo & Presentations
1. Play patient-flow.webm during demo
2. Pause to explain key decision points
3. Show cross-role handoffs

### Documentation & Wiki
```markdown
# Doctor Workflow
Watch: [Complete Doctor Workflow](doctor-complete-workflow.webm)
Steps:
1. [Dashboard](doctor-01-dashboard.png)
2. [Consultation Queue](doctor-02-queue.png)
3. ...
```

### Bug Reporting & QA
Include relevant video segments when reporting issues:
```
Bug: Prescription not visible to pharmacist
Video: doctor-complete-workflow.webm (0:45-1:10)
Expected: Prescription appears in pharmacist queue within 5 sec
Actual: Not appearing after 2 minutes
```

### System Validation
Compare video workflows against documented requirements:
- [ ] All steps executed successfully
- [ ] No error messages
- [ ] Data persisted correctly
- [ ] RBAC enforced (blocked actions shown)

---

## ⚙️ Configuration

### Video Quality Settings

```typescript
// In video-workflow-recordings.spec.ts
recordVideo: {
  dir: 'tests/e2e/.recordings',
  size: { width: 1920, height: 1080 }, // Full HD
}
```

### Output Formats
- **Video:** WebM (VP9 codec, H.264 fallback)
- **Screenshots:** PNG (portable, lossless)
- **Metadata:** JSON (Playwright test results)

### Retention Policy
- **Keep videos:** 30 days (for demos/training)
- **Archive:** Upload to secure storage after 30 days
- **Snapshots:** Keep indefinitely for documentation

---

## 🔍 Verifying Video Quality

After generation, verify:

```bash
# Check video files exist
ls -lh tests/e2e/.recordings/*.webm

# Expected output (example):
# admin-complete-workflow.webm          (95 MB)
# doctor-complete-workflow.webm         (88 MB)
# labtech-complete-workflow.webm        (76 MB)
# nurse-complete-workflow.webm          (82 MB)
# patient-complete-workflow.webm        (71 MB)
# pharmacist-complete-workflow.webm     (84 MB)
# receptionist-complete-workflow.webm   (68 MB)

# Check all screenshots captured
find tests/e2e/.recordings -name "*.png" | wc -l
# Expected: ~50 files

# Verify video playback
ffmpeg -i tests/e2e/.recordings/receptionist-complete-workflow.webm -f null -

# (Output should show "time=00:00:45" or similar with no errors)
```

---

## 📞 Support & Troubleshooting

**Videos not generating?**
- Check: `npx playwright test tests/e2e/video-workflow-recordings.spec.ts --debug`
- Review: Test output for specific error messages
- Verify: All `data-testid` attributes present in components

**Videos too large?**
- Reduce resolution in config: `size: { width: 1280, height: 720 }`
- Or delete old videos: `rm -rf tests/e2e/.recordings/*.webm`

**Playback issues?**
- Use VLC Media Player (supports all codecs)
- Or convert with: `ffmpeg -i input.webm -c copy output.mp4`

---

## 📌 Related Documentation

- [VIDEO_WORKFLOW_GUIDE.md](VIDEO_WORKFLOW_GUIDE.md) - Detailed guide
- [E2E_TEST_EXECUTION_REPORT.md](../E2E_TEST_EXECUTION_REPORT.md) - Test results
- [PATIENT_FLOW_IMPLEMENTATION_REPORT.md](PATIENT_FLOW_IMPLEMENTATION_REPORT.md) - Implementation details
- [README.md](../../README.md) - Project overview

---

**Generated:** April 1, 2026  
**Test File:** [video-workflow-recordings.spec.ts](video-workflow-recordings.spec.ts)  
**Guide:** [VIDEO_WORKFLOW_GUIDE.md](VIDEO_WORKFLOW_GUIDE.md)  
**Total Roles:** 7  
**Expected Runtime:** 3-5 minutes  
**Storage Required:** ~600 MB
