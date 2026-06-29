/**
 * Session Manager
 * Handles session lifecycle, timeout, and lock functionality
 */

import { storeTokens, clearTokens, getTokens, hasValidTokens } from './secureStorage';
import { 
  authenticateWithBiometrics, 
  checkBiometricAvailability,
  isBiometricEnabled,
  enableBiometricAuth,
  disableBiometricAuth,
  lockSession,
  unlockSession,
  isSessionLocked,
  unlockWithBiometrics,
} from './biometricAuth';

const DEFAULT_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export interface SessionConfig {
  timeoutMs?: number;
  requireBiometricOnUnlock?: boolean;
}

let sessionTimeout: ReturnType<typeof setTimeout> | null = null;
let config: SessionConfig = {};

/**
 * Initialize session manager
 */
export function initSessionManager(sessionConfig: SessionConfig = {}): void {
  config = {
    timeoutMs: DEFAULT_SESSION_TIMEOUT,
    requireBiometricOnUnlock: true,
    ...sessionConfig,
  };
}

/**
 * Start a new session with tokens
 */
export async function startSession(
  accessToken: string, 
  refreshToken: string, 
  userId: string
): Promise<void> {
  await storeTokens(accessToken, refreshToken);
  await setUserId(userId);
  resetSessionTimer();
}

/**
 * End the current session
 */
export async function endSession(): Promise<void> {
  clearSessionTimer();
  await clearTokens();
  await unlockSession();
}

/**
 * Get stored tokens
 */
export async function getSessionTokens() {
  return getTokens();
}

/**
 * Check if there's an active session
 */
export async function hasActiveSession(): Promise<boolean> {
  const tokens = await hasValidTokens();
  if (!tokens) return false;
  
  // Check if session is locked
  const locked = await isSessionLocked();
  if (locked) {
    return false;
  }
  
  return true;
}

/**
 * Request session unlock (may prompt for biometrics)
 */
export async function requestSessionUnlock(): Promise<boolean> {
  const locked = await isSessionLocked();
  if (!locked) return true;

  const biometricEnabled = await isBiometricEnabled();
  if (biometricEnabled) {
    const result = await unlockWithBiometrics();
    return result.success;
  }

  return false;
}

/**
 * Lock the session (require re-authentication)
 */
export async function lockCurrentSession(): Promise<void> {
  await lockSession();
  clearSessionTimer();
}

/**
 * Reset the session activity timer
 */
export function resetSessionTimer(): void {
  clearSessionTimer();
  
  if (config.timeoutMs && config.timeoutMs > 0) {
    sessionTimeout = setTimeout(async () => {
      await lockCurrentSession();
    }, config.timeoutMs);
  }
}

/**
 * Clear session timer
 */
function clearSessionTimer(): void {
  if (sessionTimeout) {
    clearTimeout(sessionTimeout);
    sessionTimeout = null;
  }
}

/**
 * Set user ID in storage
 */
async function setUserId(userId: string): Promise<void> {
  const { setSecureItem, KEYS } = await import('./secureStorage');
  await setSecureItem(KEYS.USER_ID, userId);
}

// Re-export utilities
export {
  checkBiometricAvailability,
  isBiometricEnabled,
  enableBiometricAuth,
  disableBiometricAuth,
  authenticateWithBiometrics,
};