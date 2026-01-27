/**
 * Authentication Setup
 * 
 * Creates and persists authentication state for each role
 * to be reused across test runs.
 */

import { test as setup, expect } from '@playwright/test';
import { TEST_USERS, UserRole } from '../config/test-users';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(__dirname, '../.auth');

// Setup authentication for admin role
setup('authenticate as admin', async ({ page }) => {
  const user = TEST_USERS.admin;
  
  await page.goto('/hospital/login');
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL(/.*dashboard.*/);
  await page.context().storageState({ path: path.join(authDir, 'admin.json') });
});

// Setup authentication for doctor role
setup('authenticate as doctor', async ({ page }) => {
  const user = TEST_USERS.doctor;
  
  await page.goto('/hospital/login');
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL(/.*dashboard.*/);
  await page.context().storageState({ path: path.join(authDir, 'doctor.json') });
});

// Setup authentication for nurse role
setup('authenticate as nurse', async ({ page }) => {
  const user = TEST_USERS.nurse;
  
  await page.goto('/hospital/login');
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL(/.*dashboard.*/);
  await page.context().storageState({ path: path.join(authDir, 'nurse.json') });
});

// Setup authentication for receptionist role
setup('authenticate as receptionist', async ({ page }) => {
  const user = TEST_USERS.receptionist;
  
  await page.goto('/hospital/login');
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL(/.*dashboard.*/);
  await page.context().storageState({ path: path.join(authDir, 'receptionist.json') });
});

// Setup authentication for pharmacist role
setup('authenticate as pharmacist', async ({ page }) => {
  const user = TEST_USERS.pharmacist;
  
  await page.goto('/hospital/login');
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL(/.*dashboard.*/);
  await page.context().storageState({ path: path.join(authDir, 'pharmacist.json') });
});

// Setup authentication for lab_technician role
setup('authenticate as lab_technician', async ({ page }) => {
  const user = TEST_USERS.lab_tech;
  
  await page.goto('/hospital/login');
  await page.fill('#email', user.email);
  await page.fill('#password', user.password);
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL(/.*dashboard.*/);
  await page.context().storageState({ path: path.join(authDir, 'lab_technician.json') });
});
