'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import type { Badge } from '@/components/gamification/BadgeGrid';

export interface GamificationData {
  xp: number;
  level: number;
  xpForNextLevel: number;
  streak: number;
  longestStreak: number;
  badges: Badge[];
}

interface UseGamificationResult {
  data: GamificationData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

const DEFAULT: GamificationData = {
  xp: 0,
  level: 1,
  xpForNextLevel: 100,
  streak: 0,
  longestStreak: 0,
  badges: [],
};

export function useGamification(userId?: string): UseGamificationResult {
  const [data, setData] = useState<GamificationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    api
      .get(`/gamification/${userId}`)
      .then((res) => {
        if (!cancelled) setData(res.data ?? DEFAULT);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load gamification data.');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => { cancelled = true; };
  }, [userId, tick]);

  return {
    data,
    isLoading,
    error,
    refresh: () => setTick((t) => t + 1),
  };
}
