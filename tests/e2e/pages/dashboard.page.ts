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
    return this.page.locator('[data-testid="user-menu"], button:has([data-testid="avatar"])');
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
    await this.openUserMenu();
    await this.page.getByRole('menuitem', { name: /logout|sign out/i }).click();
    await this.page.waitForURL(/login/i);
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
    return this.statsCards.count();
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
      await this.welcomeMessage.waitFor({ state: 'visible', timeout: 10000 });
      await this.navigation.waitForVisible();
      return true;
    } catch {
      return false;
    }
  }
}
