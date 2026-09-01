import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Unused Exports', () => {
  const sdkPath = './packages/sdk';
  const srcDir = './src';

  it('should have no unused exports', () => {
    // This test will pass if we've removed all unused exports
    // It's a verification step

    function findExports(dir: string): string[] {
      const exports: string[] = [];

      if (!fs.existsSync(dir)) return exports;

      function scanDir(d: string) {
        const files = fs.readdirSync(d);
        for (const file of files) {
          const fullPath = path.join(d, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else if (stat.isFile() && file.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const matches = content.match(
              /^(export )?(const|function|class|interface|type|enum) ([a-zA-Z_][a-zA-Z0-9_]*)/gm
            );
            if (matches) {
              for (const match of matches) {
                const name = match
                  .replace(/^(export )?(const|function|class|interface|type|enum) /, '')
                  .trim();
                exports.push(name);
              }
            }
          }
        }
      }

      scanDir(dir);
      return exports;
    }

    function findUsage(name: string, dir: string): number {
      let count = 0;

      function scanDir(d: string) {
        const files = fs.readdirSync(d);
        for (const file of files) {
          const fullPath = path.join(d, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(file)) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (content.includes(name)) {
              count++;
            }
          }
        }
      }

      scanDir(dir);
      return count;
    }

    // If sdkPath doesn't exist, skip test
    if (!fs.existsSync(sdkPath)) {
      console.log('⚠️ packages/sdk not found, skipping test');
      return;
    }

    const exports = findExports(sdkPath);
    let unusedExports: string[] = [];

    for (const exp of exports) {
      // Count usage outside sdk directory
      let usageCount = 0;

      function scanProjectDir(d: string) {
        if (!fs.existsSync(d)) return;
        const files = fs.readdirSync(d);
        for (const file of files) {
          if (file === 'node_modules' || file === 'dist' || file === 'build' || file === '.next')
            continue;
          const fullPath = path.join(d, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            if (fullPath !== sdkPath) {
              scanProjectDir(fullPath);
            }
          } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(file)) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            if (content.includes(exp)) {
              usageCount++;
            }
          }
        }
      }

      scanProjectDir('.');

      // Remove self-reference
      const selfCount = fs.readFileSync(path.join(sdkPath, 'index.ts'), 'utf-8').includes(exp)
        ? 1
        : 0;
      usageCount -= selfCount;

      if (usageCount === 0 && exp !== '__esModule') {
        unusedExports.push(exp);
      }
    }

    if (unusedExports.length > 0) {
      console.log('❌ Unused exports found:', unusedExports);
    }

    expect(unusedExports).toHaveLength(0);
  });
});
