import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('globals.css - CSS cleanup', () => {
  let cssContent: string;

  beforeAll(() => {
    const cssPath = path.join(__dirname, '../../app/globals.css');
    cssContent = fs.readFileSync(cssPath, 'utf-8');
  });

  it('contains animate-shimmer utility', () => {
    expect(cssContent).toContain('.animate-shimmer');
    expect(cssContent).toContain('animation: shimmer 2s infinite linear');
  });

  it('contains skip-link utility', () => {
    expect(cssContent).toContain('.skip-link');
  });

  it('contains sr-only utility for accessibility', () => {
    expect(cssContent).toContain('.sr-only');
  });

  it('contains focus-visible styling', () => {
    expect(cssContent).toContain(':focus-visible');
  });

  it('does not contain orphaned animate-pulse-rtl-mirror', () => {
    expect(cssContent).not.toContain('animate-pulse-rtl-mirror');
  });

  it('does not contain orphaned pulse-rtl keyframe', () => {
    expect(cssContent).not.toContain('@keyframes pulse-rtl');
  });

  it('respects prefers-reduced-motion', () => {
    expect(cssContent).toContain('prefers-reduced-motion');
  });

  it('has proper CSS structure', () => {
    expect(cssContent).toContain('@tailwind base');
    expect(cssContent).toContain('@tailwind components');
    expect(cssContent).toContain('@tailwind utilities');
  });
});
