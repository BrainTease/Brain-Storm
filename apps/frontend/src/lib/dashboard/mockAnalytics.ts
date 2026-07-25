import type { ProgressDataPoint, QuizScoreDataPoint, StreakData } from '@/components/analytics';

/**
 * Placeholder analytics series used until the `/users/:id/analytics` endpoint
 * ships. Pure generators — they return data rather than calling setters, so the
 * hook that owns the state decides what to do with them.
 */

const PROGRESS_DAYS = 30;
const STREAK_DAYS = 84;
const QUIZ_NAMES = [
  'Module 1 Quiz',
  'Module 2 Quiz',
  'Module 3 Quiz',
  'Module 4 Quiz',
  'Module 5 Quiz',
];

function shortDate(daysAgo: number, from: Date): string {
  const date = new Date(from);
  date.setDate(date.getDate() - daysAgo);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function generateMockProgressData(from = new Date()): ProgressDataPoint[] {
  const data: ProgressDataPoint[] = [];
  for (let i = PROGRESS_DAYS - 1; i >= 0; i--) {
    data.push({
      date: shortDate(i, from),
      progress: Math.max(0, Math.min(100, 30 + i * 2.5 + Math.random() * 10)),
      courseName: 'Overall Progress',
    });
  }
  return data;
}

export function generateMockStreakData(from = new Date()): StreakData[] {
  const data: StreakData[] = [];
  for (let i = 0; i < STREAK_DAYS; i++) {
    data.push({
      date: shortDate(i, from),
      count: Math.random() > 0.4 ? Math.floor(Math.random() * 5) + 1 : 0,
      weekNumber: Math.floor(i / 7),
      dayOfWeek: 6 - (i % 7),
    });
  }
  return data.reverse();
}

export function generateMockQuizData(from = new Date()): QuizScoreDataPoint[] {
  const data: QuizScoreDataPoint[] = QUIZ_NAMES.map((quizName, i) => ({
    date: shortDate(i * 5, from),
    score: Math.floor(60 + Math.random() * 40),
    maxScore: 100,
    quizName,
    attempts: Math.floor(Math.random() * 3) + 1,
  }));
  return data.reverse();
}
