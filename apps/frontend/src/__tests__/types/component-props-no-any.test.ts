import fs from 'node:fs';
import path from 'node:path';

import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';

const COMPONENTS_ROOT = path.resolve(process.cwd(), 'src', 'components');

function componentSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return componentSourceFiles(full);
    const isSource = /\.(tsx|ts)$/.test(entry.name);
    const isExcluded = /\.(test|stories)\.tsx?$/.test(entry.name);
    return isSource && !isExcluded ? [full] : [];
  });
}

// Returns "file:line" for every explicit `any` type annotation in the file.
function explicitAnyLocations(file: string): string[] {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const locations: string[] = [];
  const visit = (node: ts.Node) => {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart());
      locations.push(`${path.relative(COMPONENTS_ROOT, file)}:${line + 1}`);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return locations;
}

describe('component props and types avoid explicit any', () => {
  it('has no `any` type annotations under src/components', () => {
    const offenders = componentSourceFiles(COMPONENTS_ROOT).flatMap(explicitAnyLocations);
    expect(offenders).toEqual([]);
  });
});
