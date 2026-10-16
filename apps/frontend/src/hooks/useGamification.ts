'use client';

import api from '@/lib/api';
import { useApiQuery } from '@/hooks/useApiQuery';
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
  const { data, isLoading, error, refresh } = useApiQuery<GamificationData>(
    userId ? ['gamification', userId] : null,
    () => api.get(`/gamification/${userId}`).then((res) => res.data ?? DEFAULT),
    { errorMessage: 'Failed to load gamification data.' }
  );

  return { data, isLoading, error, refresh };
}
