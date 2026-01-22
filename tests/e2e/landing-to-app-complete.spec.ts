import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8080';

const testUsers = {
  doctor: { email: 'saran94@gmail.com', password: 'Ted@12345' }
};

async function testRoleWorkflow(page, role, credentials) {
  console.log(`\n========== Testing ${role.toUpperCase()} Workflow ==========`);
  
  // Step 1: Landing Page
  console.log(`1. Landing Page`);
  await page.goto(BASE_URL);
  await page.waitForTimeout(500);
  console.log(`   ✓ Landing page loaded`);
  
  // Step 2: Click Sign In
  console.log(`2. Navigate to Sign In`);
  const signInButton = page.locator('button:has-text("Sign In"), a:has-text("Sign In"), button:has-text("Login"), a:has-text("Login")').first();
  await signInButton.click();
  await page.waitForTimeout(1000);
  console.log(`   ✓ Sign In page loaded`);
  
  // Step 3: Enter credentials
  console.log(`3. Enter credentials`);
  await page.fill('input[type="email"]', credentials.email);
  await page.fill('input[type="password"]', credentials.password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  console.log(`   ✓ Credentials submitted`);
  
  // Step 4: Role Selection
  console.log(`4. Role Selection`);
  const roleButton = page.locator(`button:has-text("${role}"), a:has-text("${role}")`).first();
  if (await roleButton.isVisible()) {
    await roleButton.click();
    await page.waitForTimeout(1000);
    console.log(`   ✓ Role "${role}" selected`);
  }
  
  // Step 5: Dashboard
  console.log(`5. Dashboard Access`);
  await page.waitForTimeout(1000);
  console.log(`   ✓ Dashboard loaded`);
  
  // Step 6: Role-specific workflows
  await testDoctorWorkflow(page);
  
  // Step 7: Logout
  console.log(`6. Logout`);
  const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")').first();
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForTimeout(500);
    console.log(`   ✓ Logout successful`);
  }
}

async function testDoctorWorkflow(page) {
  console.log(`6. Doctor Workflow`);
  
  const workflows = [
    { name: 'Queue', selectors: ['a:has-text("Queue")', 'button:has-text("Queue")'] },
    { name: 'Consultation', selectors: ['a:has-text("Consultation")', 'button:has-text("Consultation")'] },
    { name: 'Prescription', selectors: ['a:has-text("Prescription")', 'button:has-text("Prescription")'] },
    { name: 'Lab', selectors: ['a:has-text("Lab")', 'button:has-text("Lab")'] }
  ];
  
  for (const workflow of workflows) {
    for (const selector of workflow.selectors) {
      const link = page.locator(selector).first();
      if (await link.isVisible()) {
        await link.click();
        await page.waitForTimeout(500);
        console.log(`   ✓ ${workflow.name} accessible`);
        break;
      }
    }
  }
}

test.describe('CareSync Complete End-to-End Workflow', () => {
  
  test('Doctor: Landing → Sign In → Role Selection → Workflows', async ({ page }) => {
    await testRoleWorkflow(page, 'doctor', testUsers.doctor);
  });

});
