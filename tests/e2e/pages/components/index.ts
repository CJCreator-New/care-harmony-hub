/**
 * Reusable Component Page Objects
 * Modal, Form, Table, and Notification components
 */

import { Locator, Page } from '@playwright/test';

/**
 * Base Component
 */
export abstract class BaseComponent {
  protected page: Page;
  protected rootLocator: Locator;

  constructor(page: Page, rootSelector: string) {
    this.page = page;
    this.rootLocator = page.locator(rootSelector);
  }

  async isVisible(): Promise<boolean> {
    return this.rootLocator.isVisible();
  }

  async waitForVisible(timeout = 10000): Promise<void> {
    await this.rootLocator.waitFor({ state: 'visible', timeout });
  }

  async waitForHidden(timeout = 10000): Promise<void> {
    await this.rootLocator.waitFor({ state: 'hidden', timeout });
  }
}

/**
 * Modal Component
 */
export class ModalComponent extends BaseComponent {
  constructor(page: Page, rootSelector: string = '[role="dialog"], .modal, [data-testid="modal"]') {
    super(page, rootSelector);
  }

  get closeButton(): Locator {
    return this.rootLocator.getByRole('button', { name: /close|cancel|×/i });
  }

  get title(): Locator {
    return this.rootLocator.getByRole('heading').first();
  }

  get content(): Locator {
    return this.rootLocator.locator('[class*="modal-content"], [class*="dialog-content"]');
  }

  async getTitle(): Promise<string> {
    return (await this.title.textContent()) || '';
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await this.waitForHidden();
  }

  async confirmAction(buttonText: string): Promise<void> {
    await this.rootLocator.getByRole('button', { name: new RegExp(buttonText, 'i') }).click();
  }

  async getContent(): Promise<string> {
    return (await this.content.textContent()) || '';
  }
}

/**
 * Form Component
 */
export class FormComponent extends BaseComponent {
  constructor(page: Page, rootSelector: string = 'form') {
    super(page, rootSelector);
  }

  async fillField(label: string, value: string): Promise<void> {
    const input = this.rootLocator.getByLabel(new RegExp(label, 'i'));
    await input.fill(value);
  }

  async fillFieldByPlaceholder(placeholder: string, value: string): Promise<void> {
    const input = this.rootLocator.getByPlaceholder(new RegExp(placeholder, 'i'));
    await input.fill(value);
  }

  async fillFieldByTestId(testId: string, value: string): Promise<void> {
    const input = this.rootLocator.locator(`[data-testid="${testId}"]`);
    await input.fill(value);
  }

  async selectOption(label: string, option: string): Promise<void> {
    const select = this.rootLocator.getByLabel(new RegExp(label, 'i'));
    await select.selectOption(option);
  }

  async selectOptionByTestId(testId: string, option: string): Promise<void> {
    const select = this.rootLocator.locator(`[data-testid="${testId}"]`);
    await select.selectOption(option);
  }

  async checkCheckbox(label: string, checked: boolean = true): Promise<void> {
    const checkbox = this.rootLocator.getByLabel(new RegExp(label, 'i'));
    await checkbox.setChecked(checked);
  }

  async clickRadio(label: string): Promise<void> {
    const radio = this.rootLocator.getByLabel(new RegExp(label, 'i'));
    await radio.click();
  }

  async submit(buttonText: string = 'Submit'): Promise<void> {
    await this.rootLocator
      .getByRole('button', { name: new RegExp(buttonText, 'i') })
      .click();
  }

  async getValidationError(fieldLabel: string): Promise<string | null> {
    const field = this.rootLocator.getByLabel(new RegExp(fieldLabel, 'i'));
    const errorId = await field.getAttribute('aria-describedby');
    if (!errorId) return null;

    const error = this.page.locator(`#${errorId}`);
    return error.textContent();
  }

  async hasValidationErrors(): Promise<boolean> {
    const errors = this.rootLocator.locator('[aria-invalid="true"]');
    return (await errors.count()) > 0;
  }

  async getFieldValue(label: string): Promise<string> {
    const input = this.rootLocator.getByLabel(new RegExp(label, 'i'));
    return (await input.inputValue()) || '';
  }

  async clearField(label: string): Promise<void> {
    const input = this.rootLocator.getByLabel(new RegExp(label, 'i'));
    await input.clear();
  }
}

/**
 * Table Component
 */
export class TableComponent extends BaseComponent {
  constructor(page: Page, rootSelector: string = 'table, [role="table"], [data-testid="table"]') {
    super(page, rootSelector);
  }

  get rows(): Locator {
    return this.rootLocator.locator('tbody tr, [role="row"]').filter({ hasNot: this.page.locator('th') });
  }

