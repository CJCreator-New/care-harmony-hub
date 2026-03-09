import { expect } from '@playwright/test';
import { test as authTest } from './fixtures/auth.fixture';
import { generatePatient } from './fixtures/test-data';

authTest.describe('Cross-Role — Full Patient Journey', () => {
  authTest(
    'receptionist checks in → nurse preps → doctor sees ready',
    async ({ loginAs }) => {
      // Step 1: Receptionist checks in patient
      const receptionistPage = await loginAs('receptionist');
      await receptionistPage.goto('/appointments');

      const checkInBtn = receptionistPage.getByRole('button', { name: /check.?in/i }).first();
      await expect(checkInBtn).toBeVisible();
      await checkInBtn.click();
      await expect(receptionistPage.getByText(/checked in|queue #/i)).toBeVisible();

      // Step 2: Nurse sees patient in queue and records vitals
      const nursePage = await loginAs('nurse');
      await nursePage.goto('/nurse/queue');
      await expect(nursePage.getByText(/waiting|queue/i)).toBeVisible();

      const prepBtn = nursePage.getByRole('button', { name: /prep|vitals/i }).first();
      await expect(prepBtn).toBeVisible();
      await prepBtn.click();

      await nursePage.getByLabel(/heart rate/i).fill('72');
      await nursePage.getByRole('button', { name: /save|complete/i }).click();
      await expect(nursePage.getByText(/ready for doctor|prep complete/i)).toBeVisible();

      // Step 3: Doctor sees patient as ready
      const doctorPage = await loginAs('doctor');
      await doctorPage.goto('/dashboard');
      await expect(doctorPage.getByText(/ready for doctor|patients ready/i)).toBeVisible();
    }
  );

  authTest(
    'doctor prescribes → pharmacist sees pending prescription',
    async ({ loginAs }) => {
      // Step 1: Doctor creates prescription
      const doctorPage = await loginAs('doctor');
      await doctorPage.goto('/consultations');

      const consultRow = doctorPage.getByRole('row').nth(1);
      await consultRow.getByRole('button', { name: /open|view/i }).click();
      await doctorPage.getByRole('tab', { name: /prescription/i }).click();
      await doctorPage.getByRole('button', { name: /add medication|new/i }).click();

      await doctorPage.getByLabel(/medication name/i).fill('Amoxicillin');
      await doctorPage.getByLabel(/dosage/i).fill('500mg');
      await doctorPage.getByLabel(/frequency/i).fill('TID');
      await doctorPage.getByLabel(/duration/i).fill('7 days');
      await doctorPage.getByRole('button', { name: /save|prescribe/i }).click();
      await expect(doctorPage.getByText(/prescription created|saved/i)).toBeVisible();

      // Step 2: Pharmacist sees it in pending queue
      const pharmacistPage = await loginAs('pharmacist');
      await pharmacistPage.goto('/pharmacy');
      await expect(pharmacistPage.getByText(/pending|Amoxicillin/i)).toBeVisible();
    }
  );

  authTest(
    'doctor orders lab → lab tech sees pending order',
    async ({ loginAs }) => {
      // Step 1: Doctor orders lab
      const doctorPage = await loginAs('doctor');
      await doctorPage.goto('/consultations');

      const consultRow = doctorPage.getByRole('row').nth(1);
      await consultRow.getByRole('button', { name: /open|view/i }).click();
      await doctorPage.getByRole('tab', { name: /lab|orders/i }).click();
      await doctorPage.getByRole('button', { name: /order lab|new order/i }).click();
      await doctorPage.getByLabel(/test name/i).fill('CBC');
      await doctorPage.getByRole('button', { name: /order|submit/i }).click();
      await expect(doctorPage.getByText(/lab order created|order placed/i)).toBeVisible();

      // Step 2: Lab tech sees it
      const labTechPage = await loginAs('lab_technician');
      await labTechPage.goto('/lab');
      await expect(labTechPage.getByText(/CBC|pending/i)).toBeVisible();
    }
  );
});
