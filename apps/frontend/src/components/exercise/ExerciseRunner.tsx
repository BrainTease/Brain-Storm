'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CodeEditor } from './CodeEditor';
import { runExercise, supportsSandbox } from './SandboxRunner';
import type {
  Exercise,
  TestResult,
  ExerciseResult,
} from '@brain-storm/types';

interface ExerciseRunnerProps {
  exercise: Exercise;
  onComplete?: (result: ExerciseResult) => void;
}

type Phase = 'editor' | 'running' | 'results';

export function ExerciseRunner({ exercise, onComplete }: ExerciseRunnerProps) {
  const [code, setCode] = useState(exercise.starter.code);
  const [phase, setPhase] = useState<Phase>('editor');
  const [results, setResults] = useState<TestResult[]>([]);
  const [xpEarned, setXpEarned] = useState(0);
  const [passed, setPassed] = useState(false);
  const [score, setScore] = useState(0);
  const browserSupported = supportsSandbox();
  const [showFallback, setShowFallback] = useState(false);

  const handleRun = useCallback(async () => {
    setPhase('running');

    // Small delay for UX
    await new Promise((r) => setTimeout(r, 300));

    try {
      const { testResults, xpEarned: xp } = runExercise(code, exercise.testCases, exercise.xpReward);
      const allPassed = testResults.every((t) => t.passed);
      const passedCount = testResults.filter((t) => t.passed).length;
      const s = testResults.length > 0 ? Math.round((passedCount / testResults.length) * 100) : 0;

      setResults(testResults);
      setXpEarned(xp);
      setPassed(allPassed);
      setScore(s);
      setPhase('results');

      if (allPassed) {
        onComplete?.({
          exerciseId: exercise.id,
          passed: true,
          score: 100,
          testResults,
          xpAwarded: xp,
        });
      }
    } catch (err) {
      setResults([
        {
          testCaseId: 'error',
          name: 'Execution Error',
          passed: false,
          actualOutput: '',
          expectedOutput: '',
          error: err instanceof Error ? err.message : 'Unknown error',
        },
      ]);
      setPassed(false);
      setScore(0);
      setXpEarned(0);
      setPhase('results');
    }
  }, [code, exercise, onComplete]);

  const handleReset = useCallback(() => {
    setCode(exercise.starter.code);
    setPhase('editor');
    setResults([]);
    setXpEarned(0);
    setPassed(false);
    setScore(0);
  }, [exercise.starter.code]);

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            {exercise.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {exercise.description}
          </p>
        </div>
        <Badge variant={exercise.xpReward > 0 ? 'success' : 'default'}>
          {exercise.xpReward} XP
        </Badge>
      </div>

      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        {exercise.instruction}
      </div>

      {!browserSupported && (
        <div
          role="alert"
          className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-200"
        >
          Your browser has limited support for running code. Results may be restricted.
          <button
            onClick={() => setShowFallback(true)}
            className="ml-2 underline hover:no-underline"
          >
            Continue anyway
          </button>
        </div>
      )}

      {(!browserSupported && !showFallback) ? null : (
        <>
          <CodeEditor value={code} onChange={setCode} language={exercise.starter.language} />

          <div className="flex gap-3">
            <Button onClick={handleRun} disabled={phase === 'running'}>
              {phase === 'running' ? 'Running…' : 'Run Code'}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
          </div>
        </>
      )}

      {phase === 'running' && (
        <div className="text-center py-8" role="status" aria-label="Running tests">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm text-gray-500">Running tests…</p>
        </div>
      )}

      {phase === 'results' && (
        <div className="space-y-4" role="region" aria-label="Test results">
          <div className="flex items-center gap-3">
            <div className={`text-2xl ${passed ? 'text-green-500' : 'text-red-500'}`}>
              {passed ? 'Passed' : 'Failed'}
            </div>
            <Badge variant={passed ? 'success' : 'error'}>
              {score}% ({results.filter((r) => r.passed).length}/{results.length})
            </Badge>
            {passed && xpEarned > 0 && (
              <Badge variant="success">+{xpEarned} XP</Badge>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Test Cases
            </h4>
            {results.map((tr, i) => (
              <div
                key={i}
                className={`rounded-lg px-3 py-2 text-sm ${
                  tr.passed
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <span>{tr.passed ? '✓' : '✗'}</span>
                  <span>{tr.name}</span>
                </div>
                {!tr.passed && (
                  <div className="mt-1 text-xs space-y-1 font-mono">
                    <p>Expected: {tr.expectedOutput}</p>
                    <p>Got: {tr.actualOutput || '(empty)'}</p>
                    {tr.error && <p className="text-red-500">Error: {tr.error}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>

          {passed && (
            <div
              role="status"
              className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center"
            >
              <p className="text-green-800 dark:text-green-200 font-semibold">
                All tests passed! You earned {xpEarned} XP.
              </p>
            </div>
          )}

          {!passed && (
            <div className="flex gap-3">
              <Button onClick={handleRun}>Try Again</Button>
              <Button variant="outline" onClick={handleReset}>
                Reset Code
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
