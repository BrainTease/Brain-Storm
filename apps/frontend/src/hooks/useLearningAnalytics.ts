'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import type {
  ProgressDataPoint,
  QuizScoreDataPoint,
  StreakData,
} from '@/components/analytics';
import {
  generateMockProgressData,
  generateMockQuizData,
  generateMockStreakData,
} from '@/lib/dashboard';

export interface LearningAnalytics {
  progressOverTime: ProgressDataPoint[];
  streak: StreakData[];
  quizScores: QuizScoreDataPoint[];
  isLoading: boolean;
}

/**
 * Loads the learner's analytics series.
 *
 * The `/users/:id/analytics` endpoint is still being built out, so any series the
 * backend does not return falls back to generated placeholder data.
 */
export function useLearningAnalytics(userId: string | undefined): LearningAnalytics {
  const [analytics, setAnalytics] = useState<Omit<LearningAnalytics, 'isLoading'>>({
    progressOverTime: [],
    streak: [],
    quizScores: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function load() {
      let payload: {
        progressHistory?: ProgressDataPoint[];
        streakHistory?: StreakData[];
        quizScores?: QuizScoreDataPoint[];
      } | null = null;

      try {
        const { data } = await api.get(`/users/${userId}/analytics`);
        payload = data ?? null;
      } catch {
        // Endpoint unavailable — fall through to the generated series.
      }

      if (cancelled) return;

      setAnalytics({
        progressOverTime: payload?.progressHistory ?? generateMockProgressData(),
        streak: payload?.streakHistory ?? generateMockStreakData(),
        quizScores: payload?.quizScores ?? generateMockQuizData(),
      });
      setIsLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { ...analytics, isLoading };
}
