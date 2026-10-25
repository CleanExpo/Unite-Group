import { defineConfig, devices } from '@playwright/test'

/**
 * Browser proofs for the owner card at /c/[slug] (UNI-2996). No real Supabase, no network:
 * the card's server-side reads and the enquiry server action talk to e2e/card/fake-supabase.mjs.
 *
 *   npx playwright test -c playwright.card.config.ts
 *
 * Needs Chromium: `npx playwright install chromium`.
 */
const FAKE_PORT = 54399
const WEB_PORT = 3014 // 3013 is playwright.visual.config.ts
const FAKE_KEY = 'fake-test-key-'.padEnd(60, 'x') // passes the env-guard length floor; not a real key

export default defineConfig({
  testDir: './e2e/card',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
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
      command: `npx next dev -p ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}/c/phill-mcgurk`,
      reuseExistingServer: false,
      timeout: 240_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${FAKE_PORT}`,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: FAKE_KEY,
        SUPABASE_SERVICE_ROLE_KEY: FAKE_KEY,
        CARD_ENQUIRY_RECEIPT_ENABLED: '1',
        MARGOT_PHONE_NUMBER: '+61491570156', // fictional ACMA-reserved range, test only
        NEXT_TELEMETRY_DISABLED: '1',
      },
    },
  ],
})
