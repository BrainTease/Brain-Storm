/**
 * Offline Cache Service
 * Local cache for data with stale-while-revalidate support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'offline_cache_';
const QUEUE_PREFIX = 'offline_queue_';

export interface CachedItem<T> {
  data: T;
  timestamp: number;
  stale: boolean;
}

export interface QueuedAction {
  id: string;
  type: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  payload: unknown;
  timestamp: number;
  retries: number;
}

/**
 * Store data in local cache
 */
export async function setCache<T>(key: string, data: T, maxAgeMs: number = 5 * 60 * 1000): Promise<void> {
  const item: CachedItem<T> = {
    data,
    timestamp: Date.now(),
    stale: false,
  };
  await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(item));
}

/**
 * Get data from local cache
 */
export async function getCache<T>(key: string): Promise<CachedItem<T> | null> {
  const json = await AsyncStorage.getItem(CACHE_PREFIX + key);
  if (!json) return null;
  
  try {
    const item = JSON.parse(json) as CachedItem<T>;
    return item;
  } catch {
    return null;
  }
}

/**
 * Check if cache is stale
 */
export async function isCacheStale(key: string, maxAgeMs: number = 5 * 60 * 1000): Promise<boolean> {
  const item = await getCache(key);
  if (!item) return true;
  
  return Date.now() - item.timestamp > maxAgeMs;
}

/**
 * Get cached data if fresh, otherwise return null
 */
export async function getCacheIfFresh<T>(key: string, maxAgeMs: number = 5 * 60 * 1000): Promise<T | null> {
  const item = await getCache<T>(key);
  if (!item) return null;
  
  const age = Date.now() - item.timestamp;
  if (age > maxAgeMs) return null;
  
  return item.data;
}

/**
 * Fetch with stale-while-revalidate strategy
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  maxAgeMs: number = 5 * 60 * 1000
): Promise<{ data: T; isStale: boolean }> {
  const cached = await getCache<T>(key);
  const age = cached ? Date.now() - cached.timestamp : Infinity;
  const isStale = age > maxAgeMs;

  // Return cached data immediately if available
  if (cached && !isStale) {
    // Refresh in background
    fetcher()
      .then(fresh => setCache(key, fresh, maxAgeMs))
      .catch(console.error);
    
    return { data: cached.data, isStale: false };
  }

  // Fetch fresh data
  try {
    const fresh = await fetcher();
    await setCache(key, fresh, maxAgeMs);
    return { data: fresh, isStale: false };
  } catch (error) {
    // If fetch fails and we have stale cache, return it
    if (cached) {
      return { data: cached.data, isStale: true };
    }
    throw error;
  }
}

/**
 * Clear cache for a key
 */
export async function clearCache(key: string): Promise<void> {
  await AsyncStorage.removeItem(CACHE_PREFIX + key);
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
  await AsyncStorage.multiRemove(cacheKeys);
}