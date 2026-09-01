import { readFileSync, writeFileSync } from 'fs';
import { globSync } from 'glob';

const entityFiles = globSync('apps/backend/src/**/*.entity.ts', { cwd: process.cwd() });

function fixEntityFile(filePath) {
  let content = readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let modified = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match property declarations without initializers and without ! that are in a class body
    // Pattern: propertyName: Type; or propertyName?: Type; or propertyName!: Type;
    // We want to add ! if it's a class property without initializer
    const propMatch = line.match(/^(\s*)(\w+)(\?)?:(.*?)(?:;\s*\/\/.*|;)$/);

    if (propMatch) {
      const [, indent, propName, optional, typePart] = propMatch;

      // Skip if already has ! or ? (optional)
      if (optional || line.includes('!:')) continue;

      // Skip if it's a method (has parens) or has an initializer (=)
      if (typePart.includes('(') || typePart.includes('=') || typePart.includes('=>')) continue;

      // Skip static methods/properties, decorators
      if (line.trim().startsWith('static ') || line.trim().startsWith('@')) continue;

      // Check if we're inside a class (look backwards for class keyword)
      let inClass = false;
      for (let j = i - 1; j >= 0; j--) {
        if (lines[j].includes('class ')) {
          inClass = true;
          break;
        }
        if (lines[j].includes('interface ') || lines[j].includes('type ')) {
          break;
        }
      }

      if (!inClass) continue;

      // Add ! after property name
      lines[i] = `${indent}${propName}!:${typePart};`;
      modified = true;
    }
  }

  if (modified) {
    writeFileSync(filePath, lines.join('\n'));
    console.log(`Fixed: ${filePath}`);
    return true;
  }
  return false;
}

let totalFixed = 0;
for (const file of entityFiles) {
  if (fixEntityFile(file)) totalFixed++;
}

console.log(`Total entity files fixed: ${totalFixed}`);
