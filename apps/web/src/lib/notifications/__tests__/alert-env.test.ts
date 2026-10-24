import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

describe('alert environment declarations', () => {
  it('keeps both new variables in the advisory integration tier', () => {
    const source = readFileSync('scripts/validate-env.mjs', 'utf8')
    const integration = source.split('const INTEGRATION = [')[1].split('\n]')[0]
    for (const name of ['LEAD_ALERT_EMAIL_TO', 'ALERT_HEALTH_TOKEN', 'SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL']) {
      expect(integration).toContain(`name: '${name}'`)
    }
    const result = spawnSync(process.execPath, ['scripts/validate-env.mjs', '--ci'], {
      env: {
        PATH: process.env.PATH,
        NEXT_PUBLIC_SUPABASE_URL: 'https://database.example.invalid',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-placeholder',
        SUPABASE_SERVICE_ROLE_KEY: 'test-placeholder',
        ANTHROPIC_API_KEY: 'test-placeholder',
        VAULT_ENCRYPTION_KEY: 'test-placeholder',
        CRON_SECRET: 'test-placeholder',
        FOUNDER_USER_ID: '00000000-0000-4000-8000-000000000001',
      },
      encoding: 'utf8',
    })
    expect(result.status).toBe(0)
  })
})
