# PWA (Progressive Web App) Setup

This document describes the PWA implementation for Brain-Storm, enabling offline access to enrolled course content and installability.

## Implementation Overview

### Files Added

1. **public/manifest.json** - Web app manifest with metadata, icons, and shortcuts
2. **public/sw.js** - Service worker for caching and offline support
3. **src/hooks/usePWA.ts** - React hook for PWA functionality
4. **src/components/PWAInstallPrompt.tsx** - Install prompt UI component
5. **src/components/PWAUpdateToast.tsx** - Update notification UI component
6. **src/components/OfflineIndicator.tsx** - Offline status indicator component

### Configuration Changes

#### next.config.js
- Added `next-pwa` integration with Workbox
- Configured service worker generation
- Added security header for service worker

#### package.json
- Added `next-pwa@^5.6.0`
- Added `workbox-window@^8.0.0`

#### src/app/layout.tsx
- Added PWA meta tags (theme color, mobile app capable)
- Added manifest link
- Integrated PWA components (install prompt, update toast, offline indicator)

### Features

#### 1. Installation
- Users see an install prompt on supported platforms
- Prompt appears after interaction threshold
- Can be dismissed and dismissed state is remembered
- Installable as a standalone app

#### 2. Offline Support
- Service worker caches static assets and API responses
- Enrolled lesson content cached for offline viewing
- Font files cached for better offline UX
- Images cached with cache-first strategy
- Network-first strategy for API calls with fallback to cache

#### 3. Updates
- Service worker checks for updates every 5 minutes or on focus
- Users notified when updates are available
- Can apply updates immediately or defer
- Automatic page reload after update applied

#### 4. Offline Indicator
- Visual indicator when network is offline
- Shows warning banner at top of page
- Automatically disappears when connection restored

## Caching Strategies

### Service Worker Cache Strategy

| Asset Type | Strategy | Cache |
|-----------|----------|-------|
| API calls | Network-first | runtime |
| Fonts | Cache-first | fonts |
| Images | Cache-first | images |
| HTML/JS/CSS | Cache-first | static |
| Lessons | Runtime | runtime |

### Cache Names
- `brain-storm-v1` - Static assets (HTML, JS, CSS)
- `brain-storm-runtime-v1` - API responses and dynamic content
- `brain-storm-fonts-v1` - Font files
- `brain-storm-images-v1` - Image files

## Required Assets

### Icons
Place the following icon files in `public/icons/`:

```
icon-72x72.png
icon-96x96.png
icon-128x128.png
icon-144x144.png
icon-152x152.png
icon-192x192.png
icon-384x384.png
icon-512x512.png
icon-maskable-192x192.png (for adaptive icons)
icon-maskable-512x512.png (for adaptive icons)
```

### Screenshots
Place the following screenshots in `public/screenshots/`:

```
screenshot-540x720.png (mobile view)
screenshot-1280x720.png (desktop view)
```

## Development

### Disable PWA in Development
PWA is disabled in development mode for faster iteration. Enable it by setting:
```bash
NODE_ENV=production npm run build
```

### Service Worker Management

Access service worker in DevTools:
- Chrome: DevTools → Application → Service Workers
- Firefox: about:debugging#/runtime/this-firefox

### Testing PWA

1. **Install Prompt**: Install in standalone mode and check home screen
2. **Offline Support**: Use DevTools Network tab to simulate offline
3. **Updates**: Check service worker update logic in Application tab
4. **Caching**: Verify cache contents in Application → Cache Storage

## Lighthouse PWA Audit

Run Lighthouse audit to verify PWA compliance:

```bash
npm run build
npm run start
# Then use Chrome DevTools → Lighthouse
```

Required checks:
- ✅ Web app manifest is installable
- ✅ Has a service worker that controls page and `start_url`
- ✅ Service worker startup time
- ✅ HTTPS enabled
- ✅ Appropriate viewport meta tag
- ✅ Icons properly formatted and sized

## Security Considerations

1. **Service Worker Scope**: Set to `/` for full app coverage
2. **HTTPS Only**: Service workers only work over HTTPS (development uses localhost)
3. **Cache Headers**: Configured with `updateViaCache: 'none'` for safety
4. **CSP Compatibility**: Maintained existing CSP middleware

## Environment Variables

No additional environment variables required. Uses existing:
- `NODE_ENV` - Controls PWA enable/disable
- `NEXT_PUBLIC_SITE_URL` - Used in manifest

## Offline Lesson Access

### Data Caching
To cache enrolled lessons for offline access:

1. Lessons are cached via runtime cache when fetched
2. Add explicit caching logic in API call layers
3. Consider IndexedDB for larger content (future enhancement)

### Hydration
Service worker serves cached responses when offline, maintaining app functionality.

## Browser Support

- iOS 15+ (via PWA)
- Android 5+ (via Chrome)
- Desktop modern browsers

## Troubleshooting

### Service Worker Not Registering
1. Check browser console for errors
2. Verify HTTPS (or localhost for dev)
3. Check service worker script is accessible at `/sw.js`

### Updates Not Appearing
1. Ensure new build deployed with updated cache version
2. Check service worker update check interval
3. Manually force update in DevTools → Network → Hard Refresh

### Cache Issues
1. Clear site data: DevTools → Application → Clear site data
2. Update cache version strings in `sw.js`
3. Restart browser

## Future Enhancements

1. **Background Sync**: Sync user progress when reconnecting
2. **Push Notifications**: Course update notifications
3. **IndexedDB**: Large content storage for premium courses
4. **Partial Sync**: Selective offline content downloads
5. **Analytics**: Track PWA usage and offline behavior

## References

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [next-pwa Documentation](https://github.com/shadowwalker/next-pwa)
- [Workbox Documentation](https://developers.google.com/web/tools/workbox)
- [Web Manifest Specification](https://www.w3.org/TR/appmanifest/)
