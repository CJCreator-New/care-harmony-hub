import { test, expect, Page, BrowserContext } from '@playwright/test';
import { enableTestMode, installMockApi } from './utils';

/**
 * VIDEO WORKFLOW RECORDINGS - COMPLETE E2E FOR ALL ROLES
 * 
 * Captures video recordings of the complete patient workflow as experienced by each role.
 * Each video shows the full journey from that role's perspective:
 * 
 * 1. RECEPTIONIST: Patient check-in → Registration → Vitals assignment
 * 2. NURSE: Vitals recording → Patient monitoring → Escalation alerts
 * 3. DOCTOR: Patient queue → Diagnosis → Prescription creation
 * 4. PHARMACIST: Prescription review → Medicine dispensing → Inventory tracking
 * 5. LAB TECHNICIAN: Lab orders → Result entry → Critical value alerts
 * 6. PATIENT: Portal login → Appointment booking → Results viewing
 * 7. ADMIN: User management → System configuration → Report generation
 * 
 * Videos are saved to: tests/e2e/.recordings/{role}-complete-workflow.webm
 * 
 * Run with: npx playwright test video-workflow-recordings.spec.ts
 */

const ROLES = [
  { name: 'receptionist', displayName: 'Receptionist' },
  { name: 'nurse', displayName: 'Nurse' },
  { name: 'doctor', displayName: 'Doctor' },
  { name: 'pharmacist', displayName: 'Pharmacist' },
  { name: 'labtech', displayName: 'Lab Technician' },
  { name: 'patient', displayName: 'Patient' },
  { name: 'admin', displayName: 'Administrator' },
];

// Mock credentials for each role
const roleCredentials: Record<string, { email: string; password: string }> = {
  receptionist: { email: 'receptionist@caresync.local', password: 'testpass123' },
  nurse: { email: 'nurse@caresync.local', password: 'testpass123' },
  doctor: { email: 'doctor@caresync.local', password: 'testpass123' },
  pharmacist: { email: 'pharmacist@caresync.local', password: 'testpass123' },
  labtech: { email: 'labtech@caresync.local', password: 'testpass123' },
  patient: { email: 'patient@caresync.local', password: 'testpass123' },
  admin: { email: 'admin@caresync.local', password: 'testpass123' },
};

test.describe('Complete Workflow Video Recordings - All Roles', () => {
  for (const role of ROLES) {
    test(`${role.displayName} - Complete Patient Workflow`, async ({
      browser,
      context: baseContext,
    }) => {
      console.log(`\n📹 Recording: ${role.displayName} Workflow\n`);

      // Create a new context with video recording enabled
      const context = await browser.newContext({
        recordVideo: {
          dir: 'tests/e2e/.recordings',
          size: { width: 1920, height: 1080 },
        },
      });

      const page = await context.newPage();

      try {
        // Setup test mode and API mocking
        await enableTestMode(page);
        await installMockApi(page);

        // Login as the role
        await loginAsRole(page, role.name);

        // Execute role-specific workflow
        switch (role.name) {
          case 'receptionist':
            await receptionistWorkflow(page);
            break;
          case 'nurse':
            await nurseWorkflow(page);
            break;
          case 'doctor':
            await doctorWorkflow(page);
            break;
          case 'pharmacist':
            await pharmacistWorkflow(page);
            break;
          case 'labtech':
            await labtechWorkflow(page);
            break;
          case 'patient':
            await patientWorkflow(page);
            break;
          case 'admin':
            await adminWorkflow(page);
            break;
        }

        console.log(`✅ Successfully recorded ${role.displayName} workflow`);
      } catch (error) {
        console.error(`❌ Error recording ${role.displayName} workflow:`, error);
        throw error;
      } finally {
        // Close context and save video
        await context.close();
      }
    });
  }
});

// ============================================================================
// ROLE-SPECIFIC WORKFLOWS
// ============================================================================

/**
 * RECEPTIONIST WORKFLOW
 * 1. Dashboard overview
 * 2. Patient check-in
 * 3. New patient registration
 * 4. Vitals assignment queue
 */
