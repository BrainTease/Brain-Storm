/**
 * Secure Storage Service
 * Stores tokens and sensitive data in platform secure storage (Keychain/Keystore)
 */

import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_ID: 'user_id',
  BIOMETRIC_ENABLED: 'biometric_enabled',
  SESSION_LOCKED: 'session_locked',
} as const;

export type SecureKey = typeof KEYS[keyof typeof KEYS];

/**
 * Store a value in secure storage
 */
export async function setSecureItem(key: SecureKey, value: string): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value, {
      keychainService: 'brain-storm',
    });
  } catch (error) {
    console.error('Failed to store secure item:', error);
    throw error;
  }
}

/**
 * Get a value from secure storage
 */
export async function getSecureItem(key: SecureKey): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(key, {
      keychainService: 'brain-storm',
    });
  } catch (error) {
    console.error('Failed to get secure item:', error);
    return null;
  }
}

/**
 * Delete a value from secure storage
 */
export async function deleteSecureItem(key: SecureKey): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key, {
      keychainService: 'brain-storm',
    });
  } catch (error) {
    console.error('Failed to delete secure item:', error);
  }
}

/**
 * Store authentication tokens
 */
export async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  await Promise.all([
    setSecureItem(KEYS.ACCESS_TOKEN, accessToken),
    setSecureItem(KEYS.REFRESH_TOKEN, refreshToken),
  ]);
}

/**
 * Get stored authentication tokens
 */
export async function getTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const [accessToken, refreshToken] = await Promise.all([
    getSecureItem(KEYS.ACCESS_TOKEN),
    getSecureItem(KEYS.REFRESH_TOKEN),
  ]);
  return { accessToken, refreshToken };
}

/**
 * Clear all stored tokens
 */
export async function clearTokens(): Promise<void> {
  await Promise.all([
    deleteSecureItem(KEYS.ACCESS_TOKEN),
    deleteSecureItem(KEYS.REFRESH_TOKEN),
    deleteSecureItem(KEYS.USER_ID),
    deleteSecureItem(KEYS.SESSION_LOCKED),
  ]);
}

/**
 * Check if user has valid tokens
 */
export async function hasValidTokens(): Promise<boolean> {
  const { accessToken } = await getTokens();
  return !!accessToken;
}