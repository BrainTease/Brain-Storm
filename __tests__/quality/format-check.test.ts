/**
 * #1034 — Quality Gate: Prettier format check
 *
 * Executes prettier --check for backend and frontend, asserting all files
 * conform to the project formatting standard.
 * Provides actionable diagnostics on failure.
 */
import { execSync } from 'child_process';

describe('Quality Gate — Format', () => {
  it('backend formatting passes prettier check', () => {
    try {
      const output = execSync('npm run format:check', {
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
      console.error('Format check failed. Output:\n', diagnostics.slice(0, 3000));
      fail(
        `Prettier format check failed with exit code ${err.status}.\n` +
          `Run: cd apps/backend && npm run format:check\n` +
          `To fix: cd apps/backend && npm run format\n` +
          `Diagnostics:\n${diagnostics.slice(0, 2000)}`
      );
    }
  });

  it('frontend formatting passes prettier check', () => {
    try {
      const output = execSync('npm run format:check', {
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
      console.error('Format check failed. Output:\n', diagnostics.slice(0, 3000));
      fail(
        `Prettier format check failed with exit code ${err.status}.\n` +
          `Run: cd apps/frontend && npm run format:check\n` +
          `To fix: cd apps/frontend && npm run format\n` +
          `Diagnostics:\n${diagnostics.slice(0, 2000)}`
      );
    }
  });
});
