const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:52399/');
  await page.evaluate(() => {
    localStorage.setItem('caresync_test_mode', 'true');
    localStorage.setItem('caresync_role', 'pharmacist');
    window.location.href = '/pharmacy';
  });

  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'pharmacy-test.png' });
  await browser.close();
})();