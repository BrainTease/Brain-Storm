# Accessibility Testing Guide

Complete guide for writing and running accessibility tests in the Brain-Storm platform.

## Quick Start

```bash
# Run all a11y tests
cd apps/frontend
npx playwright test --grep @a11y

# Run specific test file
npx playwright test e2e/a11y/pages/homepage.a11y.spec.ts

# Run with HTML report
npx playwright test --grep @a11y --reporter=html
npx playwright show-report
```

## Writing Accessibility Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Component Accessibility @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/your-page');
    await page.waitForLoadState('networkidle');
    await injectAxe(page); // Inject axe-core
  });

  test('should have no critical violations', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      includedImpacts: ['critical'],
    });
  });
});
```

### Test by Severity

```typescript
// Critical violations only
test('no critical violations', async ({ page }) => {
  await checkA11y(page, null, {
    includedImpacts: ['critical'],
  });
});

// Serious violations only
test('no serious violations', async ({ page }) => {
  await checkA11y(page, null, {
    includedImpacts: ['serious'],
  });
});

// Moderate violations (with threshold)
test('minimal moderate violations', async ({ page }) => {
  const violations = await getViolations(page, null, {
    includedImpacts: ['moderate'],
  });
  expect(violations.length).toBeLessThanOrEqual(5);
});
```

### Test Specific Elements

```typescript
test('button should be accessible', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  
  // Test specific element by selector
  await checkA11y(page, '[data-testid="submit-button"]', {
    detailedReport: true,
    includedImpacts: ['critical', 'serious'],
  });
});
```

### Test Specific Rules

```typescript
test('color contrast', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  
  await checkA11y(page, null, {
    rules: {
      'color-contrast': { enabled: true }
    },
    includedImpacts: ['serious', 'critical'],
  });
});

test('form labels', async ({ page }) => {
  await page.goto('/form');
  await injectAxe(page);
  
  await checkA11y(page, null, {
    rules: {
      'label': { enabled: true },
      'label-title-only': { enabled: true }
    },
  });
});
```

### Keyboard Navigation Tests

```typescript
test('keyboard navigation', async ({ page }) => {
  await page.goto('/');
  
  // Tab through interactive elements
  const elements = await page.locator('a, button, input').all();
  
  for (let i = 0; i < Math.min(5, elements.length); i++) {
    await page.keyboard.press('Tab');
    
    const focused = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      text: document.activeElement?.textContent?.trim()
    }));
    
    expect(focused.tag).toBeTruthy();
  }
});

test('focus indicators visible', async ({ page }) => {
  await page.goto('/');
  
  const button = page.locator('button').first();
  await button.focus();
  
  const hasFocusIndicator = await button.evaluate((el) => {
    const style = window.getComputedStyle(el);
    return style.outlineWidth !== '0px' || style.boxShadow !== 'none';
  });
  
  expect(hasFocusIndicator).toBe(true);
});

test('escape key closes modal', async ({ page }) => {
  await page.goto('/');
  
  // Open modal
  await page.click('[data-testid="open-modal"]');
  const modal = page.locator('[role="dialog"]');
  await expect(modal).toBeVisible();
  
  // Press Escape
  await page.keyboard.press('Escape');
  await expect(modal).not.toBeVisible();
});
```

### ARIA Tests

```typescript
test('proper ARIA usage', async ({ page }) => {
  await page.goto('/');
  
  // Check for proper roles
  const invalidRoles = await page.evaluate(() => {
    const validRoles = [
      'button', 'link', 'navigation', 'main', 'complementary',
      'contentinfo', 'alert', 'dialog', 'tab', 'tabpanel'
    ];
    
    const elements = document.querySelectorAll('[role]');
    const invalid = [];
    
    elements.forEach(el => {
      const role = el.getAttribute('role');
      if (role && !validRoles.includes(role)) {
        invalid.push(role);
      }
    });
    
    return invalid;
  });
  
  expect(invalidRoles.length).toBe(0);
});

