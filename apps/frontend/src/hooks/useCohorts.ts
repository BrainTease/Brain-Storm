'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type CohortRole = 'student' | 'ta' | 'instructor';

export interface CohortMember {
  id: string;
  email: string;
  name: string;
  role: CohortRole;
  joinedAt: string;
}

export interface CohortMessage {
  id: string;
  author: string;
  body: string;
  postedAt: string;
}

export interface AssignedCourse {
  id: string;
  title: string;
  dueAt: string;
}

export interface CohortAnalytics {
  activeMembers: number;
  avgProgress: number;
  completionRate: number;
  totalPoints: number;
}

export interface Cohort {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  capacity: number;
  createdAt: string;
  members: CohortMember[];
  messages: CohortMessage[];
  courses: AssignedCourse[];
  analytics: CohortAnalytics;
}

let id = 0;
const nextId = () => `c${++id}`;

let cohorts: Cohort[] = [
  {
    id: nextId(),
    name: 'Spring 2026 — Stellar Track',
    description: 'Intro to Soroban and on-chain credentials.',
    startDate: '2026-02-01',
    endDate: '2026-05-31',
    capacity: 30,
    createdAt: '2026-01-15T10:00:00Z',
    members: [
      {
        id: 'm1',
        email: 'aria@example.com',
        name: 'Aria Dev',
        role: 'student',
        joinedAt: '2026-02-02T10:00:00Z',
      },
      {
        id: 'm2',
        email: 'noor@example.com',
        name: 'Noor Builds',
        role: 'ta',
        joinedAt: '2026-02-02T10:00:00Z',
      },
    ],
    messages: [
      {
        id: 'msg1',
        author: 'Noor Builds',
        body: 'Welcome everyone! Module 1 is due Friday.',
        postedAt: '2026-02-03T14:00:00Z',
      },
    ],
    courses: [
      { id: 'cr1', title: 'Soroban Fundamentals', dueAt: '2026-03-15' },
      { id: 'cr2', title: 'Stellar Asset Issuance', dueAt: '2026-04-15' },
    ],
    analytics: {
      activeMembers: 24,
      avgProgress: 0.62,
      completionRate: 0.48,
      totalPoints: 18420,
    },
  },
];

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useCohorts() {
  const list = useSyncExternalStore(
    subscribe,
    () => cohorts,
    () => cohorts
  );

  const create = useCallback(
    (
      input: Omit<Cohort, 'id' | 'createdAt' | 'members' | 'messages' | 'courses' | 'analytics'>
    ) => {
      const cohort: Cohort = {
        ...input,
        id: nextId(),
        createdAt: new Date().toISOString(),
        members: [],
        messages: [],
        courses: [],
        analytics: { activeMembers: 0, avgProgress: 0, completionRate: 0, totalPoints: 0 },
      };
      cohorts = [cohort, ...cohorts];
      emit();
      return cohort;
    },
    []
  );

  const addMember = useCallback(
    (cohortId: string, member: Omit<CohortMember, 'id' | 'joinedAt'>) => {
      cohorts = cohorts.map((c) =>
        c.id === cohortId
          ? {
              ...c,
              members: [
                ...c.members,
                { ...member, id: `m${Date.now()}`, joinedAt: new Date().toISOString() },
              ],
            }
          : c
      );
      emit();
    },
    []
  );

  const removeMember = useCallback((cohortId: string, memberId: string) => {
    cohorts = cohorts.map((c) =>
      c.id === cohortId ? { ...c, members: c.members.filter((m) => m.id !== memberId) } : c
    );
    emit();
  }, []);

  const postMessage = useCallback((cohortId: string, author: string, body: string) => {
    cohorts = cohorts.map((c) =>
      c.id === cohortId
        ? {
            ...c,
            messages: [
              ...c.messages,
              { id: `msg${Date.now()}`, author, body, postedAt: new Date().toISOString() },
            ],
          }
        : c
    );
    emit();
  }, []);

  const assignCourse = useCallback((cohortId: string, course: Omit<AssignedCourse, 'id'>) => {
    cohorts = cohorts.map((c) =>
      c.id === cohortId
        ? { ...c, courses: [...c.courses, { ...course, id: `cr${Date.now()}` }] }
        : c
    );
    emit();
  }, []);

  return { cohorts: list, create, addMember, removeMember, postMessage, assignCourse };
}

export function useCohort(cohortId: string): Cohort | undefined {
  const { cohorts: list } = useCohorts();
  return list.find((c) => c.id === cohortId);
}
