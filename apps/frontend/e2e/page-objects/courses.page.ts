import { Locator, Page } from '@playwright/test';

/** `/courses` — course catalogue / marketplace. */
export class CoursesPage {
  readonly heading: Locator;
  readonly catalogueHeading: Locator;
  /** Exact course card — use for snapshots and scoped lookups. */
  readonly courseCard: Locator;
  readonly enrolledCourseCard: Locator;
  /** Course card or any card-like fallback markup. */
  readonly courseCardsLoose: Locator;
  readonly courseDetailLinks: Locator;
  readonly viewCourseLink: Locator;
  readonly enrollButtons: Locator;
  readonly enrollControls: Locator;
  readonly purchaseButton: Locator;

  constructor(readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1 });
    this.catalogueHeading = page.getByRole('heading', {
      name: /courses|browse|marketplace|catalogue/i,
    });
    this.courseCard = page.locator('[data-testid="course-card"]');
    this.enrolledCourseCard = page.locator('[data-testid="course-card"][data-enrolled="true"]');
    this.courseCardsLoose = page.locator('[data-testid="course-card"], .course-card, article');
    this.courseDetailLinks = page.locator('a[href*="/courses/"]');
    this.viewCourseLink = page.getByRole('link', { name: /view course|intro to stellar/i }).first();
    this.enrollButtons = page.getByRole('button', { name: /enroll/i });
    this.enrollControls = page.locator('[data-testid*="enroll"], button:has-text("Enroll")');
    this.purchaseButton = page
      .getByRole('button', { name: /enroll|purchase|buy|get course|start course/i })
      .first();
  }

  async goto() {
    await this.page.goto('/courses');
  }

  previewButton(name: RegExp = /preview|details|view course/i): Locator {
    return this.page.getByRole('button', { name });
  }

  courseLink(name: RegExp): Locator {
    return this.page.getByRole('link', { name });
  }

  async enrollInFirstCourse() {
    await this.enrollButtons.first().click();
  }
}
