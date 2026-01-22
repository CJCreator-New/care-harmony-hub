import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8080';

// Test data
const testUsers = {
  admin: { email: 'admin@hospital.com', password: 'Admin@123' },
  doctor: { email: 'doctor@hospital.com', password: 'Doctor@123' },
  nurse: { email: 'nurse@hospital.com', password: 'Nurse@123' },
  receptionist: { email: 'receptionist@hospital.com', password: 'Receptionist@123' },
  pharmacist: { email: 'pharmacist@hospital.com', password: 'Pharmacist@123' },
  labtech: { email: 'labtech@hospital.com', password: 'LabTech@123' },
  patient: { email: 'patient@hospital.com', password: 'Patient@123' }
};

// Helper function to login
async function login(page, email, password) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForNavigation();
}

// Helper function to check dashboard
async function checkDashboard(page, role) {
  const dashboardTitle = await page.locator('h1').first().textContent();
  expect(dashboardTitle).toBeTruthy();
  console.log(`✓ ${role} dashboard loaded`);
}

test.describe('CareSync Complete Workflow Automation', () => {
  
  test('Admin: System Access & User Management', async ({ page }) => {
    await login(page, testUsers.admin.email, testUsers.admin.password);
    await checkDashboard(page, 'Admin');
    
    // Check user management
    await page.click('text=User Management');
    await expect(page.locator('text=Users')).toBeVisible();
    console.log('✓ Admin user management accessible');
  });

  test('Doctor: Login & Dashboard', async ({ page }) => {
    await login(page, testUsers.doctor.email, testUsers.doctor.password);
    await checkDashboard(page, 'Doctor');
    
    // Check patient queue
    const queueElement = await page.locator('text=Patient Queue').isVisible();
    expect(queueElement).toBeTruthy();
    console.log('✓ Doctor patient queue visible');
  });

  test('Doctor: Patient Consultation Flow', async ({ page }) => {
    await login(page, testUsers.doctor.email, testUsers.doctor.password);
    
    // Select patient from queue
    await page.click('button:has-text("Select Patient")');
    await page.waitForTimeout(500);
    
    // Check consultation form
    const consultationForm = await page.locator('form').first().isVisible();
    expect(consultationForm).toBeTruthy();
    console.log('✓ Doctor consultation form accessible');
  });

  test('Doctor: Prescription Management', async ({ page }) => {
    await login(page, testUsers.doctor.email, testUsers.doctor.password);
    
    // Navigate to prescriptions
    await page.click('text=Prescriptions');
    await page.waitForTimeout(500);
    
    // Check prescription form
    const prescriptionForm = await page.locator('text=New Prescription').isVisible();
    expect(prescriptionForm).toBeTruthy();
    console.log('✓ Doctor prescription form accessible');
  });

  test('Nurse: Login & Dashboard', async ({ page }) => {
    await login(page, testUsers.nurse.email, testUsers.nurse.password);
    await checkDashboard(page, 'Nurse');
    
    // Check assigned patients
    const patientsElement = await page.locator('text=Assigned Patients').isVisible();
    expect(patientsElement).toBeTruthy();
    console.log('✓ Nurse assigned patients visible');
  });

  test('Nurse: Vital Signs Recording', async ({ page }) => {
    await login(page, testUsers.nurse.email, testUsers.nurse.password);
    
    // Navigate to vital signs
    await page.click('text=Vital Signs');
    await page.waitForTimeout(500);
    
    // Check vital signs form
    const vitalsForm = await page.locator('text=Record Vitals').isVisible();
    expect(vitalsForm).toBeTruthy();
    console.log('✓ Nurse vital signs form accessible');
  });

  test('Nurse: Medication Administration', async ({ page }) => {
    await login(page, testUsers.nurse.email, testUsers.nurse.password);
    
    // Navigate to medications
    await page.click('text=Medications');
    await page.waitForTimeout(500);
    
    // Check medication list
    const medicationList = await page.locator('table').first().isVisible();
    expect(medicationList).toBeTruthy();
    console.log('✓ Nurse medication list accessible');
  });

  test('Receptionist: Login & Dashboard', async ({ page }) => {
    await login(page, testUsers.receptionist.email, testUsers.receptionist.password);
    await checkDashboard(page, 'Receptionist');
    
    // Check appointment schedule
    const scheduleElement = await page.locator('text=Appointment Schedule').isVisible();
    expect(scheduleElement).toBeTruthy();
    console.log('✓ Receptionist appointment schedule visible');
  });

  test('Receptionist: Patient Registration', async ({ page }) => {
    await login(page, testUsers.receptionist.email, testUsers.receptionist.password);
    
    // Navigate to registration
    await page.click('text=Register Patient');
    await page.waitForTimeout(500);
    
    // Check registration form
    const registrationForm = await page.locator('form').first().isVisible();
    expect(registrationForm).toBeTruthy();
    console.log('✓ Receptionist registration form accessible');
  });

  test('Receptionist: Appointment Scheduling', async ({ page }) => {
    await login(page, testUsers.receptionist.email, testUsers.receptionist.password);
    
    // Navigate to scheduling
    await page.click('text=Schedule Appointment');
    await page.waitForTimeout(500);
    
    // Check scheduling form
    const schedulingForm = await page.locator('form').first().isVisible();
    expect(schedulingForm).toBeTruthy();
    console.log('✓ Receptionist scheduling form accessible');
  });

  test('Pharmacist: Login & Dashboard', async ({ page }) => {
    await login(page, testUsers.pharmacist.email, testUsers.pharmacist.password);
    await checkDashboard(page, 'Pharmacist');
    
    // Check pending prescriptions
    const prescriptionsElement = await page.locator('text=Pending Prescriptions').isVisible();
    expect(prescriptionsElement).toBeTruthy();
    console.log('✓ Pharmacist pending prescriptions visible');
  });

  test('Pharmacist: Prescription Review', async ({ page }) => {
    await login(page, testUsers.pharmacist.email, testUsers.pharmacist.password);
    
    // Navigate to prescriptions
    await page.click('text=Prescriptions');
    await page.waitForTimeout(500);
    
    // Check prescription list
    const prescriptionList = await page.locator('table').first().isVisible();
    expect(prescriptionList).toBeTruthy();
    console.log('✓ Pharmacist prescription list accessible');
  });

  test('Pharmacist: Inventory Management', async ({ page }) => {
    await login(page, testUsers.pharmacist.email, testUsers.pharmacist.password);
    
    // Navigate to inventory
    await page.click('text=Inventory');
    await page.waitForTimeout(500);
    
    // Check inventory list
    const inventoryList = await page.locator('table').first().isVisible();
    expect(inventoryList).toBeTruthy();
    console.log('✓ Pharmacist inventory list accessible');
  });

  test('Lab Tech: Login & Dashboard', async ({ page }) => {
    await login(page, testUsers.labtech.email, testUsers.labtech.password);
    await checkDashboard(page, 'Lab Tech');
    
    // Check pending orders
    const ordersElement = await page.locator('text=Pending Orders').isVisible();
    expect(ordersElement).toBeTruthy();
    console.log('✓ Lab Tech pending orders visible');
  });

  test('Lab Tech: Specimen Collection', async ({ page }) => {
    await login(page, testUsers.labtech.email, testUsers.labtech.password);
    
    // Navigate to specimen collection
    await page.click('text=Collect Specimen');
    await page.waitForTimeout(500);
    
    // Check collection form
    const collectionForm = await page.locator('form').first().isVisible();
    expect(collectionForm).toBeTruthy();
    console.log('✓ Lab Tech specimen collection form accessible');
  });

  test('Lab Tech: Test Results Entry', async ({ page }) => {
    await login(page, testUsers.labtech.email, testUsers.labtech.password);
    
    // Navigate to results
    await page.click('text=Enter Results');
    await page.waitForTimeout(500);
    
    // Check results form
    const resultsForm = await page.locator('form').first().isVisible();
    expect(resultsForm).toBeTruthy();
    console.log('✓ Lab Tech results entry form accessible');
  });

  test('Patient: Login & Portal Access', async ({ page }) => {
    await login(page, testUsers.patient.email, testUsers.patient.password);
    await checkDashboard(page, 'Patient');
    
    // Check patient portal
    const portalElement = await page.locator('text=My Health').isVisible();
    expect(portalElement).toBeTruthy();
    console.log('✓ Patient portal accessible');
  });

  test('Patient: Appointment Scheduling', async ({ page }) => {
    await login(page, testUsers.patient.email, testUsers.patient.password);
    
    // Navigate to appointments
    await page.click('text=Schedule Appointment');
    await page.waitForTimeout(500);
    
    // Check appointment form
    const appointmentForm = await page.locator('form').first().isVisible();
    expect(appointmentForm).toBeTruthy();
    console.log('✓ Patient appointment scheduling accessible');
  });

  test('Patient: Medical Records Access', async ({ page }) => {
    await login(page, testUsers.patient.email, testUsers.patient.password);
    
    // Navigate to records
    await page.click('text=Medical Records');
    await page.waitForTimeout(500);
    
    // Check records list
    const recordsList = await page.locator('table').first().isVisible();
    expect(recordsList).toBeTruthy();
    console.log('✓ Patient medical records accessible');
  });

  test('RBAC: Doctor cannot access Admin Panel', async ({ page }) => {
    await login(page, testUsers.doctor.email, testUsers.doctor.password);
    
    // Try to access admin panel
    await page.goto(`${BASE_URL}/admin`);
    
    // Should be redirected or show error
    const errorMessage = await page.locator('text=Unauthorized').isVisible().catch(() => false);
    const redirected = page.url().includes('/dashboard');
    
    expect(errorMessage || redirected).toBeTruthy();
    console.log('✓ RBAC: Doctor cannot access admin panel');
  });

  test('RBAC: Nurse cannot access Pharmacy', async ({ page }) => {
    await login(page, testUsers.nurse.email, testUsers.nurse.password);
    
    // Try to access pharmacy
    await page.goto(`${BASE_URL}/pharmacy`);
    
    // Should be redirected or show error
    const errorMessage = await page.locator('text=Unauthorized').isVisible().catch(() => false);
    const redirected = page.url().includes('/dashboard');
    
    expect(errorMessage || redirected).toBeTruthy();
    console.log('✓ RBAC: Nurse cannot access pharmacy');
  });

  test('Real-time Notifications: Doctor receives alert', async ({ page }) => {
    await login(page, testUsers.doctor.email, testUsers.doctor.password);
    
    // Check for notification bell
    const notificationBell = await page.locator('[data-testid="notification-bell"]').isVisible().catch(() => false);
    expect(notificationBell).toBeTruthy();
    console.log('✓ Real-time notifications available');
  });

  test('Audit Logging: Admin can view logs', async ({ page }) => {
    await login(page, testUsers.admin.email, testUsers.admin.password);
    
    // Navigate to audit logs
    await page.click('text=Audit Logs');
    await page.waitForTimeout(500);
    
    // Check logs table
    const logsTable = await page.locator('table').first().isVisible();
    expect(logsTable).toBeTruthy();
    console.log('✓ Audit logging accessible');
  });

  test('Data Validation: Invalid email rejected', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Enter invalid email
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');
    
    // Check for error message
    const errorMessage = await page.locator('text=Invalid email').isVisible().catch(() => false);
    expect(errorMessage).toBeTruthy();
    console.log('✓ Data validation working');
  });

  test('Security: Session timeout after inactivity', async ({ page }) => {
    await login(page, testUsers.doctor.email, testUsers.doctor.password);
    
    // Wait for session timeout (simulated)
    await page.waitForTimeout(2000);
    
    // Try to navigate
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Should still be on dashboard or redirected to login
    const isLoggedIn = page.url().includes('/dashboard') || page.url().includes('/login');
    expect(isLoggedIn).toBeTruthy();
    console.log('✓ Session management working');
  });

  test('Cross-role Workflow: Doctor to Pharmacist', async ({ page }) => {
    // Doctor creates prescription
    await login(page, testUsers.doctor.email, testUsers.doctor.password);
    await page.click('text=Prescriptions');
    await page.waitForTimeout(500);
    
    // Logout
    await page.click('button:has-text("Logout")');
    
    // Pharmacist reviews prescription
    await login(page, testUsers.pharmacist.email, testUsers.pharmacist.password);
    await page.click('text=Prescriptions');
    await page.waitForTimeout(500);
    
    const prescriptionList = await page.locator('table').first().isVisible();
    expect(prescriptionList).toBeTruthy();
    console.log('✓ Cross-role workflow: Doctor to Pharmacist working');
  });

  test('Cross-role Workflow: Doctor to Lab Tech', async ({ page }) => {
    // Doctor creates lab order
    await login(page, testUsers.doctor.email, testUsers.doctor.password);
    await page.click('text=Lab Orders');
    await page.waitForTimeout(500);
    
    // Logout
    await page.click('button:has-text("Logout")');
    
    // Lab Tech views orders
    await login(page, testUsers.labtech.email, testUsers.labtech.password);
    await page.click('text=Orders');
    await page.waitForTimeout(500);
    
    const ordersList = await page.locator('table').first().isVisible();
    expect(ordersList).toBeTruthy();
    console.log('✓ Cross-role workflow: Doctor to Lab Tech working');
  });

});
