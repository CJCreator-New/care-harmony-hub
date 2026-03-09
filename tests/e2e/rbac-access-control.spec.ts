import { expect } from '@playwright/test';
import { test as authTest } from './fixtures/auth.fixture';

authTest.describe('RBAC — Route Access Control', () => {
  const adminOnlyRoutes = ['/admin/staff', '/admin/audit', '/admin/settings'];
  const doctorOnlyRoutes = ['/consultations'];
  const nurseOnlyRoutes = ['/nurse/queue'];
  const pharmacistOnlyRoutes = ['/pharmacy'];
  const labOnlyRoutes = ['/lab'];

  for (const route of adminOnlyRoutes) {
    authTest(`patient cannot access ${route}`, async ({ loginAs }) => {
      const page = await loginAs('patient');
      await page.goto(route);
      await expect(page).not.toHaveURL(new RegExp(route.replace('/', '\\/')));
    });

    authTest(`nurse cannot access ${route}`, async ({ loginAs }) => {
      const page = await loginAs('nurse');
      await page.goto(route);
      await expect(page).not.toHaveURL(new RegExp(route.replace('/', '\\/')));
    });
  }

  for (const route of nurseOnlyRoutes) {
    authTest(`patient cannot access ${route}`, async ({ loginAs }) => {
      const page = await loginAs('patient');
      await page.goto(route);
      await expect(page).not.toHaveURL(new RegExp(route.replace('/', '\\/')));
    });
  }

  for (const route of pharmacistOnlyRoutes) {
    authTest(`patient cannot access ${route}`, async ({ loginAs }) => {
      const page = await loginAs('patient');
      await page.goto(route);
      await expect(page).not.toHaveURL(new RegExp(route.replace('/', '\\/')));
    });
  }

  for (const route of labOnlyRoutes) {
    authTest(`patient cannot access ${route}`, async ({ loginAs }) => {
      const page = await loginAs('patient');
      await page.goto(route);
      await expect(page).not.toHaveURL(new RegExp(route.replace('/', '\\/')));
    });
  }

  authTest('unauthenticated user is redirected to login', async ({ browser }) => {
    const context = await browser.newContext(); // no storage state = unauthenticated
    const page = await context.newPage();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login|signin|auth/i);
    await context.close();
  });
});
