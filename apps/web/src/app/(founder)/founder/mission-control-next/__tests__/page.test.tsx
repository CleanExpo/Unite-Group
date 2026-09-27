import { describe, it, expect, vi, afterEach } from 'vitest'

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
}))
vi.mock('next/navigation', () => ({ notFound }))
vi.mock('../MissionControlNext', () => ({ MissionControlNext: () => null }))

import MissionControlNextPage from '../page'

afterEach(() => {
  vi.unstubAllEnvs()
  notFound.mockClear()
})

describe('Mission Control vNext page — flag gate', () => {
  it('404s when the preview flag is unset', async () => {
    vi.stubEnv('MISSION_CONTROL_VNEXT_PREVIEW', '')
    await expect(MissionControlNextPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('NEXT_NOT_FOUND')
    expect(notFound).toHaveBeenCalledTimes(1)
  })

  it('renders when the preview flag is exactly "true"', async () => {
    vi.stubEnv('MISSION_CONTROL_VNEXT_PREVIEW', 'true')
    const el = await MissionControlNextPage({ searchParams: Promise.resolve({ tab: 'missions' }) })
    expect(notFound).not.toHaveBeenCalled()
    expect(el.props.tab).toBe('missions')
  })
})
