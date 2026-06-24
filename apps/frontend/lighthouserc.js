/**
 * Lighthouse CI Configuration
 * Enforces performance budgets for Core Web Vitals.
 */
module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready on',
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/courses',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/courses/1',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        throttling: {
          cpuSlowdownMultiplier: 4,
          downloadThroughputKbps: 10240,
          uploadThroughputKbps: 5120,
          rttMs: 40,
        },
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
    assert: {
      assertions: {
        // Core Web Vitals
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
        'interaction-to-next-paint': ['warn', { maxNumericValue: 200 }],

        // Performance budgets
        'first-contentful-paint': ['warn', { maxNumericValue: 1800 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        'max-potential-fid': ['warn', { maxNumericValue: 100 }],
        'server-response-time': ['warn', { maxNumericValue: 600 }],

        // Bundle budgets
        'total-byte-weight': ['warn', { maxNumericValue: 500000 }],
        'unused-javascript': ['warn', { maxNumericValue: 100000 }],
        'unused-css-rules': ['warn', { maxNumericValue: 50000 }],

        // Best practices
        'uses-responsive-images': 'warn',
        'offscreen-images': 'warn',
        'modern-image-formats': 'warn',
        'uses-optimized-images': 'warn',
        'uses-text-compression': 'warn',
        'uses-rel-preconnect': 'warn',

        // Accessibility baseline
        'color-contrast': 'error',
        'aria-allowed-attr': 'error',
        'aria-required-children': 'error',
        'aria-required-parent': 'error',
        'aria-roles': 'error',
        'html-has-lang': 'error',
        'image-alt': 'warn',
        'label': 'error',
        'link-name': 'error',
        'meta-viewport': 'error',
        'tabindex': 'warn',
        'valid-lang': 'warn',
      },
    },
  },
};
