import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('eslint-disable Justifications', () => {
  const srcDir = './src';

  it('should have justifications for all eslint-disables', () => {
    let foundDisables = 0;
    let uncommentedDisables = 0;

    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (stat.isFile() && /\.(ts|tsx|js|jsx)$/.test(file)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('eslint-disable')) {
              foundDisables++;
              if (!line.includes('--') && !line.includes('//')) {
                uncommentedDisables++;
                console.log(`❌ Uncommented eslint-disable at ${fullPath}:${i + 1}`);
              }
            }
          }
        }
      }
    }

    scanDir(srcDir);

    expect(uncommentedDisables).toBe(0);
  });

  it('should have documentation for all disables', () => {
    const docPath = './docs/eslint-disable-justifications.md';
    expect(fs.existsSync(docPath)).toBe(true);
    
    const content = fs.readFileSync(docPath, 'utf-8');
    expect(content).toContain('## Current Disables');
  });
});
