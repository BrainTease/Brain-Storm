/**
 * Offline Action Queue
 * Queues actions taken offline for later sync
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';

const QUEUE_KEY = 'offline_action_queue';

export interface QueuedAction {
  id: string;
  type: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint: string;
  payload: unknown;
  timestamp: number;
  retries: number;
}

/**
 * Add an action to the queue
 */
export async function queueAction(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>): Promise<void> {
  const queue = await getActionQueue();
  
  const newAction: QueuedAction = {
    ...action,
    id: generateId(),
    timestamp: Date.now(),
    retries: 0,
  };
  
  queue.push(newAction);
  await saveActionQueue(queue);
}

/**
 * Get all queued actions
 */
export async function getActionQueue(): Promise<QueuedAction[]> {
  const json = await AsyncStorage.getItem(QUEUE_KEY);
  if (!json) return [];
  
  try {
    return JSON.parse(json) as QueuedAction[];
  } catch {
    return [];
  }
}

/**
 * Save the action queue
 */
async function saveActionQueue(queue: QueuedAction[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Remove an action from the queue
 */
export async function removeAction(id: string): Promise<void> {
  const queue = await getActionQueue();
  const filtered = queue.filter(a => a.id !== id);
  await saveActionQueue(filtered);
}

/**
 * Clear the entire queue
 */
export async function clearActionQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  const state = await Network.getNetworkStateAsync();
  return state.isConnected ?? false;
}

/**
 * Process the action queue (sync pending actions)
 */
export async function processQueue(
  apiClient: {
    post: (url: string, data?: unknown) => Promise<unknown>;
    put: (url: string, data?: unknown) => Promise<unknown>;
    patch: (url: string, data?: unknown) => Promise<unknown>;
    delete: (url: string) => Promise<unknown>;
  },
  options: { maxRetries?: number; onProgress?: (completed: number, total: number) => void } = {}
): Promise<{ success: number; failed: number }> {
  const { maxRetries = 3, onProgress } = options;
  
  if (!(await isOnline())) {
    return { success: 0, failed: 0 };
  }
  
  const queue = await getActionQueue();
  let success = 0;
  let failed = 0;
  
  for (let i = 0; i < queue.length; i++) {
    const action = queue[i];
    onProgress?.(i, queue.length);
    
    try {
      switch (action.type) {
        case 'POST':
          await apiClient.post(action.endpoint, action.payload);
          break;
        case 'PUT':
          await apiClient.put(action.endpoint, action.payload);
          break;
        case 'PATCH':
          await apiClient.patch(action.endpoint, action.payload);
          break;
        case 'DELETE':
          await apiClient.delete(action.endpoint);
          break;
      }
      
      await removeAction(action.id);
      success++;
    } catch (error) {
      // Increment retry count
      action.retries++;
      
      if (action.retries >= maxRetries) {
        // Remove after max retries
        await removeAction(action.id);
        failed++;
      } else {
        // Update retry count
        queue[i] = action;
      }
    }
  }
  
  // Save updated queue
  await saveActionQueue(queue);
  
  return { success, failed };
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}';
}