test('ARIA labels present', async ({ page }) => {
  await page.goto('/');
  
  const iconsButtons = await page.locator('button:has(svg)').all();
  
  for (const button of iconsButtons) {
    const ariaLabel = await button.getAttribute('aria-label');
    const text = await button.textContent();
    
    expect(ariaLabel || text?.trim()).toBeTruthy();
  }
});
```

### Form Accessibility Tests

```typescript
test('form inputs have labels', async ({ page }) => {
  await page.goto('/form');
  
  const inputs = await page.locator('input, select, textarea').all();
  
  for (const input of inputs) {
    const id = await input.getAttribute('id');
    const ariaLabel = await input.getAttribute('aria-label');
    const ariaLabelledBy = await input.getAttribute('aria-labelledby');
    
    if (id) {
      const label = await page.locator(`label[for="${id}"]`).count();
      expect(label > 0 || ariaLabel || ariaLabelledBy).toBeTruthy();
    } else {
      expect(ariaLabel || ariaLabelledBy).toBeTruthy();
    }
  }
});

test('error messages accessible', async ({ page }) => {
  await page.goto('/form');
  
  // Trigger validation
  await page.click('button[type="submit"]');
  await page.waitForTimeout(500);
  
  // Check for accessible errors
  const errors = await page.locator('[role="alert"], [aria-invalid="true"]').count();
  expect(errors).toBeGreaterThan(0);
});
```

### Image Accessibility Tests

```typescript
test('images have alt text', async ({ page }) => {
  await page.goto('/');
  
  const images = await page.locator('img').all();
  
  for (const img of images) {
    const alt = await img.getAttribute('alt');
    const role = await img.getAttribute('role');
    
    // Must have alt (can be empty for decorative)
    expect(alt !== null).toBe(true);
    
    // If role="presentation", alt should be empty
    if (role === 'presentation') {
      expect(alt).toBe('');
    }
  }
});
```

### Mobile Accessibility Tests

```typescript
test('mobile touch targets', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  
  const buttons = await page.locator('button, a[href]').all();
  
  for (const button of buttons.slice(0, 10)) {
    if (await button.isVisible()) {
      const box = await button.boundingBox();
      
      if (box) {
        // Touch targets should be at least 44x44 pixels
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  }
});

test('no horizontal scroll on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  
  const scrollWidth = await page.evaluate(() => document.body.scrollWidth);
  expect(scrollWidth).toBeLessThanOrEqual(375);
});
```

## Running Tests

### Local Development

```bash
# All accessibility tests
npm run test:e2e --workspace=apps/frontend -- --grep @a11y

# Specific test file
cd apps/frontend
npx playwright test e2e/a11y/pages/homepage.a11y.spec.ts

# With debugging
npx playwright test --grep @a11y --debug

# Headed mode (see browser)
npx playwright test --grep @a11y --headed

# Update snapshots if needed
npx playwright test --grep @a11y --update-snapshots
```

### CI/CD

Tests run automatically on:
- Every pull request
- Commits to main branch
- Manual workflow dispatch

Workflow file: `.github/workflows/accessibility-testing.yml`

### Test Reports

```bash
# Generate HTML report
npx playwright test --grep @a11y --reporter=html

# Open report
npx playwright show-report

