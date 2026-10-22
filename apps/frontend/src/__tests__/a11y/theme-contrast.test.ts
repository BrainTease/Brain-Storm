import fs from 'node:fs';
import path from 'node:path';

import colors from 'tailwindcss/colors';
import { describe, expect, it } from 'vitest';

const UI_ROOT = path.resolve(process.cwd(), 'src', 'components', 'ui');
const MIN_RATIO = 4.5; // WCAG AA for body text

// Surfaces the shared UI primitives render text on.
const LIGHT_SURFACES = {
  white: '#ffffff',
  'gray-50': colors.gray[50],
  'gray-100': colors.gray[100],
};
const DARK_SURFACES = { 'gray-900': colors.gray[900], 'gray-800': colors.gray[800] };

const TEXT_CLASS =
  /(?:^|\s)(dark:)?text-(gray|blue|red|green|yellow|orange|purple)-(\d{3})(?=\s|$|")/g;

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const n = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => channel(parseInt(n.slice(i, i + 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(fg: string, bg: string): number {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
}

function colorHex(family: string, shade: string): string {
  const palette = (colors as unknown as Record<string, Record<string, string>>)[family];
  return palette[shade];
}

function classStrings(file: string): string[] {
  const source = fs.readFileSync(file, 'utf8');
  return [...source.matchAll(/(?:className|class)=(?:"([^"]*)"|\{`([^`]*)`\}|'([^']*)')/g)].map(
    (m) => m[1] ?? m[2] ?? m[3] ?? ''
  );
}

interface TextClass {
  dark: boolean;
  family: string;
  shade: string;
}

function textClassesIn(classString: string): TextClass[] {
  return [...classString.matchAll(TEXT_CLASS)].map((m) => ({
    dark: Boolean(m[1]),
    family: m[2],
    shade: m[3],
  }));
}

function uiFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return uiFiles(full);
    return /\.tsx$/.test(entry.name) && !/\.(test|stories)\.tsx$/.test(entry.name) ? [full] : [];
  });
}

function violations(): string[] {
  const found: string[] = [];
  for (const file of uiFiles(UI_ROOT)) {
    for (const classString of classStrings(file)) {
      for (const cls of textClassesIn(classString)) {
        const hex = colorHex(cls.family, cls.shade);
        if (!hex) continue;
        const surfaces = cls.dark ? DARK_SURFACES : LIGHT_SURFACES;
        for (const [name, bg] of Object.entries(surfaces)) {
          if (contrast(hex, bg) < MIN_RATIO) {
            const label = `${cls.dark ? 'dark:' : ''}text-${cls.family}-${cls.shade}`;
            found.push(`${path.relative(UI_ROOT, file)}: ${label} on ${name}`);
          }
        }
      }
    }
  }
  return [...new Set(found)];
}

describe('theme text colors meet WCAG AA contrast in shared UI', () => {
  it('uses text classes that reach 4.5:1 on the surfaces they render on', () => {
    expect(violations()).toEqual([]);
  });
});
