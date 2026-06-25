# Internationalization (i18n) Guide

Guide for adding and maintaining translations in the Brain-Storm frontend.

---

## Table of Contents

1. [next-intl Setup and Usage](#1-next-intl-setup-and-usage)
2. [Translation File Structure](#2-translation-file-structure)
3. [Adding a New Language](#3-adding-a-new-language)
4. [RTL Language Support](#4-rtl-language-support)
5. [Locale-Specific Formatting](#5-locale-specific-formatting)

---

## 1. next-intl Setup and Usage

Brain-Storm uses [next-intl](https://next-intl.dev) (`^4.8.3`) for all frontend translations.

### How It Fits Together

```
src/i18n/routing.ts       — defines supported locales and default locale
src/i18n/request.ts       — loads the correct message file per request
src/middleware.ts          — rewrites URLs to include the locale prefix
src/app/[locale]/layout.tsx — wraps the app with NextIntlClientProvider
messages/{locale}.json    — translation strings
```

### Routing Config (`src/i18n/routing.ts`)

```typescript
import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'es'],
  defaultLocale: 'en',
});
```

This is the single source of truth for which locales are active. All other files derive from it.

### Request Config (`src/i18n/request.ts`)

Loads the message file for the incoming request's locale and falls back to `defaultLocale` for unknown values:

```typescript
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as 'en' | 'es')) {
    locale = routing.defaultLocale;
  }
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

### Middleware (`src/middleware.ts`)

Automatically prefixes all routes with the active locale (e.g. `/courses` → `/en/courses`):

```typescript
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
```

### Layout (`src/app/[locale]/layout.tsx`)

Validates the locale param, loads messages server-side, and provides them to the client tree:

```typescript
const messages = await getMessages();

return (
  <html lang={locale}>
    <body>
      <NextIntlClientProvider messages={messages}>
        {children}
      </NextIntlClientProvider>
    </body>
  </html>
);
```

### Using Translations in Components

**Client components** — use the `useTranslations` hook:

```typescript
'use client';
import { useTranslations } from 'next-intl';

export default function WalletSection() {
  const t = useTranslations('wallet');
  return <h2>{t('title')}</h2>;
}
```

**Server components** — use the async `getTranslations` function:

```typescript
import { getTranslations } from 'next-intl/server';

export default async function CoursesPage() {
  const t = await getTranslations('courses');
  return <h1>{t('title')}</h1>;
}
```

**Interpolation** — pass variables as the second argument:

```typescript
t('issued', { date: '2024-01-15' })   // "Issued: 2024-01-15"
t('avatarAlt', { name: 'Alice' })     // "Alice's avatar"
```

**Mocking in tests** — Vitest tests mock `next-intl` to return the key directly:

```typescript
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}));
```

---

## 2. Translation File Structure

All message files live in `apps/frontend/messages/` and are named `{locale}.json`.

```
apps/frontend/messages/
├── en.json   ← English (default)
└── es.json   ← Spanish
```

### Namespace Convention

Keys are grouped into namespaces that map to feature areas. Each namespace is a top-level object:

```json
{
  "nav": { ... },
  "home": { ... },
  "courses": { ... },
  "credentials": { ... },
  "profile": { ... },
  "wallet": { ... }
}
```

| Namespace | Used by |
|---|---|
| `nav` | `Navbar`, `Footer` |
| `home` | Home page (`/`) |
| `courses` | Courses listing page |
| `credentials` | Credentials page |
| `profile` | Profile page and `WalletSection` |
| `wallet` | `WalletSection` component |

### Key Naming Rules

- Use `camelCase` for key names: `browseCourses`, not `browse_courses`.
- Use `{variable}` placeholders for dynamic values: `"issued": "Issued: {date}"`.
- Nest only one level deep (namespace → key). Avoid deeply nested objects except for logical groupings like `levels` inside `courses`.
- Keep keys in English even in non-English files — only the values are translated.

### Example

```json
{
  "credentials": {
    "title": "My Credentials",
    "issued": "Issued: {date}",
    "tx": "Tx: {hash}",
    "verify": "Verify on Stellar ↗"
  }
}
```

Every key present in `en.json` **must** have a corresponding key in every other locale file. Missing keys cause a runtime warning and fall back to the key name.

---

## 3. Adding a New Language

Follow these steps to add a new locale (example: French, `fr`).

### Step 1 — Create the message file

Copy `en.json` as a starting point and translate all values:

```bash
cp apps/frontend/messages/en.json apps/frontend/messages/fr.json
```

Translate every value in `fr.json`. Do not change key names. Do not remove keys.

### Step 2 — Register the locale in routing

```typescript
// src/i18n/routing.ts
export const routing = defineRouting({
  locales: ['en', 'es', 'fr'],   // add 'fr'
  defaultLocale: 'en',
});
```

### Step 3 — Update the request config type guard

```typescript
// src/i18n/request.ts
if (!locale || !routing.locales.includes(locale as 'en' | 'es' | 'fr')) {
```

### Step 4 — Update the layout type guard

```typescript
// src/app/[locale]/layout.tsx
if (!routing.locales.includes(locale as 'en' | 'es' | 'fr')) {
  notFound();
}
```

### Step 5 — Verify

```bash
npm run dev:frontend
# Navigate to http://localhost:3001/fr — the app should render in French
```

Run the full test suite to confirm nothing is broken:

```bash
npm run test --workspace=apps/frontend
npm run test:e2e --workspace=apps/frontend
```

### Checklist

- [ ] `messages/fr.json` created with all keys from `en.json` translated
- [ ] `locales` array updated in `routing.ts`
- [ ] Type guards updated in `request.ts` and `layout.tsx`
- [ ] Manual smoke-test at `/fr`
- [ ] Tests pass

---

## 4. RTL Language Support

Brain-Storm now supports RTL (right-to-left) languages, with Arabic (`ar`) currently implemented. This section documents the RTL implementation and how to extend it for additional RTL languages like Hebrew (`he`) or Farsi (`fa`).

### HTML Direction Attribute

The `<html>` element automatically carries the correct `dir` attribute based on the active locale. This is handled in the locale layout:

```typescript
// src/app/[locale]/layout.tsx
import { isRTLLocale } from '@/i18n/routing';

const dir = isRTLLocale(locale) ? 'rtl' : 'ltr';

return (
  <html lang={locale} dir={dir}>
    ...
  </html>
);
```

The `isRTLLocale()` function checks if a locale is in the `RTL_LOCALES` list defined in `src/i18n/routing.ts`.

### RTL Detection in Components

Use the `useIsRTL()` hook in client components to detect RTL mode for conditional styling:

```typescript
'use client';
import { useIsRTL } from '@/hooks/useIsRTL';

export function MyComponent() {
  const isRTL = useIsRTL();
  return <div className={isRTL ? 'rtl-specific-class' : 'ltr-class'}>...</div>;
}
```

### Tailwind CSS Logical Properties

Prefer logical CSS properties over directional ones. This ensures layouts adapt automatically to RTL:

| Avoid (directional) | Prefer (logical) | Notes |
|---|---|---|
| `pl-4` | `ps-4` | padding-inline-start |
| `pr-4` | `pe-4` | padding-inline-end |
| `ml-2` | `ms-2` | margin-inline-start |
| `mr-2` | `me-2` | margin-inline-end |
| `text-left` | `text-start` | text alignment |
| `text-right` | `text-end` | text alignment |
| `float-left` | `float-start` | float direction |
| `float-right` | `float-end` | float direction |
| `left-0` | `inset-s-0` | positioning (if unavoidable) |
| `right-0` | `inset-e-0` | positioning (if unavoidable) |

For existing components with directional classes, use Tailwind's `rtl:` variant to override:

```html
<div class="pl-4 rtl:pl-0 rtl:pr-4">Content</div>
<div class="text-left rtl:text-right">Directional text</div>
```

### Icon and Arrow Mirroring

Icons that imply direction (arrows, chevrons, direction indicators) must be mirrored in RTL. Use the `scale-x-[-1]` transform via the `rtl:` variant or the `useIsRTL()` hook:

**Option 1: CSS-based (simpler)**
```html
<span class="rtl:scale-x-[-1] inline-block">→</span>
```

**Option 2: Component-based (with useIsRTL hook)**
```typescript
'use client';
import { useIsRTL } from '@/hooks/useIsRTL';

export function DirectionalIcon() {
  const isRTL = useIsRTL();
  return <span className={isRTL ? 'scale-x-[-1]' : ''}>→</span>;
}
```

### CSS in globals.css

RTL-specific utilities have been added to `src/app/globals.css`:

- `.skip-link` now uses logical properties (`inset-block-start`, `inset-inline-start`, `border-end-start-radius`)
- Custom RTL utilities like `animate-pulse-rtl-mirror` are available for specialized animations
- All spacing and positioning uses logical CSS properties where possible

### Testing RTL

To test RTL implementation:

1. **Browser testing**: Navigate to `http://localhost:3001/ar` to view the app in Arabic (RTL)
2. **Browser DevTools**: Set `dir="rtl"` on the `<html>` element temporarily to simulate RTL
3. **Check layout**: Verify that:
   - Flex/grid layouts flow correctly (flex-row reverses visually)
   - Padding and margins are reversed
   - Text alignment is correct
   - Icons and directional indicators are mirrored
   - Navigation and menus display correctly

### Adding New RTL Languages

To add a new RTL language (e.g., Hebrew `he`):

1. **Add to RTL_LOCALES** in `src/i18n/routing.ts`:
   ```typescript
   export const RTL_LOCALES = ['ar', 'he', 'fa'] as const;
   ```

2. **Add to routing locales** in the same file:
   ```typescript
   export const routing = defineRouting({
     locales: ['en', 'es', 'fr', 'ar', 'he'],
     defaultLocale: 'en',
   });
   ```

3. **Create message file** `messages/he.json` with Hebrew translations

4. **Update type guards** in `src/i18n/request.ts` and `src/app/[locale]/layout.tsx` to include the new locale

5. **Consider font requirements**: RTL scripts often require specific fonts. Add font loading in the layout if needed:
   ```typescript
   const fontClass = RTL_LOCALES.includes(locale) ? 'font-hebrew' : 'font-sans';
   ```

### RTL Audit Utility

A debug component and console utility are available for auditing RTL implementation:

```typescript
import { RTLAudit, auditRTLImplementation } from '@/components/RTLAudit';

// In browser console:
auditRTLImplementation();
```

This outputs a detailed report of:
- HTML dir/lang attributes
- Hard-coded left/right styles (potential issues)
- Flex/grid layout counts
- Mirrored icon counts
- Text alignment usage

---

## 5. Locale-Specific Formatting

Use the JavaScript `Intl` API (built into all modern browsers and Node.js) for locale-aware formatting. next-intl exposes helpers that wrap `Intl` and respect the active locale automatically.

### Dates

Use `useFormatter` (client) or `getFormatter` (server) from next-intl:

```typescript
// Client component
import { useFormatter } from 'next-intl';

const format = useFormatter();
format.dateTime(new Date('2024-01-15'), { dateStyle: 'medium' });
// en → "Jan 15, 2024"
// es → "15 ene 2024"
```

```typescript
// Server component
import { getFormatter } from 'next-intl/server';

const format = await getFormatter();
format.dateTime(new Date('2024-01-15'), { dateStyle: 'long' });
```

For the `credentials.issued` message, pass a pre-formatted string rather than a raw `Date` object, since message interpolation does not format values:

```typescript
const format = useFormatter();
t('issued', { date: format.dateTime(new Date(issuedAt), { dateStyle: 'medium' }) });
```

### Numbers

```typescript
format.number(1234567.89, { style: 'decimal' });
// en → "1,234,567.89"
// es → "1.234.567,89"

format.number(0.042, { style: 'percent' });
// en → "4%"
// es → "4 %"
```

For BST token balances, format with 7 decimal places:

```typescript
format.number(parseFloat(balance), {
  minimumFractionDigits: 0,
  maximumFractionDigits: 7,
});
```

### Currencies

If prices are ever displayed, use `style: 'currency'`:

```typescript
format.number(29.99, { style: 'currency', currency: 'USD' });
// en → "$29.99"
// es → "29,99 US$"
```

### Relative Time

```typescript
format.relativeTime(-3, 'days');
// en → "3 days ago"
// es → "hace 3 días"
```

### Do Not Hardcode Formatted Strings

Never hardcode locale-specific punctuation or number formats in component code. Always delegate to `Intl` / next-intl formatters so the output adapts automatically when new locales are added.
