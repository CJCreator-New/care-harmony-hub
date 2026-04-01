# Video Workflow Recordings - Quick Start Guide

## Overview

This guide explains how to generate video recordings of the complete E2E workflow for each of the 7 roles in CareSync HIMS:
- 👨‍💼 Receptionist
- 👩‍⚕️ Nurse  
- 👨‍⚕️ Doctor
- 💊 Pharmacist
- 🧪 Lab Technician
- 🧑‍🦽 Patient
- 🔐 Administrator

Each video captures the complete patient workflow from that role's perspective, showing all major actions and screens they interact with.

## Prerequisites

Ensure you have:
- ✅ Node.js and npm installed
- ✅ Playwright dependencies installed (`npm ci`)
- ✅ Development server running or ability to start it
- ✅ At least 2 GB free disk space (for 7 videos)

## Running the Video Recordings

### Option 1: Run All Role Videos (Recommended)

```bash
npx playwright test tests/e2e/video-workflow-recordings.spec.ts --workers=1
```

**What this does:**
- Records 7 separate video files (one per role)
- Takes ~3-5 minutes total
- Saves videos and screenshots to `tests/e2e/.recordings/`
- Generates 50+ screenshots from each workflow

### Option 2: Run Single Role Video

```bash
# Run only receptionist workflow
npx playwright test tests/e2e/video-workflow-recordings.spec.ts -g "Receptionist"

# Run only doctor workflow
npx playwright test tests/e2e/video-workflow-recordings.spec.ts -g "Doctor"

# Other roles: Nurse, Pharmacist, Lab Technician, Patient, Administrator
```

### Option 3: Run with Detailed Reporting

```bash
npx playwright test tests/e2e/video-workflow-recordings.spec.ts --reporter=html,list
```

## Output Structure

After running, you'll find videos and screenshots in `tests/e2e/.recordings/`:

```
.recordings/
├── receptionist-complete-workflow.webm       # Full video
├── receptionist-01-dashboard.png
├── receptionist-02-queue.png
├── receptionist-03-checkin.png
├── ... (more screenshots)
├── nurse-complete-workflow.webm
├── nurse-01-dashboard.png
├── ... (50+ files total)
├── doctor-complete-workflow.webm
├── pharmacist-complete-workflow.webm
├── labtech-complete-workflow.webm
├── patient-complete-workflow.webm
└── admin-complete-workflow.webm
```

## Workflow Details

### 📽️ What Each Video Shows

#### 1. RECEPTIONIST WORKFLOW (7 steps)
- Dashboard overview
- Patient check-in queue
- Check-in process
- Patient registration form
- New patient workflow
- Vitals assignment
- Queue management

#### 2. NURSE WORKFLOW (7 steps)
- Dashboard overview
- Patient vitals queue
- Vital signs recording
- Patient detail view
- Monitoring dashboard
- Critical alerts system
- Patient escalation

#### 3. DOCTOR WORKFLOW (9 steps)
- Dashboard overview
- Consultation queue
- Patient consultation
- Medical history review
- Diagnosis recording
- Prescription creation
- Lab order placement
- Order submission
- Workflow completion

#### 4. PHARMACIST WORKFLOW (8 steps)
- Dashboard overview
- Pending prescriptions
- Prescription review
- Drug interaction check
- Prescription approval
- Medication dispensing
- Batch/expiry tracking
- Inventory management

#### 5. LAB TECHNICIAN WORKFLOW (7 steps)
- Dashboard overview
- Pending lab orders
- Order processing
- Lab results entry
- Multiple result types
- Critical value flagging
- Quality control review

#### 6. PATIENT WORKFLOW (8 steps)
- Patient portal login
- Appointment viewing
- Appointment booking
- Medical records access
- Prescription viewing
- Prescription download
- Lab results viewing
- Health summary

#### 7. ADMINISTRATOR WORKFLOW (9 steps)
- Admin dashboard
- User management interface
- New user creation
- System configuration
- Reports generation
- Report customization
- Patient statistics
- System health monitoring
- Audit logs review

## Video Specifications

- **Format:** WebM (VP9 codec)
- **Resolution:** 1920x1080 (Full HD)
- **Frame Rate:** 30 FPS
- **Estimated Size:** 50-100 MB per video
- **Total Size:** ~700 MB for all 7 videos

