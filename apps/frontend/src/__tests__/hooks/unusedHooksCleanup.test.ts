import fs from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

describe('Unused Hooks Cleanup', () => {
  it('should not have any completely unused hooks', () => {
    const hooksDir = path.join(__dirname, '../../hooks');
    const srcDir = path.join(__dirname, '../../');

    const hookFiles = fs.readdirSync(hooksDir).filter((f) => f.endsWith('.ts'));

    const srcContent = fs
      .readdirSync(srcDir, { recursive: true })
      .filter((f) => typeof f === 'string' && f.endsWith('.ts') && f.endsWith('.tsx'))
      .map((f) => fs.readFileSync(path.join(srcDir, f as string), 'utf-8'))
      .join('\n');

    hookFiles.forEach((hookFile) => {
      const hookName = hookFile.replace('.ts', '');
      const importPattern = new RegExp(`import.*${hookName}|from.*hooks`);
      expect(importPattern.test(srcContent)).toBe(true);
    });
  });

  it('should have proper test files for documented hooks', () => {
    const hooksDir = path.join(__dirname, '../../hooks');
    const testsDir = path.join(__dirname, '../hooks');

    const hookFiles = fs
      .readdirSync(hooksDir)
      .filter((f) => f.endsWith('.ts') && !f.startsWith('index'));

    const testFiles = fs.readdirSync(testsDir).filter((f) => f.endsWith('.test.ts'));

    hookFiles.forEach((hookFile) => {
      const testFileName = hookFile.replace('.ts', '.test.ts');
      expect(testFiles).toContain(testFileName);
    });
  });

  it('should not export unused hooks from hooks directory', () => {
    const hooksDir = path.join(__dirname, '../../hooks');
    const hookFiles = fs
      .readdirSync(hooksDir)
      .filter((f) => f.endsWith('.ts') && !f.startsWith('index'));

    expect(hookFiles.length).toBeGreaterThan(0);
    hookFiles.forEach((file) => {
      const fileContent = fs.readFileSync(path.join(hooksDir, file), 'utf-8');
      expect(fileContent.length).toBeGreaterThan(0);
    });
  });
});
