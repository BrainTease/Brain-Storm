# @brain-storm/mobile

**Shared mobile library** consumed by the Expo app in `packages/mobile-app`.

## Responsibility
- Expo module wrappers (secure-store, auth, notifications, network, device, linking)
- React Native async storage helpers
- Push notification and device fingerprinting utilities

## Not the app
This is **not** the Expo application. The app lives in
[`packages/mobile-app`](../mobile-app/README.md) and depends on this package.

## Tests
```bash
npm test --workspace=@brain-storm/mobile