async function receptionistWorkflow(page: Page) {
  console.log('  📊 Loading receptionist dashboard...');
  await page.goto('/dashboard/receptionist');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/receptionist-01-dashboard.png' });

  // View check-in queue
  console.log('  👥 Opening patient check-in queue...');
  await page.click('[data-testid="menu-queue"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/receptionist-02-queue.png' });

  // Check in patient
  console.log('  ✓ Checking in new patient...');
  const checkinButton = await page.$('[data-testid="btn-checkin"]');
  if (checkinButton) {
    await checkinButton.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/e2e/.recordings/receptionist-03-checkin.png' });
  }

  // Register new patient
  console.log('  📝 Navigating to patient registration...');
  await page.click('[data-testid="menu-patients"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/receptionist-04-patients.png' });

  const registerButton = await page.$('[data-testid="btn-new-patient"]');
  if (registerButton) {
    await registerButton.click();
    await page.waitForLoadState('networkidle');

    // Fill registration form
    console.log('  📋 Filling patient registration form...');
    await fillPatientForm(page, {
      firstName: 'Demo',
      lastName: 'Patient',
      email: `demo-${Date.now()}@example.com`,
      phone: '555-0100',
      dob: '1990-01-15',
    });

    await page.click('[data-testid="btn-submit"]');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/e2e/.recordings/receptionist-05-registered.png' });
  }

  // View vitals queue
  console.log('  📈 Viewing vitals assignment queue...');
  await page.click('[data-testid="menu-vitals-queue"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/receptionist-06-vitals-queue.png' });
}

/**
 * NURSE WORKFLOW
 * 1. Patient vitals queue
 * 2. Record vital signs
 * 3. Monitor patient status
 * 4. Alert on critical values
 */
async function nurseWorkflow(page: Page) {
  console.log('  📊 Loading nurse dashboard...');
  await page.goto('/dashboard/nurse');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/nurse-01-dashboard.png' });

  // View vitals queue
  console.log('  👥 Viewing patient vitals queue...');
  await page.click('[data-testid="menu-queue"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/nurse-02-queue.png' });

  // Record vitals for first patient
  const firstPatient = await page.$('[data-testid="patient-queue-item"]');
  if (firstPatient) {
    console.log('  📊 Recording vital signs...');
    await firstPatient.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/e2e/.recordings/nurse-03-patient-detail.png' });

    // Fill vitals form
    const vitalsButton = await page.$('[data-testid="btn-record-vitals"]');
    if (vitalsButton) {
      await vitalsButton.click();
      await page.waitForLoadState('networkidle');

      // Enter vital signs
      await page.fill('[data-testid="input-systolic"]', '120');
      await page.fill('[data-testid="input-diastolic"]', '80');
      await page.fill('[data-testid="input-temperature"]', '37.0');
      await page.fill('[data-testid="input-heart-rate"]', '72');
      await page.fill('[data-testid="input-respiratory-rate"]', '16');
      await page.fill('[data-testid="input-spo2"]', '98');

      await page.screenshot({ path: 'tests/e2e/.recordings/nurse-04-vitals-form.png' });
      await page.click('[data-testid="btn-submit"]');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/.recordings/nurse-05-vitals-recorded.png' });
    }
  }

  // View patient monitoring dashboard
  console.log('  📺 Viewing patient monitoring dashboard...');
  await page.click('[data-testid="menu-monitoring"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/nurse-06-monitoring.png' });

  // Check alerts
  console.log('  🚨 Checking critical alerts...');
  const alertsButton = await page.$('[data-testid="menu-alerts"]');
  if (alertsButton) {
    await alertsButton.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/e2e/.recordings/nurse-07-alerts.png' });
  }
}

/**
 * DOCTOR WORKFLOW
 * 1. Patient consultation queue
 * 2. View patient history
 * 3. Order diagnosis/tests
 * 4. Create prescription
 */
