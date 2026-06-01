# Automated Accessibility Testing

This document describes the automated accessibility testing system for Brain-Storm.

## Overview

The accessibility testing system automatically tests the frontend for WCAG 2.1 Level AA compliance using axe-core and Playwright, generates detailed reports, and provides dashboards for monitoring accessibility status.

## Features

- **WCAG 2.1 AA Compliance**: Automated testing for WCAG 2.1 Level AA standards
- **axe-core Integration**: Comprehensive accessibility scanning
- **Accessibility Reports**: Detailed JSON reports of accessibility issues
- **Accessibility Dashboards**: Interactive HTML dashboards for visualization
- **Accessibility Metrics**: Track accessibility improvements over time
- **CI/CD Integration**: Automated testing in GitHub Actions

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│         Automated Accessibility Testing                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐  ┌──────────────────┐               │
│  │  Frontend App    │  │  Playwright      │               │
│  │  (Next.js)       │──│  + axe-core      │               │
│  └──────────────────┘  └──────────────────┘               │
│           │                      │                         │
│           └──────────┬───────────┘                         │
│                      │                                     │
│           ┌──────────▼──────────┐                         │
│           │  Accessibility      │                         │
│           │  Test Suite         │                         │
│           │  - Page-level       │                         │
│           │  - Navigation       │                         │
│           │  - Headings         │                         │
│           │  - Images           │                         │
│           │  - Forms            │                         │
│           │  - Color contrast   │                         │
│           │  - Focus management │                         │
│           │  - ARIA attributes  │                         │
│           │  - Semantic HTML    │                         │
│           │  - Mobile           │                         │
│           │  - Videos           │                         │
│           │  - Links            │                         │
│           │  - Language         │                         │
│           └──────────┬──────────┘                         │
│                      │                                     │
│           ┌──────────▼──────────┐                         │
│           │  Report Generation  │                         │
│           │  - JSON reports     │                         │
│           │  - HTML dashboards  │                         │
│           │  - Metrics          │                         │
│           └────────────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Run Accessibility Tests

```bash
# Run all accessibility tests
npm run test:a11y

# Run specific test file
npm run test:a11y -- accessibility.spec.ts

# Run with specific browser
npm run test:a11y -- --project=chromium
```

### Generate Report

```bash
# Generate accessibility report
./scripts/generate-accessibility-report.sh accessibility-results.json accessibility-report.html

# View report
open accessibility-report.html
```

### View Results

```bash
# Pretty print results
cat accessibility-results.json | jq '.'

# Get pass rate
cat accessibility-results.json | jq '.pass_rate'

# Get failed tests
cat accessibility-results.json | jq '.tests[] | select(.status == "fail")'
```

## Test Categories

### 1. Page-level Accessibility

Tests overall page accessibility using axe-core:

```typescript
test('homepage should have no accessibility violations', async ({ page }) => {
  await checkA11y(page, null, {
    detailedReport: true,
  });
});
```

**Checks**:
- Page title
- Language attribute
- Semantic structure

### 2. Navigation Accessibility

Tests keyboard navigation and navigation landmarks:

```typescript
test('navigation should be keyboard accessible', async ({ page }) => {
  await page.keyboard.press('Tab');
  const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
  expect(focusedElement).toBeTruthy();
});
```

**Checks**:
- Keyboard navigation
- Skip links
- Navigation landmarks

### 3. Heading Structure

Tests proper heading hierarchy:

```typescript
test('should have proper heading hierarchy', async ({ page }) => {
  const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
  expect(headings.length).toBeGreaterThan(0);
});
```

**Checks**:
- H1 presence
- Heading hierarchy
- No skipped levels

### 4. Image Accessibility

Tests image alt text:

```typescript
test('all images should have alt text', async ({ page }) => {
  const images = await page.locator('img').all();
  for (const img of images) {
    const alt = await img.getAttribute('alt');
    expect(alt).toBeTruthy();
  }
});
```

**Checks**:
- Alt text presence
- Decorative image handling
- Meaningful descriptions

### 5. Form Accessibility

Tests form labels and error handling:

```typescript
test('form inputs should have associated labels', async ({ page }) => {
  const inputs = await page.locator('input, textarea, select').all();
  for (const input of inputs) {
    const id = await input.getAttribute('id');
    if (id) {
      const label = await page.locator(`label[for="${id}"]`);
      expect(label).toBeDefined();
    }
  }
});
```

**Checks**:
- Label associations
- Required field marking
- Error messages
- Input validation

### 6. Color Contrast

Tests text color contrast:

```typescript
test('text should have sufficient color contrast', async ({ page }) => {
  const contrastIssues = await page.evaluate(() => {
    // Contrast checking logic
  });
  expect(contrastIssues.length).toBeLessThan(10);
});
```

**Standards**:
- Normal text: 4.5:1 ratio
- Large text: 3:1 ratio

### 7. Focus Management

Tests keyboard focus visibility:

```typescript
test('focus should be visible', async ({ page }) => {
  await page.keyboard.press('Tab');
  const focusedElement = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement;
    const style = window.getComputedStyle(el);
    return style.outline || style.boxShadow;
  });
  expect(focusedElement).toBeTruthy();
});
```

**Checks**:
- Focus visibility
- Focus order
- Focus trapping

### 8. ARIA Attributes

Tests proper ARIA usage:

```typescript
test('should use proper ARIA roles', async ({ page }) => {
  const ariaRoles = await page.evaluate(() => {
    const elements = document.querySelectorAll('[role]');
    return Array.from(elements).map(el => el.getAttribute('role'));
  });
});
```

