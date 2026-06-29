# WCAG 2.1 AA Compliance Guidelines

This document outlines the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA requirements that we follow.

## Overview

WCAG 2.1 is organized around four principles (POUR):

1. **Perceivable**: Information must be presentable to users in ways they can perceive
2. **Operable**: Interface components must be operable by all users
3. **Understandable**: Information and operation must be understandable
4. **Robust**: Content must be robust enough for assistive technologies

## Level AA Requirements

### 1. Perceivable

#### 1.1 Text Alternatives (Level A)
- **1.1.1**: Provide text alternatives for non-text content
  - All images must have `alt` attributes
  - Decorative images should have empty `alt=""`
  - Complex images need detailed descriptions

#### 1.2 Time-based Media (Level A/AA)
- **1.2.1**: Captions for prerecorded audio
- **1.2.2**: Captions for prerecorded video
- **1.2.4**: Captions for live audio content
- **1.2.5**: Audio descriptions for prerecorded video

#### 1.3 Adaptable (Level A)
- **1.3.1**: Info and relationships conveyed through presentation can be programmatically determined
  - Use semantic HTML
  - Proper heading hierarchy
  - Correct ARIA roles
- **1.3.2**: Meaningful sequence preserved when linearized
- **1.3.3**: Instructions don't rely solely on sensory characteristics

#### 1.4 Distinguishable (Level AA)
- **1.4.1**: Color is not the only visual means of conveying information
- **1.4.2**: Audio control for auto-playing audio
- **1.4.3**: **Color contrast ratio of at least 4.5:1** for normal text
- **1.4.4**: Text can be resized up to 200% without loss of content
- **1.4.5**: Images of text avoided (except logos)
- **1.4.10**: Content reflows without horizontal scrolling at 320px width
- **1.4.11**: **Non-text contrast of 3:1** for UI components
- **1.4.12**: Text spacing can be adjusted without loss of content
- **1.4.13**: Content on hover/focus can be dismissed and remains visible

### 2. Operable

#### 2.1 Keyboard Accessible (Level A)
- **2.1.1**: All functionality available via keyboard
- **2.1.2**: No keyboard trap - users can navigate away
- **2.1.4**: Single character shortcuts can be turned off or remapped

#### 2.2 Enough Time (Level A)
- **2.2.1**: Timing adjustable for time limits
- **2.2.2**: Content can be paused, stopped, or hidden if it moves, blinks, or scrolls

#### 2.3 Seizures (Level A/AA)
- **2.3.1**: No content flashes more than 3 times per second

#### 2.4 Navigable (Level A/AA)
- **2.4.1**: Bypass blocks (skip links) to navigate repeated content
- **2.4.2**: Pages have descriptive titles
- **2.4.3**: Focus order is logical and meaningful
- **2.4.4**: **Link purpose clear from link text** or context
- **2.4.5**: **Multiple ways to find pages** (nav, search, sitemap)
- **2.4.6**: **Headings and labels are descriptive**
- **2.4.7**: **Focus indicator is visible**

#### 2.5 Input Modalities (Level A/AA)
- **2.5.1**: Complex pointer gestures have single-pointer alternatives
- **2.5.2**: Pointer cancellation (up-event not down-event)
- **2.5.3**: Labels match accessible names
- **2.5.4**: Motion actuation can be disabled

### 3. Understandable

#### 3.1 Readable (Level A/AA)
- **3.1.1**: Language of page specified (`<html lang="en">`)
- **3.1.2**: Language of parts specified when it changes

#### 3.2 Predictable (Level A/AA)
- **3.2.1**: Focus doesn't cause unexpected context changes
- **3.2.2**: Input doesn't cause unexpected context changes
- **3.2.3**: **Navigation mechanisms consistent across pages**
- **3.2.4**: **Components identified consistently**

#### 3.3 Input Assistance (Level A/AA)
- **3.3.1**: Error messages identify errors clearly
- **3.3.2**: **Labels or instructions for user input**
- **3.3.3**: **Error suggestions provided when possible**
- **3.3.4**: **Error prevention for legal/financial/data submission**

### 4. Robust

#### 4.1 Compatible (Level A/AA)
- **4.1.1**: Markup is valid (proper nesting, unique IDs)
- **4.1.2**: Name, role, value available for UI components
- **4.1.3**: **Status messages can be programmatically determined**

## Quick Checklist

Use this for quick verification:

### Essential (Must Have)

- [ ] **Color Contrast**: Text has 4.5:1 contrast (3:1 for large text)
- [ ] **Form Labels**: All inputs have associated labels
- [ ] **Alt Text**: All images have alt attributes
- [ ] **Keyboard Access**: All interactive elements keyboard accessible
- [ ] **Focus Visible**: Focus indicators always visible
- [ ] **Heading Hierarchy**: Proper H1-H6 structure, no skipped levels
- [ ] **Page Title**: Every page has unique, descriptive title
- [ ] **Language**: HTML lang attribute set correctly
- [ ] **Link Text**: Links have descriptive text (not "click here")
- [ ] **Button Names**: All buttons have accessible names

