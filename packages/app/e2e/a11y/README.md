# Accessibility (a11y) Testing

This directory contains automated accessibility tests for the Brain-Storm platform using axe-core and Playwright.

## Overview

Accessibility testing ensures that our application is usable by everyone, including people with disabilities. We use automated tools to catch common accessibility issues early in the development cycle.

## Tools

- **axe-core**: Industry-standard accessibility testing engine
- **axe-playwright**: Playwright integration for axe-core
- **@axe-core/react**: React component accessibility testing
- **jest-axe**: Jest integration for component tests
- **Playwright**: E2E testing framework

## Test Structure

```
packages/app/e2e/a11y/
├── README.md                    # This file
├── WCAG_GUIDELINES.md           # WCAG compliance guidelines
├── COMMON_ISSUES.md             # Common accessibility issues and fixes
└── TESTING_GUIDE.md             # How to write and run a11y tests

apps/frontend/e2e/
├── accessibility.spec.ts        # Main E2E accessibility tests
└── a11y/                        # Additional accessibility test suites
    ├── pages/                   # Page-level tests
    ├── components/              # Component-level tests
    └── workflows/               # User workflow tests

apps/frontend/tests/
└── accessibility.spec.ts        # Component accessibility tests
```

## Running Tests

### All Accessibility Tests

```bash
# From project root
npm run test:e2e --workspace=apps/frontend -- --grep @a11y

# From frontend directory
cd apps/frontend
npm run test:e2e -- --grep @a11y
```

### Specific Test Files

```bash
cd apps/frontend

# E2E accessibility tests
npx playwright test e2e/accessibility.spec.ts

# Component accessibility tests
npm test tests/accessibility.spec.ts
```

### With HTML Report

```bash
cd apps/frontend
npx playwright test e2e/accessibility.spec.ts --reporter=html
npx playwright show-report
```

## WCAG Compliance Levels

We target **WCAG 2.1 AA** compliance as our baseline:

### Level A (Must Have)

- Basic web accessibility features
- Essential for some users

### Level AA (Should Have) - Our Target

- Deals with common barriers for disabled users
- Required for many legal frameworks

### Level AAA (Nice to Have)

- Highest level of accessibility
- May not be possible for all content

## Test Coverage

### Critical Pages (Zero Critical Violations Required)

- ✅ Homepage (`/`)
- ✅ Courses page (`/courses`)
- ✅ Course detail page (`/courses/:id`)
- ✅ Dashboard (`/dashboard`)
- ✅ Profile (`/profile`)
- ✅ Login/Register (`/auth/*`)
- ✅ Quiz/Assessment pages
- ✅ Certificate pages

### Component Coverage

- Navigation (navbar, sidebar, breadcrumbs)
- Forms (inputs, selects, validation)
- Buttons and interactive elements
- Modals and dialogs
- Cards and content blocks
- Tables and data displays
- Loading states
- Error states

### Automated Checks

Our tests automatically check for:

1. **Perceivable**
   - Text alternatives for non-text content
   - Color contrast ratios
   - Proper heading structure
   - Content structure and semantics

2. **Operable**
   - Keyboard accessibility
   - Focus management
   - Navigation mechanisms
   - Input modalities

3. **Understandable**
   - Readable text
   - Predictable functionality
   - Input assistance
   - Error identification

4. **Robust**
   - Valid HTML
   - ARIA usage
   - Compatibility with assistive technologies

## Integration with CI/CD

Accessibility tests run automatically on:

- Every pull request
- Commits to `main` branch
- Before deployments

**CI Workflow**: `.github/workflows/accessibility-testing.yml`

### PR Gating

PRs with critical accessibility violations **cannot be merged**. The CI workflow will fail if:

- Critical violations found on core pages
- Serious violations exceeding threshold
- Moderate violations exceeding threshold

## Violation Severity Levels

### Critical ❌

- **Impact**: Severe - Blocks access for users
- **Action**: Must fix before merge
- **Examples**: Missing form labels, poor color contrast, no keyboard access

