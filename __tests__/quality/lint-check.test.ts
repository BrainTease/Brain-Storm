/**
 * #1034 — Quality Gate: ESLint check
 *
 * Executes the backend ESLint command and asserts it passes.
 * Provides actionable diagnostics on failure.
 */
import { execSync } from 'child_process';

describe('Quality Gate — ESLint', () => {
  it('backend ESLint passes', () => {
    try {
      const output = execSync('npm run lint', {
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
      // Preserve useful diagnostics
      console.error('ESLint failed. Output:\n', diagnostics.slice(0, 3000));
      fail(
        `ESLint check failed with exit code ${err.status}.\n` +
          `Run: cd apps/backend && npm run lint\n` +
          `Diagnostics:\n${diagnostics.slice(0, 2000)}`
      );
    }
  });

  it('frontend ESLint passes', () => {
    try {
      const output = execSync('npm run lint', {
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
      console.error('ESLint failed. Output:\n', diagnostics.slice(0, 3000));
      fail(
        `ESLint check failed with exit code ${err.status}.\n` +
          `Run: cd apps/frontend && npm run lint\n` +
          `Diagnostics:\n${diagnostics.slice(0, 2000)}`
      );
    }
  });
});