  get headers(): Locator {
    return this.rootLocator.locator('thead th, [role="columnheader"]');
  }

  async getRowCount(): Promise<number> {
    return this.rows.count();
  }

  async getColumnHeaders(): Promise<string[]> {
    const headers = await this.headers.allTextContents();
    return headers.map((h) => h.trim());
  }

  async getRow(index: number): Promise<string[]> {
    const row = this.rows.nth(index);
    const cells = row.locator('td, [role="cell"]');
    return cells.allTextContents();
  }

  async getCellValue(rowIndex: number, columnIndex: number): Promise<string> {
    const row = this.rows.nth(rowIndex);
    const cell = row.locator('td, [role="cell"]').nth(columnIndex);
    return (await cell.textContent()) || '';
  }

  async searchRow(columnIndex: number, searchText: string): Promise<number> {
    const count = await this.rows.count();
    for (let i = 0; i < count; i++) {
      const cellText = await this.rows
        .nth(i)
        .locator('td, [role="cell"]')
        .nth(columnIndex)
        .textContent();
      if (cellText?.includes(searchText)) {
        return i;
      }
    }
    return -1;
  }

  async clickRowAction(rowIndex: number, actionName: string): Promise<void> {
    const row = this.rows.nth(rowIndex);
    await row.getByRole('button', { name: new RegExp(actionName, 'i') }).click();
  }

  async clickRow(rowIndex: number): Promise<void> {
    await this.rows.nth(rowIndex).click();
  }

  async sortByColumn(columnName: string): Promise<void> {
    const header = this.headers.filter({ hasText: new RegExp(columnName, 'i') });
    await header.click();
  }

  async hasNoData(): Promise<boolean> {
    const emptyState = this.rootLocator.locator(
      '[class*="empty"], [class*="no-data"], text=/no data|no results|empty/i'
    );
    return emptyState.isVisible();
  }
}

/**
 * Notification/Toast Component
 */
export class NotificationComponent extends BaseComponent {
  constructor(page: Page, rootSelector: string = '[role="alert"], .toast, [data-sonner-toast]') {
    super(page, rootSelector);
  }

  async getMessage(): Promise<string> {
    await this.waitForVisible();
    return (await this.rootLocator.textContent()) || '';
  }

  async isSuccess(): Promise<boolean> {
    const classes = (await this.rootLocator.getAttribute('class')) || '';
    return classes.includes('success') || classes.includes('bg-green');
  }

  async isError(): Promise<boolean> {
    const classes = (await this.rootLocator.getAttribute('class')) || '';
    return classes.includes('error') || classes.includes('destructive') || classes.includes('bg-red');
  }

  async dismiss(): Promise<void> {
    const dismissButton = this.rootLocator.locator('button[aria-label*="close"], button[aria-label*="dismiss"]');
    if (await dismissButton.isVisible()) {
      await dismissButton.click();
    }
    await this.waitForHidden();
  }

  async waitForToast(expectedText?: string, timeout = 5000): Promise<void> {
    if (expectedText) {
      await this.page
        .locator(`[role="alert"]:has-text("${expectedText}"), .toast:has-text("${expectedText}")`)
        .waitFor({ state: 'visible', timeout });
    } else {
      await this.waitForVisible(timeout);
    }
  }
}

/**
 * Sidebar/Navigation Component
 */
export class NavigationComponent extends BaseComponent {
  constructor(page: Page, rootSelector: string = 'nav, [role="navigation"], aside') {
    super(page, rootSelector);
  }

  async clickNavItem(itemName: string): Promise<void> {
    await this.rootLocator.getByRole('link', { name: new RegExp(itemName, 'i') }).click();
  }

  async isNavItemActive(itemName: string): Promise<boolean> {
    const item = this.rootLocator.getByRole('link', { name: new RegExp(itemName, 'i') });
    const classes = (await item.getAttribute('class')) || '';
    const ariaSelected = await item.getAttribute('aria-selected');
    const ariaCurrent = await item.getAttribute('aria-current');

    return (
      classes.includes('active') ||
      ariaSelected === 'true' ||
      ariaCurrent === 'page'
    );
  }

  async getNavItems(): Promise<string[]> {
    const links = this.rootLocator.getByRole('link');
    return links.allTextContents();
  }

  async expandSection(sectionName: string): Promise<void> {
    const section = this.rootLocator.locator(`button:has-text("${sectionName}"), [role="button"]:has-text("${sectionName}")`);
    const expanded = await section.getAttribute('aria-expanded');
    if (expanded !== 'true') {
      await section.click();
    }
  }
}
