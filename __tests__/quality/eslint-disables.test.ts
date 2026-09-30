/**
 * Quality invariant: every `eslint-disable` must carry a justification.
 *
 * NOT covered by ESLint itself — ESLint does not require justifications.
 * Complements the human-readable audit in `eslint-disable-audit.md`.
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../..');

const SCAN_DIRS = [
  'apps/backend/src',
  'apps/frontend/src',
  'packages/sdk/src',
  'packages/types/src',
  'packages/api/src',
];

const SKIP_DIRS = new Set([
  'node_modules',
  'dist',
  'build',
  '.next',
  'coverage',
  '.turbo',
]);

interface Finding {
  file: string;
  line: number;
  text: string;
}

function scanFile(filePath: string, findings: Finding[]) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.includes('eslint-disable')) continue;

    // A justification is present when the directive has a `--` comment
    // on the same line, e.g.:
    //   // eslint-disable-next-line no-console -- CLI output required
    const hasJustification = /eslint-disable[^\n]*--\s*\S/.test(line);

    if (!hasJustification) {
      findings.push({
        file: path.relative(ROOT, filePath),
        line: i + 1,
        text: line.trim(),
      });
    }
  }
}

function walk(dir: string, findings: Finding[]) {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, findings);
    } else if (/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) {
      scanFile(full, findings);
    }
  }
}

describe('eslint-disable justifications', () => {
  it('every eslint-disable has a `-- justification`', () => {
    const findings: Finding[] = [];
    for (const rel of SCAN_DIRS) {
      walk(path.join(ROOT, rel), findings);
    }

    if (findings.length > 0) {
      const report = findings
        .map((f) => `  ${f.file}:${f.line}  ${f.text}`)
        .join('\n');
      // eslint-disable-next-line no-console -- test diagnostic output
      console.error(
        `\n${findings.length} eslint-disable directive(s) missing justification:\n${report}\n`,
      );
    }

    expect(findings).toHaveLength(0);
  });

  it('eslint-disable-audit.md exists and is current', () => {
    const docPath = path.join(ROOT, 'eslint-disable-audit.md');
    expect(fs.existsSync(docPath)).toBe(true);

    const content = fs.readFileSync(docPath, 'utf-8');
    // The audit document must have an "Inventory" or "Current" section.
    expect(content).toMatch(/##\s+(Current|Inventory|Disables)/i);
  });
});
