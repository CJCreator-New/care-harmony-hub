import { test, expect, Page } from '@playwright/test';

// Test data
const TEST_PATIENT = {
  firstName: 'John',
  lastName: 'TestPatient',
  mrn: 'MRN-E2E-001',
  phone: '555-0123',
  email: 'john.testpatient@example.com',
  dateOfBirth: '1985-06-15',
  gender: 'male'
};

const TEST_VITALS = {
  bloodPressure: '120/80',
  heartRate: '72',
  temperature: '98.6',
  weight: '175',
  height: '5\'10"',
  respiratoryRate: '16',
  oxygenSaturation: '98'
};

const TEST_PRESCRIPTION = {
  medication: 'Lisinopril',
  dosage: '10mg',
  frequency: 'Once daily',
  duration: '30 days',
  instructions: 'Take with food'
};

// Helper functions
async function setTestRole(page: Page, role: string) {
  await page.evaluate((role) => {
    localStorage.setItem('testRole', role);
  }, role);
  await page.reload();
}

async function mockApiCalls(page: Page) {
  // Mock patient data
  await page.route('**/patients**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'patient-1',
          ...TEST_PATIENT,
          hospital_id: 'hospital-1',
          created_at: new Date().toISOString()
        }])
      });
    } else {
      await route.continue();
    }
  });

  // Mock queue data
  await page.route('**/queue**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          id: 'queue-1',
          patient_id: 'patient-1',
          queue_number: 1,
          status: 'waiting',
          priority: 'normal',
          check_in_time: new Date().toISOString(),
          patient: TEST_PATIENT
        }])
      });
    } else {
      await route.continue();
    }
  });

  // Mock consultation data
  await page.route('**/consultations**', async route => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'consultation-1',
          patient_id: 'patient-1',
          current_step: 1,
          status: 'in_progress',
          patient: TEST_PATIENT,
          vitals: {},
          prescriptions: []
        })
      });
    } else {
      await route.continue();
    }
  });

  // Mock prescription creation
  await page.route('**/prescriptions', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'prescription-1',
          patient_id: 'patient-1',
          status: 'pending',
          items: [TEST_PRESCRIPTION]
        })
      });
    } else {
      await route.continue();
    }
  });
}

