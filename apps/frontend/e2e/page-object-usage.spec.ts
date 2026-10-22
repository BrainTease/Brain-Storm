import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Issue #1343 — Guard that every spec interacts with the login, register,
 * courses and enrollment pages only through page objects in `./page-objects`.
 */

const E2E_DIR = __dirname;
const PAGE_OBJECTS_DIR = path.join(E2E_DIR, 'page-objects');

const ORIGIN = String.raw`(https?://[^/'"\x60]+)?`;

const FORBIDDEN: { name: string; pattern: RegExp }[] = [
  {
    name: 'raw auth route',
    pattern: new RegExp(String.raw`['"\x60]${ORIGIN}/auth/(login|register)`),
  },
  {
    name: 'raw courses route',
    pattern: new RegExp(String.raw`goto\(\s*['"\x60]${ORIGIN}/courses`),
  },
  {
    name: 'raw auth form field',
    pattern: /getByLabel\(\s*\/\^?(username|email|password|confirm password)/i,
  },
  { name: 'raw enroll button', pattern: /name:\s*\/[^/]*enroll/i },
  {
    name: 'raw course/enrollment test id',
    pattern: /data-testid="(course-card|enroll-button|enrollment-modal)"/,
  },
];

function specFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return full === PAGE_OBJECTS_DIR ? [] : specFiles(full);
    return entry.name.endsWith('.spec.ts') && full !== __filename ? [full] : [];
  });
}

test('specs use page objects for login, courses and enrollment', () => {
  const violations: string[] = [];

  for (const file of specFiles(E2E_DIR)) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const { name, pattern } of FORBIDDEN) {
        if (pattern.test(line)) {
          violations.push(`${path.relative(E2E_DIR, file)}:${i + 1} ${name}: ${line.trim()}`);
        }
      }
    });
  }

  expect(violations).toEqual([]);
});
