# Accessibility Testing Guide

## Overview

Automated accessibility testing ensures the platform meets WCAG 2.1 AA standards. Tests cover keyboard navigation, screen reader compatibility, color contrast, and semantic HTML.

## Running Tests

### Component Tests
```bash
npm run test:a11y --workspace=apps/frontend
```

### E2E Accessibility Tests
```bash
npm run test:wcag --workspace=apps/frontend
```

### Full Suite
```bash
npm run test --workspace=apps/frontend
```

## Test Coverage

### WCAG Compliance
- **Level A** - Basic accessibility
- **Level AA** - Enhanced accessibility (target)
- **Level AAA** - Advanced accessibility

### Automated Checks
- Color contrast ratios
- Heading hierarchy
- Form labels and inputs
- Image alt text
- Button accessibility
- Keyboard navigation
- Focus indicators
- Landmark structure

### Manual Checks
- Screen reader testing (NVDA, JAWS)
- Keyboard-only navigation
- Zoom and text scaling
- Motion and animation

## Tools

- **axe-core** - Automated accessibility testing
- **jest-axe** - Jest integration for axe
- **axe-playwright** - Playwright integration for axe
- **Playwright** - E2E testing with accessibility checks

## CI/CD Integration

Accessibility tests run on every PR and push to main/develop branches. Reports are uploaded as artifacts and commented on PRs.

## Best Practices

1. **Semantic HTML** - Use proper heading levels, landmarks, and form elements
2. **Labels** - Always associate labels with form inputs
3. **Alt Text** - Provide meaningful alt text for images
4. **Color** - Don't rely on color alone to convey information
5. **Focus** - Ensure visible focus indicators on interactive elements
6. **Keyboard** - All functionality must be keyboard accessible
7. **Testing** - Test with real assistive technologies

## Common Issues

### Missing Alt Text
```tsx
// ❌ Bad
<img src="course.jpg" />

// ✅ Good
<img src="course.jpg" alt="Blockchain Basics course thumbnail" />
```

### Unlabeled Inputs
```tsx
// ❌ Bad
<input type="email" placeholder="Email" />

// ✅ Good
<label htmlFor="email">Email</label>
<input id="email" type="email" />
```

### Poor Color Contrast
```tsx
// ❌ Bad - insufficient contrast
<p style={{ color: '#999', backgroundColor: '#f0f0f0' }}>Text</p>

// ✅ Good - meets AA standard
<p style={{ color: '#333', backgroundColor: '#f0f0f0' }}>Text</p>
```

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WebAIM](https://webaim.org/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
