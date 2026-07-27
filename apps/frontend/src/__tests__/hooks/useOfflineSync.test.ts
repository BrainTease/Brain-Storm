import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useOfflineSync } from '@/hooks/useOfflineSync';

describe('useOfflineSync', () => {
  const listeners: Record<string, EventListener[]> = {};

  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: true, serviceWorker: undefined });
    vi.spyOn(window, 'addEventListener').mockImplementation((type, handler) => {
      listeners[type] = listeners[type] ?? [];
      listeners[type].push(handler as EventListener);
    });
    vi.spyOn(window, 'removeEventListener').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.keys(listeners).forEach(k => delete listeners[k]);
  });

  it('initial state is online when navigator.onLine is true', () => {
    const { result } = renderHook(() => useOfflineSync());
    expect(result.current.syncStatus).toBe('online');
  });

  it('initial state is offline when navigator.onLine is false', () => {
    vi.stubGlobal('navigator', { onLine: false, serviceWorker: undefined });
    const { result } = renderHook(() => useOfflineSync());
    expect(result.current.syncStatus).toBe('offline');
  });

  it('state changes to offline on offline event', () => {
    const { result } = renderHook(() => useOfflineSync());
    act(() => {
      listeners['offline']?.forEach(fn => fn(new Event('offline')));
    });
    expect(result.current.syncStatus).toBe('offline');
  });
});