async function doctorWorkflow(page: Page) {
  console.log('  📊 Loading doctor dashboard...');
  await page.goto('/dashboard/doctor');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/doctor-01-dashboard.png' });

  // View consultation queue
  console.log('  👥 Viewing consultation queue...');
  await page.click('[data-testid="menu-queue"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/doctor-02-queue.png' });

  // Start consultation with first patient
  const firstPatient = await page.$('[data-testid="patient-queue-item"]');
  if (firstPatient) {
    console.log('  💬 Starting patient consultation...');
    await firstPatient.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/e2e/.recordings/doctor-03-consultation.png' });

    // View patient history
    console.log('  📋 Reviewing patient medical history...');
    const historyTab = await page.$('[data-testid="tab-history"]');
    if (historyTab) {
      await historyTab.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/.recordings/doctor-04-history.png' });
    }

    // Record diagnosis
    console.log('  🔍 Recording diagnosis...');
    const diagnosisButton = await page.$('[data-testid="btn-record-diagnosis"]');
    if (diagnosisButton) {
      await diagnosisButton.click();
      await page.waitForLoadState('networkidle');
      await page.fill('[data-testid="input-diagnosis"]', 'Hypertension');
      await page.fill('[data-testid="input-chief-complaint"]', 'Blood pressure monitoring');
      await page.screenshot({ path: 'tests/e2e/.recordings/doctor-05-diagnosis.png' });
      await page.click('[data-testid="btn-submit"]');
      await page.waitForLoadState('networkidle');
    }

    // Create prescription
    console.log('  💊 Creating prescription...');
    const prescriptionButton = await page.$('[data-testid="btn-new-prescription"]');
    if (prescriptionButton) {
      await prescriptionButton.click();
      await page.waitForLoadState('networkidle');
      await page.fill('[data-testid="input-medication"]', 'Lisinopril');
      await page.fill('[data-testid="input-dose"]', '10mg');
      await page.fill('[data-testid="input-frequency"]', 'Once daily');
      await page.fill('[data-testid="input-duration"]', '30 days');
      await page.screenshot({ path: 'tests/e2e/.recordings/doctor-06-prescription.png' });
      await page.click('[data-testid="btn-submit"]');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/.recordings/doctor-07-prescription-sent.png' });
    }

    // Order lab tests
    console.log('  🧪 Ordering lab tests...');
    const labButton = await page.$('[data-testid="btn-order-labs"]');
    if (labButton) {
      await labButton.click();
      await page.waitForLoadState('networkidle');
      await page.click('[data-testid="checkbox-CBC"]');
      await page.click('[data-testid="checkbox-metabolic-panel"]');
      await page.screenshot({ path: 'tests/e2e/.recordings/doctor-08-lab-order.png' });
      await page.click('[data-testid="btn-submit"]');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/.recordings/doctor-09-labs-ordered.png' });
    }
  }
}

/**
 * PHARMACIST WORKFLOW
 * 1. Pending prescriptions queue
 * 2. Review and approve prescriptions
 * 3. Dispense medication
 * 4. Track inventory
 */
async function pharmacistWorkflow(page: Page) {
  console.log('  📊 Loading pharmacist dashboard...');
  await page.goto('/dashboard/pharmacy');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/pharmacist-01-dashboard.png' });

  // View pending prescriptions
  console.log('  💊 Viewing pending prescriptions...');
  await page.click('[data-testid="menu-prescriptions"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/pharmacist-02-prescriptions.png' });

  // Review prescription
  const firstPrescription = await page.$('[data-testid="prescription-item"]');
  if (firstPrescription) {
    console.log('  👀 Reviewing prescription...');
    await firstPrescription.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/e2e/.recordings/pharmacist-03-prescription-detail.png' });

    // Check for interactions
    console.log('  ⚠️ Checking drug interactions...');
    const interactionCheck = await page.$('[data-testid="btn-check-interactions"]');
    if (interactionCheck) {
      await interactionCheck.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/.recordings/pharmacist-04-interactions.png' });
    }

    // Approve prescription
    console.log('  ✓ Approving prescription...');
    const approveButton = await page.$('[data-testid="btn-approve"]');
    if (approveButton) {
      await approveButton.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/.recordings/pharmacist-05-approved.png' });
    }

    // Dispense medication
    console.log('  📦 Dispensing medication...');
    const dispenseButton = await page.$('[data-testid="btn-dispense"]');
    if (dispenseButton) {
      await dispenseButton.click();
      await page.waitForLoadState('networkidle');
      await page.fill('[data-testid="input-batch"]', 'BATCH-2026-001');
      await page.fill('[data-testid="input-expiry"]', '2028-12-31');
      await page.screenshot({ path: 'tests/e2e/.recordings/pharmacist-06-dispense.png' });
      await page.click('[data-testid="btn-confirm"]');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/.recordings/pharmacist-07-dispensed.png' });
    }
  }

  // View inventory
  console.log('  📊 Viewing inventory levels...');
  await page.click('[data-testid="menu-inventory"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/pharmacist-08-inventory.png' });
}

