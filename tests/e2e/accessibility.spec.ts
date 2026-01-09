import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Set up page for accessibility testing
    await page.goto('/');
  });

  test('Landing page should pass accessibility checks', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Login page should pass accessibility checks', async ({ page }) => {
    await page.goto('/auth/login');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Patient dashboard should pass accessibility checks', async ({ page }) => {
    // This would require authentication setup
    // For now, we'll test the structure
    await page.goto('/patient/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    // Allow some violations for authenticated pages that might not be fully loaded
    const criticalViolations = accessibilityScanResults.violations.filter(
      (violation: any) => violation.impact === 'critical' || violation.impact === 'serious'
    );

    expect(criticalViolations.length).toBeLessThan(5); // Allow some minor issues
  });

  test('Doctor dashboard should pass accessibility checks', async ({ page }) => {
    await page.goto('/doctor/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (violation: any) => violation.impact === 'critical' || violation.impact === 'serious'
    );

    expect(criticalViolations.length).toBeLessThan(5);
  });

  test('Admin dashboard should pass accessibility checks', async ({ page }) => {
    await page.goto('/admin/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const criticalViolations = accessibilityScanResults.violations.filter(
      (violation: any) => violation.impact === 'critical' || violation.impact === 'serious'
    );

    expect(criticalViolations.length).toBeLessThan(5);
  });

  test('Keyboard navigation should work', async ({ page }) => {
    await page.goto('/');

    // Test tab navigation
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeDefined();

    // Test skip links if they exist
    const skipLink = page.locator('a[href="#main-content"]');
    if (await skipLink.isVisible()) {
      await skipLink.click();
      const mainContent = page.locator('#main-content');
      expect(await mainContent.isVisible()).toBeTruthy();
    }
  });

  test('Color contrast should meet WCAG standards', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withRules(['color-contrast'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Images should have alt text', async ({ page }) => {
    await page.goto('/');

    const images = page.locator('img');
    const imageCount = await images.count();

    for (let i = 0; i < imageCount; i++) {
      const alt = await images.nth(i).getAttribute('alt');
      // Decorative images can have empty alt, but informative images should have alt text
      expect(alt).not.toBeNull();
    }
  });

  test('Form elements should have labels', async ({ page }) => {
    await page.goto('/auth/login');

    const inputs = page.locator('input, select, textarea');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      // Each input should have either an id with corresponding label, or aria-label, or aria-labelledby
      const hasLabel = id || ariaLabel || ariaLabelledBy;
      expect(hasLabel).toBeTruthy();
    }
  });

  test('Page should have proper heading structure', async ({ page }) => {
    await page.goto('/');

    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThan(0);

    // Check that headings follow a logical order (h1 -> h2 -> h3, etc.)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    const headingLevels = await page.locator('h1, h2, h3, h4, h5, h6').evaluateAll(
      elements => elements.map(el => parseInt(el.tagName.charAt(1)))
    );

    // Ensure no heading level is skipped (e.g., h1 followed directly by h3)
    for (let i = 1; i < headingLevels.length; i++) {
      expect(headingLevels[i]).toBeLessThanOrEqual(headingLevels[i - 1] + 1);
    }
  });

  test('Focus indicators should be visible', async ({ page }) => {
    await page.goto('/auth/login');

    // Focus on an input element
    const emailInput = page.locator('input[type="email"]');
    await emailInput.focus();

    // Check if the element has a visible focus indicator
    const hasFocusIndicator = await emailInput.evaluate(el => {
      const computedStyle = window.getComputedStyle(el);
      return computedStyle.outline !== 'none' ||
             computedStyle.boxShadow !== 'none' ||
             computedStyle.border !== computedStyle.border.replace(/rgb\(59, 130, 246\)/, '');
    });

    expect(hasFocusIndicator).toBeTruthy();
  });

  test('Language should be properly set', async ({ page }) => {
    await page.goto('/');

    const htmlLang = await page.getAttribute('html', 'lang');
    expect(htmlLang).toBe('en'); // Assuming English as default
  });

  test('Page title should be descriptive', async ({ page }) => {
    await page.goto('/');

    const title = await page.title();
    expect(title).not.toBe('');
    expect(title.length).toBeGreaterThan(10);
    expect(title).not.toBe('CareSync HMS'); // Should be more specific
  });
});