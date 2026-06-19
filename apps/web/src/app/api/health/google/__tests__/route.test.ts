import { describe, it, expect } from 'vitest'
import { GET } from '../route'

function req() {
  return new Request('https://app.test/api/health/google')
}

describe('GET /api/health/google', () => {
  it('returns missing_credentials when no env vars', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.configured).toBe(false)
    expect(body.status).toBe('missing_credentials')
  })
})
