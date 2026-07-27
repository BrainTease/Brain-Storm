# Contributing to Visual Regression Tests

Thank you for contributing to the Brain-Storm visual regression test suite! This guide will help you add new tests and maintain existing ones.

## Before You Start

1. **Understand the Goal**: Visual regression tests catch unintended UI changes
2. **Review Existing Tests**: Check `e2e/visual/` for examples
3. **Read the Workflow**: See `packages/app/visual/WORKFLOW.md`
4. **Check Coverage**: Avoid duplicating existing tests

## Adding New Visual Tests

### 1. Choose the Right Category

Organize tests by category:

```
e2e/visual/
├── components/     # Individual UI components
├── pages/          # Full page screenshots
├── themes/         # Theme-specific tests
└── rtl/            # Right-to-left layouts
```

### 2. Create Test File

```typescript
// e2e/visual/components/my-component.spec.ts
import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for MyComponent
 * Tests different states and themes
 */

test.describe('MyComponent - Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/page-with-component');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500); // Let animations complete
  });

  test('component light mode', async ({ page }) => {
    const component = page.locator('[data-testid="my-component"]');
    await expect(component).toHaveScreenshot('my-component-light.png');
  });

  test('component dark mode', async ({ page }) => {
    // Toggle theme
    const themeToggle = page.locator('[data-testid="theme-toggle"]');
    await themeToggle.click();
    await page.waitForTimeout(500);
    
    const component = page.locator('[data-testid="my-component"]');
    await expect(component).toHaveScreenshot('my-component-dark.png');
  });

  test('component hover state', async ({ page }) => {
    const component = page.locator('[data-testid="my-component"]');
    await component.hover();
    await page.waitForTimeout(200); // Wait for hover effect
    await expect(component).toHaveScreenshot('my-component-hover.png');
  });

  test('component mobile layout', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    const component = page.locator('[data-testid="my-component"]');
    await expect(component).toHaveScreenshot('my-component-mobile.png');
  });
});
```

### 3. Follow Best Practices

#### Use Consistent Selectors

```typescript
// ✅ Good: Use data-testid
const button = page.locator('[data-testid="submit-button"]');

// ❌ Bad: Fragile CSS selectors
const button = page.locator('.btn.btn-primary.mt-4');
```

#### Wait for Stability

```typescript
// Wait for network to be idle
await page.waitForLoadState('networkidle');

// Wait for specific element
await page.waitForSelector('[data-testid="my-component"]');

// Wait for animations
await page.waitForTimeout(500);

// Wait for fonts (if needed)
await page.waitForFunction(() => document.fonts.ready);
```

#### Mask Dynamic Content

```typescript
await expect(page).toHaveScreenshot('page.png', {
  mask: [
    page.locator('[data-testid="timestamp"]'),
    page.locator('[data-testid="user-avatar"]'),
    page.locator('[data-testid="email"]')
  ]
});
```

#### Handle Animations

```typescript
// Option 1: Disable animations
await expect(component).toHaveScreenshot('component.png', {
  animations: 'disabled'
});

// Option 2: Wait for completion
await page.waitForTimeout(1000);

// Option 3: CSS to disable animations (in test setup)
await page.addStyleTag({
  content: '* { animation: none !important; transition: none !important; }'
});
```

#### Set Pixel Thresholds (Sparingly)

```typescript
// Allow minor rendering differences
await expect(page).toHaveScreenshot('page.png', {
  maxDiffPixels: 100 // Use conservatively
});
```

### 4. Test Multiple States

For each component, test:

- ✅ Light and dark themes
- ✅ Desktop and mobile layouts
- ✅ Interactive states (hover, focus, active)
- ✅ Different variants (primary, secondary, etc.)
- ✅ Error states
- ✅ Loading states
- ✅ Empty states

### 5. Document Your Tests

```typescript
/**
 * Visual regression tests for MyComponent
 * 
 * Covers:
 * - Light/dark themes
 * - Responsive layouts (desktop, tablet, mobile)
 * - Interactive states (hover, focus, disabled)
 * - Variants (primary, secondary, danger)
 * 
 * @see https://github.com/BrainTease/Brain-Storm/issues/XXX
 */
```

### 6. Generate Baselines

```bash
# Run your new test to see it fail (expected)
npm run test:visual --workspace=apps/frontend

# Generate baselines
npm run test:visual:update --workspace=apps/frontend

# Verify tests pass
npm run test:visual --workspace=apps/frontend

# Review baselines visually
npx playwright show-report apps/frontend/playwright-report-visual
```

### 7. Commit Your Changes

