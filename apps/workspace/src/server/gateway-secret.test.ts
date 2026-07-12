import { spawnSync } from 'node:child_process'
import { afterEach, describe, expect, it, vi } from 'vitest'

const STORE = Symbol.for('hermes.workspace.gateway-secrets')
const TOKEN_NAMES = [
  'HERMES_API_TOKEN',
  'HERMES_DASHBOARD_TOKEN',
  'CLAUDE_API_TOKEN',
  'CLAUDE_DASHBOARD_TOKEN',
] as const

afterEach(() => {
  for (const name of TOKEN_NAMES) delete process.env[name]
  delete (globalThis as unknown as Record<symbol, unknown>)[STORE]
  vi.resetModules()
})
describe('gateway secret process boundary', () => {
  it('captures tokens in-process and removes them from spawned child environments', async () => {
    process.env.HERMES_API_TOKEN = 'private-gateway-api'
    process.env.HERMES_DASHBOARD_TOKEN = 'private-gateway-dashboard'

    const { getGatewayApiToken, getGatewayDashboardToken } = await import(
      './gateway-secret'
    )

    expect(getGatewayApiToken()).toBe('private-gateway-api')
    expect(getGatewayDashboardToken()).toBe('private-gateway-dashboard')
    expect(process.env.HERMES_API_TOKEN).toBeUndefined()
    expect(process.env.HERMES_DASHBOARD_TOKEN).toBeUndefined()

    const child = spawnSync(
      process.execPath,
      ['-e', 'process.stdout.write(JSON.stringify(process.env))'],
      { env: process.env, encoding: 'utf8' },
    )
    expect(child.status).toBe(0)
    expect(child.stdout).not.toContain('private-gateway-api')
    expect(child.stdout).not.toContain('private-gateway-dashboard')
  })
})
