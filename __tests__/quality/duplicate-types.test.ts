import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Duplicate Type Definitions', () => {
  const packagesTypes = './packages/types';
  const frontendTypes = './apps/frontend/src/types';

  it('should have no duplicate type names', () => {
    function getTypeNames(dir: string): Set<string> {
      const types = new Set<string>();
      
      if (!fs.existsSync(dir)) return types;
      
      function scanDir(d: string) {
        const files = fs.readdirSync(d);
        for (const file of files) {
          const fullPath = path.join(d, file);
          const stat = fs.statSync(fullPath);
          if (stat.isDirectory()) {
            scanDir(fullPath);
          } else if (stat.isFile() && file.endsWith('.ts')) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const matches = content.match(/^(export )?(interface|type) ([A-Za-z_][A-Za-z0-9_]*)/gm);
            if (matches) {
              for (const match of matches) {
                const name = match.replace(/^(export )?(interface|type) /, '').trim();
                types.add(name);
              }
            }
          }
        }
      }
      
      scanDir(dir);
      return types;
    }

    const packagesTypesSet = getTypeNames(packagesTypes);
    const frontendTypesSet = getTypeNames(frontendTypes);

    const duplicates: string[] = [];
    for (const type of packagesTypesSet) {
      if (frontendTypesSet.has(type)) {
        duplicates.push(type);
      }
    }

    if (duplicates.length > 0) {
      console.log('❌ Duplicate types found:', duplicates);
    }
    
    expect(duplicates).toHaveLength(0);
  });

  it('should export all types from packages/types', () => {
    const indexPath = path.join(packagesTypes, 'index.ts');
    if (fs.existsSync(indexPath)) {
      const content = fs.readFileSync(indexPath, 'utf-8');
      expect(content).toContain('export * from');
    }
  });
});
