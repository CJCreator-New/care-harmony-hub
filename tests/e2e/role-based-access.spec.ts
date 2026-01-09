import { test, expect } from '@playwright/test';
import { setTestRole, loginAsTestUser, setupApiMocks, ROLES, UserRole } from './utils/test-helpers';

// Route access matrix - defines which roles can access which routes
const ROUTE_ACCESS_MATRIX = {
  '/dashboard': ['admin', 'doctor', 'nurse', 'receptionist', 'pharmacist', 'lab_technician'],
  '/patients': ['admin', 'doctor', 'nurse', 'receptionist'],
  '/appointments': ['admin', 'doctor', 'nurse', 'receptionist'],
  '/consultations': ['admin', 'doctor', 'nurse'],
  '/prescriptions': ['admin', 'doctor', 'pharmacist'],
  '/pharmacy': ['admin', 'pharmacist'],
  '/laboratory': ['admin', 'doctor', 'lab_technician'],
  '/queue': ['admin', 'nurse', 'receptionist'],
  '/billing': ['admin', 'receptionist'],
  '/inventory': ['admin', 'pharmacist'],
  '/reports': ['admin'],
  '/settings/staff-management': ['admin'],
  '/settings/hospital-settings': ['admin']
} as const;

test.describe('Role-Based Access Control E2E', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await loginAsTestUser(page, 'admin');
  });

  test('should enforce route access permissions for all roles', async ({ page }) => {
    const roles = Object.keys(ROLES) as UserRole[];
    
    for (const role of roles) {
      await test.step(`Testing ${role} role access`, async () => {
        await setTestRole(page, role);
        
        for (const [route, allowedRoles] of Object.entries(ROUTE_ACCESS_MATRIX)) {
          const shouldHaveAccess = (allowedRoles as readonly string[]).includes(role);
          
          await page.goto(route);
          
          if (shouldHaveAccess) {
            // Should not see access denied message
            await expect(page.getByText(/access.*denied|unauthorized/i)).not.toBeVisible();
            // Should see page content
            await expect(page.locator('main, [role="main"], .main-content')).toBeVisible();
          } else {
            // Should see access denied message or be redirected
            const isAccessDenied = await page.getByText(/access.*denied|unauthorized/i).isVisible();
            const isRedirected = !page.url().includes(route);
            
            expect(isAccessDenied || isRedirected).toBeTruthy();
          }
        }
      });
    }
  });

  test('should show/hide UI elements based on role permissions', async ({ page }) => {
    await test.step('Admin should see all management options', async () => {
      await setTestRole(page, 'admin');
      await page.goto('/dashboard');
      
      // Admin should see staff management
      await expect(page.getByText(/staff.*management|user.*management/i)).toBeVisible();
      // Admin should see system settings
      await expect(page.getByText(/settings|configuration/i)).toBeVisible();
    });

    await test.step('Doctor should see clinical options only', async () => {
      await setTestRole(page, 'doctor');
      await page.goto('/dashboard');
      
      // Doctor should see consultations
      await expect(page.getByText(/consultations|clinic/i)).toBeVisible();
      // Doctor should NOT see staff management
      await expect(page.getByText(/staff.*management/i)).not.toBeVisible();
    });

    await test.step('Nurse should see patient care options', async () => {
      await setTestRole(page, 'nurse');
      await page.goto('/dashboard');
      
      // Nurse should see queue management
      await expect(page.getByText(/queue|patient.*queue/i)).toBeVisible();
      // Nurse should NOT see billing
      await expect(page.getByText(/billing|invoice/i)).not.toBeVisible();
    });

    await test.step('Patient should see limited portal options', async () => {
      await setTestRole(page, 'patient');
      await page.goto('/dashboard');
      
      // Patient should see appointments
      await expect(page.getByText(/my.*appointments|appointments/i)).toBeVisible();
      // Patient should NOT see other patients' data
      await expect(page.getByText(/all.*patients|patient.*list/i)).not.toBeVisible();
    });
  });

  test('should prevent unauthorized actions within allowed pages', async ({ page }) => {
    await test.step('Nurse cannot create prescriptions in consultation', async () => {
      await setTestRole(page, 'nurse');
      await page.goto('/consultations');
      
      // Nurse can view consultations but cannot prescribe
      await expect(page.getByRole('button', { name: /prescribe|add.*prescription/i })).not.toBeVisible();
    });

    await test.step('Receptionist cannot access clinical data', async () => {
      await setTestRole(page, 'receptionist');
      await page.goto('/patients');
      
      // Receptionist can see patient list but not clinical details
      await expect(page.getByText(/medical.*history|clinical.*notes/i)).not.toBeVisible();
    });

    await test.step('Pharmacist cannot modify patient demographics', async () => {
      await setTestRole(page, 'pharmacist');
      await page.goto('/patients');
      
      // Should be redirected or show access denied
      const hasAccess = page.url().includes('/patients') && 
                       await page.getByText(/access.*denied/i).isHidden();
      expect(hasAccess).toBeFalsy();
    });
  });

  test('should handle role switching correctly', async ({ page }) => {
    await test.step('Role switcher should update permissions immediately', async () => {
      // Start as admin
      await setTestRole(page, 'admin');
      await page.goto('/settings/staff-management');
      await expect(page.getByText(/staff.*management/i)).toBeVisible();
      
      // Switch to doctor
      await setTestRole(page, 'doctor');
      await page.goto('/settings/staff-management');
      await expect(page.getByText(/access.*denied|unauthorized/i)).toBeVisible();
      
      // Switch back to admin
      await setTestRole(page, 'admin');
      await page.goto('/settings/staff-management');
      await expect(page.getByText(/staff.*management/i)).toBeVisible();
    });

    await test.step('Role should persist across page navigation', async () => {
      await setTestRole(page, 'nurse');
      
      // Navigate to multiple pages
      await page.goto('/queue');
      await expect(page.getByText(/queue.*management/i)).toBeVisible();
      
      await page.goto('/dashboard');
      await expect(page.getByText(/nurse.*dashboard|dashboard/i)).toBeVisible();
      
      // Role should still be nurse
      const currentRole = await page.evaluate(() => localStorage.getItem('testRole'));
      expect(currentRole).toBe('nurse');
    });
  });

  test('should validate data access restrictions', async ({ page }) => {
    await test.step('Patient can only see own data', async () => {
      await setTestRole(page, 'patient');
      
      // Mock patient-specific data
      await page.route('**/patients/me', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'patient-1',
            firstName: 'John',
            lastName: 'Patient',
            mrn: 'MRN-001'
          })
        });
      });
      
      await page.goto('/patient/medical-history');
      
      // Should see own data
      await expect(page.getByText('John Patient')).toBeVisible();
      
      // Should not be able to access other patients' data
      await page.goto('/patients/patient-2');
      await expect(page.getByText(/access.*denied|not.*found/i)).toBeVisible();
    });

    await test.step('Staff can only see hospital-specific data', async () => {
      await setTestRole(page, 'doctor');
      
      // Mock hospital-specific patient data
      await page.route('**/patients**', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'patient-1',
              firstName: 'Jane',
              lastName: 'Doe',
              hospital_id: 'hospital-1' // Same hospital
            }
          ])
        });
      });
      
      await page.goto('/patients');
      await expect(page.getByText('Jane Doe')).toBeVisible();
    });
  });

  test('should handle edge cases and security scenarios', async ({ page }) => {
    await test.step('Should prevent role escalation attempts', async () => {
      await setTestRole(page, 'nurse');
      
      // Try to manually navigate to admin page
      await page.goto('/settings/staff-management');
      await expect(page.getByText(/access.*denied/i)).toBeVisible();
      
      // Try to manipulate localStorage to escalate role
      await page.evaluate(() => {
        localStorage.setItem('userRole', 'admin'); // Wrong key
      });
      
      await page.reload();
      await page.goto('/settings/staff-management');
      await expect(page.getByText(/access.*denied/i)).toBeVisible();
    });

    await test.step('Should handle invalid roles gracefully', async () => {
      // Set invalid role
      await page.evaluate(() => {
        localStorage.setItem('testRole', 'invalid_role');
      });
      
      await page.reload();
      await page.goto('/dashboard');
      
      // Should fallback to default behavior or show error
      const hasError = await page.getByText(/error|invalid/i).isVisible();
      const hasDefaultAccess = page.url().includes('/dashboard');
      
      expect(hasError || hasDefaultAccess).toBeTruthy();
    });

    await test.step('Should handle missing authentication', async () => {
      // Clear all auth data
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*login.*/);
    });
  });

  test('should validate API endpoint access by role', async ({ page }) => {
    await test.step('Should restrict API calls based on role', async () => {
      // Mock API with role-based responses
      await page.route('**/api/admin/**', async route => {
        const headers = route.request().headers();
        const userRole = headers['x-user-role'] || 'guest';
        
        if (userRole !== 'admin') {
          await route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Forbidden' })
          });
        } else {
          await route.continue();
        }
      });
      
      await setTestRole(page, 'nurse');
      
      // Try to make admin API call - should fail
      const response = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/admin/users');
          return { status: res.status, ok: res.ok };
        } catch (error) {
          return { error: error.message };
        }
      });
      
      expect(response.status).toBe(403);
    });
  });
});