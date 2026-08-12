import { describe, expect, it, vi } from 'vitest'
import { readLocalHostStatus } from '../local-host-status'

const response = (ok: boolean) => new Response('', { status: ok ? 200 : 503 })

describe('readLocalHostStatus', () => {
  it('returns explicit unknown signals when the local adapter is not enabled', async () => {
    const result = await readLocalHostStatus({
      fetch: vi.fn(), statfs: vi.fn(), hostname: () => 'mini', execFile: vi.fn(), env: {},
    } as never)
    expect(result.configured).toBe(false)
    expect(result.signals.every((signal) => signal.state === 'unknown')).toBe(true)
  })

  it('reports only successful local probes as ready', async () => {
    const result = await readLocalHostStatus({
      fetch: vi.fn().mockResolvedValueOnce(response(true)).mockResolvedValueOnce(response(false)),
      statfs: vi.fn().mockResolvedValue({ bavail: 4, bsize: 1024 ** 3 }),
      hostname: () => 'mini',
      execFile: vi.fn().mockResolvedValue({ stdout: 'state = running' }),
      env: { MISSION_CONTROL_LOCAL_HOST_ADAPTER: '1', MISSION_CONTROL_STORAGE_PATH: '/storage' },
    } as never)
    expect(result.host).toBe('mini')
    expect(result.signals.map((signal) => signal.state)).toEqual(['ready', 'degraded', 'ready', 'ready'])
  })
})
