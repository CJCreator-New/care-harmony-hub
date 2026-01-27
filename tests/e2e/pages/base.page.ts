/**
 * Base Page Object
 * Foundation for all page objects with self-healing selectors and utilities
 */

import { Page, Locator, expect } from '@playwright/test';

export interface PerformanceMetric {
  page: string;
  loadTime: number;
  timestamp: string;
  type: string;
  breakdown?: Record<string, number>;
}

export interface TestIssue {
  type: string;
  description: string;
  context?: string;
  url: string;
  timestamp: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

export abstract class BasePage {
  protected page: Page;
  protected issues: TestIssue[] = [];
  protected performanceMetrics: PerformanceMetric[] = [];

  constructor(page: Page) {
    this.page = page;
  }

  /**
   * Page URL - must be implemented by subclasses
   */
  abstract get url(): string;

  /**
   * Navigate to page with performance tracking
   */
  async navigate(): Promise<PerformanceMetric> {
    const startTime = performance.now();

    await this.page.goto(this.url);
    await this.page.waitForLoadState('networkidle');

    const loadTime = performance.now() - startTime;
    const metric: PerformanceMetric = {
      page: this.url,
      loadTime,
      timestamp: new Date().toISOString(),
      type: 'page_load',
    };

    this.performanceMetrics.push(metric);

    if (loadTime > 3000) {
      this.reportIssue('performance', `Slow page load: ${loadTime.toFixed(0)}ms`, this.url);
    }

    return metric;
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Self-healing locator strategy with fallbacks
   */
  async findElement(
    primarySelector: string,
    fallbackSelectors: string[] = [],
    elementName: string = 'element'
  ): Promise<Locator> {
    // Try primary selector
    const primary = this.page.locator(primarySelector);
    if ((await primary.count()) > 0) {
      return primary;
    }

    // Try fallback selectors
    for (const fallback of fallbackSelectors) {
      const element = this.page.locator(fallback);
      if ((await element.count()) > 0) {
        this.reportIssue(
          'selector_changed',
          `${elementName} found with fallback selector: ${fallback}`,
          primarySelector
        );
        return element;
      }
    }

    throw new Error(`Could not find ${elementName} with any strategy`);
  }

  /**
   * Click element with retry logic
   */
  async clickWithRetry(
    selector: string,
    options: { timeout?: number; retries?: number } = {}
  ): Promise<void> {
    const { timeout = 10000, retries = 3 } = options;

    for (let i = 0; i < retries; i++) {
      try {
        const element = this.page.locator(selector);
        await element.waitFor({ state: 'visible', timeout });
        await element.click();
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.page.waitForTimeout(1000);
      }
    }
  }

  /**
   * Fill input with validation
   */
  async fillInput(selector: string, value: string): Promise<void> {
    const input = this.page.locator(selector);
    await input.waitFor({ state: 'visible' });
    await input.fill(value);
  }

  /**
   * Get text content safely
   */
  async getText(selector: string): Promise<string> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible' });
    return (await element.textContent()) || '';
  }

  /**
   * Check if element is visible
   */
  async isVisible(selector: string): Promise<boolean> {
    try {
      const element = this.page.locator(selector);
      return await element.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Wait for element with retry
   */
  async waitForElementWithRetry(
    selector: string,
    options: { timeout?: number; retries?: number } = {}
  ): Promise<Locator> {
    const { timeout = 10000, retries = 3 } = options;

    for (let i = 0; i < retries; i++) {
      try {
        const element = this.page.locator(selector);
        await element.waitFor({ state: 'visible', timeout });
        return element;
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.page.waitForTimeout(1000);
      }
    }

    throw new Error(`Element ${selector} not found after ${retries} retries`);
  }

  /**
   * Mock API response
   */
  async mockAPIResponse(
    urlPattern: string | RegExp,
    response: unknown,
    options: { status?: number; headers?: Record<string, string> } = {}
  ): Promise<void> {
    await this.page.route(urlPattern, async (route) => {
      await route.fulfill({
        status: options.status || 200,
        headers: options.headers || { 'content-type': 'application/json' },
        body: JSON.stringify(response),
      });
    });
  }

  /**
   * Take annotated screenshot
   */
  async takeAnnotatedScreenshot(name: string, highlights: string[] = []): Promise<void> {
    // Highlight elements
    for (const selector of highlights) {
      await this.page.evaluate((sel) => {
        const elements = document.querySelectorAll(sel);
        elements.forEach((el) => {
          (el as HTMLElement).style.outline = '3px solid red';
        });
      }, selector);
    }

    await this.page.screenshot({
      path: `test-results/screenshots/${name}.png`,
      fullPage: true,
    });

    // Remove highlights
    for (const selector of highlights) {
      await this.page.evaluate((sel) => {
        const elements = document.querySelectorAll(sel);
        elements.forEach((el) => {
          (el as HTMLElement).style.outline = '';
        });
      }, selector);
    }
  }

  /**
   * Monitor console errors
   */
  async monitorConsoleErrors(): Promise<void> {
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        this.reportIssue('console_error', msg.text(), this.page.url());
      }
    });
  }

  /**
   * Monitor network errors
   */
  async monitorNetworkErrors(): Promise<void> {
    this.page.on('response', (response) => {
      if (!response.ok() && response.status() >= 400) {
        this.reportIssue(
          'network_error',
          `${response.status()} ${response.statusText()} - ${response.url()}`,
          this.page.url()
        );
      }
    });
  }

  /**
   * Report an issue detected during test
   */
  protected reportIssue(type: string, description: string, context?: string): void {
    this.issues.push({
      type,
      description,
      context,
      url: this.page.url(),
      timestamp: new Date().toISOString(),
      severity: this.calculateSeverity(type),
    });
  }

  /**
   * Calculate issue severity
   */
  private calculateSeverity(type: string): 'critical' | 'high' | 'medium' | 'low' {
    const severityMap: Record<string, 'critical' | 'high' | 'medium' | 'low'> = {
      selector_missing: 'high',
      selector_changed: 'medium',
      console_error: 'high',
      network_error: 'high',
      performance: 'medium',
      visibility: 'high',
    };
    return severityMap[type] || 'low';
  }

  /**
   * Get all issues detected during test
   */
  getIssues(): TestIssue[] {
    return this.issues;
  }

  /**
   * Get all performance metrics
   */
  getPerformanceMetrics(): PerformanceMetric[] {
    return this.performanceMetrics;
  }

  /**
   * Clear issues and metrics
   */
  reset(): void {
    this.issues = [];
    this.performanceMetrics = [];
  }
}
