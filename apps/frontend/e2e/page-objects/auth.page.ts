import { Locator, Page } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
}

/**
 * Creates a unique test user per invocation.
 */
export function uniqueUser(prefix = 'e2e'): TestUser {
  const ts = Date.now();
  return {
    email: `${prefix}_${ts}@example.com`,
    password: 'Test@1234!',
  };
}

/** `/auth/register` — fields match src/app/auth/register/page.tsx. */
export class RegisterPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly confirmPassword: Locator;
  readonly submitButton: Locator;

  constructor(readonly page: Page) {
    this.email = page.getByLabel(/email/i);
    this.password = page.getByLabel(/^password$/i);
    this.confirmPassword = page.getByLabel(/confirm password/i);
    this.submitButton = page.getByRole('button', { name: /register|sign up|create account/i });
  }

  async goto() {
    await this.page.goto('/auth/register');
  }

  async register(user: TestUser) {
    await this.goto();
    await this.email.fill(user.email);
    await this.password.fill(user.password);
    await this.confirmPassword.fill(user.password);
    await this.submitButton.click();
  }
}

/** `/auth/login` — fields match src/app/auth/login/page.tsx. */
export class LoginPage {
  readonly email: Locator;
  readonly password: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly logoutButton: Locator;

  constructor(readonly page: Page) {
    this.email = page.getByLabel(/email/i);
    this.password = page.getByLabel(/^password$/i);
    this.submitButton = page.getByRole('button', { name: /log in|sign in/i });
    this.errorMessage = page.getByText(/invalid|incorrect|error|failed/i);
    this.logoutButton = page.getByRole('button', { name: /logout|sign out|log out/i });
  }

  async goto() {
    await this.page.goto('/auth/login');
  }

  /** Fills and submits the login form on the current page. */
  async submit(user: TestUser) {
    await this.email.fill(user.email);
    await this.password.fill(user.password);
    await this.submitButton.click();
  }

  async login(user: TestUser) {
    await this.goto();
    await this.submit(user);
  }

  /** Logs in only if registration redirected to the login page; returns whether it did. */
  async loginIfRedirected(user: TestUser): Promise<boolean> {
    if (!this.page.url().includes('login')) return false;
    await this.submit(user);
    return true;
  }

  async logout() {
    await this.logoutButton.click();
  }
}

/** Registers a fresh user, then logs in explicitly via `/auth/login`. */
export async function registerAndLogin(page: Page, user: TestUser) {
  await new RegisterPage(page).register(user);
  await new LoginPage(page).login(user);
}
