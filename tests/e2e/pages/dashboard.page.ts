/**
 * Dashboard Page Object
 * Handles dashboard interactions for all user roles
 */

import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { NavigationComponent, TableComponent, NotificationComponent } from './components';

export class DashboardPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  get url(): string {
    return '/dashboard';
  }

  // Navigation
  get navigation(): NavigationComponent {
    return new NavigationComponent(this.page, 'nav, aside, [role="navigation"]');
  }

  // Common dashboard elements
  get welcomeMessage(): Locator {
    return this.page.locator('h1, [data-testid="welcome-message"]').first();
  }

  get userMenu(): Locator {
    return this.page.locator(
      '[data-testid="user-menu"], button:has([data-testid="avatar"]), header button:has(svg):has-text("Logout"), header button:has-text("Logout")'
    );
  }

  get notificationBell(): Locator {
    return this.page.locator('[data-testid="notifications"], button[aria-label*="notification"]');
  }

  get searchInput(): Locator {
    return this.page.locator('input[type="search"], [data-testid="global-search"]');
  }

  // Stats cards
  get statsCards(): Locator {
    return this.page.locator('[data-testid="stat-card"], .stat-card, [class*="stats"]');
  }

  // Notification component
  get notification(): NotificationComponent {
    return new NotificationComponent(this.page);
  }

  /**
   * Get welcome message text
   */
  async getWelcomeText(): Promise<string> {
    await this.welcomeMessage.waitFor({ state: 'visible' });
    return (await this.welcomeMessage.textContent()) || '';
  }

  /**
   * Open user menu
   */
  async openUserMenu(): Promise<void> {
    await this.userMenu.click();
  }

  /**
   * Logout via user menu
   */
  async logout(): Promise<void> {
    const headerLogoutButton = this.page
      .locator('header button:has-text("Logout"), button[aria-label*="Logout"]')
      .first();

    if (await headerLogoutButton.isVisible().catch(() => false)) {
      await headerLogoutButton.click();
    } else {
      await this.openUserMenu();
      await this.page.getByRole('menuitem', { name: /logout|sign out/i }).click();
    }

    await this.page.waitForURL(/(?:login|hospital)/i);
  }

  /**
   * Navigate via sidebar
   */
  async navigateTo(menuItem: string): Promise<void> {
    await this.navigation.clickNavItem(menuItem);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get count of stats cards
   */
  async getStatsCardCount(): Promise<number> {
    const selectorCount = await this.statsCards.count();
    if (selectorCount > 0) {
      return selectorCount;
    }

    // Fallback for current dashboard implementations that don't expose stat-card testids/classes.
    const knownStatLabels = [
      /total patients/i,
      /today'?s appointments/i,
      /active staff/i,
      /monthly revenue/i,
      /today'?s patients/i,
      /ready for consult/i,
      /consultations/i,
      /pending labs/i,
    ];

    let visibleLabelCount = 0;
    for (const label of knownStatLabels) {
      const labelLocator = this.page.getByText(label).first();
      if (await labelLocator.isVisible().catch(() => false)) {
        visibleLabelCount += 1;
      }
    }

    return visibleLabelCount;
  }

  /**
   * Get stat card value by title
   */
  async getStatValue(cardTitle: string): Promise<string> {
    const card = this.page.locator(
      `[data-testid="stat-card"]:has-text("${cardTitle}"), .stat-card:has-text("${cardTitle}")`
    );
    const value = card.locator('[data-testid="stat-value"], .stat-value, .text-2xl, .text-3xl');
    return (await value.textContent()) || '';
  }

  /**
   * Perform global search
   */
  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.page.keyboard.press('Enter');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Open notifications panel
   */
  async openNotifications(): Promise<void> {
    await this.notificationBell.click();
    await this.page.locator('[data-testid="notifications-panel"], [role="dialog"]').waitFor({ state: 'visible' });
  }

  /**
   * Check if user has specific role indicator
   */
  async hasRoleIndicator(role: string): Promise<boolean> {
    const roleIndicator = this.page.locator(`[data-testid="role-badge"]:has-text("${role}")`);
    return roleIndicator.isVisible();
  }

  /**
   * Get current page title
   */
  async getPageTitle(): Promise<string> {
    return this.page.title();
  }

  /**
   * Check dashboard is fully loaded
   */
  async isDashboardLoaded(): Promise<boolean> {
    try {
      await this.page.waitForURL(/\/(dashboard|patients|appointments|queue|settings|reports)/i, {
        timeout: 30000,
      });
      await this.page.locator('main h1').first().waitFor({ state: 'visible', timeout: 30000 });
      const roleSwitchFailed = this.page.getByText(/role switch failed/i).first();
      if (await roleSwitchFailed.isVisible().catch(() => false)) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }
}
