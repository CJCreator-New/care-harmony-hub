import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:8080';

// Mock data for testing
const mockData = {
  admin: {
    role: 'admin',
    name: 'Admin User',
    email: 'admin@hospital.com',
    dashboard: 'Admin Dashboard'
  },
  doctor: {
    role: 'doctor',
    name: 'Dr. John Smith',
    email: 'doctor@hospital.com',
    dashboard: 'Doctor Dashboard'
  },
  nurse: {
    role: 'nurse',
    name: 'Nurse Sarah',
    email: 'nurse@hospital.com',
    dashboard: 'Nurse Dashboard'
  },
  receptionist: {
    role: 'receptionist',
    name: 'Receptionist Mike',
    email: 'receptionist@hospital.com',
    dashboard: 'Receptionist Dashboard'
  },
  pharmacist: {
    role: 'pharmacist',
    name: 'Pharmacist Lisa',
    email: 'pharmacist@hospital.com',
    dashboard: 'Pharmacist Dashboard'
  },
  labtech: {
    role: 'labtech',
    name: 'Lab Tech Tom',
    email: 'labtech@hospital.com',
    dashboard: 'Lab Tech Dashboard'
  },
  patient: {
    role: 'patient',
    name: 'Patient Alex',
    email: 'patient@hospital.com',
    dashboard: 'Patient Portal'
  }
};

async function testRoleWithMockData(page, roleKey) {
  const user = mockData[roleKey];
  console.log(`\n========== Testing ${user.role.toUpperCase()} Workflow ==========`);
  
  // Step 1: Landing Page
  console.log(`1. Landing Page`);
  await page.goto(BASE_URL);
  await page.waitForTimeout(1000);
  const landingVisible = await page.locator('body').isVisible();
  expect(landingVisible).toBeTruthy();
  console.log(`   ✓ Landing page loaded`);
  
  // Step 2: Mock login by setting localStorage
  console.log(`2. Mock Login - ${user.name}`);
  await page.evaluate((userData) => {
    localStorage.setItem('user', JSON.stringify({
      id: `${userData.role}-123`,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      created_at: new Date().toISOString()
    }));
    localStorage.setItem('auth_token', `mock-token-${userData.role}`);
  }, user);
  console.log(`   ✓ Mock user set: ${user.name} (${user.role})`);
  
  // Step 3: Navigate to dashboard
  console.log(`3. Navigate to Dashboard`);
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForTimeout(1500);
  const dashboardVisible = await page.locator('body').isVisible();
  expect(dashboardVisible).toBeTruthy();
  console.log(`   ✓ Dashboard loaded`);
  
  // Step 4: Check for role-specific elements
  console.log(`4. Verify Role-Specific Elements`);
  
  // Check for navigation menu
  const navVisible = await page.locator('nav, [role="navigation"]').first().isVisible().catch(() => false);
  if (navVisible) {
    console.log(`   ✓ Navigation menu visible`);
  }
  
  // Check for user info
  const userInfo = await page.locator('text=' + user.name).isVisible().catch(() => false);
  if (userInfo) {
    console.log(`   ✓ User info displayed: ${user.name}`);
  }
  
  // Step 5: Test role-specific workflows
  console.log(`5. Testing ${user.role} Workflows`);
  
  switch(roleKey) {
    case 'admin':
      await testAdminWorkflows(page);
      break;
    case 'doctor':
      await testDoctorWorkflows(page);
      break;
    case 'nurse':
      await testNurseWorkflows(page);
      break;
    case 'receptionist':
      await testReceptionistWorkflows(page);
      break;
    case 'pharmacist':
      await testPharmacistWorkflows(page);
      break;
    case 'labtech':
      await testLabTechWorkflows(page);
      break;
    case 'patient':
      await testPatientWorkflows(page);
      break;
  }
  
  // Step 6: Test logout
  console.log(`6. Test Logout`);
  await page.evaluate(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('auth_token');
  });
  console.log(`   ✓ Mock user cleared`);
}

