# Video Workflow Recordings - Fixed with Real Workflows

## Issue Fixed

The previous video recordings were only showing basic UI navigation (landing page, login, dashboard). They did NOT show the actual end-to-end workflows that each role performs.

## Solution Implemented

Created `video-workflow-recording-complete.spec.ts` that records ACTUAL workflow interactions for each role:

### 7 Complete Role Workflows Now Included

#### 1. **RECEPTIONIST** - Patient Check-in & Registration
- Dashboard overview
- Opens patient queue/check-in area
- Fills out complete new patient registration form
- Enters patient demographics (name, email, phone, DOB)
- Submits registration
- Opens vitals recording interface

**What you'll see in video:** Full patient registration workflow from start to finish

---

#### 2. **NURSE** - Vitals Recording & Monitoring
- Opens vitals queue showing waiting patients
- Selects patient from queue
- Records vital signs (BP, temp, heart rate, respiratory rate)
- Submits vitals to system
- Views patient monitoring dashboard
- Checks alerts and escalations

**What you'll see in video:** Complete vitals entry and patient monitoring workflow

---

#### 3. **DOCTOR** - Consultation & Prescribing
- Opens consultation queue
- Selects patient for consultation
- Enters diagnosis/chief complaint
- Creates prescription with medication details (drug, dose, frequency)
- Sends prescription to pharmacy
- Orders lab tests (CBC, metabolic panel)
- Submits lab orders

**What you'll see in video:** Full consultation workflow including diagnosis and prescriptions

---

#### 4. **PHARMACIST** - Prescription & Dispensing
- Views pending prescriptions queue
- Reviews prescription details
- Approves prescription
- Dispenses medication with batch number and expiry
- Views inventory levels

**What you'll see in video:** Complete prescription review to dispensing workflow

---

#### 5. **LAB TECHNICIAN** - Lab Processing & Results
- Opens lab orders queue
- Selects order to process
- Enters lab results (WBC, RBC, hemoglobin, glucose, etc.)
- Submits results
- Checks for critical values
- Quality control review

**What you'll see in video:** Full lab order processing and results entry workflow

---

#### 6. **PATIENT** - Portal Access & Health Management
- Accesses patient portal
- Views appointments list
- Books new appointment (selects doctor, enters reason)
- Views prescriptions
- Accesses lab results
- Views health summary

**What you'll see in video:** Patient self-service workflow for appointments and health information

---

#### 7. **ADMINISTRATOR** - System Management
- Opens user management interface
- Creates new user account with email and role assignment
- Accesses system configuration
- Views reports interface
- Generates patient report
- Monitors system health

**What you'll see in video:** Admin operational and management workflows

---

## How to Generate Videos with Real Workflows

### Generate All Workflow Videos
```bash
npx playwright test tests/e2e/video-workflow-recording-complete.spec.ts --workers=1
```

### Generate Single Role Video
```bash
# Receptionist only
npx playwright test tests/e2e/video-workflow-recording-complete.spec.ts -g "Receptionist" --workers=1

# Doctor only
npx playwright test tests/e2e/video-workflow-recording-complete.spec.ts -g "Doctor" --workers=1

# Other roles: Nurse, Pharmacist, Lab Technician, Patient, Administrator
```

### With HTML Report
```bash
npx playwright test tests/e2e/video-workflow-recording-complete.spec.ts --workers=1 --reporter=html
```

---

## Output Files

Videos will be saved to `tests/e2e/.recordings/`:

```
.recordings/
├── receptionist-01-dashboard.png
├── receptionist-02-queue.png
├── receptionist-03-registration-form.png
├── receptionist-04-form-filled.png
├── receptionist-05-patient-registered.png
├── receptionist-06-vitals-screen.png
├── receptionist-complete-workflow.webm (full video)
├── nurse-01-dashboard.png
├── nurse-02-vitals-queue.png
├── ... (screenshots for each step)
├── nurse-complete-workflow.webm
├── doctor-complete-workflow.webm
├── pharmacist-complete-workflow.webm
├── labtech-complete-workflow.webm
├── patient-complete-workflow.webm
└── admin-complete-workflow.webm
```

---

## Key Improvements Over Previous Version

