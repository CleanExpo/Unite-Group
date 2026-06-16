// const withNextIntl = require('next-intl/plugin')('./i18n.ts');
const { withSentryConfig } = require('@sentry/nextjs');

// SYN-519: Authority Hub routes (/clients/[slug]) use ISR with revalidate=3600.
// These pages carry LocalBusiness+VideoObject schema for E.E.A.T. positioning.
// See SYN-512, SYN-516 for architectural context.
// DO NOT add caching exceptions for /clients/* routes without reading those issues first.

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Tell Next.js to use the src directory
  distDir: '.next',
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'localhost' },
      { protocol: 'https', hostname: 'ccw.com.au' },
      { protocol: 'https', hostname: 'synthex.social' },
      { protocol: 'https', hostname: 'unite-group.vercel.app' },
      { protocol: 'https', hostname: 'cdn.unite-group.vercel.app' },
      { protocol: 'https', hostname: 'unite-group-cdn.vercel.app' },
    ],
    unoptimized: process.env.NODE_ENV === 'development',
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 64, 96, 128, 256, 384],
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  // Ensure proper handling of environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_CDN_ENABLED: process.env.NODE_ENV === 'production' ? 'true' : process.env.NEXT_PUBLIC_CDN_ENABLED,
    NEXT_PUBLIC_CDN_PROVIDER: process.env.NEXT_PUBLIC_CDN_PROVIDER || 'vercel',
    NEXT_PUBLIC_CDN_BASE_URL: process.env.NEXT_PUBLIC_CDN_BASE_URL,
    ENABLE_CDN_REDIRECT: process.env.ENABLE_CDN_REDIRECT || 'false',
  },
  // Enable source maps for production builds (for Sentry)
  productionBrowserSourceMaps: true,
  // Hide source maps from being served publicly (Sentry uploads them)
  webpack: (config, { dev }) => {
    if (!dev) {
      // Ensure sourcemaps are generated for server-side code
      config.devtool = 'source-map';
    }
    return config;
  },
}

// Sentry configuration options
const sentryConfig = {
  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Hides source maps from generated client bundles
  hideSourceMaps: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
  tunnelRoute: '/monitoring',

  // Webpack-specific options
  webpack: {
    // Automatically tree-shake Sentry logger statements to reduce bundle size
    treeshake: {
      removeDebugLogging: true,
    },
    // Enables automatic instrumentation of Vercel Cron Monitors
    automaticVercelMonitors: true,
  },
};

module.exports = withSentryConfig(nextConfig, sentryConfig);
