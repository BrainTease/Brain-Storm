/**
 * Quality Gate — Import Ordering (#1380)
 *
 * Verifies that:
 * 1. The root .eslintrc.js has the `simple-import-sort` plugin configured.
 * 2. The frontend .eslintrc.js has the `import/order` rule configured with
 *    the correct group hierarchy and newlines-between enforcement.
 * 3. No source file in the frontend mixes relative side-effect imports
 *    (e.g. `./globals.css`) into the wrong position relative to internal
 *    path-alias imports (`@/…`).
 */
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Import Ordering (#1380)', () => {
  // ─── 1. Root ESLint config has simple-import-sort ──────────────────────────
  it('root .eslintrc.js configures simple-import-sort/imports', () => {
    const configPath = './.eslintrc.js';
    expect(fs.existsSync(configPath)).toBe(true);
    const content = fs.readFileSync(configPath, 'utf-8');
    expect(content).toContain('simple-import-sort/imports');
    expect(content).toContain('simple-import-sort/exports');
    expect(content).toContain('import/no-duplicates');
  });

  // ─── 2. Frontend ESLint config has import/order ─────────────────────────────
  it('apps/frontend .eslintrc.js configures import/order with correct groups', () => {
    const configPath = './apps/frontend/.eslintrc.js';
    expect(fs.existsSync(configPath)).toBe(true);
    const content = fs.readFileSync(configPath, 'utf-8');

    // Core rule presence
    expect(content).toContain("'import/order'");
    // Group ordering: builtin → external → internal → parent → sibling → index
    expect(content).toContain("'builtin'");
    expect(content).toContain("'external'");
    expect(content).toContain("'internal'");
    // Newlines between groups enforced
    expect(content).toContain("'newlines-between': 'always'");
    // Alphabetical ordering within groups
    expect(content).toContain("alphabetize");
    // No duplicate imports
    expect(content).toContain("'import/no-duplicates'");
  });

  // ─── 3. No CSS side-effect import in wrong position ─────────────────────────
  it('layout files do not place CSS imports before internal @/ imports', () => {
    const layoutFiles = [
      './apps/frontend/src/app/layout.tsx',
      './apps/frontend/src/app/[locale]/layout.tsx',
    ];

    for (const filePath of layoutFiles) {
      if (!fs.existsSync(filePath)) continue;
      const lines = fs.readFileSync(filePath, 'utf-8').split('\n');

      const importLines = lines
        .map((l, i) => ({ line: l.trim(), index: i }))
        .filter(({ line }) => line.startsWith('import'));

      // CSS/side-effect relative imports should come AFTER all @/ imports
      const lastInternalIdx = importLines.reduce((last, { line, index }) => {
        return line.includes("from '@/") || line.includes("from \"@/") ? index : last;
      }, -1);

      const cssIdx = importLines.find(({ line }) =>
        line.match(/^import\s+['"][.\/].*\.css['"]/)
      )?.index ?? -1;

      if (lastInternalIdx >= 0 && cssIdx >= 0) {
        expect(cssIdx).toBeGreaterThan(lastInternalIdx);
      }
    }
  });

  // ─── 4. External imports precede internal @/ imports in key service files ───
  it('service and store files order external imports before internal @/ imports', () => {
    const filesToCheck = [
      './apps/frontend/src/lib/api.ts',
      './apps/frontend/src/store/auth.store.ts',
      './apps/frontend/src/store/bookmarks.store.ts',
      './apps/frontend/src/hooks/useWallet.ts',
      './apps/frontend/src/lib/governanceApi.ts',
    ];

    for (const filePath of filesToCheck) {
      if (!fs.existsSync(filePath)) continue;
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      const importLines = lines
        .map((l, i) => ({ line: l.trim(), lineNum: i }))
        .filter(({ line }) => line.startsWith('import'));

      let lastExternalLine = -1;
      let firstInternalLine = Infinity;

      for (const { line, lineNum } of importLines) {
        const isExternal =
          line.match(/from ['"](?!@\/)(?!\.)[^'"]+['"]/) ||
          line.match(/from ['"](?!@brain-storm)[^'"@\.][^'"]+['"]/);
        const isInternal =
          line.includes("from '@/") || line.includes('from "@/');

        if (isExternal) lastExternalLine = Math.max(lastExternalLine, lineNum);
        if (isInternal) firstInternalLine = Math.min(firstInternalLine, lineNum);
      }

      if (lastExternalLine >= 0 && firstInternalLine < Infinity) {
        expect(lastExternalLine).toBeLessThan(firstInternalLine);
      }
    }
  });

  // ─── 5. Relative sibling imports come after @/ imports ──────────────────────
  it('relative sibling imports come after @/ path-alias imports', () => {
    const filePath = './apps/frontend/src/lib/governanceApi.ts';
    if (!fs.existsSync(filePath)) return;

    const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
    const importLines = lines
      .map((l, i) => ({ line: l.trim(), lineNum: i }))
      .filter(({ line }) => line.startsWith('import'));

    let lastInternalLine = -1;
    let firstRelativeLine = Infinity;

    for (const { line, lineNum } of importLines) {
      if (line.includes("from '@/") || line.includes('from "@/')) {
        lastInternalLine = Math.max(lastInternalLine, lineNum);
      }
      if (line.match(/from ['"]\.\//)) {
        firstRelativeLine = Math.min(firstRelativeLine, lineNum);
      }
    }

    if (lastInternalLine >= 0 && firstRelativeLine < Infinity) {
      expect(firstRelativeLine).toBeGreaterThan(lastInternalLine);
    }
  });
});
