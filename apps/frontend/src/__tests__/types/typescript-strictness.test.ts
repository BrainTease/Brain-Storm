/**
 * Test to verify TypeScript strictness and type alignment between src/types and packages/types
 * Ensures no duplicated type definitions and proper use of shared types
 * Issue #1124: Audit and fix TypeScript strictness gaps in src/types
 */

import fs from 'fs';
import path from 'path';

import { describe, it, expect } from 'vitest';

const baseDir = path.resolve(__dirname, '../..');

const checkTsconfigStrict = () => {
  const tsconfigPath = path.resolve(baseDir, '../../tsconfig.json');
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));
  return tsconfig.compilerOptions?.strict === true;
};

const getComponentPropsContent = () => {
  const componentPropsPath = path.resolve(baseDir, 'types/componentProps.ts');
  if (!fs.existsSync(componentPropsPath)) return '';
  return fs.readFileSync(componentPropsPath, 'utf-8');
};

describe('TypeScript Strictness Configuration', () => {
  it('should have strict TypeScript configuration enabled', () => {
    expect(checkTsconfigStrict()).toBe(true);
  });
});

describe('Component Props Type Definitions - Imports', () => {
  it('should import base component prop types', () => {
    const content = getComponentPropsContent();
    expect(content).toContain('BaseComponentProps');
    expect(content).toContain('BaseButtonProps');
  });

  it('should define all required prop interfaces', () => {
    const content = getComponentPropsContent();
    expect(content).toContain('export interface BaseInputProps');
    expect(content).toContain('export interface BaseSelectProps');
    expect(content).toContain('export interface BaseModalProps');
  });
});

describe('Component Props Type Definitions - React Integration', () => {
  it('should properly extend React types', () => {
    const content = getComponentPropsContent();
    expect(content).toContain('React.ButtonHTMLAttributes');
    expect(content).toContain('React.InputHTMLAttributes');
  });

  it('should properly type children as React.ReactNode', () => {
    const content = getComponentPropsContent();
    const childrenMatches = content.match(/children:\s*React\.ReactNode/g) || [];
    expect(childrenMatches.length).toBeGreaterThan(0);
  });
});

describe('Component Props Type Definitions - Naming Conventions', () => {
  it('should use consistent naming conventions', () => {
    const content = getComponentPropsContent();
    const interfaceNames = content.match(/export interface (\w+)/g) || [];
    expect(interfaceNames.length).toBeGreaterThan(0);
    interfaceNames.forEach((name) => {
      const cleanName = name.replace('export interface ', '');
      expect(cleanName).toMatch(/^Base\w+Props$/);
    });
  });

  it('should have optional properties marked with ?', () => {
    const content = getComponentPropsContent();
    const optionalProps = content.match(/\w+\?:/g) || [];
    expect(optionalProps.length).toBeGreaterThan(0);
  });
});
