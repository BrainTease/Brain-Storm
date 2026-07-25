/**
 * Test to verify console.log and debug statements are removed from production code
 * Ensures no debug logging leaks into production bundles
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Console Cleanup - Issue #785', () => {
  // Pattern to detect console statements that should not be in production
  const consolePattern = /console\.(log|debug|warn|error)\(/g;

  // Files to check - list of source files that should have no console statements
  const filesToCheck = [
    'src/hooks/useSearchAnalytics.ts',
    'src/hooks/usePWA.ts',
    'src/hooks/useGovernance.ts',
    'src/lib/notification-stream.ts',
    'src/lib/errorLogger.ts',
    'src/lib/analytics.ts',
    'src/app/[locale]/profile/page.tsx',
    'src/app/[locale]/profile/WalletSection.tsx',
    'src/components/forum/ReplyItem.tsx',
    'src/components/referrals/ReferralLink.tsx',
    'src/components/Admin/Dashboard/AdminDashboard.tsx',
  ];

  it('should have no console.log/debug statements in production code', () => {
    const baseDir = path.resolve(__dirname, '..');
    const filesWithConsole: string[] = [];

    filesToCheck.forEach((file) => {
      const filePath = path.resolve(baseDir, file);
      if (!fs.existsSync(filePath)) {
        console.warn(`File not found: ${filePath}`);
        return;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const matches = content.match(consolePattern);

      if (matches) {
        filesWithConsole.push(`${file}: found ${matches.length} console statement(s)`);
      }
    });

    expect(filesWithConsole).toEqual(
      [],
      `Found console statements in production code: ${filesWithConsole.join(', ')}`
    );
  });

  it('RTLAudit should return audit results instead of logging', () => {
    const baseDir = path.resolve(__dirname, '..');
    const filePath = path.resolve(baseDir, 'src/components/RTLAudit.tsx');
    const content = fs.readFileSync(filePath, 'utf-8');

    // Should have a return statement with audit results
    expect(content).toContain('return {');
    expect(content).toContain('dirAttribute');
    expect(content).toContain('langAttribute');
  });
});
