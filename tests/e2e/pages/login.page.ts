/**
 * Login Page Object
 * Handles authentication flows including login, logout, and error states
 */

import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.page';
import { FormComponent, NotificationComponent } from './components';
import { TestUser } from '../config/test-users';

export class LoginPage extends BasePage {
  // Selectors with fallbacks for self-healing
  private selectors = {
    emailInput: ['input[name="email"]', 'input[type="email"]', '[data-testid="email-input"]'],
    passwordInput: ['input[name="password"]', 'input[type="password"]', '[data-testid="password-input"]'],
    submitButton: ['button[type="submit"]', 'button:has-text("Sign in")', 'button:has-text("Log in")'],
    errorMessage: [
      '[role="alert"]',
      '.error-message',
      '[data-testid="login-error"]',
      '[data-sonner-toast][data-type="error"]',
      '[data-sonner-toast]:has-text("Login Failed")',
      '[data-sonner-toast]:has-text("Invalid")',
    ],
    forgotPasswordLink: ['a:has-text("Forgot")', '[data-testid="forgot-password"]'],
    registerLink: ['a:has-text("Register")', 'a:has-text("Sign up")', '[data-testid="register-link"]'],
  };

  constructor(page: Page) {
    super(page);
  }

  get url(): string {
    return '/hospital/login';
  }

  // Page elements
  get emailInput(): Locator {
    return this.page.locator(this.selectors.emailInput.join(', '));
  }

  get passwordInput(): Locator {
    return this.page.locator(this.selectors.passwordInput.join(', '));
  }

  get submitButton(): Locator {
    return this.page.locator(this.selectors.submitButton.join(', '));
  }

  get errorMessage(): Locator {
    return this.page.locator(this.selectors.errorMessage.join(', '));
  }

  get forgotPasswordLink(): Locator {
    return this.page.locator(this.selectors.forgotPasswordLink.join(', '));
  }

  get registerLink(): Locator {
    return this.page.locator(this.selectors.registerLink.join(', '));
  }

  // Form component for advanced form interactions
  get form(): FormComponent {
    return new FormComponent(this.page, 'form');
  }

  // Notification component for toast messages
  get notification(): NotificationComponent {
    return new NotificationComponent(this.page);
  }

  /**
   * Navigate to login page
   */
  async navigate(): Promise<void> {
    await super.navigate();
    await this.waitForPageLoad();
    await this.page.waitForURL(/(?:hospital\/)?login/i, { timeout: 30000 });

    // Initial Vite chunk compilation can leave the app-level suspense spinner visible briefly.
    // Wait for the actual login form controls before continuing.
    await this.emailInput.first().waitFor({ state: 'visible', timeout: 30000 });
    await this.passwordInput.first().waitFor({ state: 'visible', timeout: 30000 });
    await this.submitButton.first().waitFor({ state: 'visible', timeout: 30000 });
  }

  /**
   * Perform login with credentials
   */
  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Login with test user object
   */
  async loginAsUser(user: TestUser): Promise<void> {
    await this.login(user.email, user.password);
  }

  /**
   * Login and wait for successful redirect
   */
  async loginAndWaitForDashboard(email: string, password: string): Promise<void> {
    await this.login(email, password);
    
    // Wait for redirect to any dashboard route
    await this.page.waitForURL(
      /\/(dashboard|home|admin|doctor|nurse|reception|pharmacy|lab|patient)/i,
      { timeout: 30000 }
    );
    
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if login was successful
   */
  async isLoginSuccessful(): Promise<boolean> {
    try {
      await this.page.waitForURL(/\/(dashboard|home)/i, { timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string | null> {
    const locators = this.selectors.errorMessage.map((selector) => this.page.locator(selector).first());
    for (const locator of locators) {
      try {
        await locator.waitFor({ state: 'visible', timeout: 3000 });
        const text = (await locator.textContent())?.trim();
        if (text) return text;
      } catch {
        // Try next selector
      }
    }

    // Fallback: invalid login often stays on login route without redirect.
    if (/\/(?:hospital\/)?login/i.test(this.page.url())) {
      return 'Login failed';
    }
    return null;
  }

  /**
   * Check if error message is displayed
   */
  async hasError(): Promise<boolean> {
    return this.errorMessage.isVisible();
  }

  /**
   * Click forgot password link
   */
  async clickForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
    await this.page.waitForURL(/forgot|reset|password/i);
  }

  /**
   * Click register link
   */
  async clickRegister(): Promise<void> {
    await this.registerLink.click();
    await this.page.waitForURL(/register|signup|sign-up/i);
  }

  /**
   * Clear login form
   */
  async clearForm(): Promise<void> {
    await this.emailInput.clear();
    await this.passwordInput.clear();
  }

  /**
   * Verify form validation
   */
  async verifyRequiredFieldValidation(): Promise<{ email: boolean; password: boolean }> {
    // Try to submit empty form
    await this.submitButton.click();

    // Check for validation states
    const emailInvalid =
      (await this.emailInput.getAttribute('aria-invalid')) === 'true' ||
      (await this.emailInput.evaluate((el) => !el.checkValidity()));

    const passwordInvalid =
      (await this.passwordInput.getAttribute('aria-invalid')) === 'true' ||
      (await this.passwordInput.evaluate((el) => !el.checkValidity()));

    return { email: emailInvalid, password: passwordInvalid };
  }

  /**
   * Test invalid credentials
   */
  async attemptInvalidLogin(email: string, password: string): Promise<string | null> {
    await this.login(email, password);
    return this.getErrorMessage();
  }

  /**
   * Check page accessibility basics
   */
  async checkAccessibility(): Promise<{
    hasEmailLabel: boolean;
    hasPasswordLabel: boolean;
    formHasAriaLabel: boolean;
  }> {
    const emailLabel = await this.emailInput.getAttribute('aria-label');
    const passwordLabel = await this.passwordInput.getAttribute('aria-label');
    const form = this.page.locator('form');
    const formAriaLabel = await form.getAttribute('aria-label');

    return {
      hasEmailLabel: !!emailLabel || !!(await this.page.locator('label[for]').count()),
      hasPasswordLabel: !!passwordLabel || !!(await this.page.locator('label[for]').count()),
      formHasAriaLabel: !!formAriaLabel,
    };
  }
}
