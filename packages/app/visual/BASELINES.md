# Visual Regression Baselines

This document tracks the visual regression test baselines for the Brain-Storm platform.

## Baseline Structure

Baselines are organized by test category and stored in:
```
apps/frontend/e2e/visual/
├── components/
│   ├── buttons.spec.ts-snapshots/
│   ├── course-card.spec.ts-snapshots/
│   ├── modals.spec.ts-snapshots/
│   └── navbar.spec.ts-snapshots/
├── pages/
│   ├── homepage.spec.ts-snapshots/
│   ├── courses.spec.ts-snapshots/
│   ├── dashboard.spec.ts-snapshots/
│   └── profile.spec.ts-snapshots/
├── themes/
│   ├── color-scheme.spec.ts-snapshots/
│   └── theme-transitions.spec.ts-snapshots/
└── rtl/
    └── rtl-baseline.spec.ts-snapshots/
```

## Baseline Naming Convention

Snapshots follow this naming pattern:
```
{test-name}-{browser}-{platform}.png
```

Examples:
- `homepage-light-desktop-chromium-linux.png`
- `button-primary-dark-firefox-linux.png`
- `navbar-mobile-webkit-linux.png`

## Browser Coverage

Baselines are captured for multiple browsers:

### Desktop Browsers
- **Chromium**: Primary browser for visual testing
- **Firefox**: Gecko engine coverage
- **WebKit**: Safari/WebKit engine coverage

### Mobile Browsers
- **Mobile Chrome**: Android perspective (Pixel 5 viewport)
- **Mobile Safari**: iOS perspective (iPhone 12 viewport)

## Viewport Sizes

| Device Type | Viewport Size | Usage |
|-------------|---------------|-------|
| Desktop | 1920x1080 | Default desktop view |
| Tablet | 768x1024 | iPad/tablet layouts |
| Mobile | 375x667 | iPhone SE/small mobile |
| Mobile Large | 414x896 | iPhone 11/large mobile |

## Theme Coverage

All component and page tests cover:

### Light Mode
- Default color scheme
- Standard contrast ratios
- Light backgrounds, dark text

### Dark Mode
- Dark color scheme
- High contrast maintained
- Dark backgrounds, light text

## Component Baselines

### Buttons
- Primary, secondary, tertiary variants
- Hover, focus, disabled states
- Loading states
- Different sizes (sm, md, lg)

### Course Cards
- Default state
- Enrolled state
- Hover effects
- Grid layouts
- Mobile responsive views

### Modals
- Enrollment modal
- Confirmation modal
- With backdrop blur
- Mobile responsive

### Navbar
- Desktop and mobile layouts
- With/without user menu
- Mobile menu expanded
- Theme toggle button

## Page Baselines

### Homepage
- Hero section
- Features section
- Full page (light/dark)
- Responsive layouts

### Courses Page
- Course grid
- Search active
- Filters applied
- Empty state

### Dashboard
- Stats cards
- Progress section
- Enrolled courses
- Responsive layouts

### Profile Page
- View mode
- Edit mode
- Achievements section
- Certificates section

## RTL Baselines

Arabic (ar) locale coverage:
- Homepage RTL layout
- Navigation RTL
- Button alignment
- Text alignment
- Icon mirroring
- Mobile RTL

## Baseline Update History

Track significant baseline updates here:

### 2026-06-29 - Initial Baselines
- **Author**: Brain-Storm QA Team
- **Reason**: Initial visual regression test coverage
- **Components**: Buttons, Course Cards, Modals, Navbar
- **Pages**: Homepage, Courses, Dashboard, Profile
- **Themes**: Light/Dark mode coverage
- **RTL**: Arabic layout baselines

### Template for Future Updates

```markdown
### YYYY-MM-DD - [Update Description]
- **Author**: [Name/Team]
- **Reason**: [Why baselines were updated]
- **PR**: #[PR Number]
- **Components Updated**: [List]
- **Breaking Changes**: [Yes/No - Description]
- **Review**: [Approved by]
```

## Baseline Quality Guidelines

### What Makes a Good Baseline

✅ **Good Baselines**:
- Stable content (no dynamic data visible)
- Fully loaded (all assets, fonts, images)
- Consistent timing (animations complete)
- No flaky elements
- Representative of production

❌ **Bad Baselines**:
- Loading states visible
- Dynamic content not masked
- Incomplete rendering
- Random/flaky elements
- Dev-only content

### Baseline Stability

To maintain stable baselines:

1. **Mask Dynamic Content**
   ```typescript
   mask: [
     page.locator('[data-testid="timestamp"]'),
     page.locator('[data-testid="user-avatar"]'),
     page.locator('[data-testid="dynamic-content"]')
   ]
   ```

2. **Wait for Stability**
   ```typescript
   await page.waitForLoadState('networkidle');
   await page.waitForTimeout(500); // Let animations settle
   ```

3. **Disable Animations** (when needed)
   ```typescript
   animations: 'disabled'
   ```

4. **Use Pixel Thresholds** (sparingly)
   ```typescript
   maxDiffPixels: 100 // For minor rendering differences
   ```

## Maintenance Schedule

### Weekly
- [ ] Review flaky test reports
- [ ] Check baseline file sizes
- [ ] Monitor test execution times

### Monthly
- [ ] Audit unused baselines
- [ ] Review test coverage gaps
- [ ] Update this documentation

### Quarterly
- [ ] Major baseline audit
- [ ] Archive old baselines
- [ ] Review browser versions
- [ ] Update testing strategy

## Troubleshooting Baselines

### Baseline Mismatches

If you see unexpected differences:

1. **Check Browser Version**: CI might use different version
2. **Font Loading**: Ensure fonts load before capture
3. **Timing Issues**: Add more wait time
4. **Platform Differences**: Use Docker to match CI environment

### Missing Baselines

If baselines are missing:

```bash
# Generate missing baselines
npm run test:visual:update --workspace=apps/frontend

# Commit new baselines
git add apps/frontend/e2e/visual/**/*-snapshots/
git commit -m "chore: add missing visual baselines"
```

### Large Baseline Files

If baselines become too large:

- Use `fullPage: false` for component tests
- Crop to relevant areas
- Compress PNG files
- Consider video tests for animations

## Metrics

Track these metrics for baseline health:

- **Total Baselines**: Number of baseline images
- **Total Size**: Disk space used by baselines
- **Update Frequency**: How often baselines change
- **Stability Score**: % of tests passing consistently
- **Coverage**: % of components with baselines

## Resources

- [Playwright Screenshots Documentation](https://playwright.dev/docs/test-snapshots)
- [Visual Testing Best Practices](https://www.browserstack.com/guide/visual-regression-testing)
- [Brain-Storm Visual Testing Workflow](./WORKFLOW.md)

---

**Last Updated**: 2026-06-29  
**Maintainer**: Brain-Storm QA Team  
**Review Schedule**: Monthly
