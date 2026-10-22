import { Locator, Page } from '@playwright/test';

/** `/courses/:id` and the enrollment modal — where a learner enrolls. */
export class EnrollmentPage {
  readonly enrollButton: Locator;
  readonly enrollButtonByTestId: Locator;
  readonly enrollmentModal: Locator;
  readonly enrolledConfirmation: Locator;
  readonly alreadyEnrolledMessage: Locator;

  constructor(readonly page: Page) {
    this.enrollButton = page.getByRole('button', { name: /enroll/i });
    this.enrollButtonByTestId = page.locator('[data-testid="enroll-button"]');
    this.enrollmentModal = page.locator('[data-testid="enrollment-modal"]');
    this.enrolledConfirmation = page.getByText(/enrolled|you are enrolled|enrollment confirmed/i);
    this.alreadyEnrolledMessage = page.getByText(/already enrolled|cannot enroll/i);
  }

  async goto(courseId: string | number) {
    await this.page.goto(`/courses/${courseId}`);
  }

  async enroll() {
    await this.enrollButton.click();
  }
}