```bash
# Add test file and baselines
git add apps/frontend/e2e/visual/components/my-component.spec.ts
git add apps/frontend/e2e/visual/components/my-component.spec.ts-snapshots/

# Commit with descriptive message
git commit -m "test: add visual regression tests for MyComponent

- Covers light/dark themes
- Tests responsive layouts
- Includes hover and focus states
- References #XXX"
```

## Testing Checklist

Before submitting your PR:

- [ ] Tests run successfully locally
- [ ] Both light and dark themes tested
- [ ] Responsive layouts tested (mobile, tablet, desktop)
- [ ] Dynamic content is masked
- [ ] Animations are handled properly
- [ ] Baselines are generated and committed
- [ ] Tests pass after baseline generation
- [ ] Test file is properly documented
- [ ] Follows existing naming conventions
- [ ] No duplicate tests

## Common Patterns

### Testing a Component

```typescript
test('component default state', async ({ page }) => {
  await page.goto('/component-page');
  const component = page.locator('[data-testid="my-component"]');
  await component.waitFor({ state: 'visible' });
  await expect(component).toHaveScreenshot('component-default.png');
});
```

### Testing a Page

```typescript
test('full page screenshot', async ({ page }) => {
  await page.goto('/my-page');
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveScreenshot('my-page.png', {
    fullPage: true,
    mask: [page.locator('[data-testid="dynamic-content"]')]
  });
});
```

### Testing Theme Variations

```typescript
test('component in both themes', async ({ page }) => {
  await page.goto('/component-page');
  const component = page.locator('[data-testid="my-component"]');
  
  // Light mode
  await expect(component).toHaveScreenshot('component-light.png');
  
  // Dark mode
  await page.locator('[data-testid="theme-toggle"]').click();
  await page.waitForTimeout(500);
  await expect(component).toHaveScreenshot('component-dark.png');
});
```

### Testing Responsive Layouts

```typescript
const viewports = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1920, height: 1080 }
];

for (const viewport of viewports) {
  test(`component on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/component-page');
    await page.waitForLoadState('networkidle');
    
    const component = page.locator('[data-testid="my-component"]');
    await expect(component).toHaveScreenshot(`component-${viewport.name}.png`);
  });
}
```

### Testing Interactive States

```typescript
const states = ['default', 'hover', 'focus', 'active'];

for (const state of states) {
  test(`button ${state} state`, async ({ page }) => {
    await page.goto('/buttons');
    const button = page.locator('[data-testid="primary-button"]');
    
    switch(state) {
      case 'hover':
        await button.hover();
        break;
      case 'focus':
        await button.focus();
        break;
      case 'active':
        await button.focus();
        await page.keyboard.press('Space');
        break;
    }
    
    await page.waitForTimeout(200);
    await expect(button).toHaveScreenshot(`button-${state}.png`);
  });
}
```

## What NOT to Test

Avoid visual tests for:

- ❌ Highly dynamic content (real-time data, timestamps)
- ❌ Third-party widgets (ads, analytics)
- ❌ User-generated content
- ❌ Randomized layouts
- ❌ Content with complex animations (use video tests instead)
- ❌ Elements that change based on time/date

## Debugging Failed Tests

### Locally

```bash
# Run in headed mode
npx playwright test --config=playwright-visual.config.ts --headed

# Run with debug mode
npx playwright test --config=playwright-visual.config.ts --debug

# View report
npx playwright show-report apps/frontend/playwright-report-visual
```

### Understanding Diffs

The Playwright report shows:
- **Expected**: Baseline screenshot
- **Actual**: New screenshot
- **Diff**: Highlighted differences

Review each to understand:
- Is this intentional?
- Is this a bug?
- Is the test flaky?

## Getting Help

If you're stuck:

1. **Check Examples**: Look at existing tests in `e2e/visual/`
2. **Read Documentation**: 
   - [Workflow Guide](../../../packages/app/visual/WORKFLOW.md)
   - [Baselines Documentation](../../../packages/app/visual/BASELINES.md)
3. **Ask the Team**: Post in #qa-testing channel
4. **Open an Issue**: Include test name, error, and screenshots

## Review Process

When submitting visual tests:

1. **Self Review**: Run tests locally, review baselines
2. **PR Description**: Explain what's being tested and why
3. **Screenshots**: Include example baselines in PR
4. **CI Validation**: Ensure tests pass in CI
5. **Team Review**: QA team will review test quality

## Continuous Improvement

We're always improving our visual tests:

- Suggest better patterns
- Report flaky tests
- Improve documentation
- Share learnings with the team

Thank you for contributing! 🎉

---

**Last Updated**: 2026-06-29  
**Questions?** Open an issue or ask in #qa-testing
