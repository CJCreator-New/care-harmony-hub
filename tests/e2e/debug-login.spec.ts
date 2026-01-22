import { test, expect } from '@playwright/test';
import { TEST_DATA } from './utils/test-helpers';

test('debug login', async ({ page }) => {
  console.log('--- Starting Debug Test ---');
  await page.goto('/hospital/login');
  
  await page.getByLabel('Email Address').fill(TEST_DATA.ADMIN.email);
  await page.getByLabel('Password').fill(TEST_DATA.ADMIN.password);
  
  await page.getByRole('button', { name: /sign in|login/i }).click();

  // Wait a bit for response
  await page.waitForTimeout(5000);

  console.log('--- Current URL ---');
  console.log(page.url());
  
  // Try to find the toast content
  // Shadcn toast usually has a dedicated viewport, but looking for generic text is easier for debug
  const errorText = await page.textContent('body');
  console.log('--- Page Text Content (Snippet) ---');
  console.log(errorText.substring(0, 1000)); // First 1000 chars

});
