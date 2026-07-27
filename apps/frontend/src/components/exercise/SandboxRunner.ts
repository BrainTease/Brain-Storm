'use client';

import type { TestResult, ExerciseTestCase } from '@brain-storm/types';

function createSandboxIframe(): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
  iframe.srcdoc = '<!DOCTYPE html><html><body><script>window.__results__ = [];</script></body></html>';
  document.body.appendChild(iframe);
  return iframe;
}

function runInSandbox(code: string): unknown {
  const iframe = createSandboxIframe();
  try {
    const win = iframe.contentWindow;
    if (!win) throw new Error('Sandbox failed to initialize');

    const fn = new win.Function('console', code);
    const logs: unknown[] = [];
    const mockConsole = {
      log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
      error: (...args: unknown[]) => logs.push('[ERROR] ' + args.map(String).join(' ')),
    };
    const result = fn(mockConsole);
    document.body.removeChild(iframe);
    return { result, logs };
  } catch (err) {
    document.body.removeChild(iframe);
    throw err;
  }
}

function wrapCodeWithTest(code: string, testCase: ExerciseTestCase): string {
  return `
${code}

// Test runner
(function() {
  const input = ${JSON.stringify(testCase.input)};
  const expected = ${JSON.stringify(testCase.expectedOutput)};
  const result = run(input);
  const resultStr = typeof result === 'object' ? JSON.stringify(result) : String(result);
  return JSON.stringify({ actual: resultStr, expected: expected, passed: resultStr === expected });
})()
`;
}

function runFallback(code: string): { result: unknown; logs: string[] } {
  const logs: string[] = [];
  const mockConsole = {
    log: (...args: unknown[]) => logs.push(args.map(String).join(' ')),
    error: (...args: unknown[]) => logs.push('[ERROR] ' + args.map(String).join(' ')),
  };
  const fn = new Function('console', code);
  const result = fn(mockConsole);
  return { result, logs };
}

export interface SandboxResult {
  testResults: TestResult[];
  xpEarned: number;
}

export function runExercise(
  code: string,
  testCases: ExerciseTestCase[],
  xpReward: number,
): SandboxResult {
  const testResults: TestResult[] = [];

  for (const tc of testCases) {
    try {
      const wrapped = wrapCodeWithTest(code, tc);

      let output: string;
      let passed = false;
      let error: string | undefined;

      try {
        const result = runFallback(wrapped);
        const parsed = JSON.parse(result.result as string);
        passed = parsed.passed;
        output = parsed.actual;
      } catch {
        output = 'Error executing test';
        error = 'Test execution failed';
        passed = false;
      }

      testResults.push({
        testCaseId: tc.id,
        name: tc.name,
        passed,
        actualOutput: output,
        expectedOutput: tc.expectedOutput,
        error,
      });
    } catch (err) {
      testResults.push({
        testCaseId: tc.id,
        name: tc.name,
        passed: false,
        actualOutput: '',
        expectedOutput: tc.expectedOutput,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  const allPassed = testResults.every((t) => t.passed);
  const passedCount = testResults.filter((t) => t.passed).length;
  const totalWeight = testCases.reduce((s, tc) => s + (tc.weight ?? 1), 0);
  const earnedWeight = testResults.reduce(
    (s, tr, i) => s + (tr.passed ? (testCases[i].weight ?? 1) : 0),
    0,
  );
  const score = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  return {
    testResults,
    xpEarned: allPassed ? xpReward : Math.round(xpReward * (score / 100)),
  };
}

export function supportsSandbox(): boolean {
  try {
    new Function('');
    return true;
  } catch {
    return false;
  }
}
