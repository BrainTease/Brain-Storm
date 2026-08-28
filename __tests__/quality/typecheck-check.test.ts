/**
 * #1034 — Quality Gate: TypeScript type-check
 *
 * Executes tsc --noEmit for backend and frontend, asserting no type errors.
 * Provides actionable diagnostics on failure.
 */
import { execSync } from 'child_process';

describe('Quality Gate — TypeScript', () => {
  it('backend TypeScript type-check passes', () => {
    try {
      const output = execSync('npx tsc --noEmit', {
        cwd: 'apps/backend',
        encoding: 'utf-8',
        timeout: 120_000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      expect(output).toBeDefined();
    } catch (err: any) {
      const stderr = err.stderr || '';
      const stdout = err.stdout || '';
      const diagnostics = stderr || stdout;
      console.error('TypeScript check failed. Output:\n', diagnostics.slice(0, 3000));
      fail(
        `TypeScript type-check failed with exit code ${err.status}.\n` +
          `Run: cd apps/backend && npx tsc --noEmit\n` +
          `Diagnostics:\n${diagnostics.slice(0, 2000)}`
      );
    }
  });

  it('frontend TypeScript type-check passes', () => {
    try {
      const output = execSync('npx tsc --noEmit', {
        cwd: 'apps/frontend',
        encoding: 'utf-8',
        timeout: 120_000,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      expect(output).toBeDefined();
    } catch (err: any) {
      const stderr = err.stderr || '';
      const stdout = err.stdout || '';
      const diagnostics = stderr || stdout;
      console.error('TypeScript check failed. Output:\n', diagnostics.slice(0, 3000));
      fail(
        `TypeScript type-check failed with exit code ${err.status}.\n` +
          `Run: cd apps/frontend && npx tsc --noEmit\n` +
          `Diagnostics:\n${diagnostics.slice(0, 2000)}`
      );
    }
  });
});
