import { expect, type Locator, type Page } from '@playwright/test';
import { mockApiState, mockUsers, resetMockState } from '../mockData';

export function installMockApi(page: Page): void {
  resetMockState();

  page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path.endsWith('/api/auth/login') && method === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-jwt-token',
          user: mockApiState.users.standard,
        }),
      });
    }

    if (path.endsWith('/api/entities') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockApiState.primaryEntities) });
    }

    if (path.endsWith('/api/entities') && method === 'POST') {
      const postData = request.postDataJSON() as Record<string, unknown>;
      const newEntity = {
        id: `entity-${String(mockApiState.primaryEntities.length + 1).padStart(3, '0')}`,
        name: String(postData.name ?? 'Untitled'),
        description: String(postData.description ?? ''),
        category: String(postData.category ?? 'General'),
        startDate: String(postData.startDate ?? '2026-01-01'),
        active: true,
      };
      mockApiState.primaryEntities.push(newEntity);
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(newEntity) });
    }

    if (path.match(/\/api\/entities\/[^/]+$/) && method === 'PUT') {
      const id = path.split('/').pop() ?? '';
      const body = request.postDataJSON() as Record<string, unknown>;
      const idx = mockApiState.primaryEntities.findIndex((e) => e.id === id);
      if (idx === -1) {
        return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ message: 'Not found' }) });
      }

      const merged = { ...mockApiState.primaryEntities[idx], ...body };
      mockApiState.primaryEntities[idx] = merged;
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(merged) });
    }

    if (path.match(/\/api\/entities\/[^/]+$/) && method === 'DELETE') {
      const id = path.split('/').pop() ?? '';
      mockApiState.primaryEntities = mockApiState.primaryEntities.filter((entity) => entity.id !== id);
      return route.fulfill({ status: 204, body: '' });
    }

    if (path.endsWith('/api/notifications') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockApiState.notifications) });
    }

    if (path.endsWith('/api/settings') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockApiState.settings) });
    }

    if (path.endsWith('/api/settings') && method === 'PUT') {
      const body = request.postDataJSON() as Record<string, unknown>;
      mockApiState.settings = { ...mockApiState.settings, ...body };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockApiState.settings) });
    }

    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  });
}

export async function enableTestMode(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.localStorage.setItem('TEST_MODE', 'true');
  });
}

export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
}

export async function login(page: Page): Promise<void> {
  await page.addInitScript((user) => {
    window.localStorage.setItem('auth_token', 'mock-jwt-token');
    window.localStorage.setItem('current_user', JSON.stringify(user));
    window.localStorage.setItem('active_role', user.role);
  }, mockUsers.standard);

  await navigateTo(page, '/dashboard');
}

export async function loginAsRole(
  page: Page,
  role: 'admin' | 'doctor' | 'nurse' | 'receptionist' | 'lab' | 'pharmacist' | 'patient',
): Promise<void> {
  const user = mockUsers[role];

  // Ensure we are on app origin so localStorage can be set deterministically.
  await page.goto('/');
  await page.evaluate((initUser) => {
    window.localStorage.setItem('auth_token', 'mock-jwt-token');
    window.localStorage.setItem('current_user', JSON.stringify(initUser));
    window.localStorage.setItem('active_role', initUser.role);
    window.localStorage.setItem('TEST_MODE', 'true');
  }, user);

  if (role === 'patient') {
    await navigateTo(page, '/patient/portal');
    return;
  }

  await navigateTo(page, '/dashboard');
}

export function createErrorCollector(page: Page): { assertNoClientErrors: () => Promise<void> } {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  return {
    async assertNoClientErrors() {
      const ignoredConsolePatterns = [
        /violates the following Content Security Policy directive/i,
        /fonts\.gstatic\.com/i,
        /Creating a worker from 'blob:/i,
      ];
      const relevantConsoleErrors = consoleErrors.filter(
        (message) => !ignoredConsolePatterns.some((pattern) => pattern.test(message)),
      );

      expect.soft(relevantConsoleErrors, `Console errors found:\n${relevantConsoleErrors.join('\n')}`).toEqual([]);
      expect.soft(pageErrors, `Uncaught page errors found:\n${pageErrors.join('\n')}`).toEqual([]);
      await expect(page.getByText(/something went wrong|unexpected error|error occurred/i)).toHaveCount(0);
    },
  };
}

export async function interactWithFormControls(page: Page, fallbackText = 'Sample text'): Promise<void> {
  const textboxes = page.getByRole('textbox');
  const textboxCount = await textboxes.count();
  for (let i = 0; i < textboxCount; i += 1) {
    const field = textboxes.nth(i);
    if (!(await field.isVisible())) {
      continue;
    }
    const inputType = (await field.getAttribute('type')) ?? 'text';
    const valueByType: Record<string, string> = {
      text: i === 0 ? fallbackText : `${fallbackText} ${i}`,
      search: i === 0 ? fallbackText : `${fallbackText} ${i}`,
      email: `tester${i}@example.com`,
      tel: '5551234567',
      url: 'https://example.com',
      number: String(100 + i),
      date: '2026-02-24',
      'datetime-local': '2026-02-24T10:30',
      month: '2026-02',
      week: '2026-W08',
      time: '10:30',
      password: 'Passw0rd!23',
    };

    const value = valueByType[inputType] ?? (i === 0 ? fallbackText : `${fallbackText} ${i}`);

    try {
      await field.fill(value);
    } catch {
      // Some masked/custom inputs reject direct fill values in generic passes.
      continue;
    }
  }

  const checkboxes = page.getByRole('checkbox');
  const checkboxCount = await checkboxes.count();
  for (let i = 0; i < checkboxCount; i += 1) {
    const cb = checkboxes.nth(i);
    if (await cb.isVisible()) {
      await cb.check({ force: true });
    }
  }

  const radios = page.getByRole('radio');
  const radioCount = await radios.count();
  for (let i = 0; i < Math.min(radioCount, 2); i += 1) {
    const radio = radios.nth(i);
    if (await radio.isVisible()) {
      await radio.check({ force: true });
    }
  }

  const comboboxes = page.getByRole('combobox');
  const comboCount = await comboboxes.count();
  for (let i = 0; i < comboCount; i += 1) {
    const combo = comboboxes.nth(i);
    if (!(await combo.isVisible())) {
      continue;
    }

    await combo.click();
    const option = page.getByRole('option').first();
    if (await option.isVisible()) {
      await option.click();
    }
  }
}

export async function clickIfVisible(locator: Locator): Promise<boolean> {
  if (await locator.isVisible()) {
    await locator.click();
    return true;
  }
  return false;
}