### Serious ⚠️

- **Impact**: High - Significant barrier
- **Action**: Should fix soon (may be flagged in PR)
- **Examples**: Missing alt text, improper heading hierarchy

### Moderate ℹ️

- **Impact**: Medium - Some users affected
- **Action**: Fix in follow-up
- **Examples**: Missing lang attribute, redundant links

### Minor 💡

- **Impact**: Low - Best practice
- **Action**: Fix when convenient
- **Examples**: Missing page titles, ARIA best practices

## Writing Accessibility Tests

### Basic Test Pattern

```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Page Accessibility @a11y', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/your-page');
    await injectAxe(page);
  });

  test('should have no critical accessibility violations', async ({ page }) => {
    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      // Only fail on critical and serious violations
      rules: {
        'color-contrast': { enabled: true },
        label: { enabled: true },
        'button-name': { enabled: true },
      },
    });
  });
});
```

### Testing Specific Components

```typescript
test('button should be accessible', async ({ page }) => {
  await page.goto('/page-with-button');
  await injectAxe(page);

  // Check specific element
  await checkA11y(page, '[data-testid="my-button"]', {
    detailedReport: true,
  });
});
```

### Testing Keyboard Navigation

```typescript
test('should be keyboard navigable', async ({ page }) => {
  await page.goto('/');

  // Tab through elements
  await page.keyboard.press('Tab');
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(focused).toBeTruthy();

  // Check focus visibility
  const focusVisible = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const style = window.getComputedStyle(el);
    return style.outline !== 'none';
  });
  expect(focusVisible).toBe(true);
});
```

## Best Practices

### 1. Test Early and Often

- Run tests during development
- Fix issues before committing
- Don't wait for CI to catch problems

### 2. Use Semantic HTML

- Use proper HTML5 elements
- Add ARIA only when necessary
- Let browsers do the work

### 3. Think Beyond Automation

- Automated tests catch ~30-40% of issues
- Manual testing with screen readers is essential
- User testing with people with disabilities is invaluable

### 4. Document Exceptions

If you must suppress a violation:

```typescript
await checkA11y(page, null, {
  rules: {
    'rule-id': { enabled: false },
  },
});
```

Document WHY in a comment and create a ticket to fix it.

## Common Accessibility Patterns

### Accessible Button

```tsx
// ✅ Good
<button
  onClick={handleClick}
  aria-label="Close dialog"
>
  <CloseIcon aria-hidden="true" />
</button>

// ❌ Bad
<div onClick={handleClick}>
  <CloseIcon />
</div>
```

### Accessible Form

```tsx
// ✅ Good
<label htmlFor="email">
  Email Address
  <input
    id="email"
    type="email"
    required
    aria-required="true"
    aria-invalid={hasError}
    aria-describedby="email-error"
  />
</label>;
{
  hasError && (
    <span id="email-error" role="alert">
      Please enter a valid email
    </span>
  );
}

// ❌ Bad
<input type="email" placeholder="Email" />;
{
  hasError && <span>Error!</span>;
}
```

### Accessible Modal

```tsx
// ✅ Good
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Confirm Action</h2>
  <p id="modal-description">Are you sure?</p>
  <button onClick={onConfirm}>Confirm</button>
  <button onClick={onCancel}>Cancel</button>
</div>

// ❌ Bad
<div className="modal">
  <div>Confirm Action</div>
  <div>Are you sure?</div>
  <div onClick={onConfirm}>Confirm</div>
</div>
```

## Resources

### Official Documentation

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

### Tools

- [axe DevTools Browser Extension](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

### Testing

- [Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [Keyboard Testing](https://webaim.org/articles/keyboard/)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

## Support

- **Questions**: Ask in #accessibility channel
- **Issues**: Create GitHub issue with `a11y` label
- **Guidance**: Consult with accessibility team

---

**Last Updated**: 2026-06-29  
**Maintainer**: Brain-Storm Accessibility Team  
**WCAG Target**: 2.1 AA Compliance
