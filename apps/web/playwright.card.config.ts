import { defineConfig, devices } from '@playwright/test'
import { VISUAL_ENV } from './playwright.visual.config'

/**
 * Browser proofs for the owner card at /c/[slug] (UNI-2996). No real Supabase, no network:
 * the card's server-side reads and the enquiry server action talk to e2e/card/fake-supabase.mjs.
 *
 *   npx playwright test -c playwright.card.config.ts
 *
 * Like the visual gate, it builds the app (`pnpm run build`, the production `next build --webpack`)
 * and serves it with `next start`, never reusing a running server, so the proofs see production
 * output rather than `next dev`. CARD_SKIP_BUILD=1 serves the existing .next build: local
 * iteration only, never a gate result, and only after a build made by this config (a build made by
 * another config inlines a different NEXT_PUBLIC_SUPABASE_URL).
 *
 * Needs Chromium: `npx playwright install chromium`.
 */
const FAKE_PORT = 54399
const WEB_PORT = 3014 // 3013 is playwright.visual.config.ts
const FAKE_KEY = 'fake-test-key-'.padEnd(60, 'x') // passes the env-guard length floor; not a real key
const build = process.env.CARD_SKIP_BUILD === '1' ? '' : 'pnpm run build && '

export default defineConfig({
  testDir: './e2e/card',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  timeout: 60_000,
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    ...devices['Desktop Chrome'],
  },
  projects: [{ name: 'chromium' }],
  webServer: [
    {
      command: 'node e2e/card/fake-supabase.mjs',
      url: `http://127.0.0.1:${FAKE_PORT}/__reset`,
      env: { FAKE_SUPABASE_PORT: String(FAKE_PORT) },
      reuseExistingServer: false,
      timeout: 15_000,
    },
    {
      command: `${build}pnpm exec next start -p ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}/c/phill-mcgurk`,
      reuseExistingServer: false,
      timeout: 900_000,
      env: {
        ...VISUAL_ENV, // placeholder build env, never live secrets
        NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${FAKE_PORT}`,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: FAKE_KEY,
        SUPABASE_SERVICE_ROLE_KEY: FAKE_KEY,
        CARD_ENQUIRY_RECEIPT_ENABLED: '1',
        MARGOT_PHONE_NUMBER: '+61491570156', // fictional ACMA-reserved range, test only
      },
    },
  ],
})