## Using the Videos

### For Documentation
```markdown
# Patient Workflow - Doctor Perspective
![Doctor Dashboard](tests/e2e/.recordings/doctor-01-dashboard.png)
Watch the complete workflow: [Doctor Video](tests/e2e/.recordings/doctor-complete-workflow.webm)
```

### For Training
1. Create a training playlist with all 7 videos
2. Use screenshots in onboarding documentation
3. Share with team members to understand role-based workflows

### For Demos/Presentations
1. Play videos at 1.5-2x speed for demos
2. Combine videos with audio narration
3. Use screenshots in slide decks

### For Bug Reporting
```
Bug: Prescription not showing in pharmacist queue
Environment: CareSync HIMS v2.1
Reproduction: See doctor-07-prescription-sent.webm followed by pharmacist-02-prescriptions.webm
Expected: Prescription should appear within 5 seconds
Actual: Prescription not visible after 30 seconds
```

## Troubleshooting

### Videos are too large
Videos are recorded in full 1080p. To reduce size, use:
```bash
# Configure in playwright.config.ts:
recordVideo: {
  dir: 'tests/e2e/.recordings',
  size: { width: 1280, height: 720 }, // Reduced from 1920x1080
}
```

### Credentials not working
Ensure test mode credentials are set up correctly:
- Email: `{role}@caresync.local`
- Password: `testpass123`
- These must match your test fixtures

### Elements not found
The test uses `data-testid` attributes. If elements aren't found:
1. Check that test mode is enabled
2. Verify components have correct testid attributes
3. Check for CSS selectors vs testid mismatches

### Video recording fails
- **Cause:** Browser crashes or low memory
- **Solution:** Run with `--workers=1` (single worker)
- **Memory:** Close other apps, clear temp files

### Slow performance
If recordings are taking too long:
```bash
# Skip some steps by modifying the spec file
# Comment out non-critical workflows
# Or run individual roles separately
```

## Configuration Options

### Customize Video Resolution
Edit [video-workflow-recordings.spec.ts](video-workflow-recordings.spec.ts#L156):

```typescript
recordVideo: {
  dir: 'tests/e2e/.recordings',
  size: { width: 1920, height: 1080 }, // Adjust here
}
```

### Add Custom Workflows
```typescript
// Add to ROLES array
{ name: 'billing', displayName: 'Billing Manager' }

// Add credentials
billing: { email: 'billing@caresync.local', password: 'testpass123' }

// Add workflow function
async function billingWorkflow(page: Page) {
  // ... your steps
}

// Add to switch statement
case 'billing':
  await billingWorkflow(page);
  break;
```

## Integration with CI/CD

Run video recordings in your CI/CD pipeline:

```yaml
# .github/workflows/video-docs.yml
name: Generate E2E Video Documentation

on: [push]

jobs:
  record-videos:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright test tests/e2e/video-workflow-recordings.spec.ts
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: workflow-videos
          path: tests/e2e/.recordings/
```

## Limitations & Known Issues

- ⚠️ Test mode must be enabled (uses mock API)
- ⚠️ Videos capture user interactions, not real-time data
- ⚠️ Performance varies based on system resources
- ⚠️ Some async operations may not be captured (API delays)
- ⚠️ Screenshot filenames use testid attributes

## Next Steps

1. **Run the videos:** `npm run test:e2e -- tests/e2e/video-workflow-recordings.spec.ts`
2. **Check output:** Open `tests/e2e/.recordings/` directory
3. **Review screenshots:** Start with `{role}-01-dashboard.png` files
4. **View videos:** Play `.webm` files in Chrome, Firefox, or VLC
5. **Share results:** Use screenshots and videos in documentation/training

## Support

For issues:
- Check [Playwright Documentation](https://playwright.dev/docs/api/class-videooptions)
- Review test output via `--reporter=html` 
- Check browser logs in DevTools screenshots
- Verify testid attributes in component code

---

**Generated:** April 1, 2026  
**Test Suite:** video-workflow-recordings.spec.ts  
**Total Roles:** 7  
**Expected Duration:** 3-5 minutes
