import { test, expect } from './fixtures/auth-fixtures';
import { mockWallet, TEST_WALLET } from './fixtures/wallet-mock';

/**
 * Critical User Journeys E2E Tests
 * Covers: discovery → profile → tip, and curator listing management
 */

test.describe('Critical Journey: Discovery → Profile → Tip', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Freighter wallet for all tests
    await mockWallet(page);
  });

  test('discover course → view instructor profile → tip instructor', async ({ authedPage }) => {
    // ── 1. Discover courses ──────────────────────────────────────────────────
    await authedPage.goto('/courses');
    await expect(authedPage.getByRole('heading', { name: /courses|browse/i })).toBeVisible();

    // Pick a course with visible instructor info
    const courseCard = authedPage.locator('[data-testid="course-card"]').first();
    await expect(courseCard).toBeVisible();
    
    // Extract instructor link/name
    const instructorLink = courseCard.getByRole('link', { name: /instructor|by/i });
    await expect(instructorLink).toBeVisible();

    // ── 2. Navigate to instructor profile ────────────────────────────────────
    await instructorLink.click();
    await expect(authedPage).toHaveURL(/profile|instructor|user/);
    
    // Verify profile page loaded
    await expect(authedPage.getByRole('heading', { level: 1 })).toBeVisible();

    // ── 3. Connect wallet (if not already connected) ─────────────────────────
    const connectWalletBtn = authedPage.getByRole('button', { name: /connect wallet/i });
    if (await connectWalletBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await connectWalletBtn.click();
      // Wallet should connect using mock
      await expect(
        authedPage.getByText(new RegExp(TEST_WALLET.publicKey.substring(0, 8), 'i')),
      ).toBeVisible({ timeout: 5000 });
    }

    // ── 4. Send tip to instructor ────────────────────────────────────────────
    const tipButton = authedPage.getByRole('button', { name: /tip|send tip|support/i });
    await expect(tipButton).toBeVisible();
    await tipButton.click();

    // Tip modal should appear
    const tipModal = authedPage.getByRole('dialog').or(authedPage.locator('[role="dialog"]'));
    await expect(tipModal).toBeVisible({ timeout: 3000 });

    // Enter tip amount
    const amountInput = authedPage.getByLabel(/amount|tip amount/i);
    await expect(amountInput).toBeVisible();
    await amountInput.fill('10');

    // Confirm tip
    const confirmBtn = authedPage.getByRole('button', { name: /confirm|send|submit/i });
    await expect(confirmBtn).toBeVisible();
    await confirmBtn.click();

    // Verify success message
    await expect(
      authedPage.getByText(/tip sent|success|thank you|transaction/i),
    ).toBeVisible({ timeout: 10000 });
  });

  test('view own profile → check wallet connection → view tip history', async ({ authedPage }) => {
    // ── 1. Navigate to own profile ───────────────────────────────────────────
    await authedPage.goto('/profile');
    await expect(authedPage.getByRole('heading', { level: 1 })).toBeVisible();

    // ── 2. Wallet section should be visible ──────────────────────────────────
    const walletSection = authedPage.locator('[data-testid="wallet-section"]').or(
      authedPage.getByText(/wallet|stellar account/i),
    );
    await expect(walletSection).toBeVisible();

    // Connect wallet if not connected
    const connectBtn = authedPage.getByRole('button', { name: /connect wallet/i });
    if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await connectBtn.click();
      await expect(
        authedPage.getByText(new RegExp(TEST_WALLET.publicKey.substring(0, 8), 'i')),
      ).toBeVisible({ timeout: 5000 });
    }

    // ── 3. View tip history ──────────────────────────────────────────────────
    const tipHistoryTab = authedPage.getByRole('tab', { name: /tips|history|transactions/i });
    if (await tipHistoryTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await tipHistoryTab.click();
      
      // Verify tip history section loaded
      await expect(
        authedPage.getByText(/tip history|received tips|sent tips/i),
      ).toBeVisible({ timeout: 3000 });
    }

    // ── 4. View token balance ────────────────────────────────────────────────
    await expect(
      authedPage.getByText(/bst|balance|tokens/i),
    ).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Critical Journey: Curator Listing Management', () => {
  test.beforeEach(async ({ page }) => {
    await mockWallet(page);
  });

  test('create course listing as curator/instructor', async ({ authedPage }) => {
    // ── 1. Navigate to course creation ───────────────────────────────────────
    await authedPage.goto('/dashboard');
    
    const createCourseBtn = authedPage.getByRole('button', { name: /create course|new course|add course/i })
      .or(authedPage.getByRole('link', { name: /create course|new course|add course/i }));
    
    await expect(createCourseBtn).toBeVisible({ timeout: 5000 });
    await createCourseBtn.click();

    // ── 2. Fill course creation form ─────────────────────────────────────────
    await expect(authedPage).toHaveURL(/create|new-course|add/);
    
    const titleInput = authedPage.getByLabel(/title|course title/i);
    await expect(titleInput).toBeVisible();
    await titleInput.fill(`E2E Test Course ${Date.now()}`);

    const descriptionInput = authedPage.getByLabel(/description/i);
    await expect(descriptionInput).toBeVisible();
    await descriptionInput.fill('This is a test course created by E2E automation.');

    const categorySelect = authedPage.getByLabel(/category/i);
    if (await categorySelect.isVisible({ timeout: 2000 }).catch(() => false)) {
      await categorySelect.selectOption({ index: 1 });
    }

    // ── 3. Submit course creation ────────────────────────────────────────────
    const submitBtn = authedPage.getByRole('button', { name: /create|submit|save/i });
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // ── 4. Verify course created ─────────────────────────────────────────────
    await expect(
      authedPage.getByText(/course created|success|published/i),
    ).toBeVisible({ timeout: 10000 });
    
    // Should redirect to course detail or management page
    await expect(authedPage).not.toHaveURL(/create|new-course/);
  });

  test('manage existing course listing: edit and publish', async ({ authedPage }) => {
    // ── 1. Navigate to courses management ────────────────────────────────────
    await authedPage.goto('/dashboard');
    
    const myCoursesLink = authedPage.getByRole('link', { name: /my courses|manage courses/i });
    await expect(myCoursesLink).toBeVisible({ timeout: 5000 });
    await myCoursesLink.click();

    // ── 2. Select first course to edit ───────────────────────────────────────
    const courseList = authedPage.locator('[data-testid="course-list"]').or(
      authedPage.locator('table, [role="table"]'),
    );
    await expect(courseList).toBeVisible({ timeout: 5000 });

    const firstEditBtn = authedPage.getByRole('button', { name: /edit/i }).first();
    if (await firstEditBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstEditBtn.click();
      
      // ── 3. Edit course details ────────────────────────────────────────────
      await expect(authedPage).toHaveURL(/edit/);
      
      const descriptionInput = authedPage.getByLabel(/description/i);
      if (await descriptionInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        await descriptionInput.fill(`Updated description at ${Date.now()}`);
      }

      // ── 4. Save changes ───────────────────────────────────────────────────
      const saveBtn = authedPage.getByRole('button', { name: /save|update/i });
      await expect(saveBtn).toBeVisible();
      await saveBtn.click();

      await expect(
        authedPage.getByText(/saved|updated|success/i),
      ).toBeVisible({ timeout: 8000 });
    }
  });

  test('publish/unpublish course listing', async ({ authedPage }) => {
    // ── 1. Navigate to course management ─────────────────────────────────────
    await authedPage.goto('/dashboard');
    
    const myCoursesLink = authedPage.getByRole('link', { name: /my courses|manage courses/i });
    await expect(myCoursesLink).toBeVisible({ timeout: 5000 });
    await myCoursesLink.click();

    // ── 2. Find unpublished course ───────────────────────────────────────────
    const unpublishedCourse = authedPage.locator('[data-status="draft"]').or(
      authedPage.getByText(/draft|unpublished/i),
    ).first();

    if (await unpublishedCourse.isVisible({ timeout: 3000 }).catch(() => false)) {
      // ── 3. Publish course ─────────────────────────────────────────────────
      const publishBtn = unpublishedCourse
        .locator('..')
        .getByRole('button', { name: /publish/i });
      
      if (await publishBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await publishBtn.click();
        
        // Confirm publish if modal appears
        const confirmBtn = authedPage.getByRole('button', { name: /confirm|yes|publish/i });
        if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmBtn.click();
        }

        await expect(
          authedPage.getByText(/published|live|success/i),
        ).toBeVisible({ timeout: 8000 });
      }
    }
  });

  test('delete course listing', async ({ authedPage }) => {
    // ── 1. Navigate to course management ─────────────────────────────────────
    await authedPage.goto('/dashboard');
    
    const myCoursesLink = authedPage.getByRole('link', { name: /my courses|manage courses/i });
    await expect(myCoursesLink).toBeVisible({ timeout: 5000 });
    await myCoursesLink.click();

    // ── 2. Count courses before deletion ─────────────────────────────────────
    const courseRows = authedPage.locator('[data-testid="course-row"]').or(
      authedPage.locator('table tr, [role="row"]'),
    );
    const initialCount = await courseRows.count().catch(() => 0);

    if (initialCount > 0) {
      // ── 3. Delete first course ────────────────────────────────────────────
      const deleteBtn = authedPage.getByRole('button', { name: /delete|remove/i }).first();
      if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await deleteBtn.click();
        
        // Confirm deletion
        const confirmBtn = authedPage.getByRole('button', { name: /confirm|yes|delete/i });
        await expect(confirmBtn).toBeVisible({ timeout: 3000 });
        await confirmBtn.click();

        // Verify deletion success
        await expect(
          authedPage.getByText(/deleted|removed|success/i),
        ).toBeVisible({ timeout: 8000 });
      }
    }
  });
});

test.describe('Edge Cases: Wallet Interactions', () => {
  test('handle wallet not installed gracefully', async ({ page }) => {
    // Mock wallet as not installed
    await mockWallet(page, { isInstalled: false });

    await page.goto('/profile');
    
    const connectBtn = page.getByRole('button', { name: /connect wallet/i });
    await expect(connectBtn).toBeVisible();
    await connectBtn.click();

    // Should show install prompt
    await expect(
      page.getByText(/install|freighter not found|wallet not detected/i),
    ).toBeVisible({ timeout: 5000 });
  });

  test('handle wallet network mismatch', async ({ page }) => {
    // Mock wallet on PUBLIC network when app expects TESTNET
    await mockWallet(page, { network: 'PUBLIC' });

    await page.goto('/profile');
    
    const connectBtn = page.getByRole('button', { name: /connect wallet/i });
    if (await connectBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await connectBtn.click();

      // Should show network mismatch warning
      await expect(
        page.getByText(/wrong network|network mismatch|switch to testnet/i),
      ).toBeVisible({ timeout: 5000 });
    }
  });
});
