/**
 * Issue #1291 - Split analytics service into query and aggregation services
 *
 * Acceptance criteria:
 * - AnalyticsQueryService and AnalyticsAggregator exist
 * - Each service is under 300 lines
 * - Unit tests exist for both
 */
import * as fs from 'fs';
import * as path from 'path';

const ANALYTICS_DIR = path.resolve(__dirname);
const MAX_LINES = 300;

function listTsFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listTsFiles(full);
    return entry.name.endsWith('.ts') ? [full] : [];
  });
}

function findFileExporting(className: string): string | undefined {
  const pattern = new RegExp(`export\\s+class\\s+${className}\\b`);
  return listTsFiles(ANALYTICS_DIR)
    .filter((file) => !file.endsWith('.spec.ts'))
    .find((file) => pattern.test(fs.readFileSync(file, 'utf8')));
}

function lineCount(file: string): number {
  return fs.readFileSync(file, 'utf8').split('\n').length;
}

describe('Issue #1291 - Analytics service split', () => {
  describe('AnalyticsQueryService', () => {
    const file = findFileExporting('AnalyticsQueryService');

    it('is exported from the analytics directory', () => {
      expect(file).toBeDefined();
    });

    it('is under 300 lines', () => {
      expect(lineCount(file as string)).toBeLessThan(MAX_LINES);
    });

    it('has a unit test file', () => {
      const dir = path.dirname(file as string);
      const specs = listTsFiles(dir).filter((f) => f.endsWith('.spec.ts'));
      const content = specs.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
      expect(content).toContain('AnalyticsQueryService');
    });
  });

  describe('AnalyticsAggregator', () => {
    const file = findFileExporting('AnalyticsAggregator');

    it('is exported from the analytics directory', () => {
      expect(file).toBeDefined();
    });

    it('is under 300 lines', () => {
      expect(lineCount(file as string)).toBeLessThan(MAX_LINES);
    });

    it('has a unit test file', () => {
      const dir = path.dirname(file as string);
      const specs = listTsFiles(dir).filter((f) => f.endsWith('.spec.ts'));
      const content = specs.map((f) => fs.readFileSync(f, 'utf8')).join('\n');
      expect(content).toContain('AnalyticsAggregator');
    });
  });

  it('read queries and aggregation jobs live in separate classes', () => {
    const queryFile = findFileExporting('AnalyticsQueryService');
    const aggregatorFile = findFileExporting('AnalyticsAggregator');
    expect(queryFile).toBeDefined();
    expect(aggregatorFile).toBeDefined();
    expect(queryFile).not.toBe(aggregatorFile);
  });
});
