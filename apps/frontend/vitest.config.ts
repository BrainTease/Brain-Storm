import path from 'path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**', '**/*.pact.test.ts'],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'src/**/__tests__/**/*.{test,spec}.{ts,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html', 'json-summary'],
      exclude: [
        'node_modules/',
        'src/__tests__/',
        '**/__tests__/**',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/__mocks__/**',
        'src/app', // Next.js pages
        // Route-level lazy loading wrappers and error files are exercised via
        // smoke render tests; keep them out of coverage accounting since they
        // are thin dynamic-import/error-boundary shims.
        'src/app/**/loading.tsx',
        'src/app/**/error.tsx',
        'src/app/**/not-found.tsx',
        'src/components/lazy/**',
      ],
      include: [
        'src/lib/i18n/**',
        'src/lib/**/*.{ts,tsx}',
        'src/components/**/*.{ts,tsx}',
      ],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 80,
        statements: 85,
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});