/**
 * LAB TECHNICIAN WORKFLOW
 * 1. Pending lab orders
 * 2. Enter lab results
 * 3. Flag critical values
 * 4. Generate reports
 */
async function labtechWorkflow(page: Page) {
  console.log('  📊 Loading lab technician dashboard...');
  await page.goto('/dashboard/laboratory');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/labtech-01-dashboard.png' });

  // View pending orders
  console.log('  📋 Viewing pending lab orders...');
  await page.click('[data-testid="menu-orders"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/labtech-02-orders.png' });

  // Work on first order
  const firstOrder = await page.$('[data-testid="order-item"]');
  if (firstOrder) {
    console.log('  🔬 Processing lab order...');
    await firstOrder.click();
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/e2e/.recordings/labtech-03-order-detail.png' });

    // Enter lab results
    console.log('  📊 Entering lab results...');
    const resultsButton = await page.$('[data-testid="btn-enter-results"]');
    if (resultsButton) {
      await resultsButton.click();
      await page.waitForLoadState('networkidle');

      // Fill lab results
      await page.fill('[data-testid="input-wbc"]', '7.5');
      await page.fill('[data-testid="input-rbc"]', '4.8');
      await page.fill('[data-testid="input-hemoglobin"]', '14.5');
      await page.fill('[data-testid="input-glucose"]', '95');
      await page.fill('[data-testid="input-creatinine"]', '0.8');

      await page.screenshot({ path: 'tests/e2e/.recordings/labtech-04-results.png' });
      await page.click('[data-testid="btn-submit"]');
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/.recordings/labtech-05-results-entered.png' });
    }

    // Check for critical values
    console.log('  🚨 Flagging critical values...');
    const criticalCheck = await page.$('[data-testid="btn-check-critical"]');
    if (criticalCheck) {
      await criticalCheck.click();
      await page.waitForLoadState('networkidle');
      await page.screenshot({ path: 'tests/e2e/.recordings/labtech-06-critical-values.png' });
    }
  }

  // View quality control
  console.log('  ✓ Reviewing quality control...');
  await page.click('[data-testid="menu-qc"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/labtech-07-qc.png' });
}

/**
 * PATIENT WORKFLOW
 * 1. Patient portal login
 * 2. View appointments
 * 3. Access medical records
 * 4. View lab results
 * 5. Download prescriptions
 */
async function patientWorkflow(page: Page) {
  console.log('  📊 Loading patient portal...');
  await page.goto('/patient/dashboard');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/patient-01-dashboard.png' });

  // View appointments
  console.log('  📅 Viewing appointments...');
  await page.click('[data-testid="menu-appointments"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/patient-02-appointments.png' });

  // Book new appointment
  console.log('  ➕ Booking new appointment...');
  const bookButton = await page.$('[data-testid="btn-book-appointment"]');
  if (bookButton) {
    await bookButton.click();
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="select-doctor"]');
    await page.click('[data-testid="option-doctor-0"]');
    await page.fill('[data-testid="input-reason"]', 'Follow-up checkup');
    await page.screenshot({ path: 'tests/e2e/.recordings/patient-03-book-appointment.png' });
    await page.click('[data-testid="btn-confirm"]');
    await page.waitForLoadState('networkidle');
  }

  // View medical records
  console.log('  📋 Accessing medical records...');
  await page.click('[data-testid="menu-records"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/patient-04-records.png' });

  // View prescriptions
  console.log('  💊 Viewing prescriptions...');
  await page.click('[data-testid="menu-prescriptions"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/patient-05-prescriptions.png' });

  // Download prescription
  const downloadButton = await page.$('[data-testid="btn-download"]');
  if (downloadButton) {
    console.log('  ⬇️ Downloading prescription...');
    await downloadButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'tests/e2e/.recordings/patient-06-download.png' });
  }

  // View lab results
  console.log('  📊 Viewing lab results...');
  await page.click('[data-testid="menu-lab-results"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/patient-07-lab-results.png' });

  // View health summary
  console.log('  📈 Viewing health summary...');
  await page.click('[data-testid="menu-health-summary"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/patient-08-health-summary.png' });
}

