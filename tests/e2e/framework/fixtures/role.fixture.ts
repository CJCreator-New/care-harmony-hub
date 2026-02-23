import { test as base, type Browser, type Page } from '@playwright/test';
import type { UserRole } from '../roles';
import { storageStatePath } from '../roles';

type RoleFixture = {
  asRole: (role: UserRole) => Promise<Page>;
};

export const test = base.extend<RoleFixture>({
  asRole: async ({ browser }, use) => {
    const contexts: Awaited<ReturnType<Browser['newContext']>>[] = [];

    await use(async (role: UserRole) => {
      const context = await browser.newContext({
        storageState: storageStatePath(role),
      });
      contexts.push(context);
      const page = await context.newPage();
      await page.goto('/dashboard');
      return page;
    });

    await Promise.all(contexts.map((ctx) => ctx.close()));
  },
});

export { expect } from '@playwright/test';
