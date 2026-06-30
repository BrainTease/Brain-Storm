# Visual Regression Testing

This directory contains visual regression test baselines and documentation for the Brain-Storm platform.

## Overview

Visual regression testing helps catch unintended UI changes by comparing screenshots of components and pages against baseline images. This ensures visual consistency across development cycles and prevents regressions.

## Tools

- **Playwright**: Main testing framework for visual regression
- **Chromatic**: Optional integration for visual review workflow (Storybook)

## Test Structure

### Core Test Suites

1. **Component Tests** (`apps/frontend/e2e/visual/components/`)
   - Individual UI components
   - Component states (hover, focus, disabled)
   - Component variants

2. **Page Tests** (`apps/frontend/e2e/visual/pages/`)
   - Full page screenshots
   - Critical user journeys
   - Responsive layouts

3. **Theme Tests** (`apps/frontend/e2e/visual/themes/`)
   - Light mode baselines
   - Dark mode baselines
   - Theme transitions

4. **RTL Tests** (`apps/frontend/e2e/visual/rtl/`)
   - Right-to-left language support
   - Arabic layout baselines

## Running Visual Tests

### Local Development

```bash
# Run all visual regression tests
npm run test:visual --workspace=apps/frontend

# Update baselines (after intentional changes)
npm run test:visual:update --workspace=apps/frontend

# Run specific test file
npx playwright test e2e/visual/components/navbar.spec.ts --config=playwright-visual.config.ts
```

### CI/CD Pipeline

Visual tests run automatically on pull requests. The workflow:

1. Tests run on all commits to PRs targeting `main`
2. Visual diffs are captured and uploaded as artifacts
3. Failed tests trigger a comment on the PR with details
4. Review the diffs in the artifacts
5. Update baselines if changes are intentional

## Approval Workflow

### When Visual Tests Fail

1. **Review the Differences**
   - Download `visual-diff-artifacts` from the GitHub Actions run
   - Open `playwright-report-visual/index.html` in a browser
   - Compare actual vs expected screenshots

2. **Intentional Changes**
   If the visual changes are intentional:
   ```bash
   # Update baselines locally
   npm run test:visual:update --workspace=apps/frontend
   
   # Commit the updated snapshots
   git add apps/frontend/e2e/visual/**/*.png
   git commit -m "chore: update visual regression baselines"
   git push
   ```

3. **Unintended Changes**
   If the changes are bugs:
   - Fix the issue in the code
   - Re-run the tests
   - Verify no visual diffs remain

### Baseline Management

- **Location**: `apps/frontend/e2e/visual/**/*-snapshots/`
- **Naming**: `{test-name}-{browser}.png`
- **Version Control**: All baselines are committed to git
- **Updates**: Only update baselines when visual changes are reviewed and approved

## Best Practices

### Writing Visual Tests

1. **Wait for Stability**
   ```typescript
   await page.waitForLoadState('networkidle');
   await page.waitForTimeout(500); // Allow animations to complete
   ```

2. **Mask Dynamic Content**
   ```typescript
   await expect(page).toHaveScreenshot('page.png', {
     mask: [
       page.locator('[data-testid="timestamp"]'),
       page.locator('[data-testid="dynamic-content"]')
     ]
   });
   ```

3. **Test Multiple Viewports**
   ```typescript
   await page.setViewportSize({ width: 375, height: 667 }); // Mobile
   await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
   ```

4. **Test Both Themes**
   ```typescript
   // Light mode
   await expect(page).toHaveScreenshot('component-light.png');
   
   // Dark mode
   await page.click('[data-testid="theme-toggle"]');
   await page.waitForTimeout(500);
   await expect(page).toHaveScreenshot('component-dark.png');
   ```

### What to Test

✅ **Do Test:**
- Critical user-facing pages
- Reusable UI components
- Different theme modes
- Responsive breakpoints
- Important user flows
- Error and empty states

❌ **Don't Test:**
- Highly dynamic content (real-time data)
- Third-party widgets
- Time-dependent displays
- Content with animations (unless masked or paused)

## Troubleshooting

### Flaky Tests

If tests are inconsistent:
- Add more wait time for animations
- Mask dynamic content
- Use `maxDiffPixels` threshold for minor rendering differences
- Disable animations in test environment

### Large Diffs

If every test shows large diffs:
- Check if fonts loaded correctly
- Verify base URL is correct
- Ensure test data is consistent
- Check for CSS race conditions

### Performance

If tests are slow:
- Use `fullyParallel: true` in config
- Reduce number of browsers tested
- Test critical paths only in visual suite
- Use component-level tests instead of full pages

## Configuration

### Playwright Visual Config

Location: `apps/frontend/playwright-visual.config.ts`

Key settings:
- `testDir`: `./e2e/visual`
- `reporter`: HTML and JSON
- `projects`: Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari

### GitHub Workflow

Location: `.github/workflows/visual-regression-testing.yml`

Triggers:
- Pull requests to `main`
- Changes in `apps/frontend/**`

## Resources

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Chromatic Documentation](https://www.chromatic.com/docs/)
- [Visual Testing Best Practices](https://www.browserstack.com/guide/visual-regression-testing)

## Support

For issues or questions:
1. Check this documentation
2. Review existing test examples
3. Open an issue with the `testing` label
4. Contact the QA team

---

**Last Updated**: 2026-06-29
**Maintainer**: Brain-Storm QA Team
