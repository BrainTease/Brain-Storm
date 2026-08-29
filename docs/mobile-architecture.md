# Mobile Architecture

## Overview

Brain-Storm mobile app is built with React Native using Expo. It provides access to courses, wallet integration for Stellar blockchain, and push notifications.

## Project Structure

```
packages/
├── mobile/                    # Shared mobile utilities
│   └── src/
│       ├── auth/             # Authentication & secure storage
│       ├── cache/            # Offline cache & network status
│       ├── wallet/           # Stellar wallet integration
│       └── notifications/    # Push notifications
└── mobile-app/               # Main Expo app
    └── src/
        ├── api/              # API client
        ├── screens/          # App screens
        ├── navigation/       # Navigation stack
        └── theme/            # Design tokens
```

## Key Features

### 1. API Integration

- Axios-based client with auth token management
- Base URL configuration via Expo Constants
- Automatic retry and error handling

### 2. Navigation

- React Navigation with native stack
- Bottom tabs for main sections (Discovery, Profile)
- Deep linking support for notifications

### 3. Stellar Wallet Integration

- Deep link-based wallet connection
- Transaction signing via external wallet apps
- Support for tips and escrow on testnet
- Secure storage of connection state

### 4. Push Notifications

- FCM (Android) and APNs (iOS) via Expo
- Device token registration with backend
- Foreground and background notification handling
- Deep link navigation from notifications
- User notification preferences

### 5. Design System

- Shared design tokens (colors, typography, spacing)
- Consistent styling across components
- Reusable theme from `@brain-storm/types`

## Authentication Flow

```
1. User logs in via API
2. JWT stored in secure storage
3. API client automatically includes token
4. Token refreshed on expiry
```

## Wallet Flow

```
1. User taps "Connect Wallet"
2. App opens stellar:// deep link
3. External wallet (Freighter Mobile) prompts user
4. Wallet returns publicKey via callback URL
5. Connection state stored securely

Sign Transaction:
1. App creates transaction XDR
2. Opens stellar://sign deep link with XDR
3. Wallet prompts user to review & sign
4. Signed XDR returned via callback
5. App submits to Horizon
```

## Push Notification Flow

```
Registration:
1. App requests notification permissions
2. Obtains Expo Push Token
3. Sends token to backend /notifications/register-device

Receiving:
1. Backend sends push via Expo Push API
2. App receives notification
3. User taps notification
4. Deep link handler navigates to screen

Preferences:
- Stored locally and synced with backend
- Course updates, progress reminders, new content, messages
```

## Environment Configuration

Create `packages/mobile-app/.env`:

```bash
API_URL=https://api.brainstorm.app
EAS_PROJECT_ID=your-eas-project-id
```

## Building

```bash
# Development build
cd packages/mobile-app
npm run start

# iOS
npm run ios

# Android
npm run android

# Production build
eas build --platform ios
eas build --platform android
```

## Testing on Testnet

The app connects to Stellar testnet by default. Test transactions:

1. Connect test wallet with testnet XLM
2. Navigate to course
3. Trigger tip or escrow transaction
4. Sign in wallet
5. Verify on Stellar Expert

## Deep Links

Supported schemes:

- `brainstorm://courses/:id` - Open course detail
- `brainstorm://profile` - Open profile
- `stellar://connect` - Wallet connection
- `stellar://sign` - Transaction signing

## Offline Support

The app includes offline capabilities:

- Cached course data via `@brain-storm/mobile/cache`
- Network status detection
- Queued actions when offline
- Auto-sync when connection restored

## Security

- Secure storage for JWT and wallet keys
- Biometric authentication support
- No sensitive data in AsyncStorage
- HTTPS for all API calls
- Certificate pinning (production)

## Future Enhancements

- WalletConnect v2 integration
- In-app browser for courses
- Video playback
- Progress sync
- Offline video download
