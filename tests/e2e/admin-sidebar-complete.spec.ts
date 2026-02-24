import { test, expect, Page } from '@playwright/test';
import { loginAsTestUser } from './utils/test-helpers';

type SidebarTarget = {
  path: string;
};

async function loginAsAdmin(page: Page) {
  await loginAsTestUser(page, 'admin');
  await expect(page).toHaveURL(/dashboard|hospital\/account-setup/i);
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/dashboard/i);
}

async function assertNoRuntimeCrash(page: Page) {
  await expect(page.getByText(/application error|something went wrong|referenceerror|typeerror/i)).toHaveCount(0);
}

async function expandAllGroups(page: Page) {
  const sidebar = page.locator('aside,[role="complementary"]').first();
  const triggers = sidebar.locator('button[aria-expanded]');
  const total = await triggers.count();
  for (let i = 0; i < total; i++) {
    const trigger = triggers.nth(i);
    if (await trigger.isVisible().catch(() => false)) {
      const expanded = await trigger.getAttribute('aria-expanded');
      if (expanded !== 'true') {
        await trigger.click({ force: true });
        await page.waitForTimeout(100);
      }
    }
  }
}

async function collectSidebarTargets(page: Page): Promise<SidebarTarget[]> {
  const sidebar = page.locator('aside,[role="complementary"]').first();
  await expandAllGroups(page);
  const hrefs = await sidebar.locator('a[href]').evaluateAll((els) =>
    els
      .map((el) => el.getAttribute('href') || '')
      .filter((href) => href.startsWith('/') && !href.startsWith('/patient'))
  );
  const unique = Array.from(new Set(hrefs));
  return unique.map((path) => ({ path }));
}

async function navigateViaSidebar(page: Page, target: SidebarTarget) {
  const sidebar = page.locator('aside,[role="complementary"]').first();
  await expandAllGroups(page);
  const link = sidebar.locator(`a[href="${target.path}"]`).first();
  if (await link.count()) {
    await link.scrollIntoViewIfNeeded();
    await link.click({ force: true });
  } else {
    await page.goto(target.path);
  }
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(new RegExp(target.path.replace('/', '\\/'), 'i'));
}

async function clickOneSafeMainControl(page: Page) {
  const main = page.locator('main');
  const controls = main.locator('button, a[href], [role="button"]');
  const total = await controls.count();
  for (let i = 0; i < Math.min(total, 10); i++) {
    const el = controls.nth(i);
    const visible = await el.isVisible().catch(() => false);
    if (!visible) continue;
    const text = ((await el.innerText().catch(() => '')) || '').trim();
    if (/(logout|sign out|delete|remove|deactivate|cancel invitation)/i.test(text)) continue;
    try {
      await el.click({ force: true, timeout: 2000 });
      await page.waitForTimeout(150);
      break;
    } catch {
      // ignore non-clickable overlays and continue
    }
  }
}

test.describe('Admin Sidebar Complete Flow', () => {
  test('admin can traverse all sidebar routes and core page flows', async ({ page }) => {
    test.setTimeout(240000);
    await loginAsAdmin(page);
    const targets = await collectSidebarTargets(page);
    expect(targets.length).toBeGreaterThan(10);

    for (const target of targets) {
      await navigateViaSidebar(page, target);
      await assertNoRuntimeCrash(page);
      await clickOneSafeMainControl(page);
      await assertNoRuntimeCrash(page);
    }
  });
});
