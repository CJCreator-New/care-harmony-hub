---
Status: ready-for-agent
Severity: P2
Role: doctor
Page: /dashboard
Viewport: Desktop
Browser: chromium
---

# [P2] Doctor Role Test Assumes Standalone "Prescriptions" Sidebar Link

## Description
In `tests/e2e/tests/roles/doctor/doctor.spec.ts`:
```typescript
test.describe('Prescriptions', () => {
  test('should access prescriptions', async ({ page }) => {
    await dashboard.navigateTo('Prescriptions');
    await expect(page).toHaveURL(/prescription/i);
  });
});
```
Per `CONTEXT.md` and `src/config/routeManifest.ts`:
- Doctors prescribe medications within the Consultation workflow (`/consultations`).
- Standalone prescription queue and dispensing (`/pharmacy`) is strictly restricted to Pharmacists and Admins to enforce the clinical dispensing boundary.
- Consequently, doctors do NOT have a standalone sidebar link named "Prescriptions".

## Steps to Reproduce
1. Log in as `doctor@testgeneral.com`.
2. Observe sidebar: Core Operations (`Dashboard`, `Patients`, `Appointments`, `Queue Management`), Clinical Care (`Consultations`, `Telemedicine`, `Voice Clinical Notes`), Laboratory (`Lab Orders`).
3. Doctor test fails waiting for `getByRole('link', { name: /Prescriptions/i })`.

## Expected Result
Doctor prescription testing should navigate through a Consultation (`/consultations`) to create a prescription order, or verify access to consultation prescriptions.

## Recommended Fix
Update `tests/e2e/tests/roles/doctor/doctor.spec.ts` to test prescription generation via the Consultation workflow (`/consultations`) or check patient prescription history within a consultation.

## Regression Test Required
Yes (`tests/e2e/tests/roles/doctor/doctor.spec.ts`).
