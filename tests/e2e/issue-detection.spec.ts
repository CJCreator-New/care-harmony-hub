import { test, expect } from '@playwright/test';
import fs from 'fs';

const BASE_URL = 'http://localhost:8080';
const ISSUES_FILE = 'test-issues-report.json';

interface Issue {
  role: string;
  workflow: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue: string;
  timestamp: string;
  resolution?: string;
}

const issues: Issue[] = [];

function reportIssue(role: string, workflow: string, severity: string, issue: string, resolution?: string) {
  const issueObj: Issue = {
    role,
    workflow,
    severity: severity as 'critical' | 'high' | 'medium' | 'low',
    issue,
    timestamp: new Date().toISOString(),
    resolution
  };
  issues.push(issueObj);
  console.log(`[${severity.toUpperCase()}] ${role} - ${workflow}: ${issue}`);
}

test.describe('CareSync Issue Detection & Resolution', () => {

  test.afterAll(() => {
    // Save issues to file
    fs.writeFileSync(ISSUES_FILE, JSON.stringify(issues, null, 2));
    console.log(`\n✓ Issues report saved to ${ISSUES_FILE}`);
    console.log(`Total issues found: ${issues.length}`);
  });

  test('Check: Admin Dashboard Load Time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'admin@hospital.com');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();
    const loadTime = Date.now() - startTime;

    if (loadTime > 3000) {
      reportIssue('Admin', 'Dashboard Load', 'high', `Dashboard load time: ${loadTime}ms (exceeds 3s threshold)`, 'Optimize dashboard queries and lazy load components');
    } else {
      console.log(`✓ Admin dashboard loaded in ${loadTime}ms`);
    }
  });

  test('Check: Doctor Patient Queue Updates', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"]', 'Doctor@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    const queueVisible = await page.locator('text=Patient Queue').isVisible().catch(() => false);
    if (!queueVisible) {
      reportIssue('Doctor', 'Patient Queue', 'critical', 'Patient queue not visible on dashboard', 'Check queue component rendering and data fetching');
    } else {
      console.log('✓ Doctor patient queue visible');
    }
  });

  test('Check: Nurse Vital Signs Form Validation', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'nurse@hospital.com');
    await page.fill('input[type="password"]', 'Nurse@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await page.click('text=Vital Signs').catch(() => {});
    await page.waitForTimeout(500);

    // Try to submit empty form
    const submitButton = await page.locator('button:has-text("Submit")').first().isVisible().catch(() => false);
    if (submitButton) {
      await page.click('button:has-text("Submit")');
      const errorMessage = await page.locator('text=Required').isVisible().catch(() => false);
      if (!errorMessage) {
        reportIssue('Nurse', 'Vital Signs Form', 'high', 'Form validation not working - empty form submitted', 'Add required field validation to vital signs form');
      } else {
        console.log('✓ Vital signs form validation working');
      }
    }
  });

  test('Check: Receptionist Appointment Scheduling', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'receptionist@hospital.com');
    await page.fill('input[type="password"]', 'Receptionist@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await page.click('text=Schedule Appointment').catch(() => {});
    await page.waitForTimeout(500);

    const appointmentForm = await page.locator('form').first().isVisible().catch(() => false);
    if (!appointmentForm) {
      reportIssue('Receptionist', 'Appointment Scheduling', 'critical', 'Appointment scheduling form not accessible', 'Check appointment scheduling component and routing');
    } else {
      console.log('✓ Receptionist appointment scheduling accessible');
    }
  });

  test('Check: Pharmacist Drug Interaction Alerts', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'pharmacist@hospital.com');
    await page.fill('input[type="password"]', 'Pharmacist@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await page.click('text=Prescriptions').catch(() => {});
    await page.waitForTimeout(500);

    const alertsVisible = await page.locator('text=Drug Interaction').isVisible().catch(() => false);
    if (!alertsVisible) {
      reportIssue('Pharmacist', 'Drug Interactions', 'high', 'Drug interaction alerts not visible', 'Implement drug interaction checking and display alerts');
    } else {
      console.log('✓ Pharmacist drug interaction alerts visible');
    }
  });

  test('Check: Lab Tech Results Entry Form', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'labtech@hospital.com');
    await page.fill('input[type="password"]', 'LabTech@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await page.click('text=Enter Results').catch(() => {});
    await page.waitForTimeout(500);

    const resultsForm = await page.locator('form').first().isVisible().catch(() => false);
    if (!resultsForm) {
      reportIssue('Lab Tech', 'Results Entry', 'critical', 'Results entry form not accessible', 'Check results entry component and routing');
    } else {
      console.log('✓ Lab Tech results entry form accessible');
    }
  });

  test('Check: Patient Portal Medical Records', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'patient@hospital.com');
    await page.fill('input[type="password"]', 'Patient@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await page.click('text=Medical Records').catch(() => {});
    await page.waitForTimeout(500);

    const recordsList = await page.locator('table').first().isVisible().catch(() => false);
    if (!recordsList) {
      reportIssue('Patient', 'Medical Records', 'high', 'Medical records not displaying', 'Check patient portal data fetching and display');
    } else {
      console.log('✓ Patient medical records accessible');
    }
  });

  test('Check: RBAC Permission Enforcement', async ({ page }) => {
    // Test doctor accessing admin panel
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"]', 'Doctor@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await page.goto(`${BASE_URL}/admin`);
    const isRedirected = page.url().includes('/dashboard') || page.url().includes('/login');
    const hasError = await page.locator('text=Unauthorized').isVisible().catch(() => false);

    if (!isRedirected && !hasError) {
      reportIssue('RBAC', 'Permission Enforcement', 'critical', 'Doctor can access admin panel - RBAC not enforced', 'Implement proper RBAC checks on protected routes');
    } else {
      console.log('✓ RBAC permission enforcement working');
    }
  });

  test('Check: Real-time Notifications', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"]', 'Doctor@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    const notificationBell = await page.locator('[data-testid="notification-bell"]').isVisible().catch(() => false);
    if (!notificationBell) {
      reportIssue('Notifications', 'Real-time Updates', 'medium', 'Notification bell not visible', 'Add notification component to header');
    } else {
      console.log('✓ Real-time notifications available');
    }
  });

  test('Check: Audit Logging', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'admin@hospital.com');
    await page.fill('input[type="password"]', 'Admin@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    await page.click('text=Audit Logs').catch(() => {});
    await page.waitForTimeout(500);

    const logsTable = await page.locator('table').first().isVisible().catch(() => false);
    if (!logsTable) {
      reportIssue('Admin', 'Audit Logging', 'high', 'Audit logs not accessible', 'Implement audit log viewer in admin panel');
    } else {
      console.log('✓ Audit logging accessible');
    }
  });

  test('Check: Data Validation - Email Format', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password');
    await page.click('button[type="submit"]');

    const errorMessage = await page.locator('text=Invalid email').isVisible().catch(() => false);
    if (!errorMessage) {
      reportIssue('Validation', 'Email Format', 'medium', 'Email validation not working', 'Add email format validation to login form');
    } else {
      console.log('✓ Email validation working');
    }
  });

  test('Check: Cross-role Workflow - Prescription Flow', async ({ page }) => {
    // Doctor creates prescription
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"]', 'Doctor@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    const prescriptionForm = await page.locator('text=New Prescription').isVisible().catch(() => false);
    if (!prescriptionForm) {
      reportIssue('Workflow', 'Prescription Creation', 'critical', 'Doctor cannot create prescriptions', 'Check prescription form component and routing');
    } else {
      console.log('✓ Doctor prescription creation accessible');
    }
  });

  test('Check: Cross-role Workflow - Lab Order Flow', async ({ page }) => {
    // Doctor creates lab order
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'doctor@hospital.com');
    await page.fill('input[type="password"]', 'Doctor@123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation();

    const labOrderForm = await page.locator('text=New Lab Order').isVisible().catch(() => false);
    if (!labOrderForm) {
      reportIssue('Workflow', 'Lab Order Creation', 'critical', 'Doctor cannot create lab orders', 'Check lab order form component and routing');
    } else {
      console.log('✓ Doctor lab order creation accessible');
    }
  });

  test('Check: Performance - Page Load Time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/login`);
    const loadTime = Date.now() - startTime;

    if (loadTime > 2000) {
      reportIssue('Performance', 'Page Load', 'medium', `Login page load time: ${loadTime}ms (exceeds 2s threshold)`, 'Optimize page load performance');
    } else {
      console.log(`✓ Login page loaded in ${loadTime}ms`);
    }
  });

  test('Check: Error Handling - Network Error', async ({ page }) => {
    // Simulate network error
    await page.context().setOffline(true);
    await page.goto(`${BASE_URL}/login`).catch(() => {});
    
    const errorMessage = await page.locator('text=Network Error').isVisible().catch(() => false);
    await page.context().setOffline(false);

    if (!errorMessage) {
      reportIssue('Error Handling', 'Network Errors', 'medium', 'Network error not handled gracefully', 'Add error boundary and network error handling');
    } else {
      console.log('✓ Network error handling working');
    }
  });

});
