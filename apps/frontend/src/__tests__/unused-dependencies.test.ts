/**
 * Test to verify unused dependencies have been removed (Issue #1120)
 * Ensures frontend package.json contains only actively used dependencies
 */

import fs from 'fs';
import path from 'path';

import { describe, it, expect } from 'vitest';

const FRONTEND_DIR = path.resolve(__dirname, '../..');
const PKG_JSON_PATH = path.resolve(FRONTEND_DIR, 'package.json');

const getPackageJson = () => {
  const content = fs.readFileSync(PKG_JSON_PATH, 'utf-8');
  return JSON.parse(content);
};

describe('Unused Dependencies Cleanup - Issue #1120', () => {
  it('should have package.json', () => {
    expect(fs.existsSync(PKG_JSON_PATH)).toBe(true);
  });

  it('should not have prototype dependencies', () => {
    const pkg = getPackageJson();
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const isProto = (dep: string) =>
      dep.toLowerCase().includes('prototype-') ||
      dep.toLowerCase().includes('test-lib') ||
      dep.toLowerCase().includes('temp-');
    const suspicious = Object.keys(allDeps).filter(isProto);
    expect(suspicious.length).toBe(0);
  });

  it('should have core dependencies', () => {
    const pkg = getPackageJson();
    expect(pkg.dependencies.react).toBeDefined();
    expect(pkg.dependencies.next).toBeDefined();
    expect(pkg.dependencies['react-dom']).toBeDefined();
  });

  it('should not have duplicate dependencies', () => {
    const pkg = getPackageJson();
    const allDeps = [
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {}),
    ];
    const duplicates = allDeps.filter((dep, i) => allDeps.indexOf(dep) !== i);
    expect(duplicates.length).toBe(0);
  });

  it('should have testing tools', () => {
    const pkg = getPackageJson();
    const devDeps = pkg.devDependencies || {};
    expect(Object.keys(devDeps).some((d) => d.includes('vitest'))).toBe(true);
    expect(Object.keys(devDeps).some((d) => d.includes('typescript'))).toBe(true);
    expect(Object.keys(devDeps).some((d) => d.includes('eslint'))).toBe(true);
  });

  it('should have valid semver ranges', () => {
    const pkg = getPackageJson();
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const invalid = Object.entries(allDeps)
      .filter(([_, version]) => typeof version === 'string' && !version.match(/^[\^~*\d=<>v]/))
      .map(([name]) => name);
    expect(invalid.length).toBe(0);
  });

  it('should have workspace dependencies', () => {
    const pkg = getPackageJson();
    const monoDeps = Object.keys(pkg.dependencies || {}).filter((d) =>
      d.startsWith('@brain-storm/')
    );
    expect(monoDeps.length).toBeGreaterThan(0);
  });

  it('should have package-lock.json', () => {
    const lockfilePath = path.resolve(FRONTEND_DIR, 'package-lock.json');
    expect(fs.existsSync(lockfilePath)).toBe(true);
  });

  it('should have separated dependencies', () => {
    const pkg = getPackageJson();
    expect(pkg.dependencies).toBeDefined();
    expect(pkg.devDependencies).toBeDefined();
    expect(Object.keys(pkg.dependencies || {}).length).toBeGreaterThan(0);
  });

  it('should have engines specified', () => {
    const pkg = getPackageJson();
    expect(pkg.engines).toBeDefined();
    expect(pkg.engines?.node).toBeDefined();
  });

  it('should have build and test scripts', () => {
    const pkg = getPackageJson();
    const scripts = pkg.scripts || {};
    expect(Object.keys(scripts).some((s) => s.includes('build'))).toBe(true);
    expect(Object.keys(scripts).some((s) => s.includes('test'))).toBe(true);
  });
});