| Aspect | Previous Version | New Version |
|--------|------------------|------------|
| **Content** | Basic UI navigation | Complete end-to-end workflows |
| **User Actions** | Page clicks only | Form fills, data entry, workflow steps |
| **Business Logic** | Not shown | Complete business processes |
| **Value** | Limited (UI only) | High (shows actual work) |
| **Screenshots** | Generic pages | Workflow-specific steps |
| **Use Case** | Overview only | Training, documentation, demos |

---

## What Each Video Demonstrates

### Receptionist Video Shows:
✅ How to register new patients
✅ Complete patient intake process
✅ Managing check-in queue
✅ Assigning patients to nursing tasks

### Nurse Video Shows:
✅ How to record vital signs
✅ Reading patient data from queue
✅ Monitoring patient status
✅ Using monitoring dashboard

### Doctor Video Shows:
✅ Full consultation workflow
✅ Entering diagnoses
✅ Writing prescriptions with proper details
✅ Ordering laboratory tests
✅ Managing patient orders

### Pharmacist Video Shows:
✅ Reviewing prescriptions
✅ Approval process
✅ Dispensing medications
✅ Tracking medication inventory

### Lab Technician Video Shows:
✅ Processing lab orders
✅ Entering test results
✅ Quality control checks
✅ Critical value flagging

### Patient Video Shows:
✅ Booking appointments
✅ Viewing medical history
✅ Accessing prescriptions
✅ Reviewing test results

### Admin Video Shows:
✅ User account management
✅ System configuration
✅ Report generation
✅ System health monitoring

---

## Prerequisites for Full Functionality

To have videos with fully populated data:
1. **Development server running:** `npm run dev`
2. **Database seeded:** with test users and patients
3. **Authentication configured:** mock auth in place
4. **Ready time:** 5-10 minutes for all 7 roles

If dev server is NOT running:
- Videos will still generate (1-2 seconds each)
- But UI will show connection errors
- Screenshots will be blank/error pages
- For actual workflows, ensure server is running

---

## Usage Examples

### For Staff Training
```
1. Run: npx playwright test tests/e2e/video-workflow-recording-complete.spec.ts --workers=1
2. Share doctor-complete-workflow.webm with new doctors
3. They watch complete workflow before starting
4. Reference pharmacist video for questions
```

### For Documentation
```
Embed in wiki:
![Pharmacist Workflow](tests/e2e/.recordings/pharmacist-02-prescriptions.png)
Watch: [Complete Pharmacist Workflow](tests/e2e/.recordings/pharmacist-complete-workflow.webm)
```

### For System Demos
```
1. Play nurse-complete-workflow.webm during demo
2. Pause at key steps to explain features
3. Show cross-role data flow (Doctor → Pharmacist → Patient)
4. Demonstrate system response times
```

### For QA/Testing
```
Compare current videos against previous:
- Verify workflows still work after code changes
- Check UI hasn't broken
- Validate business process execution
- Confirm data flows between roles
```

---

## Troubleshooting

### Videos Show Connection Errors
**Cause:** Dev server not running  
**Solution:** `npm run dev` before running tests

### Form fields not filling
**Cause:** Element selectors don't match current UI  
**Solution:** Update selectors in test to match current HTML

### Videos are very short (1-2 seconds)
**Cause:** Dev server down or authentication failed  
**Solution:** Check console for errors, verify mock auth setup

### No videos generated at all
**Cause:** Test failed to run  
**Solution:** `npx playwright test tests/e2e/video-workflow-recording-complete.spec.ts --reporter=list` to see errors

---

## File Structure

```
tests/e2e/
├── video-workflow-recording-complete.spec.ts    ← Main test (THIS FILE)
├── video-workflow-recordings-simple.spec.ts     ← Basic version (navigation only)
├── video-workflow-recordings.spec.ts            ← Original template
├── .recordings/
│   ├── *.webm                                   ← Generated videos
│   └── *.png                                    ← Generated screenshots
└── VIDEO_WORKFLOW_GUIDE.md                      ← Setup guide
```

---

## Next Steps

1. **Start dev server:** `npm run dev`
2. **Generate videos:** `npx playwright test tests/e2e/video-workflow-recording-complete.spec.ts --workers=1`
3. **Review videos:** Open `tests/e2e/.recordings/` folder
4. **Share results:** Upload videos to training/wiki system
5. **Schedule regeneration:** Run after major UI changes

---

**Test File:** `tests/e2e/video-workflow-recording-complete.spec.ts`  
**Generated:** April 1, 2026  
**Status:** Fixed - Now showing complete workflows with real interactions