/**
 * ADMIN WORKFLOW
 * 1. User management
 * 2. System configuration
 * 3. Generate reports
 * 4. Monitor system health
 */
async function adminWorkflow(page: Page) {
  console.log('  📊 Loading admin dashboard...');
  await page.goto('/dashboard/admin');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/admin-01-dashboard.png' });

  // View user management
  console.log('  👥 Accessing user management...');
  await page.click('[data-testid="menu-users"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/admin-02-users.png' });

  // Create new user
  console.log('  ➕ Creating new user...');
  const createButton = await page.$('[data-testid="btn-new-user"]');
  if (createButton) {
    await createButton.click();
    await page.waitForLoadState('networkidle');
    await page.fill('[data-testid="input-email"]', `newuser-${Date.now()}@caresync.local`);
    await page.fill('[data-testid="input-name"]', 'New User');
    await page.select('[data-testid="select-role"]', 'nurse');
    await page.screenshot({ path: 'tests/e2e/.recordings/admin-03-new-user.png' });
    await page.click('[data-testid="btn-create"]');
    await page.waitForLoadState('networkidle');
  }

  // View system configuration
  console.log('  ⚙️ Accessing system configuration...');
  await page.click('[data-testid="menu-settings"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/admin-04-settings.png' });

  // View reports
  console.log('  📊 Generating reports...');
  await page.click('[data-testid="menu-reports"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/admin-05-reports.png' });

  // Generate patient statistics report
  const generateButton = await page.$('[data-testid="btn-generate-report"]');
  if (generateButton) {
    console.log('  📈 Generating patient statistics...');
    await generateButton.click();
    await page.waitForLoadState('networkidle');
    await page.select('[data-testid="select-report-type"]', 'patient-statistics');
    await page.fill('[data-testid="input-date-range"]', 'last-30-days');
    await page.screenshot({ path: 'tests/e2e/.recordings/admin-06-report-config.png' });
    await page.click('[data-testid="btn-generate"]');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'tests/e2e/.recordings/admin-07-report-generated.png' });
  }

  // Monitor system health
  console.log('  💚 Monitoring system health...');
  await page.click('[data-testid="menu-system-health"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/admin-08-system-health.png' });

  // View audit logs
  console.log('  📋 Viewing audit logs...');
  await page.click('[data-testid="menu-audit-logs"]');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/e2e/.recordings/admin-09-audit-logs.png' });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Login as a specific role
 */
async function loginAsRole(page: Page, role: string) {
  console.log(`  🔐 Logging in as ${role}...`);
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  const credentials = roleCredentials[role];
  if (!credentials) {
    throw new Error(`No credentials found for role: ${role}`);
  }

  await page.fill('[data-testid="input-email"]', credentials.email);
  await page.fill('[data-testid="input-password"]', credentials.password);
  await page.click('[data-testid="btn-login"]');

  // Wait for navigation to dashboard
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

/**
 * Fill patient registration form
 */
async function fillPatientForm(
  page: Page,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dob: string;
  }
) {
  await page.fill('[data-testid="input-first-name"]', data.firstName);
  await page.fill('[data-testid="input-last-name"]', data.lastName);
  await page.fill('[data-testid="input-email"]', data.email);
  await page.fill('[data-testid="input-phone"]', data.phone);
  await page.fill('[data-testid="input-dob"]', data.dob);
  await page.select('[data-testid="select-gender"]', 'M');
}