test.describe('Critical Patient Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API calls
    await mockApiCalls(page);
    
    // Navigate to login page
    await page.goto('/hospital/login');
    
    // Login as admin (will be overridden by role switcher)
    await page.getByLabel('Email').fill('admin@testgeneral.com');
    await page.getByLabel('Password').fill('TestPass123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    
    // Wait for dashboard to load
    await expect(page).toHaveURL(/.*dashboard.*/);
  });

  test('should complete full patient flow: check-in → vitals → prep → consultation → prescription → dispense', async ({ page }) => {
    // Step 1: Patient Check-in (Receptionist Role)
    await test.step('Patient Check-in', async () => {
      await setTestRole(page, 'receptionist');
      
      // Navigate to queue management
      await page.getByRole('link', { name: /queue|check.*in/i }).click();
      await expect(page.getByText('Queue Management')).toBeVisible();
      
      // Verify patient appears in waiting queue
      await expect(page.getByText(TEST_PATIENT.firstName)).toBeVisible();
      await expect(page.getByText('#1')).toBeVisible(); // Queue number
      await expect(page.getByText('waiting')).toBeVisible();
    });

    // Step 2: Vitals Recording (Nurse Role)
    await test.step('Record Vitals', async () => {
      await setTestRole(page, 'nurse');
      
      // Navigate to queue management
      await page.getByRole('link', { name: /queue/i }).click();
      
      // Click on vitals button for the patient
      await page.getByRole('button', { name: /vitals/i }).first().click();
      
      // Fill vitals form
      await page.getByLabel('Blood Pressure').fill(TEST_VITALS.bloodPressure);
      await page.getByLabel('Heart Rate').fill(TEST_VITALS.heartRate);
      await page.getByLabel('Temperature').fill(TEST_VITALS.temperature);
      await page.getByLabel('Weight').fill(TEST_VITALS.weight);
      await page.getByLabel('Height').fill(TEST_VITALS.height);
      
      // Save vitals
      await page.getByRole('button', { name: /save|record/i }).click();
      await expect(page.getByText(/vitals.*recorded|saved/i)).toBeVisible();
    });

    // Step 3: Patient Preparation (Nurse Role)
    await test.step('Patient Preparation', async () => {
      // Start prep checklist
      await page.getByRole('button', { name: /prep|checklist/i }).first().click();
      
      // Complete prep items
      await page.getByRole('checkbox', { name: /identity.*verified/i }).check();
      await page.getByRole('checkbox', { name: /vitals.*recorded/i }).check();
      await page.getByRole('checkbox', { name: /allergies.*reviewed/i }).check();
      await page.getByRole('checkbox', { name: /ready.*doctor/i }).check();
      
      // Mark as ready for doctor
      await page.getByRole('button', { name: /ready.*doctor|complete.*prep/i }).click();
      await expect(page.getByText(/ready.*doctor|prep.*complete/i)).toBeVisible();
    });

    // Step 4: Call Patient for Consultation (Nurse/Receptionist Role)
    await test.step('Call Patient', async () => {
      // Call patient for consultation
      await page.getByRole('button', { name: /call.*consultation|call/i }).first().click();
      
      // Verify patient status changed to called
      await expect(page.getByText(/called|ready.*service/i)).toBeVisible();
      
      // Start service
      await page.getByRole('button', { name: /start.*service/i }).click();
      await expect(page.getByText(/in.*service/i)).toBeVisible();
    });

    // Step 5: Consultation (Doctor Role)
    await test.step('Doctor Consultation', async () => {
      await setTestRole(page, 'doctor');
      
      // Navigate to consultations
      await page.getByRole('link', { name: /consultations/i }).click();
      
      // Start or continue consultation
      await page.getByRole('button', { name: /start|continue|view/i }).first().click();
      
      // Step 1: Chief Complaint
      await page.getByLabel('Chief Complaint').fill('Patient reports high blood pressure readings');
      await page.getByLabel('Duration').fill('2 weeks');
      await page.getByRole('button', { name: /next|continue/i }).click();
      
      // Step 2: Physical Exam (vitals should be pre-filled)
      await expect(page.locator(`input[value="${TEST_VITALS.bloodPressure}"]`)).toBeVisible();
      await page.getByRole('button', { name: /next|continue/i }).click();
      
      // Step 3: Diagnosis
      await page.getByLabel('Primary Diagnosis').fill('Essential Hypertension');
      await page.getByLabel('ICD-10 Code').fill('I10');
      await page.getByRole('button', { name: /next|continue/i }).click();
      
      // Step 4: Treatment Plan
      await page.getByLabel('Treatment Plan').fill('Start ACE inhibitor, lifestyle modifications');
      await page.getByRole('button', { name: /next|continue/i }).click();
      
      // Step 5: Summary & Orders
      // Add prescription
      await page.getByRole('button', { name: /add.*prescription|prescribe/i }).click();
      await page.getByLabel('Medication').fill(TEST_PRESCRIPTION.medication);
      await page.getByLabel('Dosage').fill(TEST_PRESCRIPTION.dosage);
      await page.getByLabel('Frequency').fill(TEST_PRESCRIPTION.frequency);
      await page.getByLabel('Duration').fill(TEST_PRESCRIPTION.duration);
      await page.getByLabel('Instructions').fill(TEST_PRESCRIPTION.instructions);
      
      // Enable pharmacy notification
      await page.getByRole('checkbox', { name: /notify.*pharmacy/i }).check();
      
      // Complete consultation
      await page.getByRole('button', { name: /complete|finish/i }).click();
      await expect(page.getByText(/consultation.*completed|saved/i)).toBeVisible();
    });

    // Step 6: Prescription Dispensing (Pharmacist Role)
    await test.step('Prescription Dispensing', async () => {
      await setTestRole(page, 'pharmacist');
      
      // Navigate to pharmacy
      await page.getByRole('link', { name: /pharmacy/i }).click();
      
      // Verify prescription appears in queue
      await expect(page.getByText(TEST_PATIENT.firstName)).toBeVisible();
      await expect(page.getByText(TEST_PRESCRIPTION.medication)).toBeVisible();
      
      // Process prescription
      await page.getByRole('button', { name: /process|dispense/i }).first().click();
      
      // Verify prescription details
      await expect(page.getByText(TEST_PRESCRIPTION.dosage)).toBeVisible();
      await expect(page.getByText(TEST_PRESCRIPTION.frequency)).toBeVisible();
      
      // Check for drug interactions (should be none for this test)
      await expect(page.getByText(/no.*interactions|safe/i)).toBeVisible();
      
      // Dispense medication
      await page.getByRole('button', { name: /dispense|complete/i }).click();
      await expect(page.getByText(/dispensed|completed/i)).toBeVisible();
    });

    // Step 7: Verify Workflow Completion
    await test.step('Verify Completion', async () => {
      // Switch back to admin to verify overall status
      await setTestRole(page, 'admin');
      
      // Check dashboard for completed workflow
      await page.getByRole('link', { name: /dashboard/i }).click();
      
      // Verify metrics updated
      await expect(page.getByText(/completed.*consultations/i)).toBeVisible();
      await expect(page.getByText(/dispensed.*prescriptions/i)).toBeVisible();
    });
  });

  test('should handle role-based access control correctly', async ({ page }) => {
    await test.step('Test Role Restrictions', async () => {
      // Test patient role cannot access admin functions
      await setTestRole(page, 'patient');
      
      // Try to access admin page - should be denied
      await page.goto('/settings/staff-management');
      await expect(page.getByText(/access.*denied|unauthorized/i)).toBeVisible();
      
      // Test nurse cannot access doctor-only functions
      await setTestRole(page, 'nurse');
      await page.goto('/consultations');
      
      // Should not see prescription creation buttons
      await expect(page.getByRole('button', { name: /prescribe/i })).not.toBeVisible();
    });
  });

  test('should handle data validation and error cases', async ({ page }) => {
    await test.step('Test Validation Errors', async () => {
      await setTestRole(page, 'nurse');
      
      // Navigate to vitals recording
      await page.getByRole('link', { name: /queue/i }).click();
      await page.getByRole('button', { name: /vitals/i }).first().click();
      
      // Try to save with invalid data
      await page.getByLabel('Blood Pressure').fill('invalid');
      await page.getByLabel('Heart Rate').fill('-10');
      await page.getByRole('button', { name: /save/i }).click();
      
      // Should show validation errors
      await expect(page.getByText(/invalid.*format|error/i)).toBeVisible();
    });

    await test.step('Test Drug Interaction Alerts', async () => {
      await setTestRole(page, 'doctor');
      
      // Mock patient with existing medications
      await page.route('**/patients/patient-1', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            ...TEST_PATIENT,
            current_medications: ['Warfarin 5mg daily']
          })
        });
      });
      
      await page.goto('/consultations');
      await page.getByRole('button', { name: /start|new/i }).first().click();
      
      // Navigate to prescription step
      for (let i = 0; i < 4; i++) {
        await page.getByRole('button', { name: /next/i }).click();
      }
      
      // Try to prescribe interacting medication
      await page.getByRole('button', { name: /add.*prescription/i }).click();
      await page.getByLabel('Medication').fill('Aspirin');
      await page.getByLabel('Dosage').fill('325mg');
      
      // Should show interaction warning
      await expect(page.getByText(/interaction.*warning|caution/i)).toBeVisible();
      await expect(page.getByText(/warfarin/i)).toBeVisible();
    });
  });

  test('should handle unauthorized access attempts', async ({ page }) => {
    await test.step('Test Unauthorized Routes', async () => {
      // Test accessing protected routes without proper role
      const restrictedRoutes = [
        { path: '/settings/staff-management', allowedRoles: ['admin'] },
        { path: '/consultations', allowedRoles: ['doctor', 'nurse'] },
        { path: '/pharmacy', allowedRoles: ['pharmacist', 'admin'] },
        { path: '/laboratory', allowedRoles: ['lab_technician', 'admin'] }
      ];

      for (const route of restrictedRoutes) {
        // Try accessing as patient (should be denied)
        await setTestRole(page, 'patient');
        await page.goto(route.path);
        
        if (!route.allowedRoles.includes('patient')) {
          await expect(page.getByText(/access.*denied|unauthorized/i)).toBeVisible();
        }
        
        // Try accessing with allowed role (should work)
        await setTestRole(page, route.allowedRoles[0]);
        await page.goto(route.path);
        await expect(page.getByText(/access.*denied|unauthorized/i)).not.toBeVisible();
      }
    });
  });

  test('should maintain state persistence across navigation', async ({ page }) => {
    await test.step('Test localStorage Persistence', async () => {
      // Set test role
      await setTestRole(page, 'doctor');
      
      // Navigate to different pages
      await page.getByRole('link', { name: /consultations/i }).click();
      await page.getByRole('link', { name: /patients/i }).click();
      await page.getByRole('link', { name: /dashboard/i }).click();
      
      // Verify role persisted
      const storedRole = await page.evaluate(() => localStorage.getItem('testRole'));
      expect(storedRole).toBe('doctor');
      
      // Verify role switcher shows correct role
      await expect(page.getByText('Doctor')).toBeVisible();
    });

    await test.step('Test Role Reset', async () => {
      // Use role switcher to reset
      await page.getByRole('button', { name: /test.*mode|role/i }).click();
      await page.getByRole('menuitem', { name: /reset.*actual/i }).click();
      
      // Should reload and clear test role
      await page.waitForLoadState('networkidle');
      const storedRole = await page.evaluate(() => localStorage.getItem('testRole'));
      expect(storedRole).toBeNull();
    });
  });

  test('should handle network errors gracefully', async ({ page }) => {
    await test.step('Test API Failure Handling', async () => {
      // Mock API failure
      await page.route('**/patients**', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });

      await setTestRole(page, 'receptionist');
      await page.getByRole('link', { name: /patients/i }).click();
      
      // Should show error message
      await expect(page.getByText(/error.*loading|failed.*load/i)).toBeVisible();
      
      // Should provide retry option
      await expect(page.getByRole('button', { name: /retry|reload/i })).toBeVisible();
    });
  });

  test('should validate complete workflow with real-time updates', async ({ page }) => {
    await test.step('Test Real-time Queue Updates', async () => {
      await setTestRole(page, 'nurse');
      await page.getByRole('link', { name: /queue/i }).click();
      
      // Simulate real-time update by changing patient status
      await page.evaluate(() => {
        // Simulate WebSocket message
        window.dispatchEvent(new CustomEvent('queue-update', {
          detail: {
            id: 'queue-1',
            status: 'called',
            called_time: new Date().toISOString()
          }
        }));
      });
      
      // Should update UI without page refresh
      await expect(page.getByText(/called/i)).toBeVisible();
    });
  });
});

test.describe('Edge Cases and Error Handling', () => {
  test('should handle missing patient data', async ({ page }) => {
    // Mock empty patient response
    await page.route('**/patients**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      });
    });

    await page.goto('/hospital/login');
    await page.getByLabel('Email').fill('admin@testgeneral.com');
    await page.getByLabel('Password').fill('TestPass123!');
    await page.getByRole('button', { name: /sign in/i }).click();
    
    await setTestRole(page, 'receptionist');
    await page.getByRole('link', { name: /patients/i }).click();
    
    // Should show empty state
    await expect(page.getByText(/no.*patients|empty/i)).toBeVisible();
  });

  test('should handle session timeout', async ({ page }) => {
    // Mock session timeout
    await page.route('**/auth/**', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Session expired' })
      });
    });

    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login.*/);
    await expect(page.getByText(/session.*expired|login.*required/i)).toBeVisible();
  });
});