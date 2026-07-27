'use client';

import { useMemo } from 'react';

export type LeaderboardPeriod = 'week' | 'month' | 'all';

export interface LeaderboardEntry {
  userId: string;
  username: string;
  avatarUrl?: string;
  points: number;
  coursesCompleted: number;
  badges: string[];
}

export interface LeaderboardPage {
  entries: LeaderboardEntry[];
  total: number;
  page: number;
  pageSize: number;
  updatedAt: string;
}

const MOCK_USERS: Omit<LeaderboardEntry, 'points' | 'coursesCompleted' | 'badges'>[] = [
  { userId: 'u1', username: 'aria.dev' },
  { userId: 'u2', username: 'noor.builds' },
  { userId: 'u3', username: 'sofia.codes' },
  { userId: 'u4', username: 'kenji.io' },
  { userId: 'u5', username: 'lina.web' },
  { userId: 'u6', username: 'jamal.eth' },
  { userId: 'u7', username: 'emma.dev' },
  { userId: 'u8', username: 'amir.ai' },
  { userId: 'u9', username: 'priya.k' },
  { userId: 'u10', username: 'theo.dev' },
  { userId: 'u11', username: 'maya.codes' },
  { userId: 'u12', username: 'omar.dev' },
  { userId: 'u13', username: 'sara.tech' },
  { userId: 'u14', username: 'lucas.dev' },
  { userId: 'u15', username: 'zoe.builds' },
  { userId: 'u16', username: 'rafa.codes' },
  { userId: 'u17', username: 'kara.dev' },
  { userId: 'u18', username: 'ivan.eth' },
  { userId: 'u19', username: 'mei.tech' },
  { userId: 'u20', username: 'leo.dev' },
  { userId: 'u21', username: 'eva.codes' },
  { userId: 'u22', username: 'sam.web' },
  { userId: 'u23', username: 'nia.dev' },
  { userId: 'u24', username: 'kai.io' },
  { userId: 'u25', username: 'tara.dev' },
];

const BADGES = ['first-cert', 'streak-7', 'streak-30', 'top-10', 'mentor', 'early-bird'];

const PERIOD_SCALE: Record<LeaderboardPeriod, number> = {
  week: 0.15,
  month: 0.45,
  all: 1,
};

function deterministicRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function buildEntries(period: LeaderboardPeriod): LeaderboardEntry[] {
  const scale = PERIOD_SCALE[period];
  return MOCK_USERS.map((u, i) => {
    const base = 4200 - i * 110;
    const jitter = Math.floor(deterministicRandom(i + 1) * 200);
    const points = Math.max(0, Math.round((base + jitter) * scale));
    const coursesCompleted = Math.max(0, Math.round((18 - i * 0.6) * scale));
    const badgeCount = Math.max(0, Math.min(BADGES.length, Math.round(5 - i * 0.2)));
    return {
      ...u,
      points,
      coursesCompleted,
      badges: BADGES.slice(0, badgeCount),
    };
  }).sort((a, b) => b.points - a.points);
}

export interface UseLeaderboardOptions {
  period: LeaderboardPeriod;
  page: number;
  pageSize?: number;
}

export function useLeaderboard({
  period,
  page,
  pageSize = 10,
}: UseLeaderboardOptions): LeaderboardPage {
  return useMemo(() => {
    const all = buildEntries(period);
    const start = (page - 1) * pageSize;
    return {
      entries: all.slice(start, start + pageSize),
      total: all.length,
      page,
      pageSize,
      updatedAt: '2026-05-26T12:00:00Z',
    };
  }, [period, page, pageSize]);
}
