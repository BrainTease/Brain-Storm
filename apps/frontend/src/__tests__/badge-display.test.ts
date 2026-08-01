/**
 * Test to verify badge display components are properly extracted into shared library
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Badge Display Library - Issue #783', () => {
  it('should have BadgeDisplay shared component', () => {
    const baseDir = path.resolve(__dirname, '..');
    const badgeDisplayPath = path.resolve(baseDir, 'src/components/ui/BadgeDisplay.tsx');
    expect(fs.existsSync(badgeDisplayPath)).toBe(true, 'BadgeDisplay.tsx should exist');
  });

  it('should export badge display components', () => {
    const baseDir = path.resolve(__dirname, '..');
    const badgeDisplayPath = path.resolve(baseDir, 'src/components/ui/BadgeDisplay.tsx');
    const content = fs.readFileSync(badgeDisplayPath, 'utf-8');

    const expectedExports = [
      'BadgeDisplay',
      'InlineBadgeList',
      'BadgeCounter',
      'StatusBadge',
      'BadgeGroup',
      'BadgeItem',
    ];

    expectedExports.forEach((exportName) => {
      expect(content).toContain(exportName, `Should export or define ${exportName}`);
    });
  });

  it('BadgeGrid should use shared BadgeDisplay component', () => {
    const baseDir = path.resolve(__dirname, '..');
    const badgeGridPath = path.resolve(baseDir, 'src/components/gamification/BadgeGrid.tsx');
    const content = fs.readFileSync(badgeGridPath, 'utf-8');

    expect(content).toContain(
      "from '@/components/ui/BadgeDisplay'",
      'BadgeGrid should import from shared BadgeDisplay'
    );
    expect(content).toContain('BadgeDisplay', 'BadgeGrid should use BadgeDisplay component');
  });

  it('should define BadgeItem interface for consistency', () => {
    const baseDir = path.resolve(__dirname, '..');
    const badgeDisplayPath = path.resolve(baseDir, 'src/components/ui/BadgeDisplay.tsx');
    const content = fs.readFileSync(badgeDisplayPath, 'utf-8');

    expect(content).toContain('export interface BadgeItem', 'Should export BadgeItem interface');
    expect(content).toContain('id: string');
    expect(content).toContain('name: string');
    expect(content).toContain('description: string');
  });

  it('should have utility badge components', () => {
    const baseDir = path.resolve(__dirname, '..');
    const badgeDisplayPath = path.resolve(baseDir, 'src/components/ui/BadgeDisplay.tsx');
    const content = fs.readFileSync(badgeDisplayPath, 'utf-8');

    const utilities = ['BadgeCounter', 'StatusBadge', 'BadgeGroup', 'InlineBadgeList'];

    utilities.forEach((utility) => {
      expect(content).toContain(
        `export const ${utility}`,
        `Should export ${utility} utility component`
      );
    });
  });
});
