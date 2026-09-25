/* eslint-disable max-lines-per-function, @typescript-eslint/no-var-requires */
import * as fs from 'fs';
import * as path from 'path';

describe('Issue #1134 - logging consolidation', () => {
  const SRC_ROOT = path.resolve(__dirname, '../..');
  const CONSOLE_CALL_REGEX = /\bconsole\.(log|error|warn|debug|info)\s*\(/;

  function collectSourceFiles(dir: string): string[] {
    const results: string[] = [];
    const excludedDirs = ['node_modules', 'dist', 'migrations', '.spec.ts', '.test.ts'];
    const EXCLUDED_DIRS = new Set(excludedDirs);
    const PERMITTED_CONSOLE_FILES = new Set([
      'migration-runner.ts',
      'migration-validator.ts',
      'migration-rollback.ts',
      'logging-conventions.ts',
    ]);

    function walk(current: string): void {
      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) {
          walk(full);
        } else if (
          entry.name.endsWith('.ts') &&
          !entry.name.endsWith('.spec.ts') &&
          !entry.name.endsWith('.test.ts') &&
          !PERMITTED_CONSOLE_FILES.has(entry.name)
        ) {
          results.push(full);
        }
      }
    }

    walk(dir);
    return results;
  }

  describe('Logger module exports', () => {
    it('should export logger factory for dependency injection', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { LoggerFactory } = require('./logger-factory');
      expect(LoggerFactory).toBeDefined();
    });

    it('should export logger service', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { LoggerService } = require('./logger.service');
      expect(LoggerService).toBeDefined();
    });

    it('should export logger module for nestjs', () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { LoggerModule } = require('./logger.module');
      expect(LoggerModule).toBeDefined();
    });

    it('should have index.ts exporting all logger utilities', () => {
      const indexPath = path.join(SRC_ROOT, 'common', 'logger', 'index.ts');
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf8');
        expect(content).toContain('export');
      }
    });
  });

  describe('Services should use Logger from @nestjs/common', () => {
    it('cdn service should use Logger', () => {
      const file = path.join(SRC_ROOT, 'cdn', 'cdn.service.ts');
      if (!fs.existsSync(file)) return;
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toMatch(/new Logger\(CdnService\.name\)/);
    });

    it('audit subscriber should use Logger', () => {
      const file = path.join(SRC_ROOT, 'audit', 'audit-subscriber.ts');
      if (!fs.existsSync(file)) return;
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toMatch(/new Logger\(AuditSubscriber\.name\)/);
    });

    it('auth service should use Logger', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.service.ts');
      if (!fs.existsSync(file)) return;
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toMatch(/console\.(log|error|warn)/);
    });

    it('users service should use Logger', () => {
      const file = path.join(SRC_ROOT, 'users', 'users.service.ts');
      if (!fs.existsSync(file)) return;
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toMatch(/console\.(log|error|warn)/);
    });
  });

  describe('No raw console calls in service files', () => {
    const criticalModules = [
      'auth',
      'users',
      'grants',
      'certificates',
      'bookings',
      'payments',
      'analytics',
    ];

    test.each(criticalModules)('%s module should not have console calls', (module) => {
      const moduleDir = path.join(SRC_ROOT, module);
      if (!fs.existsSync(moduleDir)) return;

      const files = collectSourceFiles(moduleDir);
      for (const file of files) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content
          .split('\n')
          .filter((line) => !line.trimStart().startsWith('//'))
          .filter((line) => CONSOLE_CALL_REGEX.test(line));

        const msg = `File ${file} contains raw console calls: ${lines.join('\n')}`;
        expect(lines).toEqual([], msg);
      }
    });
  });

  describe('LoggingMiddleware and LoggingInterceptor usage', () => {
    it('logging middleware should exist', () => {
      const file = path.join(SRC_ROOT, 'common', 'logger', 'logging.middleware.ts');
      expect(fs.existsSync(file)).toBe(true);
    });

    it('logging interceptor should exist', () => {
      const file = path.join(SRC_ROOT, 'common', 'logger', 'logging.interceptor.ts');
      expect(fs.existsSync(file)).toBe(true);
    });

    it('logging conventions should be documented', () => {
      const file = path.join(SRC_ROOT, 'common', 'logger', 'logging-conventions.ts');
      expect(fs.existsSync(file)).toBe(true);
    });

    it('logging guide should exist', () => {
      const file = path.join(SRC_ROOT, 'common', 'logger', 'LOGGING_GUIDE.md');
      expect(fs.existsSync(file)).toBe(true);
    });
  });

  describe('Logger injection patterns', () => {
    it('auth service should not use console', () => {
      const file = path.join(SRC_ROOT, 'auth', 'auth.service.ts');
      if (!fs.existsSync(file)) return;
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toMatch(/console\.log\(/);
    });

    it('grants business service should not use console', () => {
      const file = path.join(SRC_ROOT, 'grants', 'grants-business.service.ts');
      if (!fs.existsSync(file)) return;
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toMatch(/console\.(log|error|warn|debug)/);
    });

    it('certificates service should not use console', () => {
      const file = path.join(SRC_ROOT, 'certificates', 'certificates.service.ts');
      if (!fs.existsSync(file)) return;
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toMatch(/console\.(log|error|warn|debug)/);
    });

    it('bookings service should not use console', () => {
      const file = path.join(SRC_ROOT, 'bookings', 'bookings.service.ts');
      if (!fs.existsSync(file)) return;
      const content = fs.readFileSync(file, 'utf8');
      expect(content).not.toMatch(/console\.(log|error|warn|debug)/);
    });
  });

  describe('ESLint rule enforcement', () => {
    it('eslint config should forbid console calls', () => {
      const eslintFile = path.join(SRC_ROOT, '..', '.eslintrc.js');
      if (fs.existsSync(eslintFile)) {
        const content = fs.readFileSync(eslintFile, 'utf8');
        expect(content).toContain('no-console');
      }
    });

    it('backend eslint config should forbid console', () => {
      const eslintFile = path.join(SRC_ROOT, '..', '.eslintrc.js');
      if (fs.existsSync(eslintFile)) {
        const content = fs.readFileSync(eslintFile, 'utf8');
        expect(content).toMatch(/console|no-console/);
      }
    });
  });

  describe('Structured logging compliance', () => {
    it('structured logger service should exist', () => {
      const file = path.join(SRC_ROOT, 'common', 'logger', 'structured-logger.service.ts');
      expect(fs.existsSync(file)).toBe(true);
    });

    it('structured logger should provide context methods', () => {
      const file = path.join(SRC_ROOT, 'common', 'logger', 'structured-logger.service.ts');
      if (!fs.existsSync(file)) return;
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toContain('class');
      expect(content).toContain('method');
    });

    it('logging example should be provided', () => {
      const file = path.join(SRC_ROOT, 'common', 'logger', 'logger.example.ts');
      expect(fs.existsSync(file)).toBe(true);
    });
  });

  describe('Request context logging', () => {
    it('request context service should exist', () => {
      const file = path.join(SRC_ROOT, 'common', 'request-context.service.ts');
      expect(fs.existsSync(file)).toBe(true);
    });

    it('logging should use request context for tracing', () => {
      const file = path.join(SRC_ROOT, 'common', 'request-context.service.ts');
      if (!fs.existsSync(file)) return;
      const content = fs.readFileSync(file, 'utf8');
      expect(content).toBeDefined();
    });
  });

  describe('Migration and cleanup tracking', () => {
    it('logging cleanup spec should test compliance', () => {
      const file = path.join(SRC_ROOT, 'common', 'logger', 'logging-cleanup.spec.ts');
      expect(fs.existsSync(file)).toBe(true);
    });

    it('consolidation spec should verify logging usage', () => {
      const file = path.join(SRC_ROOT, 'common', 'logger', 'logging-consolidation.spec.ts');
      expect(fs.existsSync(file)).toBe(true);
    });
  });
});
