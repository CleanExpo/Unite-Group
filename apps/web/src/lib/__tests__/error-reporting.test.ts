import { describe, it, expect, vi, beforeEach } from 'vitest'

import { sanitiseError, captureApiError } from '../error-reporting'

describe('sanitiseError (B6)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(console.error).mockClear()
  })

  it('returns the safe client message, never the raw error message', () => {
    const out = sanitiseError(new Error('SELECT * FROM secrets failed at db.internal:5432'), 'Request failed')
    expect(out).toBe('Request failed')
    expect(out).not.toContain('secrets')
    expect(out).not.toContain('db.internal')
  })

  it('captures the full error server-side (console → Vercel Logs)', () => {
    const err = new Error('internal detail')
    sanitiseError(err, 'Request failed', { route: '/api/research' })
    expect(console.error).toHaveBeenCalledOnce()
  })

  it('handles non-Error throws and still returns the client message', () => {
    expect(sanitiseError('string failure', 'Request failed')).toBe('Request failed')
    expect(console.error).toHaveBeenCalledOnce()
  })

  it('captureApiError still works independently', () => {
    captureApiError(new Error('x'), { route: '/api/x' })
    expect(console.error).toHaveBeenCalledOnce()
  })
})
