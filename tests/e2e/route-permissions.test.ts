import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('Route Permission Enforcement (Blocker #1)', () => {
  test('Doctor cannot access /settings directly via URL', async ({ page, context }) => {
    // Login as doctor
    await page.goto(`${BASE_URL}/hospital/login`);
    await page.fill('input[name="email"]', 'doctor@test.hospital');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');
    
    // Attempt direct navigation to /settings (admin-only)
    await page.goto(`${BASE_URL}/dashboard/settings`);
    
    // Verify access denied page is shown
    const heading = await page.locator('h1, text="Access Denied"').first();
    await expect(heading).toBeVisible();
    
    // Verify permission denial message
    const message = await page.locator('text=/Access denied|Required roles/i').first();
    await expect(message).toBeVisible();
    
    // Verify shield alert icon present (permission denied UI)
    const shieldIcon = await page.locator('svg[class*="shield"]').first();
    await expect(shieldIcon).toBeVisible();
  });

  test('Admin CAN access /settings directly via URL', async ({ page }) => {
    // Login as admin
    await page.goto(`${BASE_URL}/hospital/login`);
    await page.fill('input[name="email"]', 'admin@test.hospital');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');
    
    // Navigate to /settings (admin-only)
    await page.goto(`${BASE_URL}/dashboard/settings`);
    
    // Verify settings page loaded successfully
    await page.waitForSelector('text=/Settings|Hospital Settings/i');
    
    // Verify no access denied message
    const deniedMessage = await page.locator('text="Access Denied"');
    await expect(deniedMessage).not.toBeVisible();
  });

  test('Middleware check logs permission denial attempt', async ({ page }) => {
    // Login as receptionist
    await page.goto(`${BASE_URL}/hospital/login`);
    await page.fill('input[name="email"]', 'receptionist@test.hospital');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');
    
    // Attempt to access /pharmacy (pharmacist-only)
    await page.goto(`${BASE_URL}/dashboard/pharmacy`);
    
    // Verify access denied is shown
    const heading = await page.locator('h1, text="Access Denied"').first();
    await expect(heading).toBeVisible();
    
    // Verify correct denial reason (pharmacist role required)
    const reason = await page.locator('text=/pharmacist|pharmacy/i').first();
    await expect(reason).toBeVisible();
  });

  test('Nurse can access /consultations (multi-role route)', async ({ page }) => {
    // Login as nurse
    await page.goto(`${BASE_URL}/hospital/login`);
    await page.fill('input[name="email"]', 'nurse@test.hospital');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');
    
    // Navigate to consultations (admin, doctor, nurse allowed)
    await page.goto(`${BASE_URL}/dashboard/consultations`);
    
    // Verify consultations page loaded
    await page.waitForSelector('text=/Consultations|Consultation/i');
    
    // Verify no access denied
    const deniedMessage = await page.locator('text="Access Denied"');
    await expect(deniedMessage).not.toBeVisible();
  });

  test('Patient redirects from /settings to dashboard', async ({ page }) => {
    // Login as patient
    await page.goto(`${BASE_URL}/hospital/login`);
    await page.fill('input[name="email"]', 'patient@test.hospital');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');
    
    // Attempt to access /settings
    await page.goto(`${BASE_URL}/dashboard/settings`);
    
    // Should show access denied (patient not allowed)
    const heading = await page.locator('h1, text="Access Denied"').first();
    await expect(heading).toBeVisible();
  });

  test('Back button works from access denied page', async ({ page }) => {
    // Login as doctor
    await page.goto(`${BASE_URL}/hospital/login`);
    await page.fill('input[name="email"]', 'doctor@test.hospital');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect and navigate to first page
    await page.waitForURL('**/dashboard');
    const dashboardURL = page.url();
    
    // Attempt access to settings
    await page.goto(`${BASE_URL}/dashboard/settings`);
    await page.waitForSelector('text="Access Denied"');
    
    // Click back button
    await page.click('button:has-text("Go Back")');
    
    // Verify returned to previous page (dashboard)
    await page.waitForURL(dashboardURL);
    await expect(page).toHaveURL(new RegExp('dashboard'));
  });
});
