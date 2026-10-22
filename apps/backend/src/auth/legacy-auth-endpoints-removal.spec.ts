/**
 * Issue #1290 - Remove legacy auth endpoints after usage check
 *
 * Acceptance criteria:
 * - Removed routes are absent from the auth controller (and so from OpenAPI)
 * - No test or source file references the removed routes
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC_ROOT = path.resolve(__dirname, '..');
const AUTH_CONTROLLER = path.join(SRC_ROOT, 'auth', 'auth.controller.ts');

const LEGACY_ROUTES = ["'oauth/callback'", "'oauth/authorize'", "'legacy'", "'deprecated'"];

const LEGACY_PATH_REFERENCES = [/\/auth\/oauth\//, /\/auth\/legacy\b/, /\/auth\/deprecated\b/];

function listTsFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listTsFiles(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

describe('Issue #1290 - Legacy auth endpoints removed', () => {
  const controllerSource = fs.readFileSync(AUTH_CONTROLLER, 'utf8');

  it('controller declares no legacy route paths', () => {
    for (const route of LEGACY_ROUTES) {
      expect(controllerSource).not.toContain(`(${route})`);
    }
  });

  it('controller has no legacy password POST route', () => {
    expect(controllerSource).not.toMatch(/@Post\(['"]password['"]\)/);
  });

  it('active routes remain registered', () => {
    const routes = controllerSource.match(/@(Get|Post|Put|Delete|Patch)\(['"][^'"]*['"]\)/g) ?? [];
    expect(routes.length).toBeGreaterThan(0);
    expect(controllerSource).toContain("@Post('login')");
    expect(controllerSource).toContain("@Post('register')");
    expect(controllerSource).toContain("@Post('refresh')");
  });

  it('no source or test file references removed legacy routes', () => {
    const offenders = listTsFiles(SRC_ROOT)
      .filter((file) => file !== AUTH_CONTROLLER)
      .filter((file) => {
        const content = fs.readFileSync(file, 'utf8');
        return LEGACY_PATH_REFERENCES.some((pattern) => pattern.test(content));
      })
      .map((file) => path.relative(SRC_ROOT, file));

    expect(offenders).toEqual([]);
  });
});