# Generate JSON report
npx playwright test --grep @a11y --reporter=json
```

## Debugging Failed Tests

### 1. Review the HTML Report

```bash
npx playwright show-report
```

The report shows:
- Which tests failed
- Specific violations found
- Impact level (critical, serious, moderate, minor)
- How to fix each issue

### 2. Run Tests in Debug Mode

```bash
npx playwright test e2e/a11y/pages/homepage.a11y.spec.ts --debug
```

This opens:
- Playwright Inspector
- Browser window
- Step-by-step execution

### 3. Check Specific Elements

```bash
# Test only the problematic page/component
npx playwright test e2e/a11y/pages/courses.a11y.spec.ts
```

### 4. Use Browser DevTools

```typescript
test('debug element', async ({ page }) => {
  await page.goto('/');
  
  // Pause to inspect in DevTools
  await page.pause();
  
  // Or take screenshot
  await page.screenshot({ path: 'debug.png' });
});
```

## Common Test Patterns

### Pattern 1: Page-Level Test

```typescript
test.describe('Page Accessibility @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/page');
    await injectAxe(page);
  });

  test('no critical violations', async ({ page }) => {
    await checkA11y(page, null, {
      includedImpacts: ['critical'],
    });
  });

  test('no serious violations', async ({ page }) => {
    await checkA11y(page, null, {
      includedImpacts: ['serious'],
    });
  });
});
```

### Pattern 2: Component-Level Test

```typescript
test.describe('Component Accessibility @a11y', () => {
  test('button accessible', async ({ page }) => {
    await page.goto('/components');
    await injectAxe(page);
    
    await checkA11y(page, '[data-testid="my-button"]', {
      detailedReport: true,
    });
  });
});
```

### Pattern 3: Workflow Test

```typescript
test.describe('User Flow Accessibility @a11y', () => {
  test('enrollment flow accessible', async ({ page }) => {
    // Step 1: Browse courses
    await page.goto('/courses');
    await injectAxe(page);
    await checkA11y(page);
    
    // Step 2: Select course
    await page.click('[data-testid="course-card"]');
    await checkA11y(page);
    
    // Step 3: Enroll
    await page.click('[data-testid="enroll-button"]');
    await checkA11y(page);
  });
});
```

## Best Practices

### Do's ✅

1. **Tag with @a11y**: Always add `@a11y` to test descriptions
2. **Inject axe-core**: Call `injectAxe(page)` before checks
3. **Wait for page load**: Use `waitForLoadState('networkidle')`
4. **Test by severity**: Separate critical from moderate violations
5. **Use semantic selectors**: Prefer `data-testid` over CSS classes
6. **Test keyboard navigation**: Don't just test mouse interactions
7. **Check focus indicators**: Ensure they're visible
8. **Test multiple breakpoints**: Desktop, tablet, mobile

### Don'ts ❌

1. **Don't skip tests**: Fix violations, don't disable rules
2. **Don't test third-party**: Focus on your code
3. **Don't ignore warnings**: Moderate issues matter too
4. **Don't test without waiting**: Ensure page is stable
5. **Don't hardcode selectors**: Use data attributes
6. **Don't forget mobile**: Test responsive layouts
7. **Don't ignore CI failures**: Fix violations before merging

## Performance Tips

### 1. Parallel Execution

```typescript
// playwright.config.ts
export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
});
```

### 2. Selective Testing

```bash
# Only changed files
npx playwright test --grep @a11y --only-changed

# Specific browser
npx playwright test --grep @a11y --project=chromium
```

### 3. Efficient Selectors

```typescript
// ✅ Fast
page.locator('[data-testid="button"]')

// ❌ Slow
page.locator('div > div > button.primary')
```

## Troubleshooting

### Tests Pass Locally But Fail in CI

**Cause**: Timing or environment differences

**Solution**:
```typescript
// Add more wait time
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000);

// Or wait for specific element
await page.waitForSelector('[data-testid="content"]');
```

### False Positives

**Cause**: Third-party content or dynamic elements

**Solution**:
```typescript
// Exclude specific elements
await checkA11y(page, null, {
  exclude: [['.third-party-widget']],
});

// Or disable specific rules
await checkA11y(page, null, {
  rules: {
    'color-contrast': { enabled: false }
  }
});
```

### Flaky Tests

**Cause**: Animations, async content, race conditions

**Solution**:
```typescript
// Disable animations
await page.addStyleTag({
  content: '* { animation: none !important; transition: none !important; }'
});

// Wait for specific state
await page.waitForFunction(() => {
  return document.querySelectorAll('img[src]').length > 0;
});
```

## Resources

- [Playwright Docs](https://playwright.dev/docs/intro)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [WCAG Guidelines](../WCAG_GUIDELINES.md)
- [Common Issues](../COMMON_ISSUES.md)

---

**Last Updated**: 2026-06-29  
**Maintainer**: Brain-Storm QA Team
