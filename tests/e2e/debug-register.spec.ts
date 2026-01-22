import { test, expect } from '@playwright/test';
import { registerTestHospital, TEST_DATA } from './utils/test-helpers';

test('debug registration', async ({ page }) => {
  console.log('--- Debug Registration ---');
  try {
    await registerTestHospital(page);
  } catch (e) {
    console.log('--- Registration Exception ---');
    console.log(e.message);
    
    console.log('--- Current URL ---');
    console.log(page.url());

    const bodyText = await page.innerText('body');
    console.log('--- Body Text ---');
    console.log(bodyText.substring(0, 2000));
  }
});