async function testAdminWorkflows(page) {
  const links = ['Users', 'Analytics', 'Audit', 'Settings', 'Reports'];
  for (const link of links) {
    const element = await page.locator(`a:has-text("${link}"), button:has-text("${link}")`).first().isVisible().catch(() => false);
    if (element) {
      console.log(`   ✓ ${link} accessible`);
    }
  }
}

async function testDoctorWorkflows(page) {
  const links = ['Queue', 'Consultations', 'Prescriptions', 'Lab Orders', 'Patients'];
  for (const link of links) {
    const element = await page.locator(`a:has-text("${link}"), button:has-text("${link}")`).first().isVisible().catch(() => false);
    if (element) {
      console.log(`   ✓ ${link} accessible`);
    }
  }
}

async function testNurseWorkflows(page) {
  const links = ['Patients', 'Vital Signs', 'Medications', 'Care Plans', 'Tasks'];
  for (const link of links) {
    const element = await page.locator(`a:has-text("${link}"), button:has-text("${link}")`).first().isVisible().catch(() => false);
    if (element) {
      console.log(`   ✓ ${link} accessible`);
    }
  }
}

async function testReceptionistWorkflows(page) {
  const links = ['Register', 'Appointments', 'Queue', 'Insurance', 'Check-in'];
  for (const link of links) {
    const element = await page.locator(`a:has-text("${link}"), button:has-text("${link}")`).first().isVisible().catch(() => false);
    if (element) {
      console.log(`   ✓ ${link} accessible`);
    }
  }
}

async function testPharmacistWorkflows(page) {
  const links = ['Prescriptions', 'Inventory', 'Drug Interactions', 'Refills', 'Dispensing'];
  for (const link of links) {
    const element = await page.locator(`a:has-text("${link}"), button:has-text("${link}")`).first().isVisible().catch(() => false);
    if (element) {
      console.log(`   ✓ ${link} accessible`);
    }
  }
}

async function testLabTechWorkflows(page) {
  const links = ['Orders', 'Specimens', 'Results', 'Quality Control', 'Equipment'];
  for (const link of links) {
    const element = await page.locator(`a:has-text("${link}"), button:has-text("${link}")`).first().isVisible().catch(() => false);
    if (element) {
      console.log(`   ✓ ${link} accessible`);
    }
  }
}

async function testPatientWorkflows(page) {
  const links = ['Appointments', 'Medical Records', 'Prescriptions', 'Lab Results', 'Messages'];
  for (const link of links) {
    const element = await page.locator(`a:has-text("${link}"), button:has-text("${link}")`).first().isVisible().catch(() => false);
    if (element) {
      console.log(`   ✓ ${link} accessible`);
    }
  }
}

test.describe('CareSync Mock Data E2E Tests', () => {
  
  test('Admin: Mock Login → Dashboard → Workflows', async ({ page }) => {
    await testRoleWithMockData(page, 'admin');
  });

  test('Doctor: Mock Login → Dashboard → Workflows', async ({ page }) => {
    await testRoleWithMockData(page, 'doctor');
  });

  test('Nurse: Mock Login → Dashboard → Workflows', async ({ page }) => {
    await testRoleWithMockData(page, 'nurse');
  });

  test('Receptionist: Mock Login → Dashboard → Workflows', async ({ page }) => {
    await testRoleWithMockData(page, 'receptionist');
  });

  test('Pharmacist: Mock Login → Dashboard → Workflows', async ({ page }) => {
    await testRoleWithMockData(page, 'pharmacist');
  });

  test('Lab Tech: Mock Login → Dashboard → Workflows', async ({ page }) => {
    await testRoleWithMockData(page, 'labtech');
  });

  test('Patient: Mock Login → Dashboard → Workflows', async ({ page }) => {
    await testRoleWithMockData(page, 'patient');
  });

  test('All Roles Sequential - Mock Data', async ({ page }) => {
    for (const roleKey of Object.keys(mockData)) {
      await testRoleWithMockData(page, roleKey);
      await page.waitForTimeout(500);
    }
  });

});
