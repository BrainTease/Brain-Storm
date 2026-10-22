import fs from 'node:fs';
import path from 'node:path';

import * as ts from 'typescript';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = path.resolve(process.cwd(), 'src');
const ACCESSIBLE_NAME_ATTRS = new Set(['aria-label', 'aria-labelledby', 'title']);

function collectTsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__' && entry.name !== 'node_modules') collectTsxFiles(full, out);
    } else if (/\.tsx$/.test(entry.name) && !/\.(test|stories)\.tsx$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// Visible text means a letter or digit. Symbol-only glyphs such as ✕ or × are not names.
function hasVisibleText(node: ts.JsxElement): boolean {
  return node.children.some((child) => {
    if (ts.isJsxText(child)) return /[\p{L}\p{N}]/u.test(child.text);
    if (ts.isJsxExpression(child)) {
      const expr = child.expression;
      if (!expr) return false;
      if (ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr)) return false;
      // A bare identifier such as {icon} is treated as a glyph, not as a label.
      return !(ts.isIdentifier(expr) && /icon|svg/i.test(expr.text));
    }
    if (ts.isJsxElement(child)) return hasVisibleText(child);
    return false;
  });
}

function findUnlabelledButtons(file: string): number[] {
  const source = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const lines: number[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText() === 'button') {
      const props = node.openingElement.attributes.properties;
      const named = props.some(
        (p) => ts.isJsxAttribute(p) && ACCESSIBLE_NAME_ATTRS.has(p.name.getText())
      );
      const spread = props.some(ts.isJsxSpreadAttribute);
      if (!named && !spread && !hasVisibleText(node)) {
        lines.push(source.getLineAndCharacterOfPosition(node.getStart()).line + 1);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return lines;
}

describe('icon-only buttons have accessible names', () => {
  it('has no icon-only or symbol-only button without a name in src', () => {
    const offenders = collectTsxFiles(SRC_ROOT).flatMap((file) =>
      findUnlabelledButtons(file).map((line) => `${path.relative(SRC_ROOT, file)}:${line}`)
    );
    expect(offenders).toEqual([]);
  });
});
