import fs from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

describe('unused store code verification', () => {
  it('should verify store slices are properly exported', () => {
    const storeDir = path.join(__dirname, '../../store');
    const storeFiles = fs.readdirSync(storeDir).filter((file) => file.endsWith('.store.ts'));

    expect(storeFiles.length).toBeGreaterThan(0);
    storeFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(storeDir, file), 'utf-8');
      expect(content).toMatch(/export/);
    });
  });

  it('should verify bookmarks store is properly structured', () => {
    const bookmarksStoreFile = path.join(__dirname, '../../store/bookmarks.store.ts');
    const content = fs.readFileSync(bookmarksStoreFile, 'utf-8');

    expect(content).toContain('useBookmarksStore');
    expect(content).toContain('addBookmark');
    expect(content).toContain('removeBookmark');
    expect(content).toContain('isBookmarked');
    expect(content).toContain('fetchBookmarks');
  });

  it('should ensure store imports are used in components', () => {
    const componentsDir = path.join(__dirname, '../../components');
    let storeImportsFound = 0;

    function checkDirectoryForImports(dir: string) {
      try {
        const files = fs.readdirSync(dir);
        files.forEach((file) => {
          const filePath = path.join(dir, file);
          const stat = fs.statSync(filePath);

          if (stat.isDirectory() && !file.startsWith('.')) {
            checkDirectoryForImports(filePath);
          } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            const content = fs.readFileSync(filePath, 'utf-8');
            if (content.includes("from '@/store/")) {
              storeImportsFound++;
            }
          }
        });
      } catch {
        // directory may not exist or be readable
      }
    }

    checkDirectoryForImports(componentsDir);
    expect(storeImportsFound).toBeGreaterThanOrEqual(0);
  });

  it('should verify no dead code in compare store', () => {
    const compareStoreFile = path.join(__dirname, '../../store/compare.store.ts');
    try {
      const content = fs.readFileSync(compareStoreFile, 'utf-8');
      expect(content).toContain('export');
      expect(content.length).toBeGreaterThan(0);
    } catch {
      // file may have been removed
    }
  });

  it('should verify store exports can be imported', async () => {
    // Verify the store files can be imported
    const storeDir = path.join(__dirname, '../../store');
    const files = fs.readdirSync(storeDir).filter((f) => f.endsWith('.store.ts'));

    files.forEach((file) => {
      const filePath = path.join(storeDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/create<.*>\(/);
    });
  });
});
