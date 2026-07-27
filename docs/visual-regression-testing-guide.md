# Visual Regression Testing Guide

## Overview

Visual regression testing detects unintended UI changes by comparing screenshots against baseline images. Brain-Storm uses Playwright for visual testing.

## Setup

### Install Playwright

```bash
npm install -D @playwright/test
npx playwright install
```

### Configuration

Visual tests are configured in `playwright-visual.config.ts`:

```typescript
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*visual*.spec.ts',
  use: {
    baseURL: 'http://localhost:3001',
    screenshot: 'only-on-failure',
  },
});
```

## Writing Visual Tests

### Basic Screenshot Test

```typescript
import { test, expect } from '@playwright/test';

test('homepage should match baseline', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('homepage.png');
});
```

### Masking Dynamic Content

Mask elements that change between runs:

```typescript
await expect(page).toHaveScreenshot('page.png', {
  mask: [
    page.locator('[data-testid="timestamp"]'),
    page.locator('[data-testid="user-avatar"]'),
  ],
});
```

### Full Page Screenshots

```typescript
await expect(page).toHaveScreenshot('full-page.png', {
  fullPage: true,
});
```

### Component Screenshots

```typescript
const button = page.locator('[data-testid="submit-button"]');
await expect(button).toHaveScreenshot('button.png');
```

## Running Tests

### Update Baselines

When intentional UI changes are made, update baselines:

```bash
npm run test:visual -- --update-snapshots
```

### Run Tests

```bash
npm run test:visual
```

### Run Specific Test

```bash
npm run test:visual -- visual-regression.spec.ts
```

## CI/CD Integration

Visual regression tests run automatically on:
- Pull requests affecting frontend code
- Pushes to main branch

Results are commented on PRs with diff artifacts.

## Debugging Failed Tests

### View Diffs

Failed tests generate diff images in `test-results/`:

```
test-results/
├── visual-regression-homepage-1-expected.png
├── visual-regression-homepage-1-actual.png
└── visual-regression-homepage-1-diff.png
```

### Trace Failures

Enable trace recording:

```bash
npm run test:visual -- --trace on
```

View traces:

```bash
npx playwright show-trace trace.zip
```

## Best Practices

1. **Mask dynamic content** - Always mask timestamps, IDs, avatars
2. **Test key pages** - Focus on critical user journeys
3. **Use data-testid** - Add `data-testid` attributes for reliable selectors
4. **Review diffs carefully** - Verify changes are intentional
5. **Keep baselines updated** - Update baselines with design changes
6. **Test responsive** - Test at multiple viewport sizes

## Responsive Testing

Test multiple viewports:

```typescript
test.describe('Responsive Design', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 },
  ];

  viewports.forEach(({ name, width, height }) => {
    test(`should match baseline on ${name}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await page.goto('/');
      await expect(page).toHaveScreenshot(`homepage-${name}.png`);
    });
  });
});
```

## Troubleshooting

### Flaky Tests

- Increase wait times: `await page.waitForLoadState('networkidle')`
- Mask animations: Use `mask` option
- Wait for elements: `await page.waitForSelector('[data-testid="content"]')`

### Baseline Mismatches

- Check OS differences (screenshots vary by OS)
- Verify font rendering
- Check for timing issues

## Resources

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Best Practices](https://playwright.dev/docs/best-practices)
