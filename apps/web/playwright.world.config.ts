import { defineConfig } from '@playwright/test'
import base from './playwright.config'

if (!base.webServer || Array.isArray(base.webServer)) {
  throw new Error('World acceptance requires the existing single local test server')
}

// A separate sequential test process, never a production/Preview deployment flag.
// Inherit the existing non-production auth fixtures; do not bypass founder access.
export default defineConfig({
  ...base,
  testMatch: '**/world-playtest.acceptance.ts',
  outputDir: 'test-results/world',
  reporter: [['html', { outputFolder: 'playwright-report/world', open: 'never' }], ['list']],
  use: {
    ...base.use,
    baseURL: 'http://localhost:3003',
    screenshot: 'off',
    trace: 'off', // Do not capture authentication traffic or credential entry.
  },
  webServer: {
    ...base.webServer,
    reuseExistingServer: false,
    env: { MISSION_CONTROL_VNEXT_PREVIEW: 'true' },
  },
})
