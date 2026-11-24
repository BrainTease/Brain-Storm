const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// NOTE: Runtime env access is centralized in `src/config`. Components must
// import from that module instead of reading `process.env` directly. The `env`
// block below only inlines the public variables at build time so the
// centralized config module can read them in the browser. The key list lives in
// `src/config/public-env.json` so build-time and runtime access cannot drift.
const PUBLIC_ENV_KEYS = Object.keys(require('./src/config/public-env.json'));

const publicEnv = PUBLIC_ENV_KEYS.reduce((acc, key) => {
  acc[key] = process.env[key];
  return acc;
}, {});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: publicEnv,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'www.gravatar.com' },
      { protocol: 'https', hostname: 'secure.gravatar.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'ui-avatars.com' },
    ],
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    dangerouslyAllowSVG: false,
  },
  // next/font self-hosts and inlines fonts at build time, so no external
  // font hosts are needed. Keep font assets immutable-cacheable (see headers).
  optimizeFonts: true,
  experimental: {
    optimizePackageImports: [
      '@brain-storm/types',
      'next-intl',
      'next-themes',
      'zustand',
      'react-hook-form',
      'zod',
      'recharts',
      '@stellar/freighter-api',
      '@dnd-kit/core',
      '@dnd-kit/sortable',
    ],
    // Route-level code splitting: emit a separate chunk per route so heavy
    // page components are only downloaded when their route is visited.
    optimizeCss: true,
  },
  webpack(config, { isServer }) {
    if (!isServer) {
      // Split shared vendor code into its own long-lived chunk so route
      // chunks stay small and cacheable across deploys.
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...(config.optimization && config.optimization.splitChunks),
          chunks: 'all',
          cacheGroups: {
            ...(config.optimization &&
              config.optimization.splitChunks &&
              config.optimization.splitChunks.cacheGroups),
            defaultVendors: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: -10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Build-time flags (NODE_ENV, ANALYZE) are read here only; runtime feature
  // flags live in `src/config` and must be consumed from there.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

const withBundleAnalyzer =
  process.env.ANALYZE === 'true'
    ? require('@next/bundle-analyzer')({ enabled: true })
    : (config) => config;

module.exports = withBundleAnalyzer(withNextIntl(nextConfig));
