import { describe, it, expect } from 'vitest'
import { GET } from '../route'

describe('GET /api/health/social', () => {
  it('returns platform status list', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.platforms)).toBe(true)
    expect(body.platforms.length).toBeGreaterThan(0)
  })

  it('includes platform counts', async () => {
    const res = await GET()
    const body = await res.json()
    expect(typeof body.totalPlatforms).toBe('number')
    expect(typeof body.configuredPlatforms).toBe('number')
  })
})
