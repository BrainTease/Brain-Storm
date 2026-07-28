import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Import Ordering', () => {
  const srcDir = './src';

  it('should have imports in correct order', () => {
    let violations = 0;

    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (stat.isFile() && /\.(ts|tsx)$/.test(file)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          let importGroups: string[][] = [];
          let currentGroup: string[] = [];
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.trim().startsWith('import ')) {
              currentGroup.push(line);
            } else if (currentGroup.length > 0) {
              const groupCopy = [...currentGroup];
              const sorted = groupCopy.sort((a, b) => a.localeCompare(b));
              
              for (let j = 0; j < currentGroup.length; j++) {
                if (currentGroup[j] !== sorted[j]) {
                  console.log(`❌ Import order violation in ${fullPath}:`);
                  console.log(`   Expected: ${sorted[j]}`);
                  console.log(`   Found: ${currentGroup[j]}`);
                  violations++;
                }
              }
              
              currentGroup = [];
            }
          }
        }
      }
    }

    scanDir(srcDir);
    expect(violations).toBe(0);
  });

  it('should have import ordering ESLint rule configured', () => {
    const eslintPath = './.eslintrc.js';
    expect(fs.existsSync(eslintPath)).toBe(true);
    
    const content = fs.readFileSync(eslintPath, 'utf-8');
    expect(content).toContain('simple-import-sort/imports');
  });
});
