# Visual Regression Testing - Quick Start

Get up and running with visual regression testing in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Playwright installed (will be installed with npm install)
- Frontend app dependencies installed

## Quick Setup

```bash
# 1. Install dependencies (from project root)
npm install

# 2. Install Playwright browsers (from frontend directory)
cd apps/frontend
npx playwright install --with-deps

# 3. Verify installation
npx playwright --version
```

## Running Tests

### All Visual Tests

```bash
# From project root
npm run test:visual --workspace=apps/frontend

# Or from frontend directory
cd apps/frontend
npm run test:visual
```

### Specific Test File

```bash
cd apps/frontend
npx playwright test e2e/visual/components/navbar.spec.ts --config=playwright-visual.config.ts
```

### View Test Report

```bash
cd apps/frontend
npx playwright show-report playwright-report-visual
```

## Common Commands

| Command                                               | Description                            |
| ----------------------------------------------------- | -------------------------------------- |
| `npm run test:visual`                                 | Run all visual tests                   |
| `npm run test:visual:update`                          | Update baselines                       |
| `npx playwright show-report playwright-report-visual` | Open test report                       |
| `npx playwright test --headed`                        | Run tests in headed mode (see browser) |
| `npx playwright test --debug`                         | Run tests in debug mode                |
| `npx playwright test --ui`                            | Run tests in UI mode (interactive)     |

## Your First Visual Test

Create a new test file:

```typescript
// apps/frontend/e2e/visual/components/my-test.spec.ts
import { test, expect } from '@playwright/test';

test.describe('My Component - Visual Test', () => {
  test('component appears correctly', async ({ page }) => {
    // 1. Navigate to page
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 2. Find your component
    const component = page.locator('[data-testid="my-component"]');

    // 3. Take screenshot
    await expect(component).toHaveScreenshot('my-component.png');
  });
});
```

Run and generate baseline:

```bash
# This will fail first time (no baseline exists)
npm run test:visual

# Generate baseline
npm run test:visual:update

# Run again (should pass now)
npm run test:visual
```

## Typical Workflow

### Making UI Changes

1. **Before changes**: Ensure all tests pass

   ```bash
   npm run test:visual
   ```

2. **Make your changes**: Edit CSS, components, etc.

3. **Run tests**: See what changed

   ```bash
   npm run test:visual
   ```

4. **Review diffs**: Open the report

   ```bash
   npx playwright show-report playwright-report-visual
   ```

5. **Update baselines** (if changes are intentional):

   ```bash
   npm run test:visual:update
   ```

6. **Commit**: Add updated baselines to git
   ```bash
   git add apps/frontend/e2e/visual/**/*-snapshots/
   git commit -m "chore: update visual baselines"
   ```

## Understanding Test Results

### Green ✅ - Test Passed

- Screenshot matches baseline
- No visual differences
- Good to go!

### Red ❌ - Test Failed

- Screenshot differs from baseline
- Review the diff in the report
- Decide: Bug fix or baseline update?

### Test Report Sections

1. **Expected**: Original baseline image
2. **Actual**: New screenshot from test
3. **Diff**: Highlighted differences (red = changes)

## Testing Both Themes

```typescript
test('component light mode', async ({ page }) => {
  await page.goto('/');
  const component = page.locator('[data-testid="my-component"]');
  await expect(component).toHaveScreenshot('component-light.png');
});

test('component dark mode', async ({ page }) => {
  await page.goto('/');

  // Toggle theme
  await page.locator('[data-testid="theme-toggle"]').click();
  await page.waitForTimeout(500);

  const component = page.locator('[data-testid="my-component"]');
  await expect(component).toHaveScreenshot('component-dark.png');
});
```

## Testing Mobile Layouts

```typescript
test('component mobile', async ({ page }) => {
  // Set mobile viewport
  await page.setViewportSize({ width: 375, height: 667 });

  await page.goto('/');
  const component = page.locator('[data-testid="my-component"]');
  await expect(component).toHaveScreenshot('component-mobile.png');
});
```

## Pro Tips

### 1. Wait for Stability

```typescript
// Wait for network activity to finish
await page.waitForLoadState('networkidle');

// Wait for specific element
await page.waitForSelector('[data-testid="my-component"]');

// Wait for animations (500ms is usually enough)
await page.waitForTimeout(500);
```

### 2. Mask Dynamic Content

```typescript
await expect(page).toHaveScreenshot('page.png', {
  mask: [page.locator('[data-testid="timestamp"]'), page.locator('[data-testid="user-avatar"]')],
});
```

### 3. Use Data-TestId

```jsx
// In your component
<button data-testid="submit-button">Submit</button>;

// In your test
const button = page.locator('[data-testid="submit-button"]');
```

### 4. Disable Animations (if needed)

```typescript
await expect(page).toHaveScreenshot('page.png', {
  animations: 'disabled',
});
```

## Troubleshooting

### Tests pass locally but fail in CI

**Solution**: Use Docker to match CI environment

```bash
docker run -v $(pwd):/work -w /work/apps/frontend \
  mcr.microsoft.com/playwright:v1.44.0-jammy \
  npm run test:visual
```

### Flaky tests (sometimes pass, sometimes fail)

**Solution**: Add more wait time or mask dynamic content

```typescript
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000); // Longer wait
```

### Large diffs for small changes

**Solution**: Allow small pixel differences

```typescript
await expect(page).toHaveScreenshot('page.png', {
  maxDiffPixels: 100,
});
```

### "No tests found"

**Solution**: Check your file path and config

```bash
# Verify test files exist
ls apps/frontend/e2e/visual/

# Check config points to right directory
cat apps/frontend/playwright-visual.config.ts
```

## Next Steps

- 📖 Read the full [Workflow Documentation](./WORKFLOW.md)
- 📝 Check [Contributing Guide](../../../apps/frontend/e2e/visual/CONTRIBUTING.md)
- 📊 Review [Baselines Documentation](./BASELINES.md)
- 💬 Join #qa-testing channel for questions

## Quick Reference

```bash
# Run all visual tests
npm run test:visual --workspace=apps/frontend

# Update all baselines
npm run test:visual:update --workspace=apps/frontend

# Run specific test
cd apps/frontend
npx playwright test e2e/visual/components/navbar.spec.ts --config=playwright-visual.config.ts

# Run in headed mode (see browser)
npx playwright test --headed --config=playwright-visual.config.ts

# Run in debug mode (step through)
npx playwright test --debug --config=playwright-visual.config.ts

# Run in UI mode (interactive)
npx playwright test --ui --config=playwright-visual.config.ts

# View report
npx playwright show-report playwright-report-visual

# Update specific test baseline
npx playwright test e2e/visual/components/navbar.spec.ts --update-snapshots --config=playwright-visual.config.ts
```

## Help & Support

- 📚 **Documentation**: See `packages/app/visual/` directory
- 🐛 **Issues**: Open a GitHub issue with `testing` label
- 💬 **Chat**: Ask in #qa-testing Slack channel
- 📧 **Email**: qa-team@brain-storm.example

---

**Happy Testing! 🧪✨**

Last Updated: 2026-06-29
