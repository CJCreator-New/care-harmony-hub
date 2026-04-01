import { test, expect, Page, Browser } from '@playwright/test';

/**
 * VIDEO WORKFLOW RECORDINGS - WITH ACTUAL WORKFLOWS
 * 
 * This test generates videos showing the complete end-to-end workflows for each role,
 * including actual user interactions and business processes, not just UI navigation.
 * 
 * Each video shows:
 * - Role authentication/login
 * - Real workflow actions specific to that role
 * - Data interactions and state changes
 * - Complete task completion
 * 
 * Run with: npx playwright test tests/e2e/video-workflow-recording-complete.spec.ts --workers=1
 */

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5173';

// Test data shared across workflows
const testData = {
  patientName: `VideoPatient-${Date.now()}`,
  patientEmail: `videopat-${Date.now()}@test.local`,
  patientPhone: '555-0199',
  patientDOB: '1990-05-15',
};

test.describe('Complete Workflow Video Recordings with Real Interactions', () => {
  
  test('Receptionist - Full Check-In & Patient Registration Workflow', async ({ browser }) => {
    console.log('\n📹 Recording: RECEPTIONIST WORKFLOW');
    
    const context = await browser.newContext({
      recordVideo: {
        dir: 'tests/e2e/.recordings',
        size: { width: 1920, height: 1080 },
      },
    });

    const page = await context.newPage();

    try {
      // Navigate and setup mock auth
      await page.goto(BASE_URL);
      await setupMockAuth(page, 'receptionist');
      await page.reload();
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Logged in as Receptionist');
      await page.screenshot({ path: 'tests/e2e/.recordings/receptionist-01-dashboard.png' });

      // Open check-in queue
      await page.click('[data-testid="menu-patients"], [data-testid="menu-queue"], a:has-text("Queue"), a:has-text("Check-in")');
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Opened patient queue');
      await page.screenshot({ path: 'tests/e2e/.recordings/receptionist-02-queue.png' });

      // Start new patient registration
      const newPatientBtn = await page.locator('[data-testid="btn-new-patient"], button:has-text("New Patient"), button:has-text("Register")').first();
      if (await newPatientBtn.isVisible()) {
        await newPatientBtn.click();
        await page.waitForLoadState('networkidle');
        console.log('  ✓ Opened new patient form');
        await page.screenshot({ path: 'tests/e2e/.recordings/receptionist-03-registration-form.png' });

        // Fill registration form
        await page.fill('input[placeholder*="First"], input[name*="firstName"]', 'Video');
        await page.fill('input[placeholder*="Last"], input[name*="lastName"]', testData.patientName);
        await page.fill('input[type="email"]', testData.patientEmail);
        await page.fill('input[type="tel"], input[name*="phone"]', testData.patientPhone);
        await page.fill('input[type="date"], input[name*="dob"]', testData.patientDOB);
        
        console.log('  ✓ Filled patient details');
        await page.screenshot({ path: 'tests/e2e/.recordings/receptionist-04-form-filled.png' });

        // Submit registration
        await page.click('button[type="submit"], button:has-text("Register"), button:has-text("Submit")');
        await page.waitForLoadState('networkidle');
        console.log('  ✓ Patient registered');
        await page.screenshot({ path: 'tests/e2e/.recordings/receptionist-05-patient-registered.png' });

        // Take vitals
        await page.waitForTimeout(1000);
        const vitalsBtn = await page.locator('button:has-text("Vitals"), button:has-text("Record"), [data-testid*="vitals"]').first();
        if (await vitalsBtn.isVisible()) {
          await vitalsBtn.click();
          await page.waitForLoadState('networkidle');
          console.log('  ✓ Opened vitals entry');
          await page.screenshot({ path: 'tests/e2e/.recordings/receptionist-06-vitals-screen.png' });
        }
      }

      console.log('✅ Receptionist workflow recorded\n');
    } finally {
      await context.close();
    }
  });

  test('Nurse - Vitals Recording & Patient Monitoring', async ({ browser }) => {
    console.log('\n📹 Recording: NURSE WORKFLOW');
    
    const context = await browser.newContext({
      recordVideo: {
        dir: 'tests/e2e/.recordings',
        size: { width: 1920, height: 1080 },
      },
    });

    const page = await context.newPage();

    try {
      await page.goto(BASE_URL);
      await setupMockAuth(page, 'nurse');
      await page.reload();
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Logged in as Nurse');
      await page.screenshot({ path: 'tests/e2e/.recordings/nurse-01-dashboard.png' });

      // Open vitals queue
      await page.click('[data-testid="menu-queue"], [data-testid="menu-vitals"], a:has-text("Queue"), a:has-text("Vitals")');
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Opened vitals queue');
      await page.screenshot({ path: 'tests/e2e/.recordings/nurse-02-vitals-queue.png' });

      // Select patient from queue
      const patientItem = await page.locator('[data-testid*="patient"], tr:has-text("Patient"), div:has-text("Test"), button:has-text("Record")').first();
      if (await patientItem.isVisible()) {
        await patientItem.click();
        await page.waitForLoadState('networkidle');
        console.log('  ✓ Selected patient');
        await page.screenshot({ path: 'tests/e2e/.recordings/nurse-03-patient-selected.png' });

        // Record vitals
        await page.fill('input[placeholder*="Systolic"], input[name*="systolic"]', '120');
        await page.fill('input[placeholder*="Diastolic"], input[name*="diastolic"]', '80');
        await page.fill('input[placeholder*="Temperature"], input[name*="temp"]', '98.6');
        await page.fill('input[placeholder*="Heart"], input[name*="heart"]', '72');
        await page.fill('input[placeholder*="Respiratory"], input[name*="respiratory"]', '16');
        
        console.log('  ✓ Entered vital signs');
        await page.screenshot({ path: 'tests/e2e/.recordings/nurse-04-vitals-entered.png' });

        // Submit vitals
        await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Submit")');
        await page.waitForLoadState('networkidle');
        console.log('  ✓ Vitals saved');
        await page.screenshot({ path: 'tests/e2e/.recordings/nurse-05-vitals-saved.png' });
      }

      // View monitoring dashboard
      await page.click('[data-testid="menu-monitoring"], a:has-text("Monitor"), a:has-text("Dashboard")');
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Opened monitoring');
      await page.screenshot({ path: 'tests/e2e/.recordings/nurse-06-monitoring-dashboard.png' });

      console.log('✅ Nurse workflow recorded\n');
    } finally {
      await context.close();
    }
  });

  test('Doctor - Diagnosis & Prescription Workflow', async ({ browser }) => {
    console.log('\n📹 Recording: DOCTOR WORKFLOW');
    
    const context = await browser.newContext({
      recordVideo: {
        dir: 'tests/e2e/.recordings',
        size: { width: 1920, height: 1080 },
      },
    });

    const page = await context.newPage();

    try {
      await page.goto(BASE_URL);
      await setupMockAuth(page, 'doctor');
      await page.reload();
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Logged in as Doctor');
      await page.screenshot({ path: 'tests/e2e/.recordings/doctor-01-dashboard.png' });

      // Open consultation queue
      await page.click('[data-testid="menu-queue"], a:has-text("Queue"), a:has-text("Consultation")');
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Opened consultation queue');
      await page.screenshot({ path: 'tests/e2e/.recordings/doctor-02-queue.png' });

      // Select patient
      const patientItem = await page.locator('button:has-text("Consult"), tr >> nth=0, [data-testid*="patient"] >> nth=0').first();
      if (await patientItem.isVisible()) {
        await patientItem.click();
        await page.waitForLoadState('networkidle');
        console.log('  ✓ Started consultation');
        await page.screenshot({ path: 'tests/e2e/.recordings/doctor-03-consultation-started.png' });

        // Enter diagnosis
        const diagnosisField = await page.locator('textarea[placeholder*="Diagnosis"], input[name*="diagnosis"], textarea[name*="chief"]').first();
        if (await diagnosisField.isVisible()) {
          await diagnosisField.fill('Hypertension - Stage 1');
          console.log('  ✓ Entered diagnosis');
          await page.screenshot({ path: 'tests/e2e/.recordings/doctor-04-diagnosis-entered.png' });

          // Create prescription
          const prescBtn = await page.locator('button:has-text("Prescription"), button:has-text("Prescribe"), [data-testid*="prescription"]').first();
          if (await prescBtn.isVisible()) {
            await prescBtn.click();
            await page.waitForLoadState('networkidle');
            console.log('  ✓ Opened prescription form');
            await page.screenshot({ path: 'tests/e2e/.recordings/doctor-05-prescription-form.png' });

            // Fill prescription
            await page.fill('input[placeholder*="Drug"], input[name*="medication"]', 'Lisinopril');
            await page.fill('input[placeholder*="Dose"], input[name*="dose"]', '10mg');
            await page.fill('input[placeholder*="Frequency"], input[name*="frequency"]', 'Once daily');
            
            console.log('  ✓ Filled prescription');
            await page.screenshot({ path: 'tests/e2e/.recordings/doctor-06-prescription-filled.png' });

            // Submit prescription
            await page.click('button[type="submit"], button:has-text("Prescribe"), button:has-text("Send")');
            await page.waitForLoadState('networkidle');
            console.log('  ✓ Prescription sent');
            await page.screenshot({ path: 'tests/e2e/.recordings/doctor-07-prescription-sent.png' });
          }

          // Order labs
          const labBtn = await page.locator('button:has-text("Lab"), button:has-text("Order"), [data-testid*="lab"]').first();
          if (await labBtn.isVisible()) {
            await labBtn.click();
            await page.waitForLoadState('networkidle');
            console.log('  ✓ Lab order form opened');
            await page.screenshot({ path: 'tests/e2e/.recordings/doctor-08-lab-order-form.png' });

            // Select tests
            await page.click('input[type="checkbox"]:has-text("CBC"), input[value*="CBC"], label:has-text("CBC")');
            await page.click('input[type="checkbox"]:has-text("Panel"), input[value*="panel"], label:has-text("Panel")');
            
            console.log('  ✓ Selected lab tests');
            await page.screenshot({ path: 'tests/e2e/.recordings/doctor-09-labs-selected.png' });

            // Submit labs
            await page.click('button[type="submit"], button:has-text("Order"), button:has-text("Send")');
            await page.waitForLoadState('networkidle');
            console.log('  ✓ Labs ordered');
            await page.screenshot({ path: 'tests/e2e/.recordings/doctor-10-labs-ordered.png' });
          }
        }
      }

      console.log('✅ Doctor workflow recorded\n');
    } finally {
      await context.close();
    }
  });

  test('Pharmacist - Prescription Review & Dispensing', async ({ browser }) => {
    console.log('\n📹 Recording: PHARMACIST WORKFLOW');
    
    const context = await browser.newContext({
      recordVideo: {
        dir: 'tests/e2e/.recordings',
        size: { width: 1920, height: 1080 },
      },
    });

    const page = await context.newPage();

    try {
      await page.goto(BASE_URL);
      await setupMockAuth(page, 'pharmacist');
      await page.reload();
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Logged in as Pharmacist');
      await page.screenshot({ path: 'tests/e2e/.recordings/pharmacist-01-dashboard.png' });

      // Open prescriptions
      await page.click('[data-testid="menu-prescriptions"], a:has-text("Prescriptions"), a:has-text("Queue")');
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Opened prescriptions queue');
      await page.screenshot({ path: 'tests/e2e/.recordings/pharmacist-02-prescriptions.png' });

      // Review prescription
      const prescItem = await page.locator('tr >> nth=0, [data-testid*="prescription"] >> nth=0, button:has-text("Review")').first();
      if (await prescItem.isVisible()) {
        await prescItem.click();
        await page.waitForLoadState('networkidle');
        console.log('  ✓ Opened prescription detail');
        await page.screenshot({ path: 'tests/e2e/.recordings/pharmacist-03-prescription-detail.png' });

        // Approve prescription
        const approveBtn = await page.locator('button:has-text("Approve"), button:has-text("Accept"), [data-testid*="approve"]').first();
        if (await approveBtn.isVisible()) {
          await approveBtn.click();
          await page.waitForLoadState('networkidle');
          console.log('  ✓ Prescription approved');
          await page.screenshot({ path: 'tests/e2e/.recordings/pharmacist-04-approved.png' });

          // Dispense
          const dispenseBtn = await page.locator('button:has-text("Dispense"), button:has-text("Issue"), [data-testid*="dispense"]').first();
          if (await dispenseBtn.isVisible()) {
            await dispenseBtn.click();
            await page.waitForLoadState('networkidle');
            
            await page.fill('input[placeholder*="Batch"], input[name*="batch"]', 'BATCH-2026-001');
            await page.fill('input[placeholder*="Expiry"], input[name*="expiry"]', '2028-12-31');
            
            console.log('  ✓ Dispensing details entered');
            await page.screenshot({ path: 'tests/e2e/.recordings/pharmacist-05-dispense-details.png' });

            // Confirm dispense
            await page.click('button[type="submit"], button:has-text("Confirm"), button:has-text("Dispense")');
            await page.waitForLoadState('networkidle');
            console.log('  ✓ Medication dispensed');
            await page.screenshot({ path: 'tests/e2e/.recordings/pharmacist-06-dispensed.png' });
          }
        }
      }

      // View inventory
      await page.click('[data-testid="menu-inventory"], a:has-text("Inventory"), a:has-text("Stock")');
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Viewed inventory');
      await page.screenshot({ path: 'tests/e2e/.recordings/pharmacist-07-inventory.png' });

      console.log('✅ Pharmacist workflow recorded\n');
    } finally {
      await context.close();
    }
  });

  test('Lab Technician - Lab Results & Reporting', async ({ browser }) => {
    console.log('\n📹 Recording: LAB TECHNICIAN WORKFLOW');
    
    const context = await browser.newContext({
      recordVideo: {
        dir: 'tests/e2e/.recordings',
        size: { width: 1920, height: 1080 },
      },
    });

    const page = await context.newPage();

    try {
      await page.goto(BASE_URL);
      await setupMockAuth(page, 'labtech');
      await page.reload();
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Logged in as Lab Technician');
      await page.screenshot({ path: 'tests/e2e/.recordings/labtech-01-dashboard.png' });

      // Open lab orders
      await page.click('[data-testid="menu-lab"], a:has-text("Lab"), a:has-text("Orders")');
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Opened lab orders');
      await page.screenshot({ path: 'tests/e2e/.recordings/labtech-02-orders.png' });

      // Select order
      const orderItem = await page.locator('tr >> nth=0, [data-testid*="order"] >> nth=0, button:has-text("Process")').first();
      if (await orderItem.isVisible()) {
        await orderItem.click();
        await page.waitForLoadState('networkidle');
        console.log('  ✓ Opened order detail');
        await page.screenshot({ path: 'tests/e2e/.recordings/labtech-03-order-detail.png' });

        // Enter results
        const resultsBtn = await page.locator('button:has-text("Results"), button:has-text("Enter"), [data-testid*="results"]').first();
        if (await resultsBtn.isVisible()) {
          await resultsBtn.click();
          await page.waitForLoadState('networkidle');
          
          // Fill lab results
          await page.fill('input[placeholder*="WBC"], input[name*="wbc"]', '7.5');
          await page.fill('input[placeholder*="RBC"], input[name*="rbc"]', '4.8');
          await page.fill('input[placeholder*="Hemoglobin"], input[name*="hgb"]', '14.5');
          await page.fill('input[placeholder*="Glucose"], input[name*="glucose"]', '95');
          
          console.log('  ✓ Entered lab results');
          await page.screenshot({ path: 'tests/e2e/.recordings/labtech-04-results-entered.png' });

          // Submit results
          await page.click('button[type="submit"], button:has-text("Submit"), button:has-text("Report")');
          await page.waitForLoadState('networkidle');
          console.log('  ✓ Results submitted');
          await page.screenshot({ path: 'tests/e2e/.recordings/labtech-05-results-submitted.png' });

          // Check for critical values
          const criticalBtn = await page.locator('button:has-text("Critical"), [data-testid*="critical"]').first();
          if (await criticalBtn.isVisible()) {
            await criticalBtn.click();
            await page.waitForTimeout(1000);
            console.log('  ✓ Checked critical values');
            await page.screenshot({ path: 'tests/e2e/.recordings/labtech-06-critical-check.png' });
          }
        }
      }

      console.log('✅ Lab Technician workflow recorded\n');
    } finally {
      await context.close();
    }
  });

  test('Patient - Portal Access & Results Viewing', async ({ browser }) => {
    console.log('\n📹 Recording: PATIENT WORKFLOW');
    
    const context = await browser.newContext({
      recordVideo: {
        dir: 'tests/e2e/.recordings',
        size: { width: 1920, height: 1080 },
      },
    });

    const page = await context.newPage();

    try {
      await page.goto(BASE_URL);
      await setupMockAuth(page, 'patient');
      await page.reload();
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Logged in as Patient');
      await page.screenshot({ path: 'tests/e2e/.recordings/patient-01-portal.png' });

      // View appointments
      await page.click('[data-testid="menu-appointments"], a:has-text("Appointments"), a:has-text("Upcoming")');
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Viewed appointments');
      await page.screenshot({ path: 'tests/e2e/.recordings/patient-02-appointments.png' });

      // Book appointment
      const bookBtn = await page.locator('button:has-text("Book"), button:has-text("Schedule"), [data-testid*="book"]').first();
      if (await bookBtn.isVisible()) {
        await bookBtn.click();
        await page.waitForLoadState('networkidle');
        
        const doctorSelect = await page.locator('select, [role="combobox"]').first();
        if (await doctorSelect.isVisible()) {
          await doctorSelect.click();
          await page.click('option >> nth=1, [role="option"] >> nth=0');
        }
        
        await page.fill('textarea, input[placeholder*="reason"]', 'Follow-up checkup');
        
        console.log('  ✓ Booking appointment');
        await page.screenshot({ path: 'tests/e2e/.recordings/patient-03-booking.png' });

        await page.click('button[type="submit"], button:has-text("Confirm"), button:has-text("Book")');
        await page.waitForLoadState('networkidle');
        console.log('  ✓ Appointment booked');
        await page.screenshot({ path: 'tests/e2e/.recordings/patient-04-booked.png' });
      }

      // View prescriptions
      await page.click('[data-testid="menu-prescriptions"], a:has-text("Prescriptions"), a:has-text("My Medications")');
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Viewed prescriptions');
      await page.screenshot({ path: 'tests/e2e/.recordings/patient-05-prescriptions.png' });

      // View lab results
      await page.click('[data-testid="menu-results"], a:has-text("Results"), a:has-text("Lab Results")');
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Viewed lab results');
      await page.screenshot({ path: 'tests/e2e/.recordings/patient-06-results.png' });

      // View health summary
      await page.click('[data-testid="menu-summary"], a:has-text("Summary"), a:has-text("Health")');
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Viewed health summary');
      await page.screenshot({ path: 'tests/e2e/.recordings/patient-07-summary.png' });

      console.log('✅ Patient workflow recorded\n');
    } finally {
      await context.close();
    }
  });

  test('Administrator - System Management & Reports', async ({ browser }) => {
    console.log('\n📹 Recording: ADMINISTRATOR WORKFLOW');
    
    const context = await browser.newContext({
      recordVideo: {
        dir: 'tests/e2e/.recordings',
        size: { width: 1920, height: 1080 },
      },
    });

    const page = await context.newPage();

    try {
      await page.goto(BASE_URL);
      await setupMockAuth(page, 'admin');
      await page.reload();
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Logged in as Administrator');
      await page.screenshot({ path: 'tests/e2e/.recordings/admin-01-dashboard.png' });

      // User management
      await page.click('[data-testid="menu-users"], a:has-text("Users"), a:has-text("Management")');
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Opened user management');
      await page.screenshot({ path: 'tests/e2e/.recordings/admin-02-users.png' });

      // Create new user
      const newUserBtn = await page.locator('button:has-text("New"), button:has-text("Add"), [data-testid*="new"]').first();
      if (await newUserBtn.isVisible()) {
        await newUserBtn.click();
        await page.waitForLoadState('networkidle');
        
        await page.fill('input[type="email"]', `admin-user-${Date.now()}@test.local`);
        await page.fill('input[placeholder*="Name"]', 'Admin Test User');
        await page.select('select, [role="combobox"]', 'nurse');
        
        console.log('  ✓ Created new user');
        await page.screenshot({ path: 'tests/e2e/.recordings/admin-03-new-user.png' });

        await page.click('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'tests/e2e/.recordings/admin-04-user-created.png' });
      }

      // System configuration
      await page.click('[data-testid="menu-settings"], a:has-text("Settings"), a:has-text("Configuration")');
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Opened system settings');
      await page.screenshot({ path: 'tests/e2e/.recordings/admin-05-settings.png' });

      // Reports
      await page.click('[data-testid="menu-reports"], a:has-text("Reports"), a:has-text("Analytics")');
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Opened reports');
      await page.screenshot({ path: 'tests/e2e/.recordings/admin-06-reports.png' });

      // Generate report
      const genBtn = await page.locator('button:has-text("Generate"), button:has-text("Create"), [data-testid*="generate"]').first();
      if (await genBtn.isVisible()) {
        await genBtn.click();
        await page.waitForLoadState('networkidle');
        
        await page.select('select, [role="combobox"]', 'patient');
        
        console.log('  ✓ Generating report');
        await page.screenshot({ path: 'tests/e2e/.recordings/admin-07-report-config.png' });

        await page.click('button[type="submit"], button:has-text("Generate")');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'tests/e2e/.recordings/admin-08-report-generated.png' });
      }

      // System health
      await page.click('[data-testid="menu-health"], a:has-text("Health"), a:has-text("System")');
      await page.waitForLoadState('networkidle');
      console.log('  ✓ Viewed system health');
      await page.screenshot({ path: 'tests/e2e/.recordings/admin-09-system-health.png' });

      console.log('✅ Administrator workflow recorded\n');
    } finally {
      await context.close();
    }
  });
});

// Helper function to setup mock authentication
async function setupMockAuth(page: Page, role: string) {
  const roleMap: Record<string, string> = {
    receptionist: 'receptionist',
    nurse: 'nurse',
    doctor: 'doctor',
    pharmacist: 'pharmacist',
    labtech: 'lab_technician',
    patient: 'patient',
    admin: 'admin',
  };

  const roleName = roleMap[role] || role;

  await page.evaluate(({ roleName: rn }) => {
    window.localStorage.setItem('VITE_E2E_MOCK_AUTH', 'true');
    const mockUser = {
      id: `00000000-0000-0000-0000-000000000001`,
      email: `${rn}@caresync.local`,
      firstName: rn.charAt(0).toUpperCase() + rn.slice(1),
      lastName: 'TestUser',
      role: rn,
      roles: [rn],
      hospital_id: 'hospital-test-001',
    };
    window.localStorage.setItem('e2eMockUser', JSON.stringify(mockUser));
  }, { roleName });
}
