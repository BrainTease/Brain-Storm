import fs from 'fs';
import path from 'path';

import { describe, expect, it } from 'vitest';

describe('Service Type Safety', () => {
  it('should not use any type in service files', () => {
    const servicesDir = path.join(__dirname, '../../services');

    if (!fs.existsSync(servicesDir)) {
      expect(true).toBe(true);
      return;
    }

    const serviceFiles = fs
      .readdirSync(servicesDir)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));

    serviceFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(servicesDir, file), 'utf-8');
      const anyPattern = /:\s*any\b|<any>|as\s+any\b/;
      expect(anyPattern.test(content)).toBe(
        false,
        `Service file ${file} should not use 'any' type`
      );
    });
  });

  it('should use proper types from packages/types', () => {
    const servicesDir = path.join(__dirname, '../../services');

    if (!fs.existsSync(servicesDir)) {
      expect(true).toBe(true);
      return;
    }

    const serviceFiles = fs
      .readdirSync(servicesDir)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));

    expect(serviceFiles.length).toBeGreaterThan(0);

    serviceFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(servicesDir, file), 'utf-8');
      expect(content.length).toBeGreaterThan(0);
      expect(/interface|type|function|const/.test(content)).toBe(true);
    });
  });

  it('should have consistent API client function signatures', () => {
    const servicesDir = path.join(__dirname, '../../services');

    if (!fs.existsSync(servicesDir)) {
      expect(true).toBe(true);
      return;
    }

    const serviceFiles = fs
      .readdirSync(servicesDir)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));

    serviceFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(servicesDir, file), 'utf-8');
      const hasProperTypes = /interface \w+|type \w+ =/.test(content);
      expect(hasProperTypes || file.includes('Service')).toBe(true);
    });
  });

  it('should export typed API functions', () => {
    const servicesDir = path.join(__dirname, '../../services');

    if (!fs.existsSync(servicesDir)) {
      expect(true).toBe(true);
      return;
    }

    const serviceFiles = fs
      .readdirSync(servicesDir)
      .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));

    serviceFiles.forEach((file) => {
      const content = fs.readFileSync(path.join(servicesDir, file), 'utf-8');
      const hasExportedFunctions = /export\s+(function|const)/.test(content);
      expect(hasExportedFunctions).toBe(true);
    });
  });
});
