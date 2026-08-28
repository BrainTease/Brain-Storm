# Common Accessibility Issues and How to Fix Them

This document provides solutions for the most common accessibility violations found during testing.

## Table of Contents

- [Color Contrast](#color-contrast)
- [Form Labels](#form-labels)
- [Button Names](#button-names)
- [Image Alt Text](#image-alt-text)
- [Heading Hierarchy](#heading-hierarchy)
- [Keyboard Navigation](#keyboard-navigation)
- [Focus Management](#focus-management)
- [ARIA Usage](#aria-usage)
- [Link Text](#link-text)
- [Form Validation](#form-validation)

---

## Color Contrast

### Issue: `color-contrast`

**Description**: Text doesn't have sufficient contrast against its background.

**WCAG Requirement**:

- Normal text (under 18pt): 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- UI components: 3:1 minimum

### ❌ Bad Example

```css
.text {
  color: #777; /* Light gray */
  background: #fff; /* White */
  /* Ratio: 4.48:1 - FAILS for normal text */
}

.button {
  color: #999;
  background: #eee;
  /* Ratio: 2.32:1 - FAILS */
}
```

### ✅ Good Example

```css
.text {
  color: #595959; /* Darker gray */
  background: #fff; /* White */
  /* Ratio: 7:1 - PASSES */
}

.button {
  color: #fff;
  background: #0066cc; /* Blue */
  /* Ratio: 7.53:1 - PASSES */
}
```

### Tools to Check

- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- Browser DevTools (Lighthouse)
- axe DevTools Extension

---

## Form Labels

### Issue: `label`

**Description**: Form inputs don't have associated labels.

### ❌ Bad Example

```tsx
// No label at all
<input type="email" placeholder="Enter email" />

// Label not associated
<label>Email</label>
<input type="email" />

// Only placeholder (not a label!)
<input type="email" placeholder="Email address" />
```

### ✅ Good Example

```tsx
// Method 1: Explicit association
<label htmlFor="email">Email Address</label>
<input id="email" type="email" />

// Method 2: Wrapping
<label>
  Email Address
  <input type="email" />
</label>

// Method 3: aria-label (when visual label isn't needed)
<input
  type="email"
  aria-label="Email address"
/>

// Method 4: aria-labelledby
<span id="email-label">Email Address</span>
<input
  type="email"
  aria-labelledby="email-label"
/>
```

### React/Next.js Example

```tsx
export function EmailInput() {
  const [email, setEmail] = useState('');
  const inputId = useId(); // Generate unique ID

  return (
    <div>
      <label htmlFor={inputId}>
        Email Address
        <span aria-label="required">*</span>
      </label>
      <input
        id={inputId}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        aria-required="true"
      />
    </div>
  );
}
```

---

## Button Names

### Issue: `button-name`

**Description**: Buttons don't have accessible names.

### ❌ Bad Example

```tsx
// Icon-only button with no label
<button onClick={handleClose}>
  <CloseIcon />
</button>

// Empty button
<button onClick={handleSubmit}></button>

// Non-descriptive
<button>Click here</button>
```

### ✅ Good Example

```tsx
// Method 1: Text content
<button onClick={handleClose}>
  Close
</button>

// Method 2: aria-label for icon buttons
<button onClick={handleClose} aria-label="Close dialog">
  <CloseIcon aria-hidden="true" />
</button>

// Method 3: aria-labelledby
<span id="close-label" className="sr-only">Close dialog</span>
<button onClick={handleClose} aria-labelledby="close-label">
  <CloseIcon aria-hidden="true" />
</button>

// Method 4: title attribute (less preferred)
<button onClick={handleClose} title="Close dialog">
  <CloseIcon />
</button>
```

### Icon Button Component

```tsx
interface IconButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

export function IconButton({ icon, label, onClick }: IconButtonProps) {
  return (
    <button onClick={onClick} aria-label={label} className="icon-button">
      <span aria-hidden="true">{icon}</span>
    </button>
  );
}

// Usage
<IconButton icon={<CloseIcon />} label="Close dialog" onClick={handleClose} />;
```

---

## Image Alt Text

### Issue: `image-alt`

**Description**: Images don't have alternative text.

### ❌ Bad Example

```tsx
// No alt attribute
<img src="/course-thumbnail.jpg" />

// Empty alt for meaningful image
<img src="/instructor-photo.jpg" alt="" />

// Non-descriptive alt
<img src="/chart.png" alt="image" />
```

### ✅ Good Example

```tsx
// Informative images
<img
  src="/course-thumbnail.jpg"
  alt="Introduction to Blockchain Development course thumbnail"
/>

// Decorative images (empty alt)
<img
  src="/decorative-pattern.svg"
  alt=""
  role="presentation"
/>

// Complex images with description
<figure>
  <img
    src="/enrollment-chart.png"
    alt="Bar chart showing student enrollment trends"
    aria-describedby="chart-description"
  />
  <figcaption id="chart-description">
    Enrollment increased from 100 students in January to 500 in December,
    with peak enrollment in September at 650 students.
  </figcaption>
</figure>

// Images with text
<img
  src="/button-get-started.png"
  alt="Get Started"
/>
```

### Guidelines for Alt Text

**DO**:

- Describe the content and function
- Be concise (under 150 characters ideally)
- Don't repeat nearby text
- Use empty alt for decorative images

**DON'T**:

- Start with "Image of..." or "Picture of..."
- Include file names
- Be redundant
- Use alt text for layout/spacing

---

## Heading Hierarchy

### Issue: `heading-order`

**Description**: Heading levels are skipped.

### ❌ Bad Example

```tsx
<h1>Course Overview</h1>
<h3>Course Description</h3>  {/* Skipped h2! */}
<h4>Prerequisites</h4>
<h2>Instructor</h2>  {/* Going backwards! */}
```

### ✅ Good Example

```tsx
<h1>Course Overview</h1>
<h2>Course Description</h2>
<h3>What You'll Learn</h3>
<h3>Prerequisites</h3>
<h2>Instructor</h2>
<h3>Instructor Bio</h3>
<h3>Teaching Experience</h3>
```

### React Component Example

```tsx
interface SectionProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
}

export function Heading({ level, children }: SectionProps) {
  const Tag = `h${level}` as keyof JSX.IntrinsicElements;
  return <Tag>{children}</Tag>;
}

// Usage with proper hierarchy
export function CoursePage() {
  return (
    <>
      <Heading level={1}>Course Title</Heading>
      <Heading level={2}>Description</Heading>
      <Heading level={3}>Learning Objectives</Heading>
      <Heading level={2}>Instructor</Heading>
    </>
  );
}
```

---

## Keyboard Navigation

### Issue: `keyboard-navigable`

**Description**: Interactive elements can't be accessed via keyboard.

### ❌ Bad Example

```tsx
// Div with onClick (not keyboard accessible)
<div onClick={handleClick}>Click me</div>

// Custom interactive element without keyboard support
<span onClick={handleDelete} className="delete-icon">×</span>

// Disabled tab index
<button tabIndex={-1}>Can't tab to me</button>
```

### ✅ Good Example

```tsx
// Use proper button element
<button onClick={handleClick}>Click me</button>

// Make custom element keyboard accessible
<span
  role="button"
  tabIndex={0}
  onClick={handleDelete}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleDelete();
    }
  }}
  className="delete-icon"
>
  ×
</span>

// Custom keyboard-accessible component
export function KeyboardAccessibleButton({ onClick, children }) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className="custom-button"
    >
      {children}
    </div>
  );
}
```

### Keyboard Navigation Checklist

- [ ] All interactive elements accessible via Tab
- [ ] Shift+Tab moves backwards
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals
- [ ] Arrow keys for radio buttons, tabs, menus
- [ ] Focus visible at all times

---

## Focus Management

### Issue: `focus-visible`, `focus-trap`

**Description**: Focus indicators not visible or focus not properly managed.

### ❌ Bad Example

```css
/* Removing focus outline */
*:focus {
  outline: none;
}

button:focus {
  outline: none;
}
```

```tsx
// Not managing focus in modal
export function Modal({ isOpen, children }) {
  if (!isOpen) return null;
  return <div className="modal">{children}</div>;
}
```

### ✅ Good Example

```css
/* Custom focus indicator */
*:focus {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

/* Focus-visible (only keyboard focus) */
*:focus-visible {
  outline: 2px solid #0066cc;
  outline-offset: 2px;
}

*:focus:not(:focus-visible) {
  outline: none;
}
```

```tsx
// Proper focus management in modal
export function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Save previous focus
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus modal
      modalRef.current?.focus();

      // Trap focus
      const trapFocus = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          const focusableElements = modalRef.current?.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );

          if (!focusableElements) return;

          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        } else if (e.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', trapFocus);
      return () => {
        document.removeEventListener('keydown', trapFocus);
        // Restore focus
        previousFocusRef.current?.focus();
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div ref={modalRef} role="dialog" aria-modal="true" tabIndex={-1} className="modal">
      {children}
    </div>
  );
}
```

---

## ARIA Usage

### Issue: `aria-*` violations

**Description**: Incorrect or unnecessary ARIA usage.

### ❌ Bad Example

```tsx
// Redundant ARIA
<button role="button" aria-label="Submit">Submit</button>

// Invalid ARIA
<div role="fake-role">Content</div>

// Conflicting ARIA
<button aria-hidden="true">Click me</button>

// ARIA on non-interactive element
<div role="button">Not really a button</div>
```

### ✅ Good Example

```tsx
// No ARIA needed - semantic HTML
<button>Submit</button>

// Valid ARIA roles
<div role="alert">Error occurred!</div>

// Properly hidden decorative elements
<span aria-hidden="true"><DecorativeIcon /></span>

// ARIA when semantic HTML isn't enough
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={handleKeyDown}
>
  Custom Button
</div>
```

### ARIA Best Practices

**First Rule of ARIA**: Don't use ARIA

- Use semantic HTML instead
- Only add ARIA when HTML isn't sufficient

**Valid ARIA Patterns**:

```tsx
// Live regions for dynamic content
<div role="status" aria-live="polite">
  Saved successfully!
</div>

<div role="alert" aria-live="assertive">
  Error: Please try again!
</div>

// Expandable sections
<button
  aria-expanded={isExpanded}
  aria-controls="content-1"
  onClick={() => setIsExpanded(!isExpanded)}
>
  Show More
</button>
<div id="content-1" hidden={!isExpanded}>
  Content here...
</div>

// Tab panel
<div role="tablist">
  <button role="tab" aria-selected={activeTab === 0} aria-controls="panel-0">
    Tab 1
  </button>
  <button role="tab" aria-selected={activeTab === 1} aria-controls="panel-1">
    Tab 2
  </button>
</div>
<div id="panel-0" role="tabpanel" hidden={activeTab !== 0}>
  Panel 1 content
</div>
<div id="panel-1" role="tabpanel" hidden={activeTab !== 1}>
  Panel 2 content
</div>
```

---

## Link Text

### Issue: `link-name`

**Description**: Links don't have descriptive text.

### ❌ Bad Example

```tsx
// Generic link text
<a href="/courses">Click here</a>
<a href="/docs">Read more</a>
<a href="/info">Learn more</a>

// Empty link
<a href="/profile">
  <img src="/avatar.jpg" />
</a>
```

### ✅ Good Example

```tsx
// Descriptive link text
<a href="/courses">Browse available courses</a>
<a href="/docs">Read the documentation</a>
<a href="/blockchain-guide">Learn more about blockchain</a>

// Image link with alt text
<a href="/profile">
  <img src="/avatar.jpg" alt="Go to your profile" />
</a>

// Icon link with label
<a href="/settings" aria-label="Account settings">
  <SettingsIcon aria-hidden="true" />
</a>

// Link with additional context
<a href="/courses/blockchain-101" aria-describedby="course-desc">
  Blockchain 101
</a>
<p id="course-desc">Introduction to blockchain technology</p>
```

---

## Form Validation

### Issue: `aria-invalid`, `error-message`

**Description**: Form errors aren't properly communicated.

### ❌ Bad Example

```tsx
function SignupForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  return (
    <>
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      {error && <span className="error">{error}</span>}
    </>
  );
}
```

### ✅ Good Example

```tsx
function SignupForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const errorId = 'email-error';
  const inputId = 'email-input';

  return (
    <div>
      <label htmlFor={inputId}>
        Email Address
        <span aria-label="required">*</span>
      </label>
      <input
        id={inputId}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        aria-required="true"
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />
      {error && (
        <span id={errorId} role="alert" className="error">
          {error}
        </span>
      )}
    </div>
  );
}
```

### Complete Form Example

```tsx
export function AccessibleForm() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      // Submit form
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="email">
          Email <span aria-label="required">*</span>
        </label>
        <input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          aria-required="true"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <span id="email-error" role="alert" className="error">
            {errors.email}
          </span>
        )}
      </div>

      <div>
        <label htmlFor="password">
          Password <span aria-label="required">*</span>
        </label>
        <input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
          aria-required="true"
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : 'password-help'}
        />
        <span id="password-help" className="help-text">
          Must be at least 8 characters
        </span>
        {errors.password && (
          <span id="password-error" role="alert" className="error">
            {errors.password}
          </span>
        )}
      </div>

      <button type="submit">Sign Up</button>
    </form>
  );
}
```

---

## Quick Reference

### Priority by Severity

**Fix Immediately** (Critical):

1. Color contrast issues
2. Missing form labels
3. Missing button names
4. No keyboard access

**Fix Soon** (Serious): 5. Missing alt text 6. Heading hierarchy problems 7. Missing focus indicators 8. Incorrect ARIA usage

**Fix When Convenient** (Moderate): 9. Non-descriptive link text 10. Missing landmarks 11. Poor error messaging

---

## Resources

- [WCAG Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe Rules](https://github.com/dequelabs/axe-core/blob/develop/doc/rule-descriptions.md)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Resources](https://webaim.org/resources/)

---

**Last Updated**: 2026-06-29  
**Maintainer**: Brain-Storm Accessibility Team
