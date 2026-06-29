/**
 * Lighthouse CI Configuration — Core Web Vitals gate.
 *
 * All CWV assertions are set to 'error' so the CI step hard-fails on
 * regression.  Non-critical hints use 'warn' to surface issues without
 * blocking the pipeline.
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
        // ── Core Web Vitals (hard gate — 'error') ──────────────────────────
        // LCP ≤ 2500 ms  → "Good" threshold
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        // CLS ≤ 0.1      → "Good" threshold
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        // TBT ≤ 200 ms   → proxy for INP / long tasks
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        // INP ≤ 200 ms   → "Good" threshold
        'interaction-to-next-paint': ['error', { maxNumericValue: 200 }],

        // ── Secondary performance metrics (hard gate) ─────────────────────
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'speed-index': ['error', { maxNumericValue: 3000 }],
        'server-response-time': ['error', { maxNumericValue: 600 }],

        // ── Bundle budgets (hard gate) ────────────────────────────────────
        'total-byte-weight': ['error', { maxNumericValue: 500000 }],
        'unused-javascript': ['error', { maxNumericValue: 100000 }],
        'unused-css-rules': ['error', { maxNumericValue: 50000 }],

        // ── Optimization hints (non-blocking) ────────────────────────────
        'max-potential-fid': ['warn', { maxNumericValue: 100 }],
        'uses-responsive-images': 'warn',
        'offscreen-images': 'warn',
        'modern-image-formats': 'warn',
        'uses-optimized-images': 'warn',
        'uses-text-compression': 'warn',
        'uses-rel-preconnect': 'warn',

        // ── Accessibility baseline (hard gate) ───────────────────────────
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
