import { defineConfig } from '@playwright/test'

/**
 * See-Pick-Tweak visual gate (UNI-2996). Run with `pnpm run visual:gate`.
 *
 * Builds the app with placeholder env (never live secrets, fixture Stripe links that are
 * blocked in the specs), serves it on 3013 and never reuses a running server, so a stale
 * build cannot be captured. Screenshots must equal the committed ones exactly.
 * VISUAL_SKIP_BUILD=1 serves the existing .next build: local iteration only, never a gate result.
 */

const PORT = 3013

// The anon key placeholder clears the runtime 40-character floor in src/lib/supabase/env-guard.ts.
export const VISUAL_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'visual-gate-placeholder-anon-key-not-a-real-key-000000',
  NEXT_PUBLIC_APP_URL: 'https://verification.invalid',
  ANTHROPIC_API_KEY: 'ci-placeholder-anthropic-key',
  SUPABASE_SERVICE_ROLE_KEY: 'ci-placeholder-service-role-key',
  VAULT_ENCRYPTION_KEY: '12345678901234567890123456789012',
  CRON_SECRET: 'ci-placeholder-cron-secret',
  FOUNDER_USER_ID: '00000000-0000-0000-0000-000000000000',
  // Syntactically valid, never live. Every request to buy.stripe.com is blocked in the specs.
  STRIPE_PAYMENT_LINK_CARD_READY: 'https://buy.stripe.com/test_visual_fixture_ready',
  STRIPE_PAYMENT_LINK_CARD_CUSTOM: 'https://buy.stripe.com/test_visual_fixture_custom',
  STRIPE_PAYMENT_LINK_CARD_EXTRA_BUSINESS: 'https://buy.stripe.com/test_visual_fixture_extra_business',
  NEXT_TELEMETRY_DISABLED: '1',
  CI: '1',
}

const build = process.env.VISUAL_SKIP_BUILD === '1' ? '' : 'pnpm run build && '

export default defineConfig({
  testDir: './e2e/visual',
  testMatch: '**/*.visual.ts',
  outputDir: './test-results/visual',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  forbidOnly: true,
  reporter: [['list']],
  timeout: 60_000,
  expect: {
    // Capture time only, never tolerance: under load a full capture exceeded the 5s default.
    timeout: 20_000,
    toHaveScreenshot: { maxDiffPixels: 0, threshold: 0, animations: 'disabled', caret: 'hide', scale: 'css' },
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    deviceScaleFactor: 1,
    colorScheme: 'dark',
    locale: 'en-AU',
    timezoneId: 'Australia/Brisbane',
    reducedMotion: 'reduce',
    // Partial re-raster after a hover drew anti-aliased edges two ways (5-6 in 60 on mobile
    // hero-primary-hover, two stable images); full re-raster gave 60 in 60 identical.
    launchOptions: { args: ['--disable-partial-raster'] },
  },
  projects: [
    { name: 'desktop', testMatch: 'order.visual.ts', use: { viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', testMatch: 'order.visual.ts', use: { viewport: { width: 390, height: 844 } } },
    { name: 'coverage', testMatch: 'coverage.visual.ts', dependencies: ['desktop', 'mobile'] },
  ],
  webServer: {
    command: `${build}pnpm exec next start -p ${PORT} -H 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}/cards/order`,
    reuseExistingServer: false,
    timeout: 900_000,
    env: VISUAL_ENV,
  },
})
