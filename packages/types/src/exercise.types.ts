export type ExerciseLanguage = 'javascript' | 'python' | 'solidity' | 'rust';

export interface ExerciseTestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  weight?: number;
}

export interface ExerciseStarter {
  language: ExerciseLanguage;
  code: string;
}

export interface Exercise {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  instruction: string;
  starter: ExerciseStarter;
  testCases: ExerciseTestCase[];
  timeLimitSeconds?: number;
  xpReward: number;
}

export interface ExerciseAttempt {
  id?: string;
  exerciseId: string;
  userId: string;
  code: string;
  passed: boolean;
  score: number;
  testResults: TestResult[];
  submittedAt: string;
}

export interface TestResult {
  testCaseId: string;
  name: string;
  passed: boolean;
  actualOutput: string;
  expectedOutput: string;
  error?: string;
}

export interface ExerciseResult {
  exerciseId: string;
  passed: boolean;
  score: number;
  testResults: TestResult[];
  xpAwarded: number;
}