### Important (Should Have)

- [ ] **ARIA Usage**: Correct and necessary ARIA only
- [ ] **Landmarks**: Proper use of semantic HTML (nav, main, etc.)
- [ ] **Error Messages**: Form errors clearly identified and described
- [ ] **Required Fields**: Required inputs marked appropriately
- [ ] **Skip Links**: Skip to main content link present
- [ ] **Consistent Navigation**: Nav structure same across pages
- [ ] **No Keyboard Trap**: Users can always navigate away
- [ ] **Resize Text**: Content works at 200% zoom
- [ ] **Mobile Touch Targets**: At least 44×44 CSS pixels
- [ ] **Status Messages**: Dynamic content changes announced

## Testing Tools

### Automated Testing
- **axe-core**: Catches ~40% of issues
- **Lighthouse**: Overall accessibility score
- **WAVE**: Visual feedback tool
- **Pa11y**: Command-line testing

### Manual Testing
- **Keyboard Navigation**: Tab, Shift+Tab, Enter, Space, Esc, Arrows
- **Screen Readers**:
  - NVDA (Windows, free)
  - JAWS (Windows, commercial)
  - VoiceOver (macOS/iOS, built-in)
  - TalkBack (Android, built-in)
- **Browser DevTools**: Accessibility inspector
- **Zoom**: Test at 200% and 400%

## Common Patterns

### Accessible Form

```tsx
<form>
  <label htmlFor="email">
    Email Address <span aria-label="required">*</span>
  </label>
  <input
    id="email"
    type="email"
    required
    aria-required="true"
    aria-invalid={hasError}
    aria-describedby={hasError ? "email-error" : undefined}
  />
  {hasError && (
    <span id="email-error" role="alert">
      Please enter a valid email address
    </span>
  )}
</form>
```

### Accessible Modal

```tsx
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="dialog-title"
  aria-describedby="dialog-desc"
  tabIndex={-1}
>
  <h2 id="dialog-title">Confirm Action</h2>
  <p id="dialog-desc">Are you sure you want to delete this item?</p>
  <button onClick={onConfirm}>Confirm</button>
  <button onClick={onCancel}>Cancel</button>
</div>
```

### Accessible Navigation

```tsx
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/" aria-current={isHome ? "page" : undefined}>Home</a></li>
    <li><a href="/courses">Courses</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>
```

### Accessible Tabs

```tsx
<div>
  <div role="tablist" aria-label="Course sections">
    <button
      role="tab"
      aria-selected={activeTab === 0}
      aria-controls="panel-0"
      id="tab-0"
      tabIndex={activeTab === 0 ? 0 : -1}
    >
      Overview
    </button>
    <button
      role="tab"
      aria-selected={activeTab === 1}
      aria-controls="panel-1"
      id="tab-1"
      tabIndex={activeTab === 1 ? 0 : -1}
    >
      Content
    </button>
  </div>
  <div
    id="panel-0"
    role="tabpanel"
    aria-labelledby="tab-0"
    hidden={activeTab !== 0}
  >
    Overview content...
  </div>
  <div
    id="panel-1"
    role="tabpanel"
    aria-labelledby="tab-1"
    hidden={activeTab !== 1}
  >
    Course content...
  </div>
</div>
```

## Severity Guidelines

### Critical (Must Fix)
- Blocks users from accessing content
- Examples: No keyboard access, poor contrast, missing form labels

### Serious (Should Fix Soon)
- Significant barrier for many users
- Examples: Missing alt text, improper ARIA, no focus indicators

### Moderate (Fix When Possible)
- Barrier for some users
- Examples: Missing skip links, non-descriptive links

### Minor (Best Practice)
- Could be better but not blocking
- Examples: Missing lang attribute, suboptimal heading structure

## Resources

### Official Documentation
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [Understanding WCAG 2.1](https://www.w3.org/WAI/WCAG21/Understanding/)
- [How to Meet WCAG](https://www.w3.org/WAI/WCAG21/quickref/)

### Tools & Extensions
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE](https://wave.webaim.org/extension/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [Color Contrast Checker](https://webaim.org/resources/contrastchecker/)

### Learning Resources
- [WebAIM](https://webaim.org/)
- [A11y Project](https://www.a11yproject.com/)
- [Inclusive Components](https://inclusive-components.design/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

## Legal Requirements

### United States
- **Section 508**: Federal agencies must make digital content accessible
- **ADA**: Applies to places of public accommodation (including websites)

### European Union
- **EN 301 549**: European accessibility standard
- **Web Accessibility Directive**: Public sector websites must meet WCAG 2.1 AA

### International
- Many countries have adopted WCAG 2.1 AA as their standard

## Exceptions

Some content may be exempt:
- Third-party content you don't control
- Archive content (if declared as such)
- Content only for employees (but still recommended)

**However**: Always strive for accessibility regardless of legal requirements.

---

**Last Updated**: 2026-06-29  
**Standard**: WCAG 2.1 Level AA  
**Next Review**: 2027-06-29
