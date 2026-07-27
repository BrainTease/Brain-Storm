/**
 * Biometric Authentication Service
 * Handles Face ID / Touch ID / Fingerprint authentication
 */

import * as LocalAuthentication from 'expo-local-authentication';
import { setSecureItem, getSecureItem, KEYS } from './secureStorage';

export interface BiometricResult {
  success: boolean;
  error?: string;
}

export interface BiometricAvailability {
  available: boolean;
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedTypes: LocalAuthentication.AuthenticationType[];
}

/**
 * Check if biometric authentication is available on the device
 */
export async function checkBiometricAvailability(): Promise<BiometricAvailability> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  const types = await LocalAuthentication.supportedAuthenticationTypesAsync();

  return {
    available: compatible && enrolled,
    hasHardware: compatible,
    isEnrolled: enrolled,
    supportedTypes: types,
  };
}

/**
 * Authenticate using biometrics
 */
export async function authenticateWithBiometrics(
  promptMessage: string = 'Authenticate to access Brain-Storm'
): Promise<BiometricResult> {
  try {
    const { available, hasHardware, isEnrolled } = await checkBiometricAvailability();

    if (!available) {
      return {
        success: false,
        error: hasHardware 
          ? 'No biometrics enrolled. Please set up Face ID or Touch ID in device settings.'
          : 'Biometric authentication not available on this device.',
      };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      fallbackLabel: 'Use Passcode',
    });

    if (result.success) {
      return { success: true };
    }

    return {
      success: false,
      error: result.error || 'Authentication failed',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Enable biometric authentication for the app
 */
export async function enableBiometricAuth(): Promise<boolean> {
  try {
    const { available } = await checkBiometricAvailability();
    if (!available) {
      return false;
    }
    
    // Verify user can authenticate before enabling
    const result = await authenticateWithBiometrics('Set up biometric authentication');
    if (!result.success) {
      return false;
    }

    await setSecureItem(KEYS.BIOMETRIC_ENABLED, 'true');
    return true;
  } catch (error) {
    console.error('Failed to enable biometric auth:', error);
    return false;
  }
}

/**
 * Disable biometric authentication
 */
export async function disableBiometricAuth(): Promise<void> {
  await setSecureItem(KEYS.BIOMETRIC_ENABLED, 'false');
}

/**
 * Check if biometric auth is enabled
 */
export async function isBiometricEnabled(): Promise<boolean> {
  const value = await getSecureItem(KEYS.BIOMETRIC_ENABLED);
  return value === 'true';
}

/**
 * Lock session (require re-authentication)
 */
export async function lockSession(): Promise<void> {
  await setSecureItem(KEYS.SESSION_LOCKED, 'true');
}

/**
 * Unlock session after successful authentication
 */
export async function unlockSession(): Promise<void> {
  await setSecureItem(KEYS.SESSION_LOCKED, 'false');
}

/**
 * Check if session is locked
 */
export async function isSessionLocked(): Promise<boolean> {
  const value = await getSecureItem(KEYS.SESSION_LOCKED);
  return value === 'true';
}

/**
 * Unlock session with biometrics
 */
export async function unlockWithBiometrics(): Promise<BiometricResult> {
  const isLocked = await isSessionLocked();
  if (!isLocked) {
    return { success: true };
  }

  const enabled = await isBiometricEnabled();
  if (!enabled) {
    return { success: false, error: 'Biometric auth not enabled' };
  }

  const result = await authenticateWithBiometrics('Unlock Brain-Storm');
  if (result.success) {
    await unlockSession();
  }
  return result;
}