# Visual Regression Testing Workflow

This document outlines the complete workflow for visual regression testing in the Brain-Storm platform.

## Table of Contents

- [Overview](#overview)
- [Local Development Workflow](#local-development-workflow)
- [CI/CD Integration](#cicd-integration)
- [PR Review Workflow](#pr-review-workflow)
- [Baseline Update Process](#baseline-update-process)
- [Troubleshooting](#troubleshooting)

## Overview

Visual regression testing captures screenshots of UI components and pages, comparing them against baseline images to detect unintended changes. This workflow ensures visual consistency and catches UI regressions early.

### Key Principles

1. **Baseline First**: All tests must have approved baseline screenshots
2. **Review All Changes**: Every visual diff must be reviewed by a human
3. **Update Intentionally**: Only update baselines after reviewing and approving changes
4. **Gate PRs**: PRs with visual diffs cannot be merged until reviewed

## Local Development Workflow

### 1. Before Making Changes

```bash
# Ensure you have the latest baselines
git pull origin main

# Install dependencies
cd apps/frontend
npm install

# Run tests to verify current state
npm run test:visual
```

### 2. Making UI Changes

When you modify CSS, components, or layouts:

```bash
# Make your changes to the code

# Run visual tests to see differences
npm run test:visual

# Review the differences in the HTML report
npx playwright show-report playwright-report-visual
```

### 3. Reviewing Visual Diffs

The Playwright report shows three versions of each screenshot:

- **Expected**: The baseline image
- **Actual**: The new screenshot after your changes
- **Diff**: Highlighted differences between them

**Decision Points**:

- ✅ **Changes are intentional**: Update baselines (next step)
- ❌ **Changes are bugs**: Fix your code and re-run tests
- ⚠️ **Unclear**: Ask for team review

### 4. Updating Baselines (Intentional Changes)

If the visual changes are intentional and approved:

```bash
# Update all baselines
npm run test:visual:update

# Or update specific test
npx playwright test e2e/visual/components/navbar.spec.ts --update-snapshots

# Verify the updates
npm run test:visual

# Commit the new baselines
git add apps/frontend/e2e/visual/**/*-snapshots/
git commit -m "chore: update visual regression baselines for navbar redesign"
```

### 5. Pre-Commit Checklist

Before committing:

- [ ] All visual tests pass locally
- [ ] Baseline updates are intentional and reviewed
- [ ] Test report has been reviewed
- [ ] Changes are documented in commit message

## CI/CD Integration

### Automated Testing on PRs

The visual regression workflow (`.github/workflows/visual-regression-testing.yml`) runs automatically:

**Triggers**:

- Pull requests targeting `main`
- Changes to `apps/frontend/**`
- Changes to the workflow file itself

**Process**:

1. Checks out code
2. Installs dependencies
3. Builds frontend application
4. Runs Playwright visual tests
5. Uploads results as artifacts
6. Comments on PR if differences found

### Understanding CI Results

**✅ Green Check**: All visual tests passed

- No visual differences detected
- Safe to merge (pending other checks)

**❌ Red X**: Visual tests failed

- Visual differences detected
- Review required before merging

**⚠️ Yellow Dot**: Tests running

- Wait for completion

## PR Review Workflow

### For PR Authors

When your PR triggers visual test failures:

1. **Check the CI Logs**
   - Navigate to the Actions tab
   - Click on the failed workflow run
   - Review the test output

2. **Download Artifacts**
   - Scroll to bottom of workflow run
   - Download `visual-diff-artifacts.zip`
   - Extract and open `playwright-report-visual/index.html`

3. **Review All Differences**
   - Examine each failed test
   - Verify changes are intentional
   - Document reasons in PR description

4. **Update PR Description**

   ```markdown
   ## Visual Changes

   This PR includes the following intentional visual changes:

   - Updated navbar color scheme to improve contrast (accessibility)
   - Adjusted button padding for better mobile experience
   - Fixed alignment issue in course cards

   ### Screenshots

   ![Before](link-to-before)
   ![After](link-to-after)

   ### Baseline Updates Required

   The following baselines need to be updated:

   - [ ] navbar-light-desktop.png
   - [ ] button-primary-light.png
   - [ ] course-card-mobile.png
   ```

5. **Update Baselines**
   - Run `npm run test:visual:update` locally
   - Commit and push updated baselines
   - Wait for CI to pass

### For PR Reviewers

When reviewing PRs with visual changes:

1. **Download and Review Artifacts**
   - Get `visual-diff-artifacts` from the workflow
   - Open the HTML report
   - Compare expected vs actual for each change

2. **Verify Against Requirements**
   - Do changes match the PR description?
   - Are changes intentional and documented?
   - Do changes improve or maintain UX?

3. **Check for Regressions**
   - Unintended layout shifts
   - Color contrast issues
   - Responsive breakpoint problems
   - Theme inconsistencies

4. **Approval Criteria**
   ✅ Approve if:
   - All visual changes are intentional
   - Changes are well-documented
   - No accessibility regressions
   - Baselines have been updated
   - Tests pass after baseline update

   ❌ Request changes if:
   - Unexplained visual differences
   - Missing baseline updates
   - Accessibility issues
   - Breaking changes not documented

## Baseline Update Process

### When to Update Baselines

Update baselines when:

- ✅ Intentional design changes
- ✅ Component improvements
- ✅ Bug fixes that change appearance
- ✅ Accessibility improvements
- ✅ Responsive layout adjustments

Do NOT update baselines for:

- ❌ Unexplained differences
- ❌ Flaky test results
- ❌ Temporary workarounds
- ❌ Unreviewed changes

### Step-by-Step Update Process

#### Local Update

```bash
# 1. Ensure you're on the correct branch
git checkout feature/my-feature

# 2. Pull latest changes
git pull origin feature/my-feature

# 3. Run tests to see current state
npm run test:visual --workspace=apps/frontend

# 4. Review the differences
npx playwright show-report apps/frontend/playwright-report-visual

# 5. Update baselines
npm run test:visual:update --workspace=apps/frontend

# 6. Verify tests pass
npm run test:visual --workspace=apps/frontend

# 7. Commit the updates
git add apps/frontend/e2e/visual/**/*-snapshots/
git commit -m "chore: update visual baselines - [brief description]"
git push origin feature/my-feature
```

#### CI Update (for specific browsers)

If local tests pass but CI fails due to browser differences:

```bash
# Run with Docker to match CI environment
docker run --rm -v $(pwd):/work -w /work/apps/frontend mcr.microsoft.com/playwright:v1.44.0-jammy npm run test:visual:update

# Commit the CI-generated baselines
git add apps/frontend/e2e/visual/**/*-snapshots/
git commit -m "chore: update visual baselines for CI environment"
git push
```

### Baseline Review Checklist

Before committing baseline updates:

- [ ] All differences reviewed and approved
- [ ] Changes documented in commit message
- [ ] Tests pass after update
- [ ] No unintended regressions
- [ ] Accessibility maintained
- [ ] Both light and dark themes checked
- [ ] Responsive layouts verified

## Troubleshooting

### Common Issues and Solutions

#### 1. Tests Pass Locally But Fail in CI

**Cause**: Browser rendering differences, font loading, or timing issues

**Solutions**:

```bash
# Use CI-matching Docker image
docker run -v $(pwd):/work -w /work/apps/frontend mcr.microsoft.com/playwright:v1.44.0-jammy npm run test:visual

# Increase wait times
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000);

# Ensure fonts are loaded
await page.waitForFunction(() => document.fonts.ready);
```

#### 2. Flaky Visual Tests

**Cause**: Animations, dynamic content, or timing races

**Solutions**:

```typescript
// Disable animations
await expect(page).toHaveScreenshot('page.png', {
  animations: 'disabled',
});

// Mask dynamic content
await expect(page).toHaveScreenshot('page.png', {
  mask: [page.locator('[data-testid="timestamp"]'), page.locator('.animated-element')],
});

// Allow small pixel differences
await expect(page).toHaveScreenshot('page.png', {
  maxDiffPixels: 100,
});
```

#### 3. Large Diff in All Screenshots

**Cause**: Font loading, theme persistence, or environment issues

**Solutions**:

```bash
# Clear test cache
rm -rf apps/frontend/test-results-visual/
rm -rf apps/frontend/playwright-report-visual/

# Re-install dependencies
cd apps/frontend
npm ci

# Clear browser cache
npx playwright install --with-deps

# Run tests again
npm run test:visual
```

#### 4. Missing Baselines for New Tests

**Cause**: New test added without baselines

**Solution**:

```bash
# Generate baselines for new tests
npm run test:visual:update

# Commit the new baselines
git add apps/frontend/e2e/visual/**/*-snapshots/
git commit -m "chore: add visual baselines for new tests"
```

#### 5. Tests Timeout

**Cause**: Slow page load or network issues

**Solutions**:

```typescript
// Increase timeout in test
test.setTimeout(60000); // 60 seconds

// Or in config
export default defineConfig({
  timeout: 60000,
});
```

### Getting Help

If you're stuck:

1. **Check the Docs**: Review this workflow and README.md
2. **Search Issues**: Look for similar problems in GitHub issues
3. **Ask the Team**: Post in #qa-testing channel
4. **Create Issue**: Open a GitHub issue with:
   - Test name
   - Error message
   - Screenshots of the diff
   - Steps to reproduce

## Best Practices Summary

### Do's ✅

- Review all visual diffs before updating baselines
- Document visual changes in PR descriptions
- Wait for page load and animations to complete
- Mask dynamic content (timestamps, user data)
- Test both light and dark themes
- Test responsive layouts
- Keep baselines up to date
- Run tests before pushing

### Don'ts ❌

- Don't blindly update all baselines
- Don't commit without reviewing diffs
- Don't ignore CI failures
- Don't test highly dynamic content
- Don't update baselines for flaky tests
- Don't skip the review process
- Don't merge PRs with unreviewed visual changes

## Metrics and Monitoring

Track these metrics for visual testing health:

- **Pass Rate**: % of visual tests passing
- **Flaky Test Rate**: Tests that intermittently fail
- **Baseline Update Frequency**: How often baselines change
- **Review Time**: Time to review visual diffs
- **Coverage**: % of components with visual tests

## Continuous Improvement

We're always improving our visual testing:

- Add more components to visual tests
- Improve test stability and speed
- Enhance diff review process
- Better documentation and training
- Automated baseline updates for approved changes

---

**Document Version**: 1.0  
**Last Updated**: 2026-06-29  
**Next Review**: 2026-09-29  
**Maintainer**: Brain-Storm QA Team