**Checks**:
- Valid ARIA roles
- ARIA labels
- ARIA descriptions

### 9. Semantic HTML

Tests semantic HTML usage:

```typescript
test('should use semantic HTML elements', async ({ page }) => {
  const semanticElements = await page.evaluate(() => {
    const elements = document.querySelectorAll('header, nav, main, article, section, aside, footer');
    return elements.length;
  });
  expect(semanticElements).toBeGreaterThan(0);
});
```

**Checks**:
- Semantic elements
- Proper structure
- Landmark regions

### 10. Mobile Accessibility

Tests mobile accessibility:

```typescript
test('should be mobile accessible', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  const buttons = await page.locator('button').all();
  for (const button of buttons) {
    const box = await button.boundingBox();
    if (box) {
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  }
});
```

**Checks**:
- Touch target size (44x44px minimum)
- Responsive design
- Mobile navigation

### 11. Video Accessibility

Tests video captions:

```typescript
test('videos should have captions', async ({ page }) => {
  const videos = await page.locator('video').all();
  for (const video of videos) {
    const tracks = await video.locator('track[kind="captions"]').all();
    expect(tracks.length).toBeGreaterThan(0);
  }
});
```

**Checks**:
- Caption presence
- Transcript availability
- Audio descriptions

### 12. Link Accessibility

Tests link text quality:

```typescript
test('links should have descriptive text', async ({ page }) => {
  const links = await page.locator('a').all();
  for (const link of links) {
    const text = await link.textContent();
    const ariaLabel = await link.getAttribute('aria-label');
    expect(text || ariaLabel).toBeTruthy();
  }
});
```

**Checks**:
- Descriptive link text
- No "click here" links
- ARIA labels

## WCAG 2.1 Principles

### 1. Perceivable

Information must be presentable to users in ways they can perceive:

- **Text Alternatives**: Provide text for images
- **Captions**: Provide captions for videos
- **Adaptable**: Content can be presented in different ways
- **Distinguishable**: Make it easier to see and hear content

### 2. Operable

User interface must be operable:

- **Keyboard Accessible**: All functionality available via keyboard
- **Enough Time**: Users have enough time to read and use content
- **Seizures**: Don't design content that causes seizures
- **Navigable**: Help users navigate and find content

### 3. Understandable

Information and operation must be understandable:

- **Readable**: Make text readable and understandable
- **Predictable**: Make pages appear and operate in predictable ways
- **Input Assistance**: Help users avoid and correct mistakes

### 4. Robust

Content must be robust for interpretation by assistive technologies:

- **Compatible**: Maximize compatibility with current and future assistive technologies

## Report Format

Accessibility reports are JSON files with the following structure:

```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "pass_rate": 95,
  "total_tests": 20,
  "passed_tests": 19,
  "failed_tests": 1,
  "tests": [
    {
      "name": "homepage should have no accessibility violations",
      "status": "pass",
      "wcag_criteria": "WCAG 2.1 Level AA"
    },
    {
      "name": "all images should have alt text",
      "status": "fail",
      "wcag_criteria": "1.1.1 Non-text Content"
    }
  ]
}
```

## Scheduling

### GitHub Actions Workflow

```yaml
name: Accessibility Testing
on:
  push:
    branches: [main, develop]
  pull_request:
  schedule:
    - cron: '0 4 * * *'  # Daily at 4 AM UTC

jobs:
  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run accessibility tests
        run: npm run test:a11y
      - name: Generate report
        run: ./scripts/generate-accessibility-report.sh accessibility-results.json accessibility-report.html
      - name: Upload report
        uses: actions/upload-artifact@v3
        with:
          name: accessibility-report
          path: accessibility-report.html
```

## Best Practices

1. **Test regularly**: Run accessibility tests on every commit
2. **Fix issues immediately**: Address accessibility issues promptly
3. **Use semantic HTML**: Prefer semantic elements over divs
4. **Provide alt text**: Always provide meaningful alt text for images
5. **Ensure keyboard access**: All functionality must be keyboard accessible
6. **Test with assistive tech**: Use screen readers and keyboard navigation
7. **Monitor metrics**: Track accessibility improvements over time
8. **Document standards**: Keep accessibility guidelines updated

## Tools and Resources

### Testing Tools

- **axe-core**: Automated accessibility testing
- **Playwright**: Browser automation
- **WAVE**: Web accessibility evaluation tool
- **Lighthouse**: Chrome DevTools accessibility audit

### Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM](https://webaim.org/)
- [Accessibility Guidelines](./accessibility.md)
- [Accessibility Testing Guide](./accessibility-testing-guide.md)

## Troubleshooting

### Tests failing

```bash
# Run with verbose output
npm run test:a11y -- --debug

# Check specific test
npm run test:a11y -- --grep "images should have alt text"
```

### Report not generating

```bash
# Check results file
cat accessibility-results.json | jq '.'

# Verify script permissions
chmod +x ./scripts/generate-accessibility-report.sh
```

### False positives

```bash
# Review test results
cat accessibility-results.json | jq '.tests[] | select(.status == "fail")'

# Update test expectations
# Edit apps/frontend/tests/accessibility.spec.ts
```

## Related Documentation

- [Accessibility Guidelines](./accessibility.md)
- [Accessibility Testing Guide](./accessibility-testing-guide.md)
- [Visual Testing Guidelines](./visual-testing-guidelines.md